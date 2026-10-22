// ======================= STAMPEDE+ =======================
// The classic: every flock for itself (or 2 v 2). Big chains load special sheep.
(() => {
  const S = Core;
  const CONFIG_S = {
    boxEverySecs: 15, // a mystery box drops in this often
    arenas: {
      open: { name: "Open", rows: 9, cols: 6, rocks: [] },
      rocky: { name: "Rocky", rows: 9, cols: 6, rocks: [[2, 1, 2], [2, 4, 2], [6, 1, 2], [6, 4, 2], [4, 2, 3], [4, 3, 3]] }, // [row, col, hits]
      quick: { name: "Quick", rows: 7, cols: 5, rocks: [], secs: 60 },
      hilltop: { name: "Hilltop", rows: 9, cols: 7, rocks: [], stones: [[0, 0], [0, 1], [0, 5], [0, 6], [1, 0], [1, 6], [8, 0], [8, 1], [8, 5], [8, 6], [7, 0], [7, 6]], level: 5 },
      twin: { name: "Twin", rows: 9, cols: 6, rocks: [], stones: [[4, 0], [4, 1], [4, 4], [4, 5]], level: 10 },
      bethlehem: { name: "Bethlehem", rows: 9, cols: 6, rocks: [], season: "christmas", theme: "arena-bethlehem", boxEverySecs: 10 },
      garden: { name: "Garden", rows: 9, cols: 6, rocks: [], season: "easter", theme: "arena-garden", boxEverySecs: 10 },
    },
  };
  const arenaOf = (s) => {
    const a = CONFIG_S.arenas[s.arena];
    if (!a || (a.season && a.season !== Dates.season()) || (a.level && Save.profile.level < a.level && !Save.data.dev.unlockAll)) return CONFIG_S.arenas.open;
    return a;
  };
  const teamsOn = (s) => s.teams && s.n === 4;

  Modes.register({
    key: "stampede",
    title: "Stampede+",
    how: ["Tap your button to drop a sheep where your cursor is.", "Fill a square and it bursts into its neighbours, claiming them.", "Big chains load special sheep. Last flock grazing, or most squares, wins!"],
    music: { song: "jesusLovesMe", style: "bright", bpm: 126 },
    match: true,
    setupDefaults: { n: 2, arena: "open", bestOf: 3, teams: false, boxes: true, tSpeedy: false, tBig: false, tMirror: false, tNight: false },
    board: (s) => arenaOf(s),
    tuneFor: (s) => ({ roundSecs: arenaOf(s).secs ?? 90, cursorMs: s.tSpeedy ? 270 : 380, pen: s.tBig ? 8 : 5 }),
    theme: (s) => (arenaOf(s).theme ? S.ARENAS[arenaOf(s).theme] : null),
    players: (s) =>
      Array.from({ length: s.n }, (_, p) => {
        const team = teamsOn(s) ? (p === 0 || p === 3 ? 0 : 1) : p;
        // teammates share a colour, each keeps their own shape
        const lead = teamsOn(s) ? (team === 0 ? 0 : 1) : p;
        return { seat: p, team, colorIndex: s.seats[lead].color, symIndex: s.seats[p].color, dir: s.tMirror && p % 2 ? -1 : 1 };
      }),
    firstStepsSetup: (s) => ({ ...s, n: 2, arena: "open", bestOf: 1, teams: false, boxes: false, tSpeedy: false, tBig: false, tMirror: false, tNight: false, seats: [{ ...s.seats[0], kind: "human", assist: false }, { ...s.seats[1], kind: "ai", level: "easy", persona: "patient" }, s.seats[2], s.seats[3]] }),
    options(ui, s) {
      ui.seg("Flocks", "n", [[2, "2"], [3, "3"], [4, "4"]]);
      ui.seats(s.n);
      const arenas = Object.entries(CONFIG_S.arenas).filter(([, a]) => !a.season || a.season === Dates.season());
      ui.seg("Arena", "arena", arenas.map(([k, a]) => [k, a.level && Save.profile.level < a.level && !Save.data.dev.unlockAll ? `${a.name} · Lv ${a.level}` : a.name]));
      if (CONFIG_S.arenas[s.arena]?.level && Save.profile.level < CONFIG_S.arenas[s.arena].level && !Save.data.dev.unlockAll) ui.note(`${CONFIG_S.arenas[s.arena].name} opens at Flock Level ${CONFIG_S.arenas[s.arena].level}. You'll play on Open until then.`);
      ui.seg("Match", "bestOf", [[1, "Single"], [3, "Best of 3"], [5, "Best of 5"]]);
      if (s.n === 4) ui.toggle("Teams (2 v 2)", "teams", "Bottom-left and top-right against the others");
      ui.toggle("Mystery Boxes", "boxes", "Burst into a box for a special sheep");
      ui.section("Twists");
      ui.toggle("Speedy Sheep", "tSpeedy", "Cursors move faster");
      ui.toggle("Big Pens", "tBig", "8 sheep in every pen");
      ui.toggle("Mirror Cursors", "tMirror", "Every other cursor runs backwards");
      ui.toggle("Night", "tNight", "Only lanterns light the field");
    },
    playLabel: (s) => (s.bestOf > 1 ? `Play best of ${s.bestOf}` : "Play"),
    againLabel: (sum) => (sum.humans.length > 1 ? "Rematch" : "Play again"),
    tips: [
      { id: "special", on: "special", icon: "star", text: "Special sheep loaded! Drop it!" },
      { id: "rush", on: "rush", icon: "timer", text: "Stampede Time! Refills twice as fast" },
      { id: "box", on: "box", icon: "gift", text: "Burst into gifts for specials" },
      { id: "rock", on: "start", icon: "rocks", text: "Burst into rocks to break them", when: (G, pl, s) => s.arena === "rocky" },
      { id: "teams", on: "start", icon: "people", text: "Same colour? Same team!", when: (G, pl, s) => teamsOn(s) },
      { id: "night", on: "start", icon: "moon", text: "Night: lanterns light the way", when: (G, pl, s) => s.tNight },
      { id: "mirror", on: "start", icon: "refresh", text: "Some cursors run backwards!", when: (G, pl, s) => s.tMirror },
    ],
    help: [
      { title: "Tap to drop", text: "Each player has one button. Tap it to drop a sheep on the square under your cursor.", draw: (g, w, h, t) => helpTap(g, w, h, t) },
      { title: "Fill it, burst it", text: "When a square is full it bursts, and its sheep take over the squares around it.", draw: (g, w, h, t) => helpBurst(g, w, h, t) },
      { title: "Chain for specials", text: "Big chains load Line, Bomb and Overflow sheep. Your pen refills by itself.", draw: (g, w, h, t) => helpSpecial(g, w, h, t) },
    ],
    badges: [
      { id: "win", icon: "trophy", name: "First win", desc: "Win a game", test: (c) => c.won },
      { id: "chain10", icon: "bolt", name: "Chain 10", desc: "Make a 10-chain", test: (c) => c.humans.some((p) => p.best >= 10) },
      { id: "chain20", icon: "bolt", name: "Chain 20", desc: "Make a 20-chain", test: (c) => c.humans.some((p) => p.best >= 20) },
      { id: "clean", icon: "sparkle", name: "Clean hooves", desc: "Win without a lockout", test: (c) => c.won && c.humans.every((p) => p.wastes === 0) },
      { id: "overflow", icon: "star", name: "My cup runneth over", desc: "Drop an Overflow sheep", test: (c) => c.G.players.some((p) => p.human && p.overflows > 0) },
      { id: "gifts", icon: "gift", name: "Gift finder", desc: "Open 3 boxes in one game", test: (c) => c.G.players.some((p) => p.human && p.gifts >= 3) },
      { id: "rocks", icon: "rocks", name: "Rock breaker", desc: "Break 3 rocks in one game", test: (c) => c.G.players.some((p) => p.human && p.rocks >= 3) },
      { id: "champ", icon: "crown", name: "Champion", desc: "Win a best-of-5 match", test: (c) => c.won && c.match?.need === 3 },
      { id: "team", icon: "people", name: "Better together", desc: "Win a 2 v 2 game", test: (c) => c.won && teamsOn(c.setup) },
      { id: "four", icon: "party", name: "Full house", desc: "Win a 4-flock game", test: (c) => c.won && c.setup.n === 4 && !c.setup.teams },
      { id: "night", icon: "moon", name: "Night shepherd", desc: "Win with the Night twist", test: (c) => c.won && c.setup.tNight },
    ],
    hooks: {
      setup(G, s, match, opts) {
        const a = arenaOf(s);
        const b = G.b;
        for (const [r, c, hp] of a.rocks) {
          const i = r * b.cols + c;
          b.kind[i] = "rock";
          b.hp[i] = b.mhp[i] = hp;
        }
        for (const [r, c] of a.stones || []) b.rock[r * b.cols + c] = true;
        const every = (a.boxEverySecs ?? CONFIG_S.boxEverySecs) * 1000;
        G.data = { nextBox: s.boxes ? every : Infinity, every, night: s.tNight, dark: null };
        for (const pl of G.players) pl.gifts = pl.rocks = pl.overflows = 0;
        if (opts.firstSteps) seedFirstSteps(G);
      },
      hud(G) {
        const m = S.match;
        S.setHud(m ? `<span class="round">Round ${m.round}</span>` : "");
      },
      update(G, now) {
        if (now < G.data.nextBox) return;
        G.data.nextBox = now + G.data.every;
        const b = G.b;
        let n = 0;
        for (let i = 0; i < b.size; i++) if (b.owner[i] === -1 && !b.kind[i] && !b.rock[i]) n++;
        if (!n) return;
        let k = G.rng.int(n);
        for (let i = 0; i < b.size; i++) {
          if (b.owner[i] !== -1 || b.kind[i] || b.rock[i]) continue;
          if (k-- === 0) {
            b.kind[i] = "box";
            S.puff(i, "#e050ad", 6);
            Sfx.chime(2);
            S.tip("box");
            break;
          }
        }
      },
      afterDrop(G, pl, i, special) {
        if (special === "overflow") pl.overflows++;
      },
      onBox: (G, i, who) => G.players[who] && G.players[who].gifts++,
      onRockBreak: (G, i, who) => G.players[who] && G.players[who].rocks++,
      aiValue(G, pl, i) {
        const b = G.b;
        const bursts = b.count[i] + 1 >= Engine.capacity(b, i);
        let n = 0;
        for (const k of Engine.neighbours(b, i)) if (b.kind[k]) n++;
        return n * (bursts ? 3 : 0.5);
      },
      drawOver(ctx, G, c) {
        if (G.data.night) drawNight(ctx, G, c);
      },
    },
  });

  // First Steps: a row of nearly full squares by the player's start, so the first tap chains.
  function seedFirstSteps(G) {
    const b = G.b;
    const last = b.rows - 1;
    const seed = [[last, 0, 1], [last, 1, 2], [last, 2, 2], [last, 3, 2], [last - 1, 0, 2], [last - 1, 1, 3], [last - 1, 2, 2]];
    for (const [r, c, n] of seed) {
      const i = r * b.cols + c;
      b.owner[i] = 0;
      b.count[i] = n;
    }
    for (const [r, c, n] of [[0, b.cols - 1, 1], [1, b.cols - 1, 1], [0, b.cols - 2, 1]]) {
      const i = r * b.cols + c;
      b.owner[i] = 1;
      b.count[i] = n;
    }
    for (const pl of G.players) pl.placed = true;
  }

  // Night: dark everywhere except a lantern round each cursor.
  let fog = null;
  function drawNight(ctx, G, c) {
    const w = G.b.cols * c;
    const h = G.b.rows * c;
    const dpr = S.geo.dpr;
    fog ??= document.createElement("canvas");
    if (fog.width !== Math.round(w * dpr) || fog.height !== Math.round(h * dpr)) {
      fog.width = Math.round(w * dpr);
      fog.height = Math.round(h * dpr);
    }
    const g = fog.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, w, h);
    g.fillStyle = "rgba(6,10,28,0.86)";
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "destination-out";
    for (const pl of G.players) {
      if (!pl.alive || pl.observer) continue;
      const i = S.cursorCell(pl);
      const x = (Engine.colOf(G.b, i) + 0.5) * c;
      const y = (Engine.rowOf(G.b, i) + 0.5) * c;
      const r = c * 1.9;
      const gr = g.createRadialGradient(x, y, c * 0.4, x, y, r);
      gr.addColorStop(0, "rgba(0,0,0,1)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, Art.TAU);
      g.fill();
    }
    ctx.drawImage(fog, 0, 0, w, h);
  }

  // ---------- the "?" card animations ----------
  const C = ["#ff5a5f", "#3fa7ff"];
  function field(g, w, h, cols, rows, c) {
    const x0 = (w - cols * c) / 2;
    const y0 = 8;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      g.fillStyle = (r + k) % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0 + k * c, y0 + r * c, c, c);
    }
    return [x0, y0];
  }
  function helpTap(g, w, h, t) {
    const c = 30;
    const [x0, y0] = field(g, w, h, 5, 3, c);
    const p = t % 2.4;
    const col = Math.floor((t / 2.4) % 5);
    g.strokeStyle = C[0];
    g.lineWidth = 3;
    g.strokeRect(x0 + col * c + 2, y0 + c + 2, c - 4, c - 4);
    if (p > 1.2) Art.drawSheep(g, x0 + (col + 0.5) * c, y0 + 1.5 * c - Math.max(0, 1.5 - p) * 30, 7, C[0]);
    const press = p > 1 && p < 1.25;
    Art.rrect(g, w / 2 - 44, h - 46 + (press ? 3 : 0), 88, 38, 14, C[0]);
    Art.drawLamb(g, w / 2, h - 26 + (press ? 3 : 0), 28, { t, scarf: "#ffffff" });
    // a fingertip pressing the button
    Art.circle(g, w / 2 + 30, h - 20 - (press ? 0 : 8), 9, "rgba(255,236,214,0.95)");
  }
  function helpBurst(g, w, h, t) {
    const c = 34;
    const [x0, y0] = field(g, w, h, 3, 3, c);
    const p = (t % 3) / 3;
    const n = p < 0.6 ? 1 + Math.floor(p * 6) : 0;
    const mid = [x0 + 1.5 * c, y0 + 1.5 * c];
    if (n) for (let k = 0; k < Math.min(n, 4); k++) Art.drawSheep(g, mid[0] + (k % 2 ? 7 : -7), mid[1] + (k > 1 ? 7 : -7), 6, C[0]);
    if (p >= 0.6) {
      const e = Math.min(1, (p - 0.6) / 0.25);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) Art.drawSheep(g, mid[0] + dx * c * e, mid[1] + dy * c * e, 6, C[0]);
    }
    g.fillStyle = "#2b3a2f";
    g.font = "700 14px Fredoka, system-ui";
    g.textAlign = "center";
    g.fillText(p < 0.6 ? `${Math.min(n, 4)} / 4` : "Burst!", w / 2, h - 10);
    g.textAlign = "start";
  }
  function helpSpecial(g, w, h, t) {
    const items = [["line", 5], ["bomb", 9], ["overflow", 14]];
    items.forEach(([type, at], k) => {
      const x = w * (0.2 + k * 0.3);
      const y = h * 0.45 + Math.sin(t * 3 + k) * 4;
      S.drawSpecial(g, x, y, 14, type, C[0], "row", t);
      g.fillStyle = "#2b3a2f";
      g.font = "700 13px Fredoka, system-ui";
      g.textAlign = "center";
      g.fillText(`Chain ${at}`, x, h * 0.8);
    });
    g.textAlign = "start";
  }
})();
