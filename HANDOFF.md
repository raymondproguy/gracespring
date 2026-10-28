# GraceSpring Build Handoff

Main handoff for building the complete GraceSpring Family Church app. Read this first, then NEXT.md and PROGRESS.md.

## 1. What we are building

A church app for one church (GraceSpring Family Church), for members, leaders and admins.

Member features: home, audio sermons (series and categories), devotionals (series, episodes, categories), events, prayer wall, community feed, profile and settings, search, verse cards, chats (1 to 1, groups, announcements channel), voice and video calls and live prayer rooms.

Admin features: post devotionals and audio, manage events, moderate content and reports, manage roles.

Only church admins can post devotionals and announcements. Members can post in the community feed and chat.

## 2. Current state

- Static, UI only HTML/CSS/JS pages exist (about 95 pages). They define the look, layout and flows. See docs/FRONTEND.md for the page to route map.
- Nothing is wired to a backend yet.
- About 20 test users will be on the system at first. Real data will exist, so treat every migration and deploy with care.
- The csag auth binary is installed and is to be shipped on the same server as the product.

## 3. Scope and order

Built in releases, each one finished, tested and deployed before the next starts. Details and acceptance criteria are in docs/BUILD_PLAN.md.

| Release | Content |
|---|---|
| v1 | Foundations, auth integration, profiles, roles, admin shell, devotionals, audio, events, uploads |
| v2 | Community feed, prayer wall, notifications, search |
| v3 | Chats, groups, announcements channel, verse cards |
| v4 | Voice and video calls, prayer rooms, live streaming |
| Later | Mobile app (React Native), giving, if confirmed |

Mobile is paused. Do not build it now, but do not block it either: keep the API contract and shared packages clean so it can be added.

## 4. Stack

- Backend: Go, net/http with the chi router, PostgreSQL (pgx, sqlc, goose migrations), Redis (cache, rate limits, pub/sub, job queue).
- Auth: csag, a separate process with its own database. Social login: GitHub and Google for now.
- Web: React, Vite, TypeScript, TanStack Router and Query, built as a PWA.
- Shared: OpenAPI contract, generated TypeScript client, shared types and validation.
- Storage: S3 compatible object storage behind a storage interface. v1 default is local disk behind the reverse proxy, with Cloudflare R2 as the planned production driver.
- Realtime and calls (v3, v4): WebSocket gateway, LiveKit.
- Reverse proxy and TLS: Caddy.

## 5. Repository layout

```
/
  CLAUDE.md
  HANDOFF.md
  NEXT.md
  PROGRESS.md
  README.md
  design/                static HTML reference (read only)
  apps/
    api/                 Go API, realtime gateway, workers
    web/                 React web app
  packages/
    api-client/          generated TypeScript client
    shared/              shared types, validation, design tokens
  openapi/
    openapi.yaml         the API contract (source of truth)
  deploy/
    caddy/ systemd/ scripts/ backup/
  docs/
```

Move the existing static site into design/ as the first commit (use git mv so history is kept).

## 6. Docs map

| File | Purpose |
|---|---|
| docs/ARCHITECTURE.md | Components, data flow, caching, realtime |
| docs/AUTH.md | csag integration, roles, token verification spike |
| docs/BACKEND.md | Go conventions, modules, data model, API rules |
| docs/FRONTEND.md | Porting the static pages, design tokens, routes, performance |
| docs/BUILD_PLAN.md | Releases, features, acceptance criteria |
| docs/DEPLOYMENT.md | Single server setup, releases, backups, rollback |
| docs/SECURITY.md | Secrets, authorization, privacy, moderation, minors |
| docs/GIT_WORKFLOW.md | Branches, commits, tags, secret checks |
| docs/DECISIONS.md | Decision log and open questions |

## 7. Definition of done for a feature

1. Meets the acceptance criteria in docs/BUILD_PLAN.md.
2. API change is reflected in openapi/openapi.yaml and the client is regenerated.
3. Tests written and passing (unit for logic, integration for endpoints).
4. Matches the matching page in design/ on mobile (390 px) and desktop (1280 px), light and dark.
5. Loading, empty and error states exist.
6. Docs and PROGRESS.md updated.
7. No secrets, no em dashes, no emojis.

## 8. Principles

- Speed first for the user: instant first screen, optimistic updates, small payloads, cached public content.
- Simple and clear UI. Few boxes, one accent colour. Follow the existing design tokens.
- Security by default: authorization checked in the API on every request, never only in the UI.
- Small steps. Small commits. Working software at the end of every day.
