# Auth: csag integration

## Model

- csag runs as its own process and shares the Postgres database with the app, inside its own schema (auth) and with its own database user. It owns passwords, sessions, passkeys, TOTP, recovery codes, magic links and OAuth identities.
- The GraceSpring API never sees or stores passwords.
- The GraceSpring database has a profiles table keyed by the csag user id. Roles live in the profiles table, not only in the token.
- Members and admins share one login. Admin is a role.
- csag ships its own management console for users, sessions and passkeys. Treat it as an operator tool, not a user feature.

## csag endpoints (all under /v1)

Core: signup, login, refresh, logout (auth), logout-all (auth), verify (auth), sessions list and delete (auth), change-password (auth), delete-account (auth), email change request (auth) and confirm, health.

OAuth: GET oauth/{provider}, oauth/{provider}/callback, oauth/{provider}/link (auth), oauth/{provider}/link/callback.

Second factor and passwordless: totp enroll, confirm, disable (auth); passkeys register begin and finish (auth), list (auth), delete (auth, password in body); recovery-codes generate (auth); magic-link request and complete; paused login completion at login/totp, login/passkey/begin, login/passkey/finish, login/recovery-code.

Start command: csag env > .env, then edit DATABASE_URL (or SQLITE_PATH), JWT_SECRET and CORS_ORIGINS, then run csag. Always use DATABASE_URL (Postgres). SQLITE_PATH runs core auth only and the whole admin console answers 501. Set exactly one of the two, setting both or neither is a startup error.

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

11. Email delivery. The csag env template has no SMTP settings. It mentions console senders that print verification and magic link messages, EMAIL_TEMPLATE_DIR for the message text, and WEBHOOK_URL for events. Find out from the csag README how a real email reaches a user. Likely options: the GraceSpring API receives csag webhooks or a message hook and sends the email itself through SMTP or a mail provider. Record the working design before building signup, magic link or email change.
12. Shared database test. Create an empty database with two schemas and two users, point csag at it with its own user and search_path set to auth (in the connection string), start it with SKIP_AUTO_MIGRATE=false, then check that every csag table (including schema_migrations, settings, webhook_deliveries, digest_runs, shipped_log_events and the audit tables) was created in the auth schema and nothing in public. Repeat with csag migrate. List all csag table names. If csag cannot stay in its schema, fall back to two databases on the same server and record it in DECISIONS.md.
13. Admin model. csag has /v1/admin/* endpoints (settings, config tuning, security reports, webhook deliveries, digest, logging). Find out how a csag user becomes a csag admin and whether that is separate from the app role. Keep them separate on purpose: csag admin is for the owner and operator only.

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

- The csag admin endpoints (/v1/admin/*) must not be reachable on the public auth hostname. Block that path on auth.<domain> in Caddy and expose it only on a separate hostname protected by an IP allowlist or basic auth, plus csag's own admin login.
- Rotate JWT_SECRET only with a plan: it logs everyone out. Document the steps in DEPLOYMENT.md.
- Pin the csag version by recording the binary checksum and version in docs/AUTH_FINDINGS.md. Upgrade deliberately, on a branch, with a smoke test.

## csag settings that matter for this project

From the csag env template:

- Always set DATABASE_URL. Set SKIP_AUTO_MIGRATE=true in production so schema changes are a deliberate release step (csag migrate). Use false only in local development.
- PORT: set csag to 8081 so it does not clash with the GraceSpring API on 8080. Set BASE_URL to the public auth address. CORS_ORIGINS must list only the web app origin.
- ACCESS_TOKEN_TTL_MINUTES defaults to 15. Keep it short.
- JWT_SECRET: this is a shared secret, so verification in the API is likely local HS256 with the same value. That means the API could also mint tokens. Acceptable on one server if the secret file is readable only by the app users. Compare with calling GET /v1/verify in the spike and record the choice.
- ENCRYPTION_KEY is required for TOTP and passkeys. Without it those endpoints answer 404. Admins need a second factor, so set it from the start and back it up securely. If it is lost, enrolled second factors become unusable.
- WEBAUTHN_RP_ID, WEBAUTHN_RP_DISPLAY_NAME and WEBAUTHN_RP_ORIGINS must match the real domain for passkeys to work. RP_ID is the parent domain (for example gracespring.org), RP_ORIGINS lists the web app origin.
- TOTP_ISSUER_NAME: GraceSpring.
- SETTINGS_ENCRYPTION_KEY only matters for the AI settings screens. Leave unset.
- OAuth: set only GOOGLE_* and GITHUB_*. The others stay empty and answer 404, which is fine.
- REDIS_URL: csag can use Redis for its rate limiter. Use the same Redis server with a different database number (for example /1 for csag and /0 for the app). Without it csag uses an in process limiter, fine for one instance.
- LOCKOUT_THRESHOLD and LOCKOUT_DURATION_MINUTES: set 5 and 15. Do not leave them blank, a zero value locks accounts wrongly.
- PASSWORD_HASHER: argon2id.
- API_KEY_PREFIX: gs so a leaked key is easy to find with secret scanners.
- ANOMALY_DETECTION and CLOUD_LOGGING: optional, off at first. CLOUD_LOG_HASH_KEY is needed only if redaction is hash.
- WEBHOOK_URL: off at first. May become the way csag tells the API about new users and emails to send (spike item 11).
- LOG_LEVEL must be debug, info, warn or error, anything else stops startup.
