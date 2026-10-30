# PROGRESS

Running record of what has been built. Newest entries first in the log. Keep the status table current.

## Status by release

| Release | Status | Branch or tag | Notes |
|---|---|---|---|
| v1 Foundations and content | In progress | docs/repo-setup | Repo setup done |
| v2 Community and prayer | Not started | | |
| v3 Chat and verse cards | Not started | | |
| v4 Calls and live | Not started | | |
| Mobile | Paused | | |

## Feature checklist

Mark with the date and the commit or tag when done.

### v1
- [x] Repo setup and design/ moved
- [x] csag token spike
- [ ] Monorepo skeleton and CI
- [ ] API foundation
- [ ] Auth middleware
- [ ] Profiles
- [ ] Roles, admin seed, audit log
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

- 2026-10-29, feat/auth-spike: ran the csag token spike. All 13 questions in docs/AUTH.md answered in docs/AUTH_FINDINGS.md. Key results: HS256 with shared secret, no JWKS; claims are only sub/iat/exp (email and role NOT in tokens, profiles must store email); /v1/verify does not check session revocation, so local verification was chosen (DECISIONS.md 14); refresh rotation with family revocation on reuse works; logout needs session_id in the body (500 otherwise, bug noted); no cookies, no email sending in the binary (webhooks to our API chosen, DECISIONS.md 16); shared database with search_path=auth tested end to end and passed (DECISIONS.md 3 confirmed). Test user remains in the local csag database for further development. Throwaway schema-test database dropped.
- 2026-10-29, docs/repo-setup: moved the static UI site (96 HTML pages, css/, js/, assets/, its README) into design/ with git mv as pure renames. Added .editorconfig, root .env.example with placeholder values for the API, and a new root README covering layout, docs map, branch rules and the secret check. .gitignore already existed and covers everything docs/GIT_WORKFLOW.md requires. Note: a local .env with real csag and OAuth values exists at the repo root, is untracked and correctly ignored.

## Known issues

- POST /v1/logout returns 500 for any body without a valid session_id. Workaround: use session ids from GET /v1/sessions or logout-all. Reported in docs/AUTH_FINDINGS.md.
- The installed csag binary is a dev build. Pin a release tag and record its checksum in docs/AUTH_FINDINGS.md before production.
- csag access tokens stay valid after logout or session revoke until their 15 minute expiry. This is by design of csag's verify, our API just must not assume otherwise.

## Deviations from the plan

(none yet)
