# CLAUDE.md

Rules for Claude Code in this repository. Read this file, then HANDOFF.md, NEXT.md and PROGRESS.md, at the start of every session before doing anything else.

## Project in one line

GraceSpring Family Church app: a React web app and a Go API, with auth handled by a separate csag instance. Mobile (React Native) is paused. The static HTML pages in design/ are the visual reference to bring to life.

## Hard rules

1. Git identity: commit only with the git identity already configured on this machine (the owner's). Never change git config. Never add Co-Authored-By, Signed-off-by for yourself, "Generated with", or any other attribution line to commits, branches, tags, PR text or code.
2. Secrets: never commit credentials of any kind. That covers .env files, JWT secrets, database URLs, OAuth client secrets, API keys, tokens, private keys and passwords. Only .env.example with empty or fake placeholder values may be committed. Run the secret check in docs/GIT_WORKFLOW.md before every commit. If a secret is ever staged or committed, stop and tell the owner. Do not try to hide it.
3. Commit often: one commit per reasonable step (one endpoint, one screen, one migration, one fix, one doc update). Never one big commit per feature or per release.
4. One branch per feature, named feat/<short-name>. Fixes use fix/<short-name>, docs use docs/<short-name>. Never commit directly to main.
5. Writing style, everywhere (code comments, commit messages, docs, UI text, error messages): no em dashes and no emojis. Use commas, colons, periods or hyphens instead.
6. Keep PROGRESS.md and NEXT.md current. After every commit-worthy step, update them in the same branch. Update the other docs whenever behaviour, endpoints, schema or deployment steps change.
7. Do not invent decisions. If something is listed as "to decide" in docs/DECISIONS.md, use the stated default, record it, and flag it in NEXT.md.
8. Do not touch design/. It is the read-only visual reference.

## Working loop

1. Read the four files above.
2. Pick the first unchecked item in NEXT.md.
3. Create or continue its feature branch.
4. Make a small change, run tests and linters, run the secret check, commit.
5. Update PROGRESS.md and NEXT.md, commit.
6. Repeat. When a feature meets its acceptance criteria in docs/BUILD_PLAN.md, tell the owner and wait for review before merging to main.

## Quality gates before any commit

- Go: gofmt, go vet and go test pass.
- Web: type check, lint and unit tests pass.
- No secrets staged. No generated or build output staged.
- Docs touched by the change are updated.

## When blocked

Write the blocker in NEXT.md under "Blocked", describe what was tried, and move to the next unblocked item.
