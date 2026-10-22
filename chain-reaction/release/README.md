# Lamb Stampede

A free, joyful Chain Reaction party game for 1 to 4 players on one phone. Nine games, hymn music, Verse of the Day and a cheeky little lamb. No adverts, nothing to buy, no tracking.

Made to glorify Jesus, the Good Shepherd (John 10:11). Soli Deo Gloria.

---

## Putting the game online

The game is a plain static website: just files, no server code. Upload the **contents** of this folder (the one with `index.html` in it) to any of these free hosts.

### Netlify (easiest, and Join the Flock works with no set-up)
1. Go to <https://app.netlify.com/drop>.
2. Drag this whole folder onto the page.
3. That's it. Netlify gives you an address like `https://cheerful-lamb-123.netlify.app`.
4. Email sign-ups arrive in Netlify under **Forms → join-the-flock**.

### Cloudflare Pages
1. Sign in at <https://dash.cloudflare.com>, then **Workers & Pages → Create → Pages → Upload assets**.
2. Give the project a name, then drag this folder in and press **Deploy**.
3. In `js/config.js`, set the Join the Flock `provider` to `"kit"` or `"custom"` (Cloudflare has no form service).

### Vercel
1. Sign in at <https://vercel.com>, choose **Add New → Project**, and import the folder (or a Git repository holding it).
2. Framework preset: **Other**. No build command. Output folder: the folder itself.
3. Set the Join the Flock `provider` to `"kit"` or `"custom"` in `js/config.js`.

### Your own address (custom domain)
Each host has a **Domains** page: add your domain (for example `lambstampede.com`) and follow the two DNS steps it shows you at your domain company. HTTPS is switched on for you. Then:
1. Put the address into `siteUrl` in `js/config.js` (no slash at the end).
2. In `index.html`, change the two `img/og.jpg` lines to the full address, e.g. `https://lambstampede.com/img/og.jpg`, so link previews show the picture everywhere.

---

## Settings to fill in (`js/config.js`)

Open `js/config.js` in any text editor. Everything is explained beside it.

| Setting | What to put |
| --- | --- |
| `siteUrl` | Your site's address, e.g. `"https://lambstampede.com"`. Shown on share cards. |
| `contactEmail` | The email shown on the privacy page. |
| `social` | Your handle and profile link (already set to @cheekyfoundlamb). |
| `flock.provider` | `"netlify"` (works on Netlify), `"kit"`, `"custom"`, or `"none"` to hide sign-ups. |
| `flock.kitFormId` | For Kit: the number from your form's embed code. |
| `flock.customUrl` | For your own endpoint: it receives `{ email, signup, consent }` as JSON. |
| `counter` | Off by default. To count visits without cookies, set `enabled: true` and a `url` (e.g. a GoatCounter count URL). The privacy page then mentions it by itself. |
| `seasons` | The dates for Christmas and Easter decorations. Easter is worked out automatically. |

Nothing else needs changing.

---

## Releasing an update

1. Change what you like, then raise `version` in `js/config.js` (e.g. `1.0.0` → `1.0.1`) and add a line to `whatsNew` in `js/strings.js`.
2. Run `python3 tools/build.py`. This refreshes the offline file list in `sw.js` and makes the zip and the single-file version in `../dist`.
3. Upload the folder again, the same way as the first time.

Players get a gentle **"Update ready, tap to refresh"** the next time they're on a menu (never mid-game). Their progress is kept: saves are versioned and never wiped.

---

## What's in the folder

| Path | What it is |
| --- | --- |
| `index.html` | The game. |
| `css/app.css` | The look: design tokens at the top. |
| `js/config.js` | Your settings (see above). |
| `js/strings.js` | Every word the player reads, Verse of the Day, privacy text, What's New. |
| `js/engine.js` | The Chain Reaction engine (MIT licence notice inside). |
| `js/core.js` | The match core: fixed-step simulation, replays, AI, drawing. |
| `js/app.js`, `js/screens.js` | Menus and screens. |
| `js/modes/*.js` | One file per game mode, loaded only when needed. |
| `js/audio.js` | Sound effects and the hymn music (melodies written in ABC notation). |
| `js/progress.js` | Wool, Flock Levels, the Wardrobe, badges, the Journal, Daily Bread. |
| `js/share.js`, `js/pwa.js` | Sharing, Join the Flock, offline play and installing. |
| `sw.js` | The offline helper (made by `tools/build.py`). |
| `manifest.webmanifest`, `icons/`, `img/` | Install details, icons and the link-preview picture. |
| `privacy.html`, `404.html`, `robots.txt`, `_headers`, `vercel.json` | The usual website extras. |
| `fonts/` | Fredoka, with its licence (`OFL.txt`). |
| `tools/` | Build and checking tools (not needed by players). |

## Tools
- `python3 tools/build.py` makes the release (zip and single file).
- `python3 tools/check-verses.py` checks every verse word for word against two public KJV texts.
- `node tools/make-art.cjs` redraws the icons and preview picture from the game's own art (needs Playwright), then `python3 tools/optimise-png.py` makes them small.

## Licences
- The Chain Reaction engine: MIT (notice in `js/engine.js` and on the About screen).
- Fredoka font: SIL Open Font License 1.1 (`fonts/OFL.txt`).
- Hymn melodies: public domain. Scripture: King James Version (public domain).
