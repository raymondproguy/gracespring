# Backend (Go)

## Conventions

- Go latest stable. Standard library net/http with the chi router. No framework beyond that.
- Layout under apps/api: cmd/ (api, gateway, worker, admin commands), internal/<module>/ (handler, service, store, types, tests), internal/platform/ (config, logging, db, redis, http helpers, storage, mail, push), migrations/, queries/ (sqlc).
- Config from environment variables only, validated at startup. Fail fast with a clear message listing what is missing, never printing values.
- Context passed everywhere. Timeouts on every outbound call. Graceful shutdown.
- Errors wrapped with context and mapped to API errors in one place.
- Tests: table driven unit tests for services, integration tests for endpoints against a real Postgres (docker or a throwaway database). Target meaningful coverage of services and permission checks.
- Lint: gofmt, go vet, staticcheck. Run in CI.

## API rules

- Base path /v1. JSON only. Dates in RFC 3339 UTC.
- Contract lives in openapi/openapi.yaml. Update it in the same commit as the handler. Generate the TypeScript client from it.
- Success shape: { "data": ... , "next_cursor": "..." } for lists.
- Error shape: { "error": { "code": "string_code", "message": "human text", "fields": { "name": "reason" } } } with correct HTTP status codes. Never leak internals.
- Pagination: cursor based, default limit 20, max 50.
- Writes accept an Idempotency-Key header where retries are likely (create post, send message).
- Rate limits per user and per IP, stricter on write and auth related endpoints. Return Retry-After.
- Authorization: central helper functions (CanEditPost, IsAdmin and so on), tested. Never rely on the client to hide actions.
- Input validation on every endpoint, with maximum lengths. Plain text only for user content, render safely on the client.

## Data model (initial)

Use UUIDs or ULIDs for ids. Every table has created_at and updated_at. Soft delete where users can undo or moderation needs history.

Identity: profiles (id = csag user id, display_name, avatar, bio, ministry, role, created_at), roles via a column or table, follows, audit_log (actor, action, target, metadata, time).

Content:
- devotional_categories (id, name, description, cover)
- devotional_series (id, category_id, name, blurb, cover)
- devotional_episodes (id, series_id, number, title, preview, body blocks as JSON, cover, status draft or published, published_at, author_id)
- audio_categories, audio_series, audio_tracks (id, series_id, category_id, title, speaker, duration, file key, cover, status, published_at)
- playback_positions (user_id, track_id, seconds, updated_at)
- events (id, title, description, starts_at, ends_at, location, cover, status), event_rsvps (event_id, user_id)

Social: posts, post_media, comments (parent_id for replies, edited_at, deleted_at), likes (target_type, target_id, user_id), reposts, reports (target, reporter, reason, status), bookmarks.

Prayer: prayer_requests (visibility, anonymous flag, status), prayer_marks (request_id, user_id), testimonies.

Messaging (v3): conversations (kind dm, group or channel), conversation_members (role, muted_until, last_read_seq), messages (conversation_id, seq, sender_id, body, kind text or card, client_id, created_at, deleted_at), verse_cards (template, verse, reference, note, sender_id), card_recipients, blocks (blocker, blocked).

Notifications: devices or push_subscriptions, notification_preferences (quiet hours), notifications (user_id, kind, payload, read_at).

Calls (v4): call_log (kind, started_at, ended_at, initiator), call_participants, prayer_rooms (host, status, schedule).

Migrations: goose, forward only in production. Every migration must be backward compatible with the previous app version (add columns nullable or with defaults, backfill, then tighten in a later release). Never drop data in the same release that stops using it.

## Business rules to enforce

- Only admins create, edit, publish or delete devotionals, audio, events and announcements.
- Members can edit and delete only their own posts and comments. Admins and moderators can hide or remove any.
- Comment replies are one level deep. Comments can be edited (mark as edited) and deleted (replies are removed with the parent or the parent shows as deleted, pick one and document it in DECISIONS.md).
- Drafts are visible only to admins.
- Blocked users cannot message, call or see each other's chats. Reported items go to a moderation queue.
- Chat channels of kind channel allow posting only by admins.
- Minors rules are in docs/SECURITY.md.

## Uploads

- Client asks the API for an upload slot (type, size). API validates limits and returns a short lived token or presigned URL. Client uploads straight to storage. API verifies the object and creates the record.
- Validate content type by sniffing, enforce size caps (images 10 MB, audio 200 MB for v1), strip image metadata, never serve user uploads from the same origin as the app without safe headers.
- Image worker creates width variants and a small blur placeholder. Audio worker transcodes to AAC (64 and 128 kbps) and stores duration.

## Search

Postgres full text search over devotionals, audio, events, people and posts. Weighted by title and body. A single search endpoint with a kind filter.

## Notifications

Event driven: publish a domain event, a notification worker decides recipients, applies preferences and quiet hours, then sends web push or email. Never block a request on delivery.
