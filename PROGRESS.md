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
- [ ] csag token spike
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

- 2026-10-29, docs/repo-setup: moved the static UI site (96 HTML pages, css/, js/, assets/, its README) into design/ with git mv as pure renames. Added .editorconfig, root .env.example with placeholder values for the API, and a new root README covering layout, docs map, branch rules and the secret check. .gitignore already existed and covers everything docs/GIT_WORKFLOW.md requires. Note: a local .env with real csag and OAuth values exists at the repo root, is untracked and correctly ignored.

## Known issues

(none yet)

## Deviations from the plan

(none yet)
