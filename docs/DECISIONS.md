# Decisions

Decision log. Add a new entry whenever a choice is made. Do not silently change a decided item.

## Decided

| # | Decision | Why |
|---|---|---|
| 1 | Backend in Go with net/http and chi | Cheap concurrency for live connections, stable long term |
| 2 | Modular monolith, not microservices | About 20 test users now, aiming at 10k. Simpler to build and run |
| 3 | PostgreSQL for app data, separate database for csag | Clear boundary, auth data never mixes with app data |
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
