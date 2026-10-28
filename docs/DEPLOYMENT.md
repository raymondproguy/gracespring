# Deployment

Single server for now. csag ships with the product on the same machine. About 20 test users are on the system, so real data exists: every deploy is careful, and every deploy is preceded by a backup.

## Server layout

- OS: current Ubuntu LTS (or similar), firewall allowing only 22, 80 and 443. SSH keys only, password login off, fail2ban or equivalent.
- Services (systemd): caddy, postgresql, redis, csag, gracespring-api, gracespring-worker (and gracespring-gateway from v3, livekit from v4).
- Dedicated unprivileged user for the app and for csag. Files owned by that user, secrets readable only by it.
- Directories: /opt/gracespring/releases/<tag>/ (binaries and web build), /opt/gracespring/current (symlink), /etc/gracespring/ (env files, mode 600), /var/lib/gracespring/media (uploads), /var/backups/gracespring/.

## Hostnames and Caddy

- app.<domain>: static web build with SPA fallback, gzip and brotli, long cache for hashed assets, no cache for index.html and the service worker.
- api.<domain>: reverse proxy to the API.
- auth.<domain>: reverse proxy to csag.
- authadmin.<domain>: reverse proxy to the csag admin endpoints (/v1/admin/*), restricted by IP allowlist or basic auth in addition to csag admin login. The same path is blocked on auth.<domain>.
- media.<domain>: uploaded files, long cache, safe headers (nosniff, content disposition for downloads).
- Prefer one parent domain for all of them so cookies and CORS stay simple.
- Security headers: HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

## csag

- Install the binary, generate the template with csag env, store the result in /etc/gracespring/csag.env with mode 600. Never commit it.
- Set DATABASE_URL to the shared database using the csag database user with search_path auth, a long random JWT_SECRET, ENCRYPTION_KEY, and CORS_ORIGINS to the app origin only. Set PORT=8081, BASE_URL to the public auth address, SKIP_AUTO_MIGRATE=true and the WEBAUTHN_* values. A full commented list is in deploy/csag.env.example.
- Configure GitHub and Google OAuth credentials and callback URLs in that file and in the provider consoles.
- Run as a systemd service with restart on failure. Bind to localhost and expose only through Caddy.
- Record version and checksum of the binary in docs/AUTH_FINDINGS.md.

## Environment files (names only, values never in git)

- /etc/gracespring/api.env: DATABASE_URL, REDIS_URL, AUTH_VERIFY settings (per spike), STORAGE_DRIVER, MEDIA_PATH, MEDIA_BASE_URL, ALLOWED_ORIGINS, SENTRY_DSN, SMTP settings, VAPID keys for web push.
- /etc/gracespring/csag.env as above (template in deploy/csag.env.example). The API and csag may point at the same DATABASE_URL host but use different users and schemas, and different Redis database numbers.
- The repo contains only .env.example files with placeholders.

## Database

- One database with two schemas: auth for csag and app for GraceSpring. Each has its own database user with rights only on its own schema. The csag connection string sets search_path to auth, the app sets it to app. If the schema test in docs/AUTH.md fails, use two databases on the same server instead.
- Migrations run with the goose command at deploy time, before switching the release symlink. They must be backward compatible so the previous release still works if rollback is needed.
- Postgres tuned for the machine size, connection pool in the API sized to match.

## Backups

- Nightly pg_dump of the database, all schemas (compressed, encrypted) plus a copy of the media directory, kept 14 daily and 8 weekly. Copy off the server (object storage or another machine).
- Monitor backup age. Test a full restore onto a scratch machine before tagging v1 and then monthly.

## Release procedure

1. All checks green on main. PROGRESS.md and docs updated.
2. Take a fresh backup.
3. Build on the server or in CI: API, worker, gateway binaries and the web bundle. Place them in releases/<tag>/.
4. Run csag migrate if csag changed, then the app migrations.
5. Switch the current symlink and restart services one at a time. Check health and readiness.
6. Smoke test: sign in, read a devotional, play audio, post a comment, admin publish.
7. Tag the release (annotated, for example v1) on main and note it in PROGRESS.md.

## Rollback

- Switch the symlink back to the previous release and restart. Because migrations are backward compatible this is safe. If a migration was destructive (it must not be), restore from the pre deploy backup.
- Record every rollback in PROGRESS.md with the cause.

## Monitoring

Uptime check on app, api and auth health endpoints. Alerts for disk above 80 percent, high memory, failing backups, certificate expiry within 14 days, error spikes. Logs rotated.

## When to leave a single server

Move first to managed Postgres, then media to R2 with a CDN, then more API instances behind a load balancer. Do each as its own branch and release.
