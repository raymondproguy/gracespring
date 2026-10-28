# Frontend (web)

## Goal

Bring the static pages in design/ to life as a React app. The look, spacing, copy and flows already exist. Match them first, then improve. Do not redesign.

## Stack

React, Vite, TypeScript (strict), TanStack Router and TanStack Query, plain CSS with the existing tokens (no heavy UI kit), a small set of accessible primitives built in house, zod for validation, generated client from openapi/openapi.yaml. PWA with a service worker for caching the shell and for web push.

## Porting the design

1. Copy design/css/style.css tokens (colours, radii, spacing, fonts, dark mode via data-theme) into packages/shared as the single source for design tokens. Split the stylesheet into base, layout and component CSS files that map to React components.
2. Keep the visual language: one accent colour, few boxes, serif for greetings, titles and scripture, Manrope for UI, dark mode, sidebar from 960 px and a bottom tab bar below that.
3. Replace the hand written JS in design/js/main.js with React state and TanStack Query. Keep the same behaviours: tabs, toggles, sheets, toasts, confirm sheet, comment add, edit, delete, like and reply, share sheet, card maker, chat composer.
4. Icons: use the lucide set (same as the static pages).
5. Every screen gets loading skeletons, an empty state and an error state with retry. These are not in the static pages and must be added.

## Navigation

- Mobile tab bar: Home, Audio, Devotional, Chats, Community.
- Home top bar: search, Events (calendar icon), notifications, profile avatar.
- Desktop sidebar: Home, Audio, Devotional, Events, Prayer, Growth, Community, Messages, Ministries, then Search, Profile, Settings.
- Admin links appear only for admins (Settings, Church admin, and the pencil on Devotional).
- Chat and call screens hide the tab bar.

## Route map (static page to route)

| Static page(s) | Route | Release |
|---|---|---|
| index, onboarding-1..3 | /welcome, /onboarding | v1 |
| signin, signup | /signin, /signup (csag) | v1 |
| home | / | v1 |
| profile, settings | /profile, /settings | v1 |
| audio, audio-series, audio-categories, audio-category-*, audio-player | /audio, /audio/series/:id, /audio/categories, /audio/categories/:id, /audio/play/:trackId | v1 |
| devotional, devotional-series-*, devotional-category-*, devotional-<episode> | /devotional, /devotional/series/:id, /devotional/categories/:id, /devotional/:episodeId | v1 |
| admin-devotional, admin-devotional-new | /admin/devotionals, /admin/devotionals/new, /admin/devotionals/:id/edit | v1 |
| events, event-details | /events, /events/:id | v1 |
| growth, ministries | /growth, /ministries | v2 |
| community, create-post | /community, /community/new | v2 |
| prayer | /prayer | v2 |
| search | /search | v2 |
| messages, chat-<id>, chat-info-<id>, new-chat, new-group | /messages, /messages/:conversationId, /messages/:conversationId/info, /messages/new, /messages/new-group | v3 |
| card-new, card-<id> | /cards/new, /cards/:id | v3 |
| call-voice, call-video, call-incoming, call-room | /call/voice/:userId, /call/video/:userId, /call/incoming, /rooms/:id | v4 |

Static page names with a person or group name (chat-sarah, chat-youth) are samples. Real chats load by conversation id.

## Data fetching

- TanStack Query for all server state. Query keys per resource. Stale times: public content minutes, personal data seconds.
- Optimistic updates for like, repost, comment add, edit, delete, RSVP, follow, send message, with rollback on error.
- Cursor pagination with infinite queries and virtualised long lists.
- Prefetch on hover or focus for likely next screens (next episode, next track).
- Persist the query cache to IndexedDB so the app opens instantly and works for read only use offline.

## Audio player

- Single persistent player in the app shell so audio continues across route changes.
- Media Session API for lock screen controls. Save position every few seconds and on pause to the API. Resume from the saved position.
- Streams with range requests. Offer a data saver quality option.

## Accessibility and quality

- Semantic HTML, keyboard reachable controls, visible focus, labels on all inputs and icon buttons, sufficient contrast in both themes, reduced motion respected.
- Test at 390 px and 1280 px, light and dark.
- Lighthouse targets: performance 90 or above on mobile profile for the shell, accessibility 95 or above.

## Share links and previews

Shared devotional, event and card links must show a title and image when pasted into WhatsApp. Serve Open Graph meta tags for public share URLs from the Go API (a small HTML response for crawlers) and redirect people to the app route.

## State, auth and errors

- Access token in memory, refresh handled per docs/AUTH.md. Redirect to /signin on an unrecoverable 401.
- One global error boundary plus route level boundaries. Toasts for transient messages.
- Never log tokens or personal data in the console or in error reports.

## Testing

Vitest and Testing Library for components and hooks, Playwright for a few end to end flows per release (sign in, read a devotional, comment, upload as admin). Run in CI.
