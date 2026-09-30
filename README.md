# rustest

A fast, minimalist API testing tool — a lean, self-hostable alternative to Postman.
The backend is written in **Rust** and the UI is a lightweight **React** app. It runs
as a single binary locally or as a small Docker container.

```
┌─ rustest ────────────────────────────────────────────────┐
│  [GET ▾]  https://api.example.com/users      [ Send ]    │
├────────────┬──────────────────────────────────────────────┤
│  History   │  Params | Headers | Body | Auth             │
│  Saved     │  ─────────────────────────────────────────   │
│            │  200 OK   42 ms   1.2 KB   application/json │
│            │  { "users": [ ... ] }                        │
└────────────┴──────────────────────────────────────────────┘
```

## Features (v1)

- HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- Query **params**, request **headers**, and **body** (`json`, `text`, `form-urlencoded`)
- **Auth**: none, Bearer token, Basic auth
- Rich **response viewer**: status, latency, size, headers and pretty-printed JSON
- **History** (last 200 requests) and **saved requests** — persisted to disk
- Keyboard shortcut: `Ctrl/Cmd + Enter` to send
- Single Rust binary + static UI; Docker image for one-command deploys

## Quick start (local)

Requirements: Rust (stable) and Node 18+.

```bash
# 1. Build the UI
cd web && npm install && npm run build && cd ..

# 2. Run the server (serves API + UI on http://localhost:3000)
cargo run --release
```

Open <http://localhost:3000>.

### Development mode

Run the backend and the Vite dev server in two terminals (Vite proxies `/api` to the backend):

```bash
cargo run                 # backend on :3000
cd web && npm run dev     # UI on :5173
```

## Docker

```bash
# Build and run
docker build -t rustest .
docker run --rm -p 3000:3000 -v rustest-data:/data rustest

# Or with compose
docker compose up --build
```

Open <http://localhost:3000>.

## Configuration

| Env var                | Default     | Description                          |
| ---------------------- | ----------- | ------------------------------------ |
| `RUSTEST_HOST`         | `0.0.0.0`   | Bind address                         |
| `RUSTEST_PORT`         | `3000`      | Port                                 |
| `RUSTEST_DATA_DIR`     | `data`      | Directory for history/collections    |
| `RUSTEST_WEB_DIR`      | `web/dist`  | Directory of built frontend assets   |
| `RUSTEST_TIMEOUT_SECS` | `30`        | Outbound request timeout             |

## HTTP API

The UI is a thin client over a small JSON API:

| Method   | Path                    | Purpose                       |
| -------- | ----------------------- | ----------------------------- |
| `GET`    | `/api/health`           | Health/version check          |
| `POST`   | `/api/execute`          | Execute a request             |
| `GET`    | `/api/history`          | List history                  |
| `DELETE` | `/api/history`          | Clear history                 |
| `GET`    | `/api/collections`      | List saved requests           |
| `POST`   | `/api/collections`      | Save a request                |
| `DELETE` | `/api/collections/:id`  | Delete a saved request        |

Example:

```bash
curl -X POST localhost:3000/api/execute \
  -H 'Content-Type: application/json' \
  -d '{"method":"GET","url":"https://httpbin.org/get","params":[{"key":"a","value":"1","enabled":true}],"headers":[],"body":{"kind":"none","content":""},"auth":{"kind":"none","token":"","username":"","password":""}}'
```

## Project layout

```
src/
  main.rs       # axum server, routes, static file serving
  models.rs     # request/response/history types
  executor.rs   # reqwest-based HTTP execution
  storage.rs    # JSON-file persistence
web/
  src/          # React + TypeScript UI
Dockerfile      # multi-stage build
```

## Roadmap

- [ ] Environments & variable interpolation (`{{baseUrl}}`)
- [ ] WebSocket testing
- [ ] OAuth2 / API-key auth
- [ ] Response assertions & test scripts
- [ ] Import/export Postman collections
- [ ] Request tabs & history search

## License

MIT
