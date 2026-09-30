.PHONY: build web run dev docker fmt clippy

web:
	cd web && npm install && npm run build

build: web
	cargo build --release

run: build
	./target/release/rustest

dev:
	cargo run

docker:
	docker build -t rustest .

fmt:
	cargo fmt

clippy:
	cargo clippy --all-targets -- -D warnings
