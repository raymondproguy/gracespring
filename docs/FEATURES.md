# Features and infrastructure

What the app does by release, what is parked, how people install it, and the infrastructure it runs on. Scope and acceptance criteria live in docs/BUILD_PLAN.md. Decisions are logged in docs/DECISIONS.md. Where a figure here is a price or a limit from an outside provider, check the provider's page before relying on it.

## 1. Scope by release

| Feature | Release | Reference screens in design/ |
| --- | --- | --- |
| Sign up, sign in, onboarding, profile, settings | v1 | index, onboarding-*, signin, signup, profile, settings |
| Devotionals (series, episodes, categories, comments, repost, admin posting) | v1 | devotional*, admin-devotional* |
| Audio sermons (series, categories, player, saved position, admin upload) | v1 | audio*, audio-player |
| Events and RSVP | v1 | events, event-details |
| Home feed (text, quote and image plus text posts), post page | v2 | home, post-<id>, create-post |
| Branded share image and link previews | v2 | share sheet on home and post pages |
| Prayer wall, growth | v2 | prayer, growth |
| 1 to 1 chat (contacts with accounts), voice notes, photos and files | v2 | messages, chat-<id>, chat-info-<id>, new-chat |
| Announcements channel (admins post) | v2 | chat-announce |
| GraceSpring Bot | v2 | chat-bot |
| Push notifications, notification settings | v2 | permission-notifications, notification-settings |
| App lock (Face ID, fingerprint, PIN) | v2 | lock-setup, pin-setup, lock, lock-settings |
| Search, moderation tools | v2 | search |

## 2. Parked features

Kept in design/later/ as finished screens. Nothing in the main app links to them. Bring one back on its own feature branch when the owner asks.

| Feature | Screens in design/later | What it needs when it returns |
| --- | --- | --- |
| Voice and video calls, voicemail | call-voice, call-video, call-incoming | LiveKit (or WebRTC with a TURN server), a call log, ringing when the app is closed. A call connects in under 5 seconds on typical mobile data and recovers from a short network drop. Call permissions respect blocks. |
| Group prayer rooms | call-room | LiveKit room with hosts, speakers and listeners. Only invited speakers can be heard. |
| Groups | new-group, chat-youth, chat-prayer, chat-cell and their info pages | Group conversations, member roles, add and remove, the minors policy in docs/SECURITY.md. |
| Community and ministries | community, ministries | Member posts, follow, ministry membership, moderation. |
| Verse cards | removed from the design | Not planned. |

## 3. How feature behaviour works

- Home feed: admins publish posts. Each post has like, comment, repost and share, and its own page. Comments behave like devotional comments (add, edit, delete, like, reply).
- Share image: a canvas draws the church frame, navy card, gold accent and the line "Share faith. Share hope." Android and iPhone share the picture through the system share sheet. A link share carries Open Graph tags (title, image) so WhatsApp shows a preview. The canvas needs an https page (it is blocked on file:// pages).
- Chat: only between people who both have a GraceSpring account. Phone contacts who are not on the app can be invited with a link. Voice notes and files go to object storage and the message holds the URL, duration and size. Messages are delivered over WebSocket, with a push when the person is offline.
- GraceSpring Bot: rule based answers (service times, location, prayer, devotional, Bible verses) with buttons that open the right screen. Giving is answered as "coming soon" until it exists. Any AI backed version is an owner decision.
- Notifications: web push to installed web apps, with a permission screen and settings per type and quiet hours. iPhone supports web push only after "Add to Home Screen" on iOS 16.4 or newer.
- App lock: the design simulates Face ID and fingerprint. In the real app, a PIN is stored hashed on the device, and biometrics use the device's platform authenticator through WebAuthn. The lock is a convenience on the device, it does not replace the csag sign in.

## 4. Installing the app

The app is a PWA, so no store listing is needed to start.

- Website: a small static site (about the church, service times, location, listen and read, install button) on the main domain.
- Android: install from the browser prompt, or download an APK link from the website once a wrapper is built.
- iPhone: "Add to Home Screen" is free. TestFlight needs a paid Apple developer account. Store listings come later with the React Native app.

## 5. Infrastructure

### Domain and hostnames

A `.com.ng` domain, with DNS on Cloudflare (change the nameservers at the registrar). Exact name is open (docs/DECISIONS.md).

| Host | Serves |
| --- | --- |
| root and www | the static church website |
| app | the React PWA (static files) |
| api | the Go API and WebSocket gateway |
| auth | csag (sign in) |
| authadmin | csag admin endpoints, restricted (docs/DEPLOYMENT.md) |

### Single server to start (2 vCPU, 4 GB RAM)

- Caddy: HTTPS certificates and routing.
- Go API (chi) and its worker, with the chat gateway in the same process at first.
- csag auth as a second process on the same server.
- PostgreSQL: one database, schemas `auth` and `app`, nightly backups copied to object storage, restore tested.
- Redis: cache, rate limits, pub/sub and the job queue. A remote free tier is fine for the first test users.
- systemd keeps every service running and holds logs.

### Services outside the server

- Cloudflare: DNS, CDN, DDoS protection.
- Cloudflare R2: audio, devotional images, post images, profile photos, chat attachments. Free allowance of about 10 GB, then storage is charged per GB and downloads are free. Backblaze B2 is cheaper per GB to store but charges for downloads beyond a free share, so R2 is the default. The API stores URLs, so the provider can change later.
- Email: a free tier of a transactional provider (Resend, Brevo) for magic links and resets. csag needs a supported mail integration (docs/AUTH_FINDINGS.md).
- Push: web push (VAPID keys), no third party.

### Why not Telegram for audio

Considered and rejected for the main store. Bots can only download files up to 20 MB, sermons are often bigger, a public channel is open to anyone, the player cannot be styled or measured, and Telegram does not offer embedding as a hosting service. A Telegram channel can still mirror new audio for people who like it. The app must not depend on it.

### Cost for about 20 test users

The server (roughly 5 to 12 US dollars a month), the domain (yearly, check the registrar), and free tiers for everything else. Cost grows with storage and with the number of people online at once, not with total sign ups.

### Keeping the app fast

- Page through feeds and chats, never load everything.
- Resize images on upload and store variants.
- Serve audio and images from object storage through the CDN, not through the API.
- Cache public lists in Redis. Use optimistic updates in the UI.
- Cache the app shell with a service worker so it opens instantly and works offline for read-only pages.
- Load test the busiest endpoints and the chat gateway before tagging a release.

### Scaling triggers

- Move PostgreSQL to a managed instance when backups or load need it.
- Add a second API server behind Caddy when CPU stays high, since the gateway fans out through Redis.
- Run any future call server on its own small server so calls never slow the API. Calls cost mainly bandwidth: most 1 to 1 calls go direct, about one in five needs a relay, and a relayed video call uses roughly 0.5 to 1 GB an hour.
