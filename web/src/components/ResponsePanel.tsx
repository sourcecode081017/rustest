import { useMemo, useState } from "react";
import type { ResponseSpec } from "../types";

interface Props {
  response: ResponseSpec | null;
  error: string | null;
  loading: boolean;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return "ok";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client";
  return "server";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function prettify(body: string, contentType: string | null): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  const looksJson =
    (contentType?.includes("json") ?? false) ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");
  if (looksJson) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

export default function ResponsePanel({ response, error, loading }: Props) {
  const [tab, setTab] = useState<"body" | "headers">("body");
  const [copied, setCopied] = useState(false);

  const prettyBody = useMemo(
    () => (response ? prettify(response.body, response.content_type) : ""),
    [response]
  );

  if (loading) {
    return <div className="response-panel empty">Sending request…</div>;
  }

  if (error) {
    return (
      <div className="response-panel">
        <div className="response-error">{error}</div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-panel empty">
        Send a request to see the response.
      </div>
    );
  }

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(prettyBody || response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="response-panel">
      <div className="response-meta">
        <span className={`status-pill ${statusClass(response.status)}`}>
          {response.status} {response.status_text}
        </span>
        <span className="meta-item">{response.duration_ms} ms</span>
        <span className="meta-item">{formatBytes(response.size_bytes)}</span>
        {response.content_type && (
          <span className="meta-item muted">{response.content_type}</span>
        )}
        {response.truncated && (
          <span className="meta-item warn">truncated at 5 MB</span>
        )}
      </div>

      <div className="tabs">
        <button
          className={tab === "body" ? "tab active" : "tab"}
          onClick={() => setTab("body")}
        >
          Body
        </button>
        <button
          className={tab === "headers" ? "tab active" : "tab"}
          onClick={() => setTab("headers")}
        >
          Headers ({response.headers.length})
        </button>
        <div className="spacer" />
        <button className="ghost-btn" onClick={copyBody}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {tab === "body" ? (
        <pre className="response-body">{prettyBody || "(empty)"}</pre>
      ) : (
        <div className="response-headers">
          {response.headers.map((h, i) => (
            <div className="header-line" key={i}>
              <span className="header-key">{h.key}</span>
              <span className="header-value">{h.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
