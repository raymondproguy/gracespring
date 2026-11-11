# NEXT

The ordered work queue. Work from the top. Check items off as they are finished and move them to PROGRESS.md. Add new items at the right place, do not just append.

## In progress

- feat/shared-database: confirmed local csag and the API use the same PostgreSQL database. Existing csag tables stay in public; API tables use app. Production remains auth/app.
- feat/design-ios-refresh (review, not yet merged): iOS type and liquid glass look, home feed, share image, chat with voice notes and files, bot, notification banner and app lock screens, in design/. When feat/web-shell ports screens, take styles from design/css/glass.css and design/css/features.css.
- feat/scope-v1 (review, not yet merged, builds on feat/design-ios-refresh): moves calls, groups, ministries and community to design/later, four tab nav, and rewrites the docs for the new scope.
- feat/web-shell: port the reference screens from design/ into React and match their layouts, spacing, imagery and responsive behavior. Home is the first port; auth, onboarding and content routes still need their reference layouts.

## Up next (release v1)

One branch per feature (decision 22 in docs/DECISIONS.md). Branch names are suggestions.

1. [x] docs/repo-setup: move the static site into design/ with git mv, add .gitignore, .editorconfig, .env.example, README.md. Commit each separately.
2. [x] feat/auth-spike: run the csag token spike described in docs/AUTH.md. Record findings in docs/AUTH_FINDINGS.md (signing algorithm, claims, key distribution, verify endpoint, refresh behaviour, cookie support, CORS, error shapes, rate limits, console URL, how users are stored). Do not build on assumptions before this is done.
3. [x] feat/monorepo-skeleton: pnpm workspace, Go module in apps/api, Vite app in apps/web, packages/shared, openapi/openapi.yaml with /health only, Makefile or task runner, CI workflow for lint and tests.
4. [x] feat/api-foundation: config loading from environment, structured logging, chi router, health and readiness endpoints, error format, request IDs, graceful shutdown, Postgres connection, goose migrations, sqlc setup.
5. [x] feat/api-auth-middleware: verify csag tokens locally (per spike result), load profile and role into request context, rate limit middleware (Redis).
6. [x] feat/profiles: finish onboarding; email/password signup and sign-in connect new accounts to the profile form and Home. Profile email comes from csag's users table with column-level read-only access (Decision 17).
7. [x] feat/roles-admin-seed: roles (member, leader, admin), one-time first-admin seed command, admin-only role changes and audit log.
8. [ ] feat/web-shell: responsive shell, protected route navigation, profile editing, Settings, saved theme, rotating sessions and sign out everywhere are in place. Content pages remain placeholders until their APIs are built.
9. [ ] feat/storage: storage interface, local disk driver, presigned or token based upload endpoint, image variants worker, file validation.
10. [ ] feat/devotionals-api: categories, series, episodes, drafts, publish, list and detail endpoints, admin write endpoints.
11. [ ] feat/devotionals-web: hub, series, category, reading pages, admin list and editor, wired to the API.
12. [ ] feat/devotionals-engagement: likes, comments with replies and edit and delete, reposts, share link with preview meta tags.
13. [ ] feat/audio-api and feat/audio-web: series, categories, tracks, player, saved position, admin upload.
14. [ ] feat/events: list, detail, RSVP, admin management.
15. [ ] feat/deploy-v1: systemd units, Caddy config, backups, deploy script, smoke test, tag v1.

## Queued (release v2, after v1 is deployed)

Scope is in docs/BUILD_PLAN.md and docs/FEATURES.md. Parked work (calls, groups, ministries, community) is not queued.

1. [ ] feat/feed: feed posts API and web (text, quote, image plus text), post page, likes, comments, repost, admin composer.
2. [ ] feat/share-image: branded share image (canvas), link previews with Open Graph tags.
3. [ ] feat/prayer: prayer wall, I prayed marks, testimonies, growth pages.
4. [ ] feat/chat: 1 to 1 conversations, WebSocket gateway, voice notes, photos and files, announcements channel, block and report, contacts only with invite link.
5. [ ] feat/bot: GraceSpring Bot with rule based answers.
6. [ ] feat/notifications: web push, permission screen, settings, quiet hours, in app banner.
7. [ ] feat/app-lock: PIN and WebAuthn unlock, settings, lock screen.
8. [ ] feat/search-moderation: search across content, report queue and moderation tools.
9. [ ] feat/website: static church website with install button.

## Blocked

(none)

## Open questions for the owner

See docs/DECISIONS.md, section "Open".
