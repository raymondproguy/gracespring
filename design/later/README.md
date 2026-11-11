# Later

Screens that are out of scope for the first release. They are kept here as reference so they can come back once the core app is stable. Nothing in the main app links to them.

| Feature | Screens |
| --- | --- |
| Voice and video calls | `call-voice.html`, `call-video.html`, `call-incoming.html`, `call-room.html` (group prayer room) |
| Groups | `new-group.html`, `chat-youth.html`, `chat-prayer.html`, `chat-cell.html` and their `chat-info-*.html` pages |
| Community | `community.html` (people, ministries and groups tabs) |
| Ministries | `ministries.html` |

These pages were written against the older five tab layout (Community tab). Each page sets `<base href="../">` so it shares the main `css/`, `js/` and `assets/` folders. When one of these features is built, port it to the app on its own feature branch and restore the nav entry then. See `docs/FEATURES.md` for the plan.
