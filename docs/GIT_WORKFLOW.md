# Git workflow

## Identity and attribution

- Commit only as the git identity already configured on this machine. Do not run git config to change name or email.
- Do not add Co-Authored-By, Signed-off-by for the assistant, "Generated with", session links or any other attribution to commit messages, tags, PR descriptions or code.
- Use only the git credentials already on this machine to push. Never store tokens in the repo, in remotes URLs, in scripts or in docs.

## Branches

- main is always deployable. Never commit to it directly. Merge only after the owner approves.
- One branch per feature: feat/<short-name>. Fixes: fix/<short-name>. Docs only: docs/<short-name>. Chores: chore/<short-name>.
- Branch from an up to date main. Keep branches short lived. Rebase on main before asking for review.

## Commits

- Commit after each reasonable step, not at the end of a feature. Examples of one step: add a migration, add one endpoint with its test, port one screen, fix one bug, update the docs for one change.
- Aim for commits a reviewer can read in a few minutes. If a diff is large, split it.
- Each commit must build and pass tests on its own.
- Message format: a short imperative subject line (under 72 characters), a blank line, then an optional body explaining why.
  - Prefix with a type: feat, fix, docs, test, refactor, chore, build, ci.
  - Example: feat(api): add GET /v1/devotionals with cursor pagination
- No em dashes and no emojis in messages.

## Tags and versions

- Releases are tagged v1, v2, v3 as the product increases. Fixes after a release use v1.1, v1.2 and so on.
- Tag only on main, only after the deploy checklist in docs/DEPLOYMENT.md passes. Use annotated tags with a short release note.
- Update PROGRESS.md with the tag in the same change.

## Secret check before every commit

Run these and stop if anything shows up:

1. git status, and read the list of files being added.
2. git diff --cached --name-only: no .env, no *.pem, no *.key, no *.db, no *.sqlite, no backups, no uploads, no node_modules, no build output.
3. git diff --cached with a search for these patterns: password, secret, token, apikey, api_key, private key, BEGIN, DATABASE_URL=, JWT_SECRET=, client_secret, long random looking strings.
4. Only .env.example is allowed, and its values must be empty or obviously fake.

Add a pre-commit hook script in deploy/scripts/ that automates this (a tool such as gitleaks is fine). Install instructions go in README.md.

If a secret is committed by mistake: stop, do not push, tell the owner. If it was pushed, the secret must be rotated at its source. Rewriting history is not enough.

## .gitignore must include

.env, .env.*, !.env.example, *.pem, *.key, *.db, *.sqlite, uploads/, data/, backups/, node_modules/, dist/, build/, coverage/, bin/, tmp/, .DS_Store, editor folders.

## Pull request text

Short summary, what changed, how it was tested, which docs were updated, screenshots for UI work. No attribution lines.
