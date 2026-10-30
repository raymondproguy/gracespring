.PHONY: dev build lint test api

dev:
	pnpm dev

build:
	pnpm build

lint:
	pnpm lint

test:
	pnpm test

api:
	cd apps/api && go run ./cmd/api
