# Auth: csag integration

## Model

- csag runs as its own process with its own database. It owns passwords, sessions, passkeys, TOTP, recovery codes, magic links and OAuth identities.
- The GraceSpring API never sees or stores passwords.
- The GraceSpring database has a profiles table keyed by the csag user id. Roles live in the profiles table, not only in the token.
- Members and admins share one login. Admin is a role.
- csag ships its own management console for users, sessions and passkeys. Treat it as an operator tool, not a user feature.

## csag endpoints (all under /v1)

Core: signup, login, refresh, logout (auth), logout-all (auth), verify (auth), sessions list and delete (auth), change-password (auth), delete-account (auth), email change request (auth) and confirm, health.

OAuth: GET oauth/{provider}, oauth/{provider}/callback, oauth/{provider}/link (auth), oauth/{provider}/link/callback.

Second factor and passwordless: totp enroll, confirm, disable (auth); passkeys register begin and finish (auth), list (auth), delete (auth, password in body); recovery-codes generate (auth); magic-link request and complete; paused login completion at login/totp, login/passkey/begin, login/passkey/finish, login/recovery-code.

Start command: csag env > .env, then edit DATABASE_URL (or SQLITE_PATH), JWT_SECRET and CORS_ORIGINS, then run csag. Use Postgres for the product, not SQLite.

## Task 1: token spike (do this before building on auth)

Claude Code runs csag locally and records facts in docs/AUTH_FINDINGS.md. Do not assume any answer. Find out:

1. How access tokens are signed (HS256 with the shared JWT_SECRET, or an asymmetric key). Is there a JWKS or public key endpoint?
2. Token claims: user id, email, session id, expiry, any roles or custom claims.
3. Access and refresh token lifetimes, refresh rotation and reuse detection.
4. Whether the API can verify locally. If only a shared secret exists, note the risk: anything holding the secret can mint tokens. Decide between (a) local verification with the shared secret kept only in the API and csag, root-only readable files, or (b) calling GET /v1/verify with a short cache (about 30 to 60 seconds). Record the choice in DECISIONS.md.
5. Whether refresh tokens can be set as httpOnly cookies, and what domain, SameSite and CORS settings are needed. Prefer app, api and auth under one parent domain.
6. Response and error shapes for each endpoint, and rate limits.
7. How OAuth redirects work, the callback URLs to register with GitHub and Google, and how the web app receives the result.
8. How the management console is started, where it listens, and how it is protected.
9. How user records are stored and whether the user table can be exported (needed for an exit path).
10. Whether email sending needs SMTP settings, and which flows send email.

Also run the happy path and failure path for signup, login, refresh, logout, logout-all, verify and a passkey or TOTP login if feasible, and save the request and response examples (with all secrets and tokens redacted) in AUTH_FINDINGS.md.

## Integration design

- Web app calls csag directly for signup, login, refresh, logout and second factor flows. It calls the GraceSpring API with the access token in the Authorization header (or via cookie if the spike supports it).
- API middleware verifies the token (per spike result), then loads or creates the profile for that user id. First request after signup creates the profile with role member.
- Wrap csag behind an internal interface in the API (for example an Authenticator with Verify and RevokeCheck methods) so it can be swapped later.
- Account deletion: the app calls csag delete-account, then the API removes or anonymizes the profile and content according to docs/SECURITY.md. This must be possible from inside the app (store requirement when mobile ships).
- Roles: member, leader, admin. The first admin is created by a one time command run on the server, for example: api admin grant --email owner@example.org. After that only admins can grant roles. Every grant and revoke goes to the audit log.
- Admins must have a second factor (TOTP or passkey) enabled. The API refuses admin actions for an admin session without it, once csag exposes this in claims or an API call. If the spike shows it cannot be checked, enforce it by process and record the gap in PROGRESS.md.
- Session list and revoke screens in the web settings call csag sessions endpoints.

## OAuth setup

- Providers for now: GitHub and Google.
- Register callback URLs for the auth domain in each provider console. Keep client IDs and secrets only in the server .env for csag, never in the repo.
- Note that Apple login is required on iOS if the mobile app later offers Google login.

## Security notes

- csag management console must not be on the public internet without protection. Put it behind Caddy with an IP allowlist or basic auth plus csag's own login, on a separate hostname.
- Rotate JWT_SECRET only with a plan: it logs everyone out. Document the steps in DEPLOYMENT.md.
- Pin the csag version by recording the binary checksum and version in docs/AUTH_FINDINGS.md. Upgrade deliberately, on a branch, with a smoke test.
