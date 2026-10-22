# Changelog

## 1.0.0: the full release (in progress, step 6 of 11)

### New
- **One app for every game.** A home pasture that follows the time of day, a Play screen grouped into Play Together, Team Up and Solo, a Daily hub, Wardrobe, Shepherd's Journal, Stats, Settings and About.
- **Stampede+, finished.** Open, Rocky and Quick arenas, plus Hilltop (Flock Level 5), Twin (Flock Level 10), Bethlehem at Christmas and Garden at Easter. Single, best of 3 or best of 5 with a series scoreboard; 2 v 2 teams (teammates share a colour, each keeps their own shape); Mystery Boxes; Twists (Speedy Sheep, Big Pens, Mirror Cursors, Night); Chain of the Match replay and Save Clip.
- **Sheep Saga, finished.** 45 levels over Green Pastures, Rocky Hills and Night Valley, each world ending in a boss. One new idea per level on a saw-tooth curve, goals shown as icons, "So close!" on near misses, stars, boosters from 3-star finishes, and star milestones that unlock Wardrobe gifts (Laurel wreath at 30 stars, the Night Valley arena at 60, Fireflies at 100). A scrolling world map where your lamb walks to the next level. After 3 tries the Shepherd quietly offers help (5 more sheep and a Line sheep); after 6 you may skip ahead and come back later. Daily Pasture: a new level every day, made from the date so everyone plays the same one. When the last boss falls, dawn breaks over Night Valley.
- **Big Bad Wolf, finished.** Three bosses (Big Bad Wolf, Alpha of the Pack, Wolf in Sheep's Clothing), then a Boss Rush once all three have run off. Normal, Hard and Heroic. Each boss has an intro card with his silhouette and attacks, red warning squares before every attack, and a second phase at half bluster. His bluster, attack speed and pups scale with the number of flocks, so a lone lamb and a family of four both get a fair fight. When his bluster runs out, the Shepherd's light shines from the hill and the wolf scampers away; the results show how many bursts each flock landed on him. After two losses in a row the Shepherd helps (less bluster, slower attacks). AI teammates look ahead to see whether a burst will reach the wolf.
- **Sheep Rush, finished.** A one-minute score attack with a Daily Rush (the same board and the same falling sheep for everyone, each day) and Free Play. Bronze, Silver, Gold and Platinum medals, your personal best, and a ghost bar that shows second by second whether you're ahead of or behind your best run. Clocks, golden sheep and gift boxes, the combo meter, a share card and the Daily Rush share line.
- **Lost Lamb, finished.** Open, Rocky and Ring arenas; single, best of 3 or best of 5. The lamb wears your Wardrobe outfit and shows what he's about to do: a yawn before a nap, a wiggle before zoomies, and a golden glow when points double. Every flock's bar carries its shape as well as its colour. AI flocks read his moods and race for the square he'll hop to next, and never startle him off their own square.
- **Flock Fall, finished.** Head-to-head against an AI (Easy to Expert), against a friend on one screen, or Endless alone. Your chains drop rocks onto the other side's pasture; both sides get the same rocks in the same order, so it's fair. Incoming rocks wait in a queue you can see, and a chain of your own clears them before they land. When your pasture fills past the danger line the music quickens and the edges glow red. Endless speeds up gently, keeps a score and remembers your best.
- **First Steps.** The very first match is an easy one: a ghost thumb shows the button, your cursor waits on a ready square, and your first tap sets off a chain.
- **Smart hints.** After 3 lockouts in a row the squares you may use glow. After 5 seconds without a tap your button pulses. Both retire once learned and can be switched off.
- **Tips per mode.** One animated icon and up to 6 words, once ever, never pausing play.
- **"?" cards.** Three swipeable animated cards on every setup screen.
- **AI.** Easy, Normal, Hard, Expert and Auto (it follows how you've been doing). Three personalities: Bolt chases big chains, Mossy guards and waits, Nibbles steals your sheep. Human reaction times; it only sees what you see.
- **Players.** 1 to 4, any seat human or AI. Names, colours with shapes, lamb looks, and the Little Lamb assist (slower cursor, bigger pen) plus cursor speed and pen size per player. Keys A, L, Q, P (Space for solo, Esc to pause). Instant rematch with a scoreboard for the evening, and awards: Biggest Chain, Comeback Lamb, Sharpshooter, Busy Bee.
- **Progress.** Wool, Flock Level with a gift every level, the Wardrobe (hats, scarves, bells, glasses, wool colours, flock patterns, cursor trails, bursts, arenas), Lamb Photo, badges, Daily Bread streak (one missed day is forgiven).
- **Faith.** Verse of the Day (65 King James verses, checked word for word against two public texts), the Shepherd's Journal (a verse card per game), hymn music, the Shepherd in warm golden light, Christmas and Easter seasons.
- **Sharing.** Share cards with your lamb and result, Save Clip (a short video of the Chain of the Match), Join the Flock email sign-up with a parent or guardian option.
- **Install and offline.** Works offline after the first visit, installs to the home screen (picture steps for iPhone), "Update ready, tap to refresh" only on menus, keeps the screen awake during play, full screen on Android, asks the browser to keep saves safe.
- **Settings.** Master, music and effects volume; vibration; pen display (dots, bar, row, ring); tap zone; button size; left-handed solo; hints; verse; shake; confirm before quitting; three colour-blind palettes; high contrast; reduced motion; larger text; fewer flashes; graphics quality; battery saver; backup code; reset. A developer menu hides behind 7 taps on the version.

### Fixed (from the audit)
- Older iPhones no longer crash on load (missing `structuredClone` and canvas `roundRect`).
- Switching focus no longer pauses the game; only hiding the app does.
- The simulation now runs in fixed steps from a seed, so replays are exact (tested: a 1,500-step round with 76 human taps and three AIs replays to the identical board).
- The phone's back button goes back one screen and never leaves the game; in play it pauses.
- Gentler words everywhere: flocks "rest" rather than go "out", wolves are chased off, never hurt.
- Expert AI now sees further into a stampede than Normal, so the levels really differ (Expert beats Normal 11–5, Hard beats Easy 9–3 in simulated duels).
- Music has a limiter and ducking, softer voices, and goes quiet when the app is hidden.
- Saves are one versioned file, migrated forward and never wiped; a backup code moves them between devices.
- Shouts no longer steal a busy slot; the screen between rounds can be skipped with a tap.

### Studio choices
- **Name:** Lamb Stampede (changeable in `js/config.js`).
- **Hymns:** only melodies I can reproduce note for note are used: *Jesus Loves Me* (verse), *Amazing Grace* and *Joy to the World* (Christmas). *Savior, Like a Shepherd Lead Us*, *The King of Love My Shepherd Is*, *All Things Bright and Beautiful* and *Christ the Lord Is Risen Today* are replaced by original tunes in the same spirit (*Green Pastures*, *The Shepherd's March*, *Still Waters*, *Meadow Dash*, *Rocky Ridge*, and *Sunrise Garden* at Easter), rather than risk a wrong note in a hymn.
- **Bible text:** King James Version.
- **Join the Flock** defaults to Netlify Forms, since it needs no set-up there.
- **Teams** share a colour so a glance tells you who's with whom; each player keeps their own shape.
- **Default AI level** is Auto.
