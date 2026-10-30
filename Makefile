.PHONY: dev build lint test api migrate-up migrate-status sqlc

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

test:
	pnpm test

api:
	cd apps/api && HTTP_ADDR=$${HTTP_ADDR:-127.0.0.1:8082} go run ./cmd/api

migrate-up:
	cd apps/api && go run ./cmd/migrate up

migrate-status:
	cd apps/api && go run ./cmd/migrate status

sqlc:
	cd apps/api && go tool sqlc generate -f sqlc.yaml
