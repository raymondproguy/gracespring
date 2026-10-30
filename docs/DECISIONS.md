# Decisions

Decision log. Add a new entry whenever a choice is made. Do not silently change a decided item.

## Decided

| # | Decision | Why |
|---|---|---|
| 1 | Backend in Go with net/http and chi | Cheap concurrency for live connections, stable long term |
| 2 | Modular monolith, not microservices | About 20 test users now, aiming at 10k. Simpler to build and run |
| 3 | One PostgreSQL database shared by csag and the app, in two schemas (auth and app) with a separate database user for each | One backup and restore, tables stay separate. Depends on the schema test in docs/AUTH.md, fallback is two databases on the same server |
| 4 | Redis for cache, rate limits, pub/sub, jobs | Standard and small |
| 5 | Auth handled by csag, separate process, same server | Owner's choice, ships with the product |
| 6 | Social login: GitHub and Google for now | Owner's choice |
| 7 | Admin is a role in the app database, same login as members | One account system |
| 8 | Web first (React, Vite, TypeScript, PWA). Mobile (React Native) paused | Faster to a usable product |
| 9 | Monorepo | Shared types and one contract |
| 10 | OpenAPI contract first, generated TypeScript client | Keeps web and later mobile in sync |
| 11 | Releases tagged v1, v2, v3 | Owner's choice |
| 12 | Calls, chat and groups come after the content release | Heaviest part, built last |
| 13 | Only admins post devotionals and announcements | Product rule |
| 14 | API verifies access tokens locally, HS256 with the shared JWT_SECRET | Measured in docs/AUTH_FINDINGS.md: /v1/verify checks signature and expiry only, it does not consult sessions, so calling it per request buys nothing and costs a round trip. Secret kept in root readable env files only. API trusts only sub from the token, role comes from profiles |
| 15 | Web stores the refresh token in memory plus localStorage for now | csag has no cookie support (tested: no Set-Cookie anywhere). No third party scripts in the app, XSS trade-off accepted at test user scale. Revisit if csag adds cookie support |
| 16 | GraceSpring API sends real email, triggered by csag webhooks | csag ships console senders only (logs to stdout). WEBHOOK_URL with X-Cryden-Signature HMAC verification is the supported path; API subscribes to signup_success and email_change_requested and sends via SMTP |

## Defaults in use until decided

| Topic | Default | Notes |
|---|---|---|
| Audio and image storage | Storage interface with a local disk driver for v1, Cloudflare R2 driver planned | Move to R2 before audio traffic grows |
| Giving (online donations) | Out of scope for v1 to v4 | Paystack or Flutterwave hosted checkout if added |
| Hosting region | The single server the owner provides | Revisit when user numbers grow |
| Live streaming | Out of v4 core, add Cloudflare Stream or Mux if wanted | Do not build video delivery by hand |
| Chat encryption | TLS in transit, encrypted at rest, not end to end | State this in the privacy text |

## Open

1. Where are most users located and what is the monthly budget?
2. Where does existing sermon audio live now, and how many hours is it?
3. Is giving needed at launch?
4. Which social logins beyond GitHub and Google, if any (Apple is required on iOS if mobile ships with Google login)?
5. Domain names: app, api, auth, auth console.
6. Email sending provider for csag and app mail (SMTP details).
7. Policy for minors in Youth Ministry chats (see docs/SECURITY.md).
8. Does csag run correctly inside its own schema (search_path)? If not, use two databases on the same server. ANSWERED by the spike: yes, tested end to end (docs/AUTH_FINDINGS.md item 12). Decision 3 stands.
9. How do csag verification and magic link emails get delivered? The csag env has no SMTP settings (see docs/AUTH.md, spike item 11). ANSWERED by the spike: the GraceSpring API receives csag webhooks and sends the email itself via SMTP (decision 16). Still open: which SMTP provider (item 6).
10. OAuth callback answers JSON, not a browser redirect: how does the web app complete the flow? Options: host a small callback page that forwards code and state to csag from JS, or ask csag for a redirect_uri override (docs/AUTH_FINDINGS.md item 7).
11. csag refresh tokens never expire (sessions have no TTL column). Acceptable at test user scale, revisit before real users (docs/AUTH_FINDINGS.md item 3).
