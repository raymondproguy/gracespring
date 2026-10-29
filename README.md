# GraceSpring Family Church app

A church app for members, leaders and admins: audio sermons, devotionals, events, prayer wall, community feed, chats, verse cards, calls and live prayer rooms. React web app and Go API, with auth handled by a separate csag instance.

## Repository layout

```
/
  design/              static HTML/CSS/JS reference UI (read only, do not edit)
  apps/
    api/               Go API, realtime gateway, workers (not yet created)
    web/               React web app (not yet created)
  packages/
    api-client/        generated TypeScript client (not yet created)
    shared/            shared types, validation, design tokens (not yet created)
  openapi/             the API contract (not yet created)
  deploy/              caddy/, systemd/, scripts/, backup/ (not yet created)
  docs/                architecture, build plan, workflows, decisions
```

## Docs

Start with `CLAUDE.md`, then `HANDOFF.md`, `NEXT.md` and `PROGRESS.md`. The full docs map is in `HANDOFF.md`, section 6.

Key files: `docs/BUILD_PLAN.md` (releases and acceptance criteria), `docs/FRONTEND.md` (porting the design pages), `docs/AUTH.md` (csag integration), `docs/GIT_WORKFLOW.md` (branches, commits, secret checks).

## Branches and commits

Never commit to main directly. One branch per feature: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`, `chore/<short-name>`. Commit often, one step per commit. Full rules in `docs/GIT_WORKFLOW.md`.

## Secret check before committing

The rules live in `docs/GIT_WORKFLOW.md`, section "Secret check before every commit". Never stage `.env` or any real credentials. Only `.env.example` files with placeholder values may be committed. A pre-commit hook script automating the check is planned under `deploy/scripts/`.

## Local development

Not set up yet. The monorepo skeleton (pnpm workspace, Go module, Vite app) is the next milestone after the auth spike. See `NEXT.md` for the ordered work queue.
