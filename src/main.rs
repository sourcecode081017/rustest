mod executor;
mod models;
mod storage;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::Utc;
use models::{ExecuteResult, HistoryEntry, RequestSpec, SavedRequest};
use serde::Deserialize;
use std::sync::Arc;
use std::time::Duration;
use storage::Store;
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;
use uuid::Uuid;

struct AppState {
    client: reqwest::Client,
    store: Store,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "rustest=info,tower_http=info".into()),
        )
        .init();

    let port: u16 = std::env::var("RUSTEST_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3000);
    let host = std::env::var("RUSTEST_HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let data_dir = std::env::var("RUSTEST_DATA_DIR").unwrap_or_else(|_| "data".into());
    let web_dir = std::env::var("RUSTEST_WEB_DIR").unwrap_or_else(|_| "web/dist".into());
    let timeout_secs: u64 = std::env::var("RUSTEST_TIMEOUT_SECS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(30);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .redirect(reqwest::redirect::Policy::limited(10))
        .user_agent(concat!("rustest/", env!("CARGO_PKG_VERSION")))
        .build()?;

    let state = Arc::new(AppState {
        client,
        store: Store::new(&data_dir),
    });

    let api = Router::new()
        .route("/health", get(health))
        .route("/execute", post(execute))
        .route("/history", get(get_history).delete(clear_history))
        .route("/collections", get(get_collections).post(save_request))
        .route("/collections/:id", delete(delete_saved))
        .with_state(state);

    // SPA static files: serve from disk, fall back to index.html for client routes.
    let index = std::path::Path::new(&web_dir).join("index.html");
    let static_files = ServeDir::new(&web_dir).fallback(ServeFile::new(index));

    let app = Router::new()
        .nest("/api", api)
        .fallback_service(static_files)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let addr = format!("{host}:{port}");
    tracing::info!("rustest listening on http://{addr}  (web: {web_dir})");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok", "version": env!("CARGO_PKG_VERSION") }))
}

async fn execute(
    State(state): State<Arc<AppState>>,
    Json(spec): Json<RequestSpec>,
) -> Result<Json<ExecuteResult>, ApiError> {
    let response = executor::execute(&state.client, &spec).await?;
    let id = Uuid::new_v4().to_string();
    state.store.add_history(HistoryEntry {
        id: id.clone(),
        created_at: Utc::now().to_rfc3339(),
        request: spec,
        status: Some(response.status),
        duration_ms: Some(response.duration_ms),
    });
    Ok(Json(ExecuteResult {
        response,
        history_id: id,
    }))
}

async fn get_history(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(state.store.history())
}

async fn clear_history(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    state.store.clear_history();
    StatusCode::NO_CONTENT
}

async fn get_collections(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(state.store.saved())
}

#[derive(Deserialize)]
struct SaveRequestInput {
    name: String,
    request: RequestSpec,
}

async fn save_request(
    State(state): State<Arc<AppState>>,
    Json(input): Json<SaveRequestInput>,
) -> impl IntoResponse {
    let saved = SavedRequest {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        created_at: Utc::now().to_rfc3339(),
        request: input.request,
    };
    state.store.save_request(saved.clone());
    (StatusCode::CREATED, Json(saved))
}

async fn delete_saved(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> StatusCode {
    if state.store.delete_saved(&id) {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

struct ApiError(anyhow::Error);

impl<E> From<E> for ApiError
where
    E: Into<anyhow::Error>,
{
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let msg = self.0.to_string();
        tracing::warn!("request error: {msg}");
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": msg })),
        )
            .into_response()
    }
}
