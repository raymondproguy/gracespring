# Architecture

## Shape

One Go codebase, one deployable API binary, plus a realtime gateway and a worker started from the same codebase as separate processes. csag runs next to it as its own process. Postgres and Redis run on the same server for v1 and can be moved to managed services without code changes.

```
Browser (React PWA)
      |
   Caddy (TLS, routing, static files, compression)
      |-- app.<domain>   : web app static files
      |-- api.<domain>   : Go API (REST)
      |-- ws.<domain>    : Go realtime gateway (v3)
      |-- auth.<domain>  : csag
      |-- authadmin.<domain> : csag console (restricted)
      |-- media.<domain> : uploaded files (disk now, CDN and R2 later)

Go API  --> Postgres (app database)
        --> Redis
        --> storage interface (disk, later R2)
Workers --> Redis queue, Postgres, storage, email, web push
csag    --> its own Postgres database
```

## Modules in the API

Each module owns its tables, queries, handlers and tests. Modules talk through Go interfaces, not by reading each other's tables.

- identity: profiles, roles, follows, audit log
- content: devotionals (categories, series, episodes), audio (categories, series, tracks), events and RSVPs
- social: posts, comments, likes, reposts, reports
- prayer: requests, prayed-by marks, testimonies
- messaging: conversations, members, messages, receipts, verse cards (v3)
- notifications: devices and subscriptions, preferences, delivery
- media: uploads, variants, validation
- calls: LiveKit token issuing, call log (v4)
- admin: admin only endpoints and moderation tools

## Request path

1. Caddy terminates TLS and forwards to the API.
2. Middleware: request ID, logging, panic recovery, CORS, rate limit, auth, load profile and role.
3. Handler validates input, checks authorization, calls the module service.
4. Service uses sqlc generated queries. Cursor pagination everywhere.
5. Response with the standard JSON shape (see docs/BACKEND.md).

## Caching

- Public or semi public reads (devotionals, audio lists, events): ETag and Cache-Control with stale-while-revalidate, purged or versioned on publish.
- Per user reads: short Redis cache where it pays off, never stale for the owner after their own write.
- Static assets: long cache with hashed file names.
- Media: long cache, immutable URLs that include a content hash.

## Realtime (v3)

- WebSocket gateway authenticates with the same access token.
- Message flow: client sends with a client generated ID, API persists the message, then publishes to Redis pub/sub, gateway instances fan out to connected members. Idempotent by client ID.
- Per conversation sequence numbers give ordering and gap detection. On reconnect the client asks for messages after its last sequence.
- Typing and presence are ephemeral in Redis with short expiry, never written to Postgres.
- Offline members get web push (and later mobile push).

## Calls (v4)

- LiveKit server runs on the same host first or LiveKit Cloud. The API issues short lived join tokens after checking membership and permission.
- Prayer rooms: hosts and speakers have publish rights, listeners subscribe only, raise hand is a data message.
- A call log table records start, end and participants for the Calls tab.

## Background jobs

Redis backed queue (asynq): image variants, audio transcoding, push and email delivery, scheduled reminders, cleanup of expired uploads. Jobs are idempotent and retried with backoff.

## Performance targets

- API p95 under 200 ms for reads at 20 test users and still under 300 ms at 2,000 concurrent users on one server.
- First meaningful screen under 2 seconds on a mid range phone over 4G.
- Web bundle: route level code splitting, initial JS under 200 KB gzipped for the shell.
- Images served as WebP with width variants and placeholders. Audio streamed with range requests.

## Observability

Structured JSON logs with request ID, Sentry (or similar) for errors, a health and readiness endpoint, uptime monitor, basic metrics. Alert on error rate, disk space, backup age and certificate expiry.

## Scaling path (not needed now)

Move Postgres to a managed instance with a read replica, put media on R2 and a CDN, run more API and gateway instances behind Caddy or a load balancer, add Meilisearch if Postgres search is not enough. None of these require a rewrite if the module and storage boundaries above are respected.
