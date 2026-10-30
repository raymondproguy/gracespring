# PROGRESS

Running record of what has been built. Newest entries first in the log. Keep the status table current.

## Status by release

| Release | Status | Branch or tag | Notes |
|---|---|---|---|
| v1 Foundations and content | In progress | feat/profiles | Repo setup, auth spike, monorepo skeleton, API foundation, auth middleware, profiles and role administration in progress |
| v2 Community and prayer | Not started | | |
| v3 Chat and verse cards | Not started | | |
| v4 Calls and live | Not started | | |
| Mobile | Paused | | |

## Feature checklist

Mark with the date and the commit or tag when done.

### v1
- [x] Repo setup and design/ moved
- [x] csag token spike
- [x] Monorepo skeleton and CI
- [x] API foundation
- [x] Auth middleware
- [x] Profiles
- [x] Roles, admin seed, audit log
- [ ] Web shell and auth screens
- [ ] Storage and uploads
- [ ] Devotionals API and web
- [ ] Devotional engagement
- [ ] Audio API and web
- [ ] Events
- [ ] Deploy and tag v1

### v2
- [ ] Community feed
- [ ] Prayer wall and testimonies
- [ ] Notifications (web push, email)
- [ ] Search
- [ ] Moderation tools (reports, hide, remove)

### v3
- [ ] Conversations and messages API
- [ ] WebSocket gateway
- [ ] Groups and announcements channel
- [ ] Verse cards
- [ ] Block, report, mute

### v4
- [ ] LiveKit integration
- [ ] Voice and video calls
- [ ] Prayer rooms
- [ ] Live service streaming

## Log

Format: date, branch, what changed, what to know.

- 2026-10-30, feat/monorepo-skeleton: added pnpm workspace, Go API module with a health route, React/Vite TypeScript shell, shared package, health-only OpenAPI contract, Makefile, and CI for formatting, vet, tests, lint and build. Local development commands are in README.md.
- 2026-10-30, feat/api-foundation: added environment configuration, JSON slog logging, chi routing and middleware, structured API errors, request IDs, health/readiness routes, PostgreSQL pool, graceful shutdown, Goose migration command and sqlc config/tool. Database readiness is checked on /ready; health stays independent of dependencies.
- 2026-10-30, feat/api-auth-middleware: added local HS256 token verification, database-backed role context, automatic member profile creation, protected GET /v1/me, Redis fixed-window limits per IP and user, and readiness checks for Redis. Roles come from profiles, never token claims; API rate limiting fails closed if Redis is unavailable.
- 2026-10-30, feat/profiles: added validated PATCH /v1/me, multipart avatar upload, an email/password signup and sign-in path that keeps the access token in memory, and profile onboarding through to Home. Profile email is read from csag's users table using read-only access to the ID and email columns. Empty bio or ministry clears the value. Avatar images are limited to JPEG/PNG, re-encoded to strip metadata, and saved with content-hash keys.
- 2026-10-30, feat/profiles: added admin-only role changes, audit entries, a first-admin seed command, and a guard against demoting the last administrator. Full admin user management remains in progress.

- 2026-10-29, feat/auth-spike: ran the csag token spike. All 13 questions in docs/AUTH.md answered in docs/AUTH_FINDINGS.md. Key results: HS256 with shared secret, no JWKS; claims are only sub/iat/exp (email and role are not in tokens); /v1/verify does not check session revocation, so local verification was chosen (DECISIONS.md 14); refresh rotation with family revocation on reuse works; logout needs session_id in the body (500 otherwise, bug noted); no cookies and no real email sender. Follow-up source inspection corrected the webhook assumption: audit events contain no email or one-time email token. Shared database with search_path=auth tested end to end and passed (DECISIONS.md 3 confirmed). Test user remains in the local csag database for further development. Throwaway schema-test database dropped.
- 2026-10-29, docs/repo-setup: moved the static UI site (96 HTML pages, css/, js/, assets/, its README) into design/ with git mv as pure renames. Added .editorconfig, root .env.example with placeholder values for the API, and a new root README covering layout, docs map, branch rules and the secret check. .gitignore already existed and covers everything docs/GIT_WORKFLOW.md requires. Note: a local .env with real csag and OAuth values exists at the repo root, is untracked and correctly ignored.

## Known issues

- The API needs `USAGE` on the configured csag schema and column-level `SELECT (id, email)` on its users table for profile responses. Production uses `auth`; the local .env setup currently uses `public`.
- POST /v1/logout returns 500 for any body without a valid session_id. Workaround: use session ids from GET /v1/sessions or logout-all. Reported in docs/AUTH_FINDINGS.md.
- The installed csag binary is a dev build. Pin a release tag and record its checksum in docs/AUTH_FINDINGS.md before production.
- csag access tokens stay valid after logout or session revoke until their 15 minute expiry. This is by design of csag's verify, our API just must not assume otherwise.

## Deviations from the plan

(none yet)
