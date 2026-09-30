use crate::models::{KeyValue, RequestSpec, ResponseSpec};
use anyhow::{anyhow, Context, Result};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Method;
use std::str::FromStr;
use std::time::Instant;

const MAX_BODY_BYTES: usize = 5 * 1024 * 1024; // 5 MB

pub async fn execute(client: &reqwest::Client, spec: &RequestSpec) -> Result<ResponseSpec> {
    let method = Method::from_str(spec.method.trim().to_uppercase().as_str())
        .map_err(|_| anyhow!("Unsupported HTTP method: {}", spec.method))?;

    let mut url =
        url::Url::parse(spec.url.trim()).with_context(|| format!("Invalid URL: {}", spec.url))?;

    // Merge enabled query params into the URL.
    {
        let mut pairs = url.query_pairs_mut();
        for p in &spec.params {
            if p.is_active() {
                pairs.append_pair(&p.key, &p.value);
            }
        }
    }

    let mut headers = HeaderMap::new();
    for h in &spec.headers {
        apply_header(&mut headers, h)?;
    }

    // Authorization
    let mut basic_auth: Option<(String, String)> = None;
    match spec.auth.kind.as_str() {
        "bearer" if !spec.auth.token.trim().is_empty() => {
            let val = HeaderValue::from_str(&format!("Bearer {}", spec.auth.token.trim()))
                .context("Invalid bearer token")?;
            headers.insert(AUTHORIZATION, val);
        }
        "basic" => {
            basic_auth = Some((spec.auth.username.clone(), spec.auth.password.clone()));
        }
        _ => {}
    }

    let mut request = client.request(method, url).headers(headers.clone());
    if let Some((user, pass)) = basic_auth {
        request = request.basic_auth(user, Some(pass));
    }

    // Body
    let body_kind = spec.body.kind.as_str();
    let has_body = body_kind != "none" && !spec.body.content.is_empty();
    if has_body {
        let ct = match body_kind {
            "json" => "application/json",
            "form" => "application/x-www-form-urlencoded",
            _ => "text/plain",
        };
        if !headers.contains_key(CONTENT_TYPE) {
            request = request.header(CONTENT_TYPE, ct);
        }
        request = request.body(spec.body.content.clone());
    }

    let started = Instant::now();
    let mut resp = request.send().await.map_err(map_reqwest_err)?;
    let status = resp.status();
    let mut out_headers: Vec<KeyValue> = resp
        .headers()
        .iter()
        .map(|(k, v)| KeyValue {
            key: k.as_str().to_string(),
            value: v.to_str().unwrap_or("<binary>").to_string(),
            enabled: true,
        })
        .collect();
    out_headers.sort_by(|a, b| a.key.cmp(&b.key));

    let content_type = resp
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let mut collected: Vec<u8> = Vec::new();
    let mut truncated = false;
    while let Some(chunk) = resp.chunk().await.map_err(map_reqwest_err)? {
        if collected.len() + chunk.len() > MAX_BODY_BYTES {
            let remaining = MAX_BODY_BYTES - collected.len();
            collected.extend_from_slice(&chunk[..remaining]);
            truncated = true;
            break;
        }
        collected.extend_from_slice(&chunk);
    }
    let duration_ms = started.elapsed().as_millis() as u64;
    let size_bytes = collected.len();

    let body = String::from_utf8_lossy(&collected).to_string();

    Ok(ResponseSpec {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers: out_headers,
        body,
        duration_ms,
        size_bytes,
        content_type,
        truncated,
    })
}

fn apply_header(headers: &mut HeaderMap, h: &KeyValue) -> Result<()> {
    if !h.is_active() {
        return Ok(());
    }
    let name = HeaderName::from_bytes(h.key.trim().as_bytes())
        .with_context(|| format!("Invalid header name: {}", h.key))?;
    let value = HeaderValue::from_str(&h.value)
        .with_context(|| format!("Invalid header value for {}", h.key))?;
    headers.append(name, value);
    Ok(())
}

fn map_reqwest_err(err: reqwest::Error) -> anyhow::Error {
    if err.is_timeout() {
        anyhow!("Request timed out")
    } else if err.is_connect() {
        anyhow!("Could not connect to host: {err}")
    } else if err.is_builder() {
        anyhow!("Invalid request: {err}")
    } else {
        anyhow!("Request failed: {err}")
    }
}
