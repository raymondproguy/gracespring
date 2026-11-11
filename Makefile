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
	@test -f apps/api/.env || (echo "Copy apps/api/.env.example to apps/api/.env and configure it first."; exit 1)
	@set -a; . ./apps/api/.env; set +a; cd apps/api && go run ./cmd/api

migrate-up:
	@test -f apps/api/.env || (echo "Copy apps/api/.env.example to apps/api/.env and configure it first."; exit 1)
	@set -a; . ./apps/api/.env; set +a; cd apps/api && go run ./cmd/migrate up

migrate-status:
	@test -f apps/api/.env || (echo "Copy apps/api/.env.example to apps/api/.env and configure it first."; exit 1)
	@set -a; . ./apps/api/.env; set +a; cd apps/api && go run ./cmd/migrate status

sqlc:
	cd apps/api && go tool sqlc generate -f sqlc.yaml
