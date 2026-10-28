# Build plan

Releases are shippable. Each one is built in small steps on feature branches, merged to main after review, deployed and tagged. Start v2 only after v1 is deployed and the test users have used it.

Mobile (React Native with Expo) is paused. When it resumes it reuses the API, the generated client and shared packages.

## v1: Foundations and content

Scope
- Repo, monorepo, CI, API foundation, migrations, config, logging, health checks
- csag integration (docs/AUTH.md), GitHub and Google sign in, profiles, roles, first admin seed, audit log
- Web shell, theme, navigation, onboarding, sign in and sign up, settings with sessions list and sign out everywhere
- Uploads and storage interface, image variants
- Devotionals: categories, series, episodes, drafts, publish, reading pages, admin posting and editing, likes, comments (add, edit, delete, like, reply), repost, share
- Audio: categories, series, tracks, persistent player, saved position, admin upload
- Events: list, details, RSVP, admin management
- Deploy on the single server, backups, tag v1

Acceptance
- A new person can sign up with email, GitHub or Google, finish onboarding and land on Home.
- An admin can publish a devotional with a cover and see it in members' feeds immediately.
- A member can read, like, comment, edit and delete their own comment, reply, repost and share.
- Audio plays, continues across pages and resumes where it stopped on another device.
- Non admins cannot reach admin pages or admin endpoints (tested).
- All screens have loading, empty and error states.
- Backups run nightly and a restore has been tested.

## v2: Community and prayer

Scope
- Community feed: posts with photos, comments, likes, reposts, follow, report
- Prayer wall: requests with visibility and anonymous option, "I prayed" marks, answered prayer testimonies
- Notifications: in app list, web push, email digest, preferences and quiet hours
- Search across devotionals, audio, events, people and posts
- Moderation tools: report queue, hide, remove, warn, ban, audit entries
- Growth and ministries pages

Acceptance
- Posting, commenting and prayer marks feel instant (optimistic) and survive refresh.
- A reported post appears in the admin queue and can be hidden in two clicks.
- A user can mute categories of notification and set quiet hours.

## v3: Chat and verse cards

Scope
- Conversations: 1 to 1, groups, read only announcements channel (admins post)
- WebSocket gateway, delivery, read marks, typing, reconnect and catch up
- Group management: create, add and remove members, group admins, leave, mute
- Block, report, mute
- Verse cards: maker with templates, verse suggestions, note, send to one, many or groups, received and sent lists, save
- Push for new messages and cards when offline
- Safety rules for minors (docs/SECURITY.md) enforced in the API

Acceptance
- A message reaches an online recipient in under a second and an offline one as a push.
- Messages are never duplicated or lost across reconnects (tested).
- Blocked users cannot contact each other.
- Only admins can post in the announcements channel.

## v4: Calls, rooms and live

Scope
- LiveKit setup, join tokens from the API
- Voice and video calls between two users, incoming call screen, call history
- Group prayer rooms: host, speakers, listeners, raise hand, scheduled rooms with reminders
- Live service streaming through a hosted provider (Cloudflare Stream or Mux), with replay links

Acceptance
- A call connects in under 5 seconds on typical mobile data and recovers from a short network drop.
- Only invited speakers can be heard in a prayer room.
- Call permissions respect blocks.

## After v4

- Mobile app (React Native with Expo): push, background audio, calls, offline downloads
- Giving (hosted checkout, receipts), if decided
- Multi language support if needed
- Scale work from docs/ARCHITECTURE.md when numbers require it

## Rules for every release

- Load test the busiest endpoints and the WebSocket gateway for a Sunday peak before tagging.
- Security checklist in docs/SECURITY.md passes.
- Update README.md, PROGRESS.md and release notes in the annotated tag.
