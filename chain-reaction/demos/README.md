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
| S2 | Sheep Saga | Solo level map: 15 levels with a sheep budget, goals, rocks, thorns, gates, lost sheep, night, the wolf and a boss rock. Levels are text maps in `LEVELS` |
| S3 | Wolf Waves | Solo or 2-player co-op survival: 45-second waves against faster wolves, more of them on waves 3 and 5 |
| S4 | Big Bad Wolf | Co-op boss fight for 1–4: hurt the 2x2 wolf with bursts, dodge Swipe, Howl, Pups and Stomp |
| S5 | Shrinking Pasture | Battle royale for 2–4: every 20 seconds the outer ring turns to stone |
| S6 | Lost Lamb | King of the hill for 2–4: own the square the wandering lamb stands on to fill your bar |
| S7 | Sheep Rush | 60-second solo score attack: claim grey sheep, smash rocks, keep the combo multiplier going, copy a share line |
| S8 | Rhythm Stampede | 1v1 against AI or a friend to a Web Audio beat: tap on the step for a PERFECT double sheep |

## Finished games (v2)

The five favourite Stampede versions, rebuilt to a finished-game standard on the v2 core (`src/_stampede2.*`): title screen, first-play tutorial, pause menu with auto-pause, results with records, settings (music, sound, vibration, reduced motion, pen display, tap zone, AI), stats and badges, Web Audio music, haptics, pooled particles and sprite caching.

| File | Game | New |
|---|---|---|
| `s1-stampede-plus-v2.html` | Stampede+ | Best-of-3/5 matches, 3 arenas (Open, Rocky, Quick), teams, mystery boxes |
| `s2-sheep-saga-v2.html` | Sheep Saga | 30 levels in 3 worlds with bosses, Ice and Crates, one-time blocker hints, scrolling map, boosters |
| `s4-big-bad-wolf-v2.html` | Big Bad Wolf | 3 unlockable bosses with 2 phases each (Big Bad Wolf, Alpha of the Pack, Wolf in Sheep's Clothing), Normal and Hard, damage per player |
| `s6-lost-lamb-v2.html` | Lost Lamb | Open, Rocky and Ring arenas, a lamb that yawns into naps and wiggles into zoomies, golden moments, best of 3 |
| `s7-sheep-rush-v2.html` | Sheep Rush | Daily Rush (same board for everyone, seeded by date) and Free Play, medals, clock / golden sheep / mystery box pickups, share line |

## New Stampede demos (v2 core)

| File | Demo | Idea |
|---|---|---|
| `n1-wool-ball.html` | Wool Ball | Football with explosions, 1v1 or 2v2: bursts kick the ball, first to 3 goals, then sudden death |
| `n2-flock-fall.html` | Flock Fall | Puyo-style versus on two 6x10 boards: drop down columns, everything falls, 4+ chains pop and send rocks |
| `n3-wolf-tag.html` | Wolf Tag | Infection party for 3–4: caught lambs join the wolves; a last lamb who holds out wins alone |
| `n4-guard-the-fold.html` | Guard the Fold | Co-op tower defence for 1–4: bursts beside a dirt path hit walking wolves; 10 waves, 5 hearts, 3 paths |
| `n5-lead-him-home.html` | Lead Him Home | Escort, solo or 2 co-op: the lamb walks home over your squares while wolves scare him back; 10 levels |
| `n6-the-lost-coin.html` | The Lost Coin | Treasure hunt for 2–4: bursts uncover the grass to find coins and golden coins, and spring wolf traps |
| `n7-hot-wolf.html` | Hot Wolf | Hot potato for 2–4: kick the ticking wolf off your square before he pounces on everything near him |
| `n8-bridge.html` | Bridge | Connect race on 7x7, 1v1 or 2v2: Light links left to right, Dark top to bottom; best of 3 |
| `n9-lamb-race.html` | Lamb Race | Racing party for 2–4: every burst moves your lamb a tile round a 34-tile track; Line +3, Bomb trips the lamb ahead; 3 laps |
| `n10-pilgrimage.html` | Pilgrimage | Solo roguelike: 7 rounds against tougher flocks and the Wolf, picking a stacking blessing after each win |

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
- `src/_stampede2.js`, `src/_stampede2.css`, `src/_stampede2.html`: the v2 Stampede core used by the finished games and the new demos
- `src/_stampede.js`, `src/_stampede.css`, `src/_stampede.html`: the original real-time Stampede core (cursors, sheep pens, special sheep, shouts, lambs, AI seats, Stampede Time, tuning panel)

Demos change the engine's behaviour only through the rule hooks passed to `Engine.resolve`.
