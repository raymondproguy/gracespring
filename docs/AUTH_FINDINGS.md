# csag auth findings

Results of the token spike (docs/AUTH.md, Task 1), done 2026-10-29 against the local csag instance on port 8080, plus reading of the csag source at the version pinned below. Every claim marked tested was exercised with real requests. Secrets and tokens are redacted.

## Version pinned

- Binary: /home/recoding/go/bin/csag, built from a working tree ("csag version" prints dev)
- SHA-256: c99500b6b9d2ab6e85aef5d2e2452f49959f23c52afcadc1216427cf7ddf8aee
- Module: github.com/crydensync/api, go 1.25.0, using cryden v2.5.0
- Its own OpenAPI spec (served at GET /v1/docs/openapi.yaml) says version 1.8
- Schema: 14 migrations, latest 014_reviewed_anomalies.up.sql

Note: the installed binary is a dev build. Before production, pin a release tag build and re-record the checksum here.

## 1. Token signing

Tested. Access tokens are HS256 JWTs signed with the shared JWT_SECRET. No JWKS or public key endpoint exists (probed /.well-known/jwks.json, /v1/jwks, /v1/public-key: all 404). The only cryptographic material is the shared secret in the env of both csag and the GraceSpring API.

## 2. Token claims

Tested. Exactly three claims, nothing else:

```json
{ "exp": 1793237420, "iat": 1793236520, "sub": "<user uuid>" }
```

No email, no session id, no role claim for ordinary users. Two exceptions, both from source:

- An operator (csag console admin) gets "role": "admin" baked in at issue time.
- Per-user metadata keys (the operators table writes them) become extra claims on the next login or refresh.

Consequence: the GraceSpring API cannot read the email or role from the token. It must load the profile from its own database keyed by the sub claim. That matches the planned design (roles live in profiles), but note a user's email is not in the token at all: the API needs to get it from the profile row, and profiles must store it at creation time.

## 3. Token lifetimes, rotation, reuse detection

Tested.

- Access token: 15 minutes (ACCESS_TOKEN_TTL_MINUTES=15 in the running instance). No refresh TTL knob exists.
- Refresh token: an opaque random string (not a JWT). It is backed by a row in the sessions table (SHA-256 hash stored, raw token only returned once). Sessions have no expiry column: a refresh chain lives until it is revoked. Lifetime is therefore unbounded unless the API or an operator revokes. Recommend: the web client treats 30 days of no use as expired by process, and we revisit if csag adds a session TTL.
- Rotation: each refresh revokes the old session row and issues a new one in the same family (sessions.family_id). Reuse of an old refresh token is detected and revokes the entire family (tested: replaying the pre-rotation token returned 401 token_reused and later logins from the chain failed). Audit events token_rotated and token_reuse_detected are written.

## 4. Local verification: decision

Tested both ways.

- GET /v1/verify with a valid token: 200 {"data":{"user_id":"..."}}. With an expired or wrong-signature token: 401 invalid_access_token.
- Critical finding, tested: /v1/verify checks signature and expiry only. It does NOT consult the session store. After DELETE /v1/sessions/{id} and after POST /v1/logout-all, the still-unexpired access token kept verifying 200 on /v1/verify and on authenticated endpoints (a revoked session's GET /v1/sessions still answered, though with an empty list).

Decision (recorded in docs/DECISIONS.md as 14): the GraceSpring API verifies tokens locally with HS256 and the shared JWT_SECRET, same as /v1/verify would, keeping the secret in a root-readable env file. Calling /v1/verify per request would buy nothing (it does not check sessions either) and costs a round trip. Risk accepted: anything holding the secret can mint tokens for any sub. Mitigation: the secret lives only in /etc/gracespring files readable by the api and csag service users, and the API never trusts anything but sub from a token, loading role from its own profiles table.

Corollary for the UI: "is my session revoked" cannot be detected server-side until refresh fails. The web app should call GET /v1/sessions on the settings screen and treat a 401 anywhere as "sign in again". Refresh failure (401 token_reused or invalid token) is the real session-death signal.

## 5. Cookies

Tested. No Set-Cookie on login, refresh or logout. Tokens move in the JSON body only. The one cookie in csag is internal: the OAuth link flow signs the user id into a short-lived cookie between /oauth/{p}/link and /link/callback (source). Refresh tokens as httpOnly cookies are not supported by csag as-is. Decision (docs/DECISIONS.md 15): web keeps the refresh token in memory plus a localStorage copy at first (test-user scale), and we accept the XSS trade-off explicitly because the app has no third-party scripts; revisit before real users if csag adds cookie support. Documented in SECURITY.md terms later.

## 6. Response and error shapes, rate limits

Tested. Two envelopes everywhere:

```json
{ "data": { ... } }
{ "error": { "code": "...", "message": "..." } }
```

Codes seen live: invalid_access_token (401), missing_auth_header (401), invalid_credentials (401, same for unknown email and wrong password: no user enumeration), user_exists (409), bad_request (400), rate_limited (429), account_locked (403), oauth_state_mismatch (400), oauth_provider_not_configured (404), totp_not_configured / passkeys_not_configured (404), verification_token_invalid (400), token_reused (401), internal_error (500). One special case: password_policy_violation adds a details array of stable rule codes (min_length, require_digit, ...).

Rate limits (source + tested):

- Engine level, per user: RATE_LIMIT_ATTEMPTS default 10 per RATE_LIMIT_WINDOW_SECONDS (60s) on login, signup, magic-link. Fail closed if Redis is configured and unreachable.
- Edge level, per IP: 100 requests/minute default on everything, always in process.
- Account lockout: LOCKOUT_THRESHOLD failed passwords then lock for LOCKOUT_DURATION_MINUTES. Tested: 5 bad logins produced 401 x5, then 403 account_locked. The lock cleared by itself after the window. LOCKOUT_THRESHOLD=0 means never lock, do not set it to 0.
- No rate limit headers are returned.

## 7. OAuth flow

Tested (redirects only; full callback round trip not done from this machine).

- GET /v1/oauth/google 302 to accounts.google.com with client_id, redirect_uri=http://localhost:8080/v1/oauth/google/callback, response_type=code, scope=openid+email, and a random state. GitHub: scope read:user user:email.
- GET /v1/oauth/{provider}/callback: state mismatch answers 400 oauth_state_mismatch (tested). On success the source shows it writes the same JSON token envelope as login. There is no frontend redirect: csag answers JSON, so the web app cannot use the callback directly in a browser tab unless csag is extended or the callback page is hosted by us. Open question for integration: register the callback URL to a small page that POSTs the code+state to csag from JS, or ask csag for a redirect_uri override. Decision pending, see DECISIONS.md open item.
- GET /v1/oauth/{provider}/link (Bearer auth) starts account linking; /link/callback is public and verified by the short-lived signed cookie instead.
- A password account with the same email: 409 oauth_email_conflict; client should log in with password then link.
- Callback URLs to register: {BASE_URL}/v1/oauth/google/callback and {BASE_URL}/v1/oauth/github/callback.

## 8. Management console

From source. There is no HTML console in this binary. The "console" is the /v1/admin/* JSON API (users, metadata, anomalies, webhook deliveries, digest, logging, config tuning, settings) plus GET /v1/docs, a Swagger UI for the API itself. Access requires a token whose role claim is admin; ordinary users get 403 not_operator (tested: 404 page not found for /v1/admin without trailing segment; the guard itself returns 403 errNotOperator per source). First operator: go run ./cmd/grant-operator -db "$DATABASE_URL" -email owner@example.org (-revoke to remove). The claim is baked in at issue time, so grant or revoke takes effect at next login or refresh.

Deployment: block /v1/admin/* on the public auth hostname in Caddy; expose it only on authadmin.<domain> behind IP allowlist or basic auth, per docs/DEPLOYMENT.md.

## 9. User storage and export

Tested. csag owns 18 tables (all created in its schema, see item 12): users, sessions, audit_events, verification_tokens, oauth_identities, operators, totp_secrets, webauthn_credentials, recovery_codes, login_attempts, api_keys, user_metadata, webhook_deliveries, shipped_log_events, digest_runs, settings, reviewed_anomalies, schema_migrations.

users is minimal: id (uuid), email, password_hash, failed_attempts, locked_until, created_at, updated_at. There is no name column and no email_verified column (signup accepts only email and password; the name field I sent at signup was ignored). Display name belongs in the GraceSpring profiles table, as planned. Export: a plain SQL SELECT over users, oauth_identities and sessions is the exit path; no special tooling needed.

## 10. Email sending

From source. csag ships only console senders: consoleEmailSender and consoleMagicLinkSender log "[EMAIL] ..." lines with the raw token to stdout. There is no SMTP anywhere in the binary. EMAIL_TEMPLATE_DIR swaps the message text (text/template, fields To, Token, URL) but delivery is still the log line.

Flows that emit messages: email verification (signup confirm), magic link login, email change. That is all.

Working design for us (recorded as docs/DECISIONS.md 16): the GraceSpring API subscribes to csag events and sends real mail. Two mechanisms exist: WEBHOOK_URL (csag enqueues events to webhook_deliveries and POSTs them, signed with X-Cryden-Signature HMAC-SHA256 of the body under WEBHOOK_SECRET, with retries) or tailing csag's log. Webhooks are the supported path. Set WEBHOOK_URL to an internal API endpoint, subscribe to at least signup_success and email_change_requested (default event set excludes the noisy login ones), send verification and magic link email ourselves via SMTP. The raw token is in the event payload, so the API can build the full link. Until SMTP details are decided (open question 6 in DECISIONS.md), signup confirmation and magic link cannot reach a real inbox; password+OAuth sign in works without email.

## 11. (covered above)

## 12. Shared database, csag in its own schema: PASS

Tested end to end on a throwaway database (dropped afterwards):

- Created database gs_schema_test with schemas auth and app, user csag_test with rights only on auth, connection string ...?sslmode=disable&search_path=auth.
- csag migrate: applied all 14 migrations successfully.
- All 18 csag tables landed in auth, zero in public (verified via pg_tables).
- Started csag on port 8099 against it with SKIP_AUTO_MIGRATE=true: health 200, signup 201, the user row existed in auth.users, nothing in public. SIGTERM gave a clean 30 second drain and shutdown.

Decision (docs/DECISIONS.md 3 confirmed): one database, csag on schema auth with its own user and search_path, GraceSpring on schema app. No search_path is hardcoded in csag (source: unqualified table names everywhere), which is exactly why this works. The fallback (two databases) is not needed.

Caveat: csag's migrate will happily create its tables in whatever search_path the connection has. The GRANT set for csag_test (USAGE, CREATE on auth only) is the least privilege that works; replicate it in deploy scripts.

## 13. Admin model

From source. Two separate admin concepts, keep them separate:

- csag operator: row in csag's operators table, surfaced as role=admin claim in tokens. Grants access to /v1/admin/* (the console API). Created only via the grant-operator command with direct database access. For the owner and operator only, never for church admins.
- Church admin: a role in the GraceSpring profiles table, checked by the GraceSpring API. Unrelated to csag.

## 14. Happy and failure path transcripts

Tested live, condensed (tokens redacted):

- POST /v1/signup {"email","password"} -> 201 {"data":{"user_id","email"}}. Extra fields (name) ignored. Duplicate: 409 user_exists.
- POST /v1/login {"email","password"} -> 200 {"data":{"access_token","refresh_token"}}. Wrong password: 401 invalid_credentials. 6th+ rapid failures: 403 account_locked, then 429 rate_limited. Malformed JSON: 400 bad_request.
- POST /v1/refresh {"refresh_token"} -> 200 new pair. Replayed old token: 401 token_reused (family revoked).
- GET /v1/verify Bearer -> 200 {"data":{"user_id"}}. Garbage/no header: 401. Expired: 401. Revoked session: still 200 (see item 4).
- POST /v1/logout: BUG AND WORKAROUND. The body must be {"session_id": "<uuid from GET /v1/sessions>"}: correct call returns 200 {"data":{"status":"logged out"}}. Any other body ({}, {"refresh_token": ...}, {"all":true}, null) answers 500 internal_error. GET/DELETE on /v1/logout: 405. Access token stays valid until expiry after logout (item 4).
- POST /v1/logout-all (no body needed) -> 200 {"data":{"status":"logged out of all devices"}}. Access token keeps verifying until expiry (item 4).
- GET /v1/sessions -> 200 {"data":[{id, ip, user_agent, created_at, label, device:{browser,os,form}, location}]}. label is the "Chrome on macOS" style string for a devices screen.
- DELETE /v1/sessions/{id} -> 200 {"data":{"status":"session revoked"}}.
- POST /v1/change-password {"current_password","new_password"} -> 200 {"data":{"status":"password changed, please log in again"}}. All sessions are invalidated (tested: old token's refresh then failed with token_reused).
- POST /v1/delete-account: requires password in the body; wrong password 401 invalid_credentials (not executed on the test user to keep it alive).
- POST /v1/magic-link/request {"email"} -> 200 {"data":{}} always (no enumeration). Token goes only to the console log in this build (item 10). POST /v1/magic-link/complete {"token"} -> 400 verification_token_invalid for a bad token.
- GET /v1/health -> 200 {"data":{"status":"ok"}}. GET /v1/docs -> Swagger UI HTML.

## 15. Second factors (TOTP, passkeys)

Not live-testable on this instance: ENCRYPTION_KEY is empty, so both answer 404 totp_not_configured / passkeys_not_configured. From source, the paused-login shape once configured:

```json
{ "data": { "second_factor_required": true, "pending_token": "...", "methods": ["totp", "webauthn"] } }
```

pending_token is then POSTed to /v1/login/totp, /v1/login/passkey/begin+/finish, or /v1/login/recovery-code. It is not an access token. Once a second factor is confirmed, password alone is never enough again. Admins must have one: set ENCRYPTION_KEY from the start (docs/AUTH.md integration notes).

## Bugs and gaps found

1. POST /v1/logout 500s on every body except {"session_id": "..."} (and 500s even on correct-looking ones if the session id is not provided). The error is swallowed as internal_error. Workaround in our client: always fetch the session id from GET /v1/sessions or store it, or just use logout-all. Worth reporting upstream.
2. /v1/verify and all authenticated endpoints accept revoked-session tokens until expiry. Our API design must not assume verify reflects revocation.
3. OAuth callback answers JSON, which a browser-tab redirect flow cannot consume. Needs the integration decision in item 7.
4. No email delivery in the binary at all; console senders only. See item 10.
5. The installed binary is a dev build ("csag version" prints dev), not a release tag. Pin a release before production and record the checksum here.

## Config the running instance uses

PORT=8080, BASE_URL=http://localhost:8080, CORS_ORIGINS=http://localhost:5173 (plus a stale https://yourapp.com entry to remove later), ACCESS_TOKEN_TTL_MINUTES=15, GOOGLE_* and GITHUB_* set, ENCRYPTION_KEY empty, LOCKOUT_* empty (defaults: 5 attempts, 15 minutes), SKIP_AUTO_MIGRATE=false (fine in dev, must be true in production), WEBHOOK_URL empty, REDIS_URL empty (in-process limiter). Change to PORT=8081 for the real deployment so the GraceSpring API gets 8080.
