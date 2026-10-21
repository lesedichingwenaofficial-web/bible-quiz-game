# cheekyfoundlamb demos

Eighteen playable prototypes, plus the Stampede versions, built on the same Chain Reaction engine. Each `NN-*.html` file is self-contained: open it in a browser, or host the folder on Netlify or Vercel.

| # | Demo | Idea |
|---|---|---|
| 1 | Flock Reaction | Classic Chain Reaction for 2–8 players; each player guards a lamb |
| 2 | Lamb vs Wolf | Lopsided 1v1: light converts, the wolf's shadow scatters |
| 3 | Rejoice With Me | One-tap arcade chain of found sheep, 10 levels |
| 4 | Loaves & Fishes | Limited-move basket puzzle |
| 5 | Fruits of the Spirit | 5-board roguelike with stacking blessings, plus a sandbox |
| 6 | The Valley | Psalm 23 campaign: 5 worlds with their own tile rules |
| 7 | The 99 | Hand of special sheep cards, plus a 99-slot collection |
| 8 | Stampede | Real-time party mode for 2–4 players on one phone |
| 9 | Let It Shine | Co-op lights against the darkness until dawn |
| 10 | Lost & Found | 4-board run combining demos 2, 5, 6 and 7 |
| 11 | Gift Box | Gift boxes on the board: burst into one to claim and unwrap a card |
| 12 | Seven Gifts | Every player holds 7 wrapped gifts and chooses when to open them |
| 13 | Turn the Other Cheek | Uno-style turn chaos for 3–6 lambs in a ring |
| 14 | Miracles | Clash-style 1v1: deck of 8, manna bar, card cycling, collection |
| 15 | The Talents | Earn, invest and bury talents; the Master returns after 15 rounds |
| 16 | The Lamb's Journey | Roll the die and walk a track around the board |
| 17 | Gift Traps | Hide traps under gift tags; they spring on enemy chains |
| 18 | The Daily Gift | Wordle-style daily puzzle with a par and a shareable result |

## Stampede versions

Eight takes on demo 8, all on one shared real-time core (`src/_stampede.js`) so they can later sit behind one mode menu.

| # | Version | Idea |
|---|---|---|
| S1 | Stampede+ | 2–4 players or AI: sheep pens, chain rewards, special sheep, optional 2v2 teams and mystery boxes |

Balance numbers sit in a `CONFIG` object at the top of each file.

## Editing

Edit the sources in `src/`, then rebuild:

```bash
python3 build.py
```

`build.py` pastes the shared pieces into every demo so each file stays standalone:

- `src/_engine.js`: the Chain Reaction engine, identical in every demo, with the MIT notice
- `src/_kit.js`: art (lamb, wolf, Shepherd, sheep), sound, wave animation and AI helpers
- `src/_kit.css`: the shared screen layout
- `src/_cards.js`, `src/_cards.css`: the card pool, card effects, targeting, reveal scenes, board effects and card AI (demos 11–18)
- `src/_table.js`: board, player chips, hand and tap-to-target UI for the card demos
- `src/_stampede.js`, `src/_stampede.css`, `src/_stampede.html`: the real-time Stampede core (cursors, sheep pens, special sheep, shouts, lambs, AI seats, Stampede Time, tuning panel)

Demos change the engine's behaviour only through the rule hooks passed to `Engine.resolve`.
