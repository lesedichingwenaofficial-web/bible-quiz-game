# Chain Burst

A browser chain reaction strategy game for 2–8 players. Each player can be a human (pass-and-play) or a bot with easy, medium or hard difficulty. "Chain Burst" is a working title.

## How to play

- On your turn, tap an empty cell or one of your own to add an orb.
- A cell explodes when it is full: corners hold 2 orbs, edges 3, the middle 4.
- An explosion throws one orb into each neighbouring cell and turns it your colour. Neighbours that fill up explode too.
- Once everyone has played, a player with no orbs left is out. The last colour standing wins.

## Files

| File | What it does |
|---|---|
| `engine.js` | The rules: placing orbs, explosion waves, elimination and winning. Pure functions with no drawing. |
| `ai.js` | Bot opponents: scores the board and, on Hard, looks one reply ahead |
| `game.js` | Canvas drawing, animation, input, menus, sound and undo |
| `index.html`, `style.css` | Page layout and styling |
| `tests/` | Engine tests |

`playMove` in the engine returns a snapshot of the board after each explosion wave. `game.js` animates those snapshots one by one, which is what makes the cascades visible.

## Run locally

ES modules don't load from `file://`, so serve the folder:

```bash
cd chain-reaction
python3 -m http.server 8000   # then open http://localhost:8000
npm test                      # run the engine tests (Node 22+)
```

## Deploy

No build step is needed. The folder is a static site.

- **Netlify:** New site → import this repo → set **Base directory** to `chain-reaction`. Leave the build command empty and set the publish directory to `chain-reaction`. `netlify.toml` is already set up for this.
- **Vercel:** New project → import this repo → set **Root Directory** to `chain-reaction` and the Framework Preset to **Other**. Leave the build command empty.
