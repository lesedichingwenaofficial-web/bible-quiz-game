# Version 1.0 audit

What I found going through all nine modes (the v2 files), the shared core and the test runs. Everything here is fixed in the release build.

## Bugs
1. **Older iPhones crash on load.** The core uses `structuredClone` (missing before iOS 15.4) and canvas `roundRect` (missing before iOS 16). Both throw at start-up.
2. **Pauses when focus moves.** A window `blur` pauses play, so tapping outside the game (an embedded preview, a desktop window) stops the match. Only real hiding (app switch, lock) should pause.
3. **Not deterministic.** Waves, cursors and AI run on wall-clock time and `Math.random`, so replays, Save Clip, fair Flock Fall sequences and identical daily levels are impossible. Frame hitches change outcomes.
4. **Flock Fall isn't fair.** Rock columns and AI are unseeded, so the two players never get the same sequence.
5. **The phone's back button leaves the game.** No history handling at all.
6. **Wording that sounds violent:** "damage", "health", "kills", the badges "Giant slayer" and "Heavy hitter", "Pounce!". Wolves should be chased off, never hurt.
7. **AI thinking can stutter.** Every AI step clones the board and resolves up to 40 waves on the main thread; with 4 AIs on a big board this can spike a frame.
8. **No sound safety.** No master limiter, so stacked bursts plus music can clip. The square-wave lead is harsh. Sound effects keep their audio context alive while hidden.
9. **Saves aren't versioned.** Each mode writes its own keys with no migration and no backup.
10. **The tutorial is the same generic three steps in every mode** (tap / cursor / pen), and it re-teaches basics.

## Rough edges
- Nine separate 120–150 KB files, each with its own copy of the engine, kit and core. No shared app, Home or navigation.
- The system font stack looks different on every phone, and emoji icons render differently on Android, iOS and Windows.
- Results show static numbers: no count-up, no rewards, no awards, no share.
- Lost Lamb's bars and Bridge's HUD rely on colour alone in places.
- Shouts can steal a busy slot when six fire at once.
- The between-rounds screen can't be skipped.
- The AI difficulty setting is global; there's no Expert, no Auto and no personalities.
- Guard the Fold's Long S path is very swingy, and wolves "die".
- Big Bad Wolf's victory has no Shepherd moment; Sheep Saga's final boss has no dawn.
- Sheep Rush has no ghost pace line; Flock Fall shows no incoming rocks.

## Missing for 1.0 (from the brief)
App shell (Home, Play, Daily hub, Wardrobe, Journal, Stats, Settings, About, What's New), wool, Flock Level, cosmetics, Lamb Photo, Verse of the Day, Shepherd's Journal, hymn music, seasons, First Steps tutorial, contextual tips, smart hints, How to Play cards, Shepherd's help, per-player names, looks and handicaps, keyboard controls, session scores and awards, Party Night, Chain of the Match replay, Save Clip, share cards, Join the Flock, the privacy page, PWA (manifest, icons, service worker, update prompt, install), _headers, 404 and robots.txt, developer mode, error screen and log, battery saver and auto quality, accessibility palettes, high contrast, larger text, fewer flashes, backup codes.

Mode content gaps:
- Sheep Saga: 45 levels plus Daily Pasture.
- Lead Him Home: 30 levels and a world map.
- Big Bad Wolf: Boss Rush and Heroic.
- Flock Fall: Endless mode and the rock preview.
- Guard the Fold: Endless, a boss wave and next-wave icons.
- Bridge: 5x5 and 9x9 boards, best of 5.
- Stampede+: Twists.
