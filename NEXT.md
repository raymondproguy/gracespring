# NEXT

The ordered work queue. Work from the top. Check items off as they are finished and move them to PROGRESS.md. Add new items at the right place, do not just append.

## In progress

(none)

## Up next (release v1)

Branch names are suggestions.

1. [x] docs/repo-setup: move the static site into design/ with git mv, add .gitignore, .editorconfig, .env.example, README.md. Commit each separately.
2. [ ] feat/auth-spike: run the csag token spike described in docs/AUTH.md. Record findings in docs/AUTH_FINDINGS.md (signing algorithm, claims, key distribution, verify endpoint, refresh behaviour, cookie support, CORS, error shapes, rate limits, console URL, how users are stored). Do not build on assumptions before this is done.
3. [ ] feat/monorepo-skeleton: pnpm workspace, Go module in apps/api, Vite app in apps/web, packages/shared, openapi/openapi.yaml with /health only, Makefile or task runner, CI workflow for lint and tests.
4. [ ] feat/api-foundation: config loading from environment, structured logging, chi router, health and readiness endpoints, error format, request IDs, graceful shutdown, Postgres connection, goose migrations, sqlc setup.
5. [ ] feat/api-auth-middleware: verify csag tokens locally (per spike result), load profile and role into request context, rate limit middleware (Redis).
6. [ ] feat/profiles: profiles table keyed by csag user id, create on first authenticated request, GET and PATCH /v1/me, avatar upload.
7. [ ] feat/roles-admin-seed: roles (member, leader, admin), one time first admin seed command, promote and demote endpoints, audit log table and writer.
8. [ ] feat/web-shell: port design tokens and base CSS, app layout (sidebar on desktop, tab bar on mobile), routing, theme toggle, auth screens wired to csag (signin, signup, onboarding), protected routes.
9. [ ] feat/storage: storage interface, local disk driver, presigned or token based upload endpoint, image variants worker, file validation.
10. [ ] feat/devotionals-api: categories, series, episodes, drafts, publish, list and detail endpoints, admin write endpoints.
11. [ ] feat/devotionals-web: hub, series, category, reading pages, admin list and editor, wired to the API.
12. [ ] feat/devotionals-engagement: likes, comments with replies and edit and delete, reposts, share link with preview meta tags.
13. [ ] feat/audio-api and feat/audio-web: series, categories, tracks, player, saved position, admin upload.
14. [ ] feat/events: list, detail, RSVP, admin management.
15. [ ] feat/deploy-v1: systemd units, Caddy config, backups, deploy script, smoke test, tag v1.

## Blocked

(none)

## Open questions for the owner

See docs/DECISIONS.md, section "Open".
