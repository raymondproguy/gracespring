# GraceSpring Family Church: UI (static)

Plain HTML / CSS / JS. No build step, no framework, no backend. Open `index.html` in a browser.

- `index.html` to `settings.html`: one file per screen (20 total), linked together
- `css/style.css`: all styling. One accent color plus neutrals, set as tokens at the top (`:root`)
- `js/main.js`: small UI behaviours only (tabs, sheets, toggles, search filter, player, dark mode, greeting)
- `assets/img/`: optimized photos, avatars and emblem

Responsive: phone layout with bottom tab bar; from 960px wide it becomes a sidebar layout.
Nothing is saved or sent anywhere. Forms just move to the next screen.

## Devotional (added)
- **Member side:** `devotional.html` (Latest / Series / Categories), series pages, category pages, and reading pages with likes, repost, branded share sheet and comments (add, edit, delete, like, reply).
- **Admin side (UI only):** `admin-devotional.html` (published and drafts, edit, delete) and `admin-devotional-new.html` (new or `?edit=id`, with live preview). Reach it from Devotional (pencil) or Settings > Church admin.
- **Audio categories:** `audio-categories.html` and `audio-category-*.html`, chosen separately from devotional categories.
- Nothing is saved: posting, comments and likes reset on reload. Content other than Supernatural Health is placeholder.

## Messages, verse cards and calls (added)
- `messages.html` has three tabs: Chats, Cards, Calls (open one directly with `#cards` or `#calls`).
- Chats: `chat-<id>.html` for 1-to-1 chats, groups (Youth, Prayer Team, Cell Group) and a read-only announcements channel. Each has an info page (`chat-info-<id>.html`) with report, block and leave. `new-chat.html` and `new-group.html` start new ones.
- Verse cards: `card-new.html` (backgrounds, verse suggestions, note, send to one, several or groups) and `card-<id>.html` for received cards.
- Calls: `call-voice.html?p=<person>`, `call-video.html?p=<person>`, `call-incoming.html`, and `call-room.html` (group prayer room).
- Front-end only: messages, calls and cards are not saved or sent, and the video call shows no real video.
