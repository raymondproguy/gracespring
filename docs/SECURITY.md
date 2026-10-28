# Security, privacy and safety

## Secrets

- No secret ever enters git (see docs/GIT_WORKFLOW.md). That includes csag env, OAuth client secrets, JWT secret, database URLs, VAPID keys, SMTP passwords, LiveKit keys, Sentry DSN if private.
- Secrets live in root owned files on the server with mode 600, or in a secrets manager later.
- Different secrets for local development and production.
- If a secret leaks, rotate it at the source immediately.

## Authentication and sessions

- Handled by csag (docs/AUTH.md). Admins must have a second factor.
- Short lived access tokens, refresh with rotation. Users can see and revoke sessions.
- Rate limit sign in related endpoints at the proxy and in the API.

## Authorization

- Check on the server for every request: who is the user, what role, do they own or belong to the resource.
- Deny by default. Admin endpoints under /v1/admin require the admin role and are covered by tests that prove a member gets 403.
- Audit log every admin and moderation action.

## Input and output

- Validate and length limit all input. Parameterised queries only (sqlc).
- User content is plain text. Escape on render. Links get rel noopener and noreferrer. No raw HTML from users.
- Uploads: type sniffing, size caps, metadata stripped from images, random file names, served from the media host with nosniff.
- CORS limited to the app origin. CSRF protection if cookies are used for auth.

## Privacy

- Collect only what is needed. Publish a plain language privacy policy and terms before inviting more than test users.
- Prayer requests and chats are sensitive. Visibility options on prayer requests (everyone, group, leaders only, anonymous). Anonymous means the author is hidden from members but stored for moderation.
- Chats are encrypted in transit and at rest but not end to end. Say so in the privacy policy, and limit admin access to chat content to moderation of reported items.
- Users can export and delete their data. Account deletion removes or anonymises profile, content and chats according to the policy, and calls csag delete-account.
- Check applicable data protection law for members' countries (for example Nigeria NDPR, and GDPR where relevant).

## Minors and Youth Ministry

- Collect date of birth or an age band at sign up. Under 18 accounts are marked.
- No private one to one chats between an adult and a minor unless a parent or guardian consent is recorded and a leader is added to the conversation. Default is to disallow.
- Youth groups have at least two adult leaders, visible to members. Leaders can see group chats of youth groups they lead.
- No location sharing, no public profiles for minors, no discoverability by strangers.
- Owner to confirm the final policy (docs/DECISIONS.md, open item 7) before v3 ships.

## Moderation

- Report on posts, comments, prayer requests, messages and profiles. Reports go to an admin queue with status.
- Tools: hide, remove, warn, suspend, ban. Block and mute for members.
- Basic word filter and rate limiting against spam. Response time target for reports is set by the church and shown to admins.
- Required for app store approval of apps with user generated content: report, block, remove, contact info.

## Infrastructure

- Firewall on, SSH keys only, automatic security updates, services bound to localhost behind Caddy.
- Dependency scanning in CI (govulncheck, pnpm audit) and pinned versions. Review changes to csag deliberately.
- Backups encrypted and tested.

## Release security checklist

1. No secrets in the repo or in build output (secret scan on the whole history of the release branch).
2. Admin endpoints tested for 401 and 403.
3. Rate limits active.
4. Dependency scan clean or findings recorded.
5. Backups and a restore tested.
6. Privacy policy and terms linked in the app.
