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
| 12 | Calls, chat and groups come after the content release | Heaviest part, built last. Calls and groups are parked, see 18. 1 to 1 chat is v2 |
| 13 | Only admins post devotionals and announcements | Product rule |
| 14 | API verifies access tokens locally, HS256 with the shared JWT_SECRET | Measured in docs/AUTH_FINDINGS.md: /v1/verify checks signature and expiry only, it does not consult sessions, so calling it per request buys nothing and costs a round trip. Secret kept in root readable env files only. API trusts only sub from the token, role comes from profiles |
| 15 | Web stores the refresh token in memory plus localStorage for now | csag has no cookie support (tested: no Set-Cookie anywhere). No third party scripts in the app, XSS trade-off accepted at test user scale. Revisit if csag adds cookie support |
| 16 | Treat csag WEBHOOK_URL as audit-event delivery only; it is not an email channel | Source inspection of the installed build shows `signup_success` and `email_change_requested` contain no email address or one-time token. Real mail needs a supported integration |
| 17 | Read profile email from csag's users table with column-level read-only access | csag owns email, tokens omit it, and audit webhooks do not include it. The API reads only user ID and email from the configured auth schema |
| 18 | First releases are feed, devotionals, audio, 1 to 1 chat and push notifications. Calls, groups, ministries and community are parked in design/later | Smaller scope ships sooner, costs less to run, and gets real feedback. Calls are the hardest and most expensive part. Parked screens are kept for reference |
| 19 | Audio and images live in Cloudflare R2 behind the storage interface, stored as URLs. Telegram is not used as storage | Telegram bots cannot download files over 20 MB, public channels are open to everyone, and its embed is not a hosting service. R2 has no download fees and a free allowance of about 10 GB |
| 20 | Domain is a .com.ng name with DNS on Cloudflare, hosts root, www, app, api, auth, authadmin | Owner's choice. Exact name still open |
| 21 | Install is a PWA from the website for now, with an APK link later. No store listing in the first releases | Owner cannot publish to the Play Store yet. iPhone uses Add to Home Screen |
| 22 | One branch per feature. Fixes, docs and chores for that feature go on the same branch. A standalone docs or chore branch is only for work that belongs to no feature | Fewer branches to review and merge. Commits stay small inside the branch |
| 23 | Chat is only between people who both have an account. Others are invited by link | Same model as WhatsApp for a closed church community, no unsolicited messages |
| 24 | App lock is a device side convenience: PIN stored hashed on the device, biometrics through WebAuthn platform authenticators | csag stays the source of identity. The design only simulates biometrics |

## Defaults in use until decided

| Topic | Default | Notes |
|---|---|---|
| Audio and image storage | Superseded by decision 19: R2 in production, local disk driver for development | |
| Giving (online donations) | Out of scope for v1 to v4 | Paystack or Flutterwave hosted checkout if added |
| Hosting region | The single server the owner provides | Revisit when user numbers grow |
| Live streaming | Out of v4 core, add Cloudflare Stream or Mux if wanted | Do not build video delivery by hand |
| Chat encryption | TLS in transit, encrypted at rest, not end to end | State this in the privacy text |

## Open

1. Where are most users located and what is the monthly budget?
2. Where does existing sermon audio live now, and how many hours is it?
3. Is giving needed at launch?
4. Which social logins beyond GitHub and Google, if any (Apple is required on iOS if mobile ships with Google login)?
5. Domain names: the root is a .com.ng name (decision 20). Exact name and the subdomains for app, api, auth and auth console are still to confirm.
6. Email sending provider for csag and app mail (SMTP details).
7. Policy for minors in chats (see docs/SECURITY.md). Youth group chats are parked with groups, so this matters when 1 to 1 chat opens or groups return.
8. Does csag run correctly inside its own schema (search_path)? If not, use two databases on the same server. ANSWERED by the spike: yes, tested end to end (docs/AUTH_FINDINGS.md item 12). Decision 3 stands.
9. How will real email be sent? The installed csag build has console senders only, and its audit webhook omits email addresses and one-time tokens. Choose a supported csag mail integration or change csag's sender contract. SMTP provider is still open (item 6). Profile email source is decided in item 17.
10. OAuth callback answers JSON, not a browser redirect: how does the web app complete the flow? Options: host a small callback page that forwards code and state to csag from JS, or ask csag for a redirect_uri override (docs/AUTH_FINDINGS.md item 7).
11. csag refresh tokens never expire (sessions have no TTL column). Acceptable at test user scale, revisit before real users (docs/AUTH_FINDINGS.md item 3).
12. May members create feed posts, or only admins? Design shows a composer on Home. Default until decided: admins only (decision 13).
13. Should the GraceSpring Bot stay rule based, or use an AI model later? Default: rule based.
