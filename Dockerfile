# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- Stage 2: build the Rust backend ----
FROM rust:1-slim-bookworm AS backend
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Pre-build dependencies with a dummy main to maximize layer caching.
RUN mkdir -p src && printf 'fn main() {}\n' > src/main.rs \
    && cargo build --release \
    && rm -rf src
COPY src ./src
RUN touch src/main.rs && cargo build --release

# ---- Stage 3: minimal runtime ----
FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/rustest /usr/local/bin/rustest
COPY --from=web /web/dist /app/web/dist

ENV RUSTEST_HOST=0.0.0.0 \
    RUSTEST_PORT=3000 \
    RUSTEST_WEB_DIR=/app/web/dist \
    RUSTEST_DATA_DIR=/data

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["rustest"]
