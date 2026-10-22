// ======================= SHEEP SAGA =======================
// Solo puzzle levels: clear the goals before your sheep run out. 45 levels over three worlds,
// each ending in a boss, plus a Daily Pasture that's the same for everyone.
(() => {
  const S = Core;
  const SAGA = {
    wolfRefill: 1.9, // seconds per sheep for the wolf's pen
    thornSpreadSecs: 6, // a thorn spreads if none is cleared for this long
    rockSpecialChance: 0.35, // a broken rock loads a special this often
    finaleGap: 260, // ms between leftover sheep in the finale
    finaleMax: 16, // leftover sheep that fly in; the rest just score
    points: { burst: 10, hit: 20, rock: 60, thorn: 30, gate: 30, wake: 50, ice: 40, crate: 40, leftover: 500 },
    stars: [0.15, 0.35], // 2 and 3 stars: share of the sheep budget left over
    fill: 0.5, // default share of empty squares that start with your sheep
    boosterPlus: 5, // sheep added by the +5 booster
    helpAfter: 3, // fails on a level before the Shepherd offers help
    skipAfter: 6, // fails before you may skip ahead
    helpSheep: 5, // the Shepherd's help: extra sheep, and a Line sheep to start
    milestones: [[30, "hat-laurel"], [60, "arena-valley"], [100, "trail-fireflies"]], // stars -> Wardrobe gifts
  };

  // Maps are 9 rows of 6. Key: . empty  1-5 rock with that many hits  T thorn  G gate  Z lost sheep (asleep)
  // I ice (1 hit)  J ice (2 hits)  C crate  B boss rock (2x2).
  // Goals: rocks, thorns, ice, crates (clear them all), wake: N, chain: N, own: percent, boss.
  // teach: the idea this level introduces (a tip shows once, the first time).
  const WORLDS = [
    { name: "Green Pastures", theme: { grass: ["#3d7a45", "#46874e"], edge: "#24402c" }, sky: ["#8fd0ff", "#cdeec0"], music: { song: "jesusLovesMe", style: "bright", bpm: 116 } },
    { name: "Rocky Hills", theme: { grass: ["#6b7a45", "#76854d"], edge: "#3c4128" }, sky: ["#f2c98e", "#b9c48a"], music: { song: "amazingGrace", style: "waltz", bpm: 120 } },
    { name: "Night Valley", theme: { grass: ["#2b4f4a", "#325a54"], edge: "#16282a" }, sky: ["#141d3a", "#2d4a5a"], dawn: ["#ffb38a", "#ffe3b0"], music: { song: "stillWaters", style: "gentle", bpm: 96 } },
  ];
  const E = "...... ...... ...... ...... ...... ...... ...... ...... ......";
  const LEVELS = [
    // Green Pastures: the basics, one idea at a time
    { budget: 30, goals: { chain: 5 }, map: E },
    { budget: 26, goals: { own: 60 }, fill: 0.3, map: E },
    { budget: 34, goals: { rocks: 1 }, teach: "rock", map: "...... ...... .1..1. ...... ...... ...... .1..1. ...... ......" },
    { budget: 28, goals: { chain: 8 }, fill: 0.6, map: E },
    { budget: 46, goals: { rocks: 1 }, map: "...... ..22.. ...... .2..2. ...... .2..2. ...... ..22.. ......" },
    { budget: 30, goals: { wake: 4 }, teach: "sleep", map: "Z....Z ...... ...... ...... ...... ...... ...... ...... Z....Z" },
    { budget: 34, goals: { own: 70 }, fill: 0.35, map: "...... ...... ...... ...... 1.11.1 ...... ...... ...... ......" },
    { budget: 44, goals: { wake: 4 }, teach: "gate", map: "...... .GGGG. .GZZG. .GGGG. ...... ...... Z....Z ...... ......" },
    { budget: 30, goals: { chain: 10 }, fill: 0.65, map: E },
    { budget: 44, goals: { crates: 1 }, teach: "crate", map: "...... .C..C. ...... ..CC.. ...... ..CC.. ...... .C..C. ......" },
    { budget: 30, goals: { ice: 1 }, teach: "ice", map: "...... ...... .I..I. ...... ..II.. ...... .I..I. ...... ......" },
    { budget: 44, goals: { rocks: 1, wake: 3 }, map: "Z....Z ..2... ...... ...2.. ..Z... .2.... ...... ..2... ......" },
    { budget: 36, goals: { crates: 1, chain: 8 }, fill: 0.55, map: "C....C ...... ...... ...... ..CC.. ...... ...... ...... C....C" },
    { budget: 44, goals: { ice: 1, rocks: 1 }, map: "...... .I..I. ...... ..22.. .I..I. ..22.. ...... .I..I. ......" },
    { budget: 40, goals: { boss: 1 }, boss: 12, teach: "boss", map: "...... .C..C. ...... ..BB.. ..BB.. ...... .1..1. ...... ......" },
    // Rocky Hills: thorns, the wolf, tougher rocks
    { budget: 40, goals: { thorns: 1 }, teach: "thorn", map: "...... ...... ..TT.. ...... T....T ...... ..TT.. ...... ......" },
    { budget: 48, goals: { rocks: 1 }, map: "...... .3..3. ...... 3....3 ...... 3....3 ...... .3..3. ......" },
    { budget: 44, goals: { thorns: 1, wake: 3 }, map: "T....T ...... ..Z... ...... ...Z.. ...... ..Z... ...... T....T" },
    { budget: 30, goals: { own: 65 }, fill: 0.4, map: "...... ...... ..11.. ...... ...... ...... ..11.. ...... ......" },
    { budget: 30, goals: { own: 60 }, fill: 0.3, wolf: "easy", teach: "wolf", map: E },
    { budget: 40, goals: { ice: 1 }, teach: "ice2", map: "...... .J..J. ...... ..JJ.. ...... ..JJ.. ...... .J..J. ......" },
    { budget: 46, goals: { rocks: 1 }, wolf: "easy", map: "...... .2..2. ...... ..33.. ...... ..33.. ...... .2..2. ......" },
    { budget: 46, goals: { wake: 2 }, map: "GZG... GGG... ...... ..CC.. ...... ..CC.. ...... ...GGG ...GZG" },
    { budget: 32, goals: { chain: 12 }, fill: 0.65, map: "...... ...... ...... ..CC.. ...... ..CC.. ...... ...... ......" },
    { budget: 50, goals: { thorns: 1, ice: 1 }, wolf: "easy", map: "..TT.. ...... .J..J. ...... T....T ...... .J..J. ...... ..TT.." },
    { budget: 48, goals: { crates: 1, rocks: 1 }, map: "C.4..C ...... ..C... ...4.. ...... ..4... ...C.. ...... C..4.C" },
    { budget: 46, goals: { thorns: 1, wake: 2 }, wolf: "easy", map: "...T.. Z..... ...... T....T ...... ...... ....Z. ...... ..T..." },
    { budget: 36, goals: { wake: 6 }, map: "Z....Z ...... ..Z... ...... ...Z.. ...... Z....Z ...... ......" },
    { budget: 50, goals: { rocks: 1, chain: 12 }, wolf: "easy", map: "2....2 ...... ..44.. ...... ...... ...... ..44.. ...... 2....2" },
    { budget: 52, goals: { boss: 1 }, boss: 16, wolf: "easy", map: "T....T .2..2. ...... ..BB.. ..BB.. ...... .2..2. ...... T....T" },
    // Night Valley: lantern light, everything together
    { budget: 38, goals: { wake: 5 }, night: true, teach: "night", map: "Z..... ....Z. ...... .Z.... ...... ....Z. ...... .Z.... ......" },
    { budget: 48, goals: { rocks: 1 }, night: true, map: "...... .2..2. ...... ...... ..22.. ...... ...... .2..2. ......" },
    { budget: 44, goals: { ice: 1 }, night: true, map: "...... I....I ...... ..JJ.. ...... ..JJ.. ...... I....I ......" },
    { budget: 32, goals: { own: 70 }, fill: 0.4, map: "...... ...... .1..1. ...... ...... ...... .1..1. ...... ......" },
    { budget: 40, goals: { wake: 6 }, wolf: "normal", night: true, map: "...... Z....Z ...... ..2... Z....Z ...2.. ...... Z....Z ......" },
    { budget: 40, goals: { thorns: 1 }, map: "T.CC.T ...... ...... ..TT.. ...... ...... ..TT.. ...... T.CC.T" },
    { budget: 38, goals: { wake: 2 }, night: true, map: "GGG... GZG... ...... ...... ..CC.. ...... ...... ...GZG ...GGG" },
    { budget: 30, goals: { chain: 14 }, fill: 0.7, map: E },
    { budget: 44, goals: { rocks: 1, chain: 12 }, wolf: "normal", map: "...... .4..4. ...... ...... ..CC.. ...... ...... .4..4. ......" },
    { budget: 50, goals: { thorns: 1, ice: 1 }, wolf: "normal", night: true, map: "T....T ...... .J..J. ...... ..TT.. ...... .J..J. ...... T....T" },
    { budget: 36, goals: { own: 70 }, fill: 0.35, wolf: "normal", map: "...... ...... ...... ..CC.. ...... ..CC.. ...... ...... ......" },
    { budget: 60, goals: { rocks: 1, wake: 4, ice: 1 }, night: true, map: "T.CC.T .G..G. ..33.. Z....Z ..II.. Z....Z ..33.. .G..G. T....T" },
    { budget: 34, goals: { wake: 4, chain: 10 }, fill: 0.55, map: "Z....Z ...... ...... ...... ...... ...... ...... ...... Z....Z" },
    { budget: 60, goals: { rocks: 1, thorns: 1, ice: 1 }, wolf: "normal", night: true, map: "T.33.T ...... .J..J. ...... ..CC.. ...... .J..J. ...... T.33.T" },
    { budget: 60, goals: { boss: 1 }, boss: 22, wolf: "normal", night: true, map: "T....T .3..3. ...... ..BB.. ..BB.. ...... .3..3. .C..C. T....T" },
  ];
  const PER_WORLD = 15;
  const worldOf = (n) => (n === "daily" ? Dates.dailyNumber() % 3 : Math.min(2, Math.floor((n - 1) / PER_WORLD)));
  const ROCK_DEFAULT = 2;
  const WOLF = "#8b8f9c";
  const SLEEP = "#c9c9d4";
  const GOAL_ICONS = { rocks: "rock", thorns: "thorn", ice: "ice", crates: "crate", wake: "zzz", chain: "bolt", own: "grass", boss: "crown" };
  const BOOSTERS = [["line", "Line sheep", "bolt"], ["bomb", "Bomb sheep", "sparkle"], ["plus", `+${SAGA.boosterPlus} sheep`, "plus"]];

  // ---------- progress (in the save file) ----------
  const prog = () => {
    const p = Save.mode("saga").progress;
    p.stars ??= [];
    p.fails ??= [];
    p.skipped ??= [];
    p.boosters ??= { line: 1, bomb: 1, plus: 1 };
    p.award ??= 0;
    p.daily ??= {};
    return p;
  };
  const cleared = (k) => (prog().stars[k] || 0) > 0 || !!prog().skipped[k];
  function unlocked() {
    if (Save.data.dev.unlockAll) return LEVELS.length;
    let n = 1;
    while (n < LEVELS.length && cleared(n - 1)) n++;
    return n;
  }
  const totalStars = () => prog().stars.reduce((a, b) => a + (b || 0), 0);
  const finalBeaten = () => (prog().stars[LEVELS.length - 1] || 0) > 0;

  // ---------- Daily Pasture: a level made from today's date, the same for everyone ----------
  function dailyLevel() {
    const day = Dates.today();
    const r = RNG(hashStr("pasture-" + day));
    const grid = Array.from({ length: 9 }, () => Array(6).fill("."));
    const kinds = r.shuffle(["rock", "ice", "sleep", "crate", "thorn"]).slice(0, 2 + r.int(2));
    const goals = {};
    let budget = 26;
    // blockers go in mirrored pairs, which reads as a designed level
    const put = (ch, n) => {
      for (let k = 0; k < n; k++) {
        const row = 1 + r.int(7);
        const col = r.int(3);
        grid[row][col] = ch;
        grid[8 - row][5 - col] = ch;
      }
    };
    for (const kind of kinds) {
      if (kind === "rock") {
        put(String(2 + r.int(2)), 2);
        goals.rocks = 1;
        budget += 10;
      } else if (kind === "ice") {
        put(r() < 0.5 ? "I" : "J", 2);
        goals.ice = 1;
        budget += 8;
      } else if (kind === "sleep") {
        put("Z", 2);
        goals.wake = 3;
        budget += 6;
      } else if (kind === "crate") {
        put("C", 2);
        goals.crates = 1;
        budget += 8;
      } else {
        put("T", 2);
        goals.thorns = 1;
        budget += 10;
      }
    }
    if (r() < 0.5) goals.chain = 8 + r.int(5);
    const L = { budget, goals, map: grid.map((row) => row.join("")).join(" "), night: r() < 0.25, daily: day };
    // the stamps never block every way through: count real goals
    if (goals.wake) goals.wake = Math.min(goals.wake, L.map.split("Z").length - 1);
    return L;
  }
  const levelOf = (lvl) => (lvl === "daily" ? dailyLevel() : LEVELS[lvl - 1]);

  // ---------- level setup ----------
  function buildLevel(G, s) {
    const lvl = s.lvl;
    const L = levelOf(lvl);
    const b = G.b;
    const rows = L.map.split(" ");
    const D = (G.data = {
      lvl, L, budget: L.budget, score: 0, maxChain: 0, woke: 0, quiet: 0, thornAt: 0, finale: null, won: false, bossHp: L.boss || 0, bossCells: [],
      ice: new Int8Array(b.size), iceMax: new Int8Array(b.size), emptyAt: 0, spread: 0, help: !!s.help, booster: s.booster || null,
    });
    // the same level always deals the same starting flock, so a retry is a fair retry
    const r = RNG(hashStr(`saga-${L.daily || lvl}`));
    for (let row = 0; row < b.rows; row++)
      for (let c = 0; c < b.cols; c++) {
        const i = row * b.cols + c;
        const ch = rows[row][c];
        if (ch >= "1" && ch <= "5") {
          b.kind[i] = "rock";
          b.hp[i] = b.mhp[i] = Number(ch) || ROCK_DEFAULT;
        } else if (ch === "T") b.kind[i] = "thorn";
        else if (ch === "G") b.kind[i] = "gate";
        else if (ch === "Z") b.kind[i] = "sleep";
        else if (ch === "C") b.kind[i] = "crate";
        else if (ch === "B") {
          b.kind[i] = "boss";
          D.bossCells.push(i);
        } else if (ch === "I" || ch === "J") {
          D.ice[i] = D.iceMax[i] = ch === "I" ? 1 : 2;
          b.owner[i] = 0;
          b.count[i] = 1 + r.int(Engine.capacity(b, i) - 1);
        } else if (r() < (L.fill ?? SAGA.fill)) {
          b.owner[i] = 0;
          b.count[i] = 1 + r.int(Engine.capacity(b, i) - 1);
        }
      }
    D.thornAt = SAGA.thornSpreadSecs * 1000;
    const p0 = G.players[0];
    if (D.booster === "plus") D.budget += SAGA.boosterPlus;
    else if (D.booster) p0.special = D.booster;
    // the Shepherd's help: a few more sheep and a Line sheep ready
    if (D.help) {
      D.budget += SAGA.helpSheep;
      if (!p0.special) p0.special = "line";
    }
    D.startBudget = D.budget;
    p0.placed = true;
  }

  let rockCount = 0;
  const count = (G, kind) => {
    let n = 0;
    for (let i = 0; i < G.b.size; i++) if (G.b.kind[i] === kind) n++;
    return n;
  };
  const iceLeft = (G) => {
    let n = 0;
    for (let i = 0; i < G.b.size; i++) if (G.data.ice[i] > 0) n++;
    return n;
  };
  const playable = (G) => {
    let n = 0;
    for (let i = 0; i < G.b.size; i++) if (!G.b.kind[i]) n++;
    return n;
  };
  const ownPct = (G) => Math.floor((100 * S.cellsOf(0)) / Math.max(1, playable(G)));

  // [goal, left-or-progress, done, share done (0..1)]
  function goalState(G) {
    const D = G.data;
    const out = [];
    for (const [g, v] of Object.entries(D.L.goals)) {
      if (g === "rocks" || g === "thorns" || g === "crates") {
        const n = count(G, g === "rocks" ? "rock" : g === "thorns" ? "thorn" : "crate");
        D.start ??= {};
        D.start[g] ??= Math.max(1, n);
        out.push([g, n, n === 0, 1 - n / D.start[g]]);
      }
      if (g === "ice") {
        const n = iceLeft(G);
        D.start ??= {};
        D.start.ice ??= Math.max(1, n);
        out.push([g, n, n === 0, 1 - n / D.start.ice]);
      }
      if (g === "wake") out.push([g, `${Math.min(D.woke, v)}/${v}`, D.woke >= v, D.woke / v]);
      if (g === "chain") out.push([g, `${Math.min(D.maxChain, v)}/${v}`, D.maxChain >= v, D.maxChain / v]);
      if (g === "own") out.push([g, `${Math.min(ownPct(G), v)}%`, ownPct(G) >= v, ownPct(G) / v]);
      if (g === "boss") out.push([g, D.bossHp, D.bossHp <= 0, 1 - D.bossHp / D.L.boss]);
    }
    return out;
  }
  const goalPills = (goals) => goals.map(([g, v, ok]) => `<span class="obj${ok ? " ok" : ""}">${Icons.get(GOAL_ICONS[g])}<b>${ok ? Icons.get("check") : esc(v)}</b></span>`).join("");
  const goalPreview = (L) => goalPills(Object.entries(L.goals).map(([g, v]) => [g, g === "boss" ? L.boss : g === "own" ? `${v}%` : g === "wake" || g === "chain" ? v : "all", false]));

  // ---------- blockers ----------
  // A sheep (from a burst or a special) reaching one of this game's blockers. True when it took the sheep.
  function hitBlocker(G, i, who) {
    const b = G.b;
    const D = G.data;
    const mine = who === 0;
    if (D.ice[i] > 0) {
      D.ice[i]--;
      if (mine) D.score += SAGA.points.ice;
      S.effect("hit", i, "#bfe9ff", G.time);
      S.puff(i, "#bfe9ff", 5);
      Sfx.chime(D.ice[i] ? 9 : 14);
      return true;
    }
    const kind = b.kind[i];
    if (!kind || kind === "rock") {
      if (kind === "rock" && mine) D.score += SAGA.points.hit;
      return false; // rocks are the core's
    }
    if (kind === "boss") {
      D.bossHp--;
      if (mine) D.score += SAGA.points.hit;
      Sfx.hit(Math.min(8, D.bossHp));
      for (const k of D.bossCells) S.effect("hit", k, "#ffffff", G.time);
      S.shake(3);
      if (D.bossHp <= 0) {
        for (const k of D.bossCells) {
          b.kind[k] = null;
          S.puff(k, "#9aa0aa", 10);
        }
        D.score += SAGA.points.rock * 5;
        S.shout(G.players[0], "Crumbled!", 1.6);
        Sfx.crack();
        S.shake(12);
        S.rebuildPath();
      }
      return true;
    }
    b.kind[i] = null;
    if (kind === "thorn") {
      if (mine) D.score += SAGA.points.thorn;
      D.thornAt = G.time + SAGA.thornSpreadSecs * 1000;
      Sfx.blip(700, 0.08, "triangle", 0.06, 300);
      S.puff(i, "#7bd36b", 6);
    } else if (kind === "gate") {
      if (mine) D.score += SAGA.points.gate;
      Sfx.blip(220, 0.12, "triangle", 0.07, 120);
      S.puff(i, "#c08a4a", 6);
    } else if (kind === "crate") {
      if (mine) D.score += SAGA.points.crate;
      if (S.isPlayer(who)) S.loadSpecial(G.players[who], G.rng.pick(["line", "bomb", "line", "bomb", "overflow"]));
      Sfx.crack();
      S.puff(i, "#b07a40", 8);
    } else if (kind === "sleep") {
      // the lost sheep wakes up and joins whoever reached him
      b.owner[i] = who;
      b.count[i] = 1;
      if (mine) {
        D.woke++;
        D.score += SAGA.points.wake;
        Sfx.bleat(1.3);
      }
      S.puff(i, G.players[who]?.color ?? "#fff", 6);
    }
    return true;
  }

  function spreadThorn(G) {
    const b = G.b;
    const thorns = [];
    for (let i = 0; i < b.size; i++) if (b.kind[i] === "thorn") thorns.push(i);
    G.rng.shuffle(thorns);
    for (const t of thorns) {
      const free = Engine.neighbours(b, t).filter((k) => !b.kind[k] && b.owner[k] === -1);
      if (free.length) {
        b.kind[G.rng.pick(free)] = "thorn";
        G.data.spread++;
        Sfx.blip(160, 0.15, "triangle", 0.06, 110);
        return;
      }
    }
  }

  // The celebration: leftover sheep fly in as Line and Bomb sheep and go off one by one.
  function finaleStep(G, now) {
    const D = G.data;
    const b = G.b;
    if (now < D.finale.next || D.budget <= 0) return;
    D.finale.next = now + SAGA.finaleGap;
    D.budget--;
    D.score += SAGA.points.leftover;
    if (D.finale.flown >= SAGA.finaleMax) return;
    D.finale.flown++;
    const spots = [];
    for (let i = 0; i < b.size; i++) if (!b.kind[i] && !b.tag[i] && !D.ice[i] && (b.owner[i] === 0 || b.owner[i] === -1)) spots.push(i);
    if (!spots.length) return;
    const i = G.rng.pick(spots);
    b.owner[i] = 0;
    b.count[i] = Engine.capacity(b, i);
    b.tag[i] = G.rng() < 0.5 ? { type: "line", dir: G.rng() < 0.5 ? "row" : "col" } : { type: "bomb", dir: null };
    S.puff(i, "#ffcf4a", 6);
    Sfx.blip(500 + D.finale.flown * 40, 0.12, "triangle", 0.07, 900 + D.finale.flown * 40);
  }
  function starsFor(D) {
    const left = D.finale.left / D.startBudget;
    return D.help ? 1 : left >= SAGA.stars[1] ? 3 : left >= SAGA.stars[0] ? 2 : 1;
  }

  // ---------- drawing ----------
  function drawThorn(g, cx, cy, r, t) {
    g.strokeStyle = "#2c5a2a";
    g.lineWidth = r * 0.12;
    g.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Art.TAU + Math.sin(t * 2) * 0.05;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.stroke();
    Art.circle(g, cx, cy, r * 0.55, "#3f7a35");
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Art.TAU + 0.3;
      Art.circle(g, cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35, r * 0.08, "#c94a6a");
    }
  }
  function drawGate(g, x, y, c) {
    g.fillStyle = "#8a5a2b";
    for (const px of [0.18, 0.5, 0.82]) g.fillRect(x + c * px - c * 0.05, y + c * 0.15, c * 0.1, c * 0.75);
    g.fillStyle = "#b07a40";
    for (const py of [0.3, 0.62]) g.fillRect(x + c * 0.08, y + c * py, c * 0.84, c * 0.1);
  }
  function drawCrate(g, x, y, c) {
    const s = c * 0.7;
    const x0 = x + (c - s) / 2;
    const y0 = y + (c - s) / 2;
    g.fillStyle = "#b07a40";
    g.fillRect(x0, y0, s, s);
    g.strokeStyle = "#6e4720";
    g.lineWidth = c * 0.06;
    g.strokeRect(x0, y0, s, s);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + s, y0 + s);
    g.moveTo(x0 + s, y0);
    g.lineTo(x0, y0 + s);
    g.stroke();
    Art.circle(g, x + c / 2, y + c / 2, c * 0.13, "#ffcf4a");
  }
  function drawSleeper(g, cx, cy, r, t) {
    Art.drawSheep(g, cx, cy, r, SLEEP);
    g.fillStyle = "#e8f0ff";
    g.font = `700 ${Math.round(r * 0.9)}px Fredoka, system-ui`;
    g.fillText("z", cx + r * 0.8, cy - r * 0.9 - Math.sin(t * 2) * r * 0.2);
  }
  function drawIce(g, x, y, c, hp, max, t) {
    g.fillStyle = hp > 1 ? "rgba(170,225,255,0.62)" : "rgba(190,235,255,0.45)";
    g.beginPath();
    g.roundRect(x + 3, y + 3, c - 6, c - 6, 6);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 1.5;
    g.stroke();
    g.beginPath();
    g.moveTo(x + c * 0.2, y + c * 0.3);
    g.lineTo(x + c * 0.35, y + c * 0.18);
    g.moveTo(x + c * 0.72, y + c * 0.75);
    g.lineTo(x + c * 0.82, y + c * 0.62);
    if (hp < max) {
      g.moveTo(x + c * 0.5, y + c * 0.1);
      g.lineTo(x + c * 0.42, y + c * 0.45);
      g.lineTo(x + c * 0.6, y + c * 0.62);
      g.lineTo(x + c * 0.5, y + c * 0.9);
    }
    g.stroke();
    g.globalAlpha = 0.25 + 0.2 * Math.sin(t * 3 + x);
    g.fillStyle = "#fff";
    g.fillRect(x + c * 0.15, y + c * 0.12, c * 0.08, c * 0.3);
    g.globalAlpha = 1;
  }

  // the dawn over Night Valley, once the last boss falls
  function drawDawn(g, w, h, t) {
    const p = Math.min(1, t / 3);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, Art.alpha("#20305a", 1 - p * 0.7));
    sky.addColorStop(0.6, "#ff9e7a");
    sky.addColorStop(1, "#ffe3b0");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    const sy = h * (0.95 - p * 0.35);
    const sun = g.createRadialGradient(w / 2, sy, 4, w / 2, sy, h * 0.8);
    sun.addColorStop(0, "rgba(255,240,180,0.95)");
    sun.addColorStop(1, "rgba(255,240,180,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, w, h);
    Art.circle(g, w / 2, sy, h * 0.12, "#fff3b8");
    g.fillStyle = "#2b4f4a";
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.78 + Math.sin(x / 40) * 8);
    g.lineTo(w, h);
    g.fill();
    Art.drawShepherd(g, w * 0.78, h * 0.82, h * 0.6, { t, rays: true });
    const jump = Save.settings.reduced ? 0 : Math.abs(Math.sin(t * 5)) * 8;
    Art.drawLamb(g, w * 0.38, h * 0.66 - jump, h * 0.55, { t, mood: "joy", look: Progress.look() });
  }

  // ---------- the world map ----------
  const MAP = { gap: 84, top: 80, bottom: 70 };
  const nodeY = (k) => MAP.top + (LEVELS.length - 1 - k) * MAP.gap;
  const nodeX = (k, w) => w / 2 + Math.sin(k * 0.9) * w * 0.3;
  let mapSel = 1;
  let walkFrom = 0;
  let panel = { booster: null, help: true };
  const sec = document.createElement("section");
  sec.className = "screen saga-map";
  sec.id = "scr-sagamap";
  sec.hidden = true;
  document.body.append(sec);

  Nav.define("sagamap", {
    render(el, params) {
      const p = prog();
      const open = unlocked();
      mapSel = Math.min(open, params.sel ?? open);
      el.innerHTML = "";
      el.append(UI.header("Sheep Saga", { right: UI.h("span", { class: "chip", html: `${Icons.get("star")}<b>${totalStars()}</b>` }) }));
      const scroll = UI.h("div", { class: "map-scroll" });
      const inner = UI.h("div", { class: "map-inner" });
      const cv = UI.h("canvas");
      const lambCv = UI.h("canvas", { class: "map-lamb" });
      inner.append(cv, lambCv);
      scroll.append(inner);
      const panelEl = UI.h("div", { class: "map-panel" });
      el.append(scroll, panelEl);
      const w = Math.min(460, el.clientWidth || 390);
      const h = MAP.top + MAP.bottom + (LEVELS.length - 1) * MAP.gap;
      inner.style.height = `${h}px`;
      inner.style.width = `${w}px`;
      drawMap(Art.sharp(cv, w, h), w, h);
      WORLDS.forEach((wd, k) => {
        const lab = UI.h("div", { class: "world-label" }, wd.name);
        lab.style.top = `${nodeY(k * PER_WORLD) + 44}px`;
        inner.append(lab);
      });
      LEVELS.forEach((L, k) => {
        const n = k + 1;
        const stars = p.stars[k] || 0;
        const locked = n > open;
        const btn = UI.h("button", {
          class: `node${L.boss ? " boss" : ""}${locked ? " locked" : stars ? " done" : p.skipped[k] ? " skipped" : ""}${n === mapSel ? " sel" : ""}`,
          "aria-label": `Level ${n}${locked ? ", locked" : ""}`,
          html: `${locked ? Icons.get("lock") : L.boss ? Icons.get("crown") : `<b>${n}</b>`}<span class="st">${locked ? "" : [0, 1, 2].map((s) => Icons.get(s < stars ? "star" : "starOutline")).join("")}</span>`,
        });
        btn.style.left = `${nodeX(k, w)}px`;
        btn.style.top = `${nodeY(k)}px`;
        btn.onclick = () => {
          if (locked) return UI.toast("Clear the level before it first", { icon: "lock" });
          mapSel = n;
          inner.querySelectorAll(".node.sel").forEach((e) => e.classList.remove("sel"));
          btn.classList.add("sel");
          placeLamb(n, false);
          renderPanel(panelEl);
        };
        inner.append(btn);
      });
      const lg = Art.sharp(lambCv, 64, 56);
      Art.drawLamb(lg, 32, 30, 50, { look: Progress.look(), mood: "happy" });
      const placeLamb = (n, instant) => {
        if (instant) lambCv.style.transition = "none";
        lambCv.style.left = `${nodeX(n - 1, w)}px`;
        lambCv.style.top = `${nodeY(n - 1)}px`;
        if (instant) {
          void lambCv.offsetWidth;
          lambCv.style.transition = "";
        }
      };
      placeLamb(params.walk && walkFrom ? walkFrom : mapSel, true);
      if (params.walk && walkFrom) {
        setTimeout(() => {
          placeLamb(mapSel, false);
          Sfx.bleat(1.2);
        }, 300);
        walkFrom = 0;
        params.walk = false;
      }
      requestAnimationFrame(() => (scroll.scrollTop = nodeY(mapSel - 1) - scroll.clientHeight * 0.55));
      renderPanel(panelEl);
    },
    onShow() {
      const m = WORLDS[worldOf(mapSel)].music;
      Music.play(m.song, "gentle", m.bpm - 20);
      Music.setLayer(0);
    },
  });

  function drawMap(g, w, h) {
    // each world a band of its own sky, with a winding path through them
    for (let wd = 0; wd < 3; wd++) {
      const yTop = wd === 2 ? 0 : nodeY(wd * PER_WORLD + PER_WORLD - 1) - MAP.gap / 2;
      const yBot = wd === 0 ? h : nodeY(wd * PER_WORLD) + MAP.gap / 2;
      const cols = wd === 2 && finalBeaten() ? WORLDS[2].dawn : WORLDS[wd].sky;
      const gr = g.createLinearGradient(0, yTop, 0, yBot);
      gr.addColorStop(0, cols[0]);
      gr.addColorStop(1, cols[1]);
      g.fillStyle = gr;
      g.fillRect(0, yTop, w, yBot - yTop);
      const r = RNG(wd + 3);
      for (let k = 0; k < 26; k++) {
        const tx = r() * w;
        const ty = yTop + r() * (yBot - yTop);
        if (wd === 0) {
          Art.circle(g, tx, ty, 2.5, ["#ffffff", "#ffd84a", "#ff9ac1"][k % 3]);
        } else if (wd === 1) Art.ellipse(g, tx, ty, 16, 10, 0, "rgba(90,70,40,0.18)");
        else if (!finalBeaten()) Art.circle(g, tx, ty, 1.6, "rgba(255,255,230,0.7)");
        else Art.circle(g, tx, ty, 2.2, "rgba(255,255,255,0.35)");
      }
    }
    g.strokeStyle = "#c8a46a";
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    for (let k = 0; k < LEVELS.length; k++) (k ? g.lineTo : g.moveTo).call(g, nodeX(k, w), nodeY(k));
    g.stroke();
    g.setLineDash([6, 10]);
    g.strokeStyle = "#f3e2b8";
    g.lineWidth = 3;
    g.stroke();
    g.setLineDash([]);
  }

  function renderPanel(box) {
    const n = mapSel;
    const L = LEVELS[n - 1];
    const p = prog();
    const fails = p.fails[n - 1] || 0;
    const canHelp = fails >= SAGA.helpAfter && !(p.stars[n - 1] > 0);
    const canSkip = fails >= SAGA.skipAfter && !cleared(n - 1) && n < LEVELS.length;
    panel.booster = null;
    panel.help = canHelp;
    box.innerHTML = `<h3>${L.boss ? `${Icons.get("crown")} Boss · ` : ""}Level ${n} <small>${WORLDS[worldOf(n)].name}</small></h3>
      <div class="goals">${goalPreview(L)}<span class="obj">${Icons.get("sheep")}<b>${L.budget}</b></span></div>
      <div class="boosters" id="sg-boost"></div>
      ${canHelp ? `<label class="help-row"><span>${Icons.get("crook")} ${STRINGS.grace.help}</span></label>` : ""}
      <button class="btn primary big" id="sg-play">${Icons.get("play")}<span>Play level ${n}</span></button>
      ${canSkip ? `<button class="btn ghost" id="sg-skip"><span>${STRINGS.grace.skip}</span></button>` : ""}`;
    if (canHelp) {
      const row = box.querySelector(".help-row");
      row.append(UI.toggle(true, (v) => (panel.help = v), STRINGS.help));
    }
    const bb = box.querySelector("#sg-boost");
    for (const [k, label, icon] of BOOSTERS) {
      const have = p.boosters[k] || 0;
      const b = UI.h("button", { class: "boost", disabled: !have, html: `${Icons.get(icon)}<span>${esc(label)}</span><small>×${have}</small>` });
      b.onclick = () => {
        panel.booster = panel.booster === k ? null : k;
        bb.querySelectorAll(".boost").forEach((x) => x.classList.remove("on"));
        if (panel.booster) b.classList.add("on");
      };
      bb.append(b);
    }
    box.querySelector("#sg-play").onclick = () => playLevel(n);
    const skip = box.querySelector("#sg-skip");
    if (skip) skip.onclick = () => {
      p.skipped[n - 1] = true;
      Save.save();
      walkFrom = n;
      Nav.go("sagamap", { sel: n + 1, walk: true }, { replace: true });
    };
  }

  function playLevel(n, o = {}) {
    const p = prog();
    const s = { lvl: n, help: o.help ?? panel.help, booster: o.booster ?? panel.booster };
    if (s.booster) {
      p.boosters[s.booster]--;
      Save.save();
    }
    Save.mode("saga").setup = { lvl: n };
    Save.save();
    App.play("saga", s);
  }

  // ---------- the mode ----------
  Modes.register({
    key: "saga",
    title: "Sheep Saga",
    how: ["Clear the goals before your sheep run out.", "Break rocks, crack ice, wake lost sheep and beat the bosses!"],
    solo: true,
    get music() {
      const lvl = S.setup?.lvl ?? 1;
      return WORLDS[worldOf(lvl)].music;
    },
    setupDefaults: { lvl: 1 },
    // Play and Continue go straight to the next level; the card opens the map
    open: () => Nav.go("sagamap", {}),
    continueSetup: () => ({ lvl: unlocked() }),
    continueLabel: () => `Level ${unlocked()}`,
    bestLine: () => `Level ${unlocked()} · ${totalStars()} stars`,
    daily: () => App.play("saga", { lvl: "daily" }, { seed: hashStr("pasture-play-" + Dates.today()) }),
    dailyDone: () => !!prog().daily[Dates.today()],
    theme: (s) => WORLDS[worldOf(s.lvl)].theme,
    players(s) {
      const L = levelOf(s.lvl);
      const list = [{ seat: 0, kind: s.bot ? "ai" : "human", level: s.bot || null }];
      if (L.wolf) list.push({ seat: -1, kind: "ai", level: L.wolf, color: WOLF, name: "Wolf", team: 1, pos: 27, persona: "sneaky" });
      return list;
    },
    tips: [
      { id: "rock", on: "start", icon: "rock", text: "Burst next to rocks to crack them", when: (G) => G.data.L.teach === "rock" },
      { id: "sleep", on: "start", icon: "zzz", text: "Reach lost sheep with a burst", when: (G) => G.data.L.teach === "sleep" },
      { id: "gate", on: "start", icon: "flag", text: "Bursts knock gates down", when: (G) => G.data.L.teach === "gate" },
      { id: "crate", on: "start", icon: "crate", text: "Crates hold a special sheep", when: (G) => G.data.L.teach === "crate" },
      { id: "ice", on: "start", icon: "ice", text: "Crack the ice with bursts", when: (G) => G.data.L.teach === "ice" },
      { id: "ice2", on: "start", icon: "ice", text: "Thick ice needs two cracks", when: (G) => G.data.L.teach === "ice2" },
      { id: "boss", on: "start", icon: "crown", text: "Burst into the big rock!", when: (G) => G.data.L.teach === "boss" },
      { id: "thorn", on: "start", icon: "thorn", text: "Clear thorns before they spread", when: (G) => G.data.L.teach === "thorn" },
      { id: "wolf", on: "start", icon: "wolf", text: "The wolf wants your pasture!", when: (G) => G.data.L.teach === "wolf" },
      { id: "night", on: "start", icon: "moon", text: "Your lantern lights the way", when: (G) => G.data.L.teach === "night" },
    ],
    help: [
      { title: "Clear the goals", text: "The icons at the top are your goals. Clear them all before your sheep run out.", draw: (g, w, h, t) => helpGoals(g, w, h, t) },
      { title: "Bursts do the work", text: "Rocks, ice, gates and crates only break when a burst reaches them. Plan your chains.", draw: (g, w, h, t) => helpBreak(g, w, h, t) },
      { title: "Spare sheep shine", text: "Sheep left over fly in as specials. More left over means more stars.", draw: (g, w, h, t) => helpStars(g, w, h, t) },
    ],
    badges: [
      { id: "first", icon: "leaf", name: "First pasture", desc: "Clear level 1", test: (c) => c.won && c.setup.lvl === 1 },
      { id: "w1", icon: "leaf", name: "Green Pastures", desc: "Beat the level 15 boss", test: (c) => c.won && c.setup.lvl === 15 },
      { id: "w2", icon: "rock", name: "Rocky Hills", desc: "Beat the level 30 boss", test: (c) => c.won && c.setup.lvl === 30 },
      { id: "w3", icon: "sun", name: "Dawn in the valley", desc: "Beat the final boss", test: (c) => c.won && c.setup.lvl === 45 },
      { id: "three", icon: "star", name: "Shining", desc: "3 stars on any level", test: (c) => c.stars === 3 },
      { id: "ten", icon: "star", name: "Star flock", desc: "3 stars on 10 levels", test: () => prog().stars.filter((x) => x === 3).length >= 10 },
      { id: "chain15", icon: "bolt", name: "Chain 15", desc: "Make a 15-chain", test: (c) => c.humans.some((p) => p.best >= 15) },
      { id: "thorn", icon: "thorn", name: "Neat gardener", desc: "Clear a thorn level before any spread", test: (c) => c.won && c.G.data.L.goals.thorns && c.G.data.spread === 0 },
      { id: "daily", icon: "calendar", name: "Daily Pasture", desc: "Clear a Daily Pasture", test: (c) => c.won && c.setup.lvl === "daily" },
    ],
    // results: stars, boosters, milestones, and where Play again / Next go
    results(sum) {
      const G = sum.G;
      const D = G.data;
      const p = prog();
      const won = !!D.won;
      const lvl = D.lvl;
      const out = { records: [], recordNames: {}, ctx: { stars: D.stars || 0 } };
      if (lvl === "daily") {
        if (won) {
          const prev = p.daily[Dates.today()] || 0;
          p.daily[Dates.today()] = Math.max(prev, D.score);
          out.wool = 30;
        }
        out.html = `<p class="daily-tag">${Icons.get("leaf")} Daily Pasture · ${esc(Dates.today())}</p>${won ? `<p class="score">${fmtNum(D.score)}</p>` : ""}`;
        out.againLabel = "Try again";
        out.again = () => App.play("saga", { lvl: "daily" }, { seed: hashStr("pasture-play-" + Dates.today()) });
        out.shareLine = won ? `Daily Pasture: ${fmtNum(D.score)}` : "";
        Save.save();
        return out;
      }
      const k = lvl - 1;
      if (won) {
        const prev = p.stars[k] || 0;
        p.stars[k] = Math.max(prev, D.stars);
        p.fails[k] = 0;
        p.cleared = p.stars.filter((x) => x > 0).length;
        if (D.stars === 3) {
          // every 3-star finish earns a booster, in turn
          const kind = BOOSTERS[p.award % 3][0];
          p.boosters[kind] = (p.boosters[kind] || 0) + 1;
          p.award++;
          out.booster = kind;
        }
        // star milestones: Wardrobe gifts
        const total = totalStars();
        for (const [need, item] of SAGA.milestones) {
          if (total >= need && !Save.profile.owned[item]) {
            Save.profile.owned[item] = 1;
            out.gift = item;
          }
        }
        out.records.push({ key: `lvl${lvl}`, value: D.score });
        out.recordNames[`lvl${lvl}`] = `score on level ${lvl}`;
        out.wool = D.stars * 4 + (LEVELS[k].boss ? 20 : 0);
      } else {
        p.fails[k] = (p.fails[k] || 0) + 1;
      }
      Save.mode("saga").setup = { lvl: won && lvl < LEVELS.length ? lvl + 1 : lvl };
      p.next = unlocked();
      Save.save();
      const st = D.stars || 0;
      const fails = p.fails[k] || 0;
      out.html = `<div class="stars">${[0, 1, 2].map((s) => Icons.get(s < st ? "star" : "starOutline")).join("")}</div>
        ${won ? `<p class="score">${fmtNum(D.score)}</p>` : `<div class="goals">${goalPills(D.finalGoals)}</div>`}
        ${out.booster ? `<p class="pill sky">${Icons.get("gift")} Booster: <b>${esc(BOOSTERS.find((b) => b[0] === out.booster)[1])}</b></p>` : ""}
        ${out.gift ? `<p class="pill gold">${Icons.get("star")} ${totalStars()} stars! New: <b>${esc(Progress.BY_ID.get(out.gift).name)}</b></p>` : ""}
        ${!won && fails >= SAGA.helpAfter ? `<p class="pill">${Icons.get("crook")} ${STRINGS.grace.help}</p>` : ""}`;
      if (won && lvl < LEVELS.length) {
        out.next = () => {
          walkFrom = lvl;
          Nav.go("sagamap", { sel: lvl + 1, walk: true }, { replace: true });
        };
        out.againLabel = "Replay";
      } else if (!won) out.againLabel = STRINGS.grace.retry;
      // a retry after enough fails comes with the Shepherd's help
      out.again = () => App.play("saga", { lvl, help: !won && fails >= SAGA.helpAfter, booster: null });
      out.shareLine = won ? `Level ${lvl}: ${"★".repeat(st)}` : "";
      return out;
    },
    drawResult(g, w, h, t, won, sum) {
      if (!(won && sum.setup.lvl === LEVELS.length)) return false;
      drawDawn(g, w, h, t);
      return true;
    },
    hooks: {
      setup(G, s) {
        buildLevel(G, s);
        if (G.data.L.night) G.data.night = true;
      },
      hud(G) {
        S.setHud(goalPills(goalState(G)));
      },
      noElimination: true,
      roundSecs: () => Infinity,
      timerHtml: (G) => `${Icons.get("sheep")} ${G.data.budget}`,
      inPath: (G, i) => G.b.kind[i] !== "rock" && G.b.kind[i] !== "boss",
      refillMs: (G, pl) => (pl.id === 1 ? SAGA.wolfRefill * 1000 : undefined),
      blocked: (G, i) => !!G.b.kind[i] || G.data.ice[i] > 0,
      canBurst: (G, b, i) => !(G.data.ice[i] > 0),
      afterDrop(G, pl) {
        if (pl.id === 0) G.data.budget--;
      },
      onWaste(G, pl) {
        if (pl.id === 0) G.data.budget--;
      },
      land: (G, b, from, to, who) => hitBlocker(G, to, who),
      specialHit: (G, k, who) => hitBlocker(G, k, who),
      onRockBreak(G, i, who) {
        if (who !== 0) return;
        G.data.score += SAGA.points.rock;
        if (G.rng() < SAGA.rockSpecialChance) S.loadSpecial(G.players[0], G.b.mhp[i] >= 3 ? "bomb" : "line");
      },
      onChain(G, pl, prev, cur) {
        if (pl.id === 0) G.data.maxChain = Math.max(G.data.maxChain, cur);
      },
      afterWave(G, now, bursts) {
        const D = G.data;
        // the finale's fireworks are for show: leftover sheep score a flat bonus instead
        if (!D.finale) D.score += bursts[0] * SAGA.points.burst * Math.min(10, Math.max(1, G.players[0].chain));
        D.quiet = bursts[0] ? 0 : D.quiet + 1; // only your own chains hold the ending back
        if (D.budget <= 0 && !D.emptyAt) D.emptyAt = now;
      },
      // A planner for the player's seat (used to test level balance, and by nobody else): charge
      // squares up, then fire a burst when it reaches blockers or makes the chain a goal needs.
      aiDecide(G, pl, now, skill) {
        if (pl.id !== 0) return "default";
        const D = G.data;
        if (pl.pen <= 0 || D.finale || now < pl.lockUntil) return;
        const b = G.b;
        const i = S.cursorCell(pl);
        if (b.kind[i] || D.ice[i] > 0 || (b.owner[i] !== 0 && b.owner[i] !== -1)) return;
        const cap = Engine.capacity(b, i);
        const n = b.owner[i] === 0 ? b.count[i] : 0;
        D.wait = (D.wait || 0) + 1;
        let go = false;
        if (n + 1 >= cap) {
          // simulate the burst: how many go off, and how many blockers they reach
          const sc = G.scratch;
          for (let k = 0; k < b.size; k++) {
            sc.owner[k] = b.owner[k];
            sc.count[k] = b.count[k];
            sc.rock[k] = b.rock[k] || !!b.kind[k];
          }
          sc.owner[i] = 0;
          sc.count[i] = n + 1;
          let bursts = 0;
          let hits = 0;
          Engine.resolve(sc, {
            maxWaves: 60,
            canBurst: (bb, c) => bb.owner[c] === 0 && !(D.ice[c] > 0),
            targets: (bb, c) => {
              bursts++;
              const t = Engine.neighbours(bb, c);
              for (const [dr, dc] of Engine.ORTHO) {
                const r = Engine.rowOf(bb, c) + dr;
                const cc = Engine.colOf(bb, c) + dc;
                if (Engine.inside(bb, r, cc) && (b.kind[r * bb.cols + cc] || D.ice[r * bb.cols + cc] > 0)) hits++;
              }
              return t;
            },
          }, false);
          const need = D.L.goals.chain || 0;
          go = hits > 0 || (need && bursts >= Math.min(need, 4 + D.wait / 20)) || bursts >= 6 || D.wait > 60;
        } else {
          // charging: prefer squares next to blockers, and keep a little in hand
          let near = 0;
          for (const k of Engine.neighbours(b, i)) if (b.kind[k] || D.ice[k] > 0) near++;
          go = n + 1 === cap - 1 ? near > 0 || D.wait > 12 : D.wait > 30;
        }
        if (!go) return;
        D.wait = 0;
        const [lo, hi] = skill.react;
        pl.aiPlan = { cell: i, at: now + lo + G.rng() * (hi - lo) };
      },
      aiValue(G, pl, i) {
        if (pl.id !== 0) return 0;
        const b = G.b;
        let near = 0;
        for (const k of Engine.neighbours(b, i)) if (b.kind[k] || G.data.ice[k]) near++;
        const bursts = b.count[i] + 1 >= Engine.capacity(b, i) && (b.owner[i] === -1 || b.owner[i] === 0);
        return near * (bursts ? 4 : 0.6);
      },
      update(G, now) {
        const D = G.data;
        const p0 = G.players[0];
        if (D.budget <= 0 && !D.finale) p0.pen = 0;
        if (now >= D.thornAt) {
          D.thornAt = now + SAGA.thornSpreadSecs * 1000;
          if (!D.finale) spreadThorn(G);
        }
        if (D.finale) finaleStep(G, now);
        const goals = goalState(G);
        S.setHud(goalPills(goals));
        if (!D.finale && goals.every(([, , ok]) => ok)) {
          // won: the leftover sheep celebrate
          D.finale = { next: now + 500, flown: 0, left: D.budget };
          p0.kind = "finale";
          p0.special = null;
          if (p0.chain) p0.best = Math.max(p0.best, p0.chain);
          p0.chain = 0;
          p0.noChain = true;
          for (const pl of G.players) if (pl.id !== 0) pl.observer = true;
          S.shout(p0, "Hallelujah!", 1.85);
          Sfx.win();
          buzz([60, 40, 120]);
        }
      },
      endCheck(G, now) {
        const D = G.data;
        if (D.finale) {
          if (D.budget > 0 || D.quiet < 5) return null;
          D.won = true;
          D.stars = starsFor(D);
          const title = D.lvl === "daily" ? "Daily Pasture cleared!" : D.lvl === LEVELS.length ? "Dawn in the valley!" : D.L.boss ? "Boss beaten!" : "Rejoice!";
          return { team: 0, title, sub: D.lvl === "daily" ? `Score ${fmtNum(D.score)}` : `Level ${D.lvl} cleared`, color: "#d9a12a" };
        }
        if (D.budget <= 0 && (D.quiet >= 7 || now - D.emptyAt > 4000)) {
          D.finalGoals = goalState(G);
          // near misses get encouragement
          const done = D.finalGoals.reduce((a, g) => a + Math.min(1, g[3]), 0) / D.finalGoals.length;
          return { team: -1, title: done >= 0.75 ? "So close!" : "Out of sheep", sub: done >= 0.75 ? "Nearly there. One more go?" : "Every try teaches the flock something.", sad: true };
        }
        return null;
      },
      drawCell(ctx, G, i, x, y, c, t) {
        const kind = G.b.kind[i];
        if (!kind || kind === "rock" || kind === "box") return false;
        if (kind === "thorn") drawThorn(ctx, x + c / 2, y + c / 2, c * 0.38, t);
        else if (kind === "gate") drawGate(ctx, x, y, c);
        else if (kind === "crate") drawCrate(ctx, x, y, c);
        else if (kind === "sleep") drawSleeper(ctx, x + c / 2, y + c / 2 + c * 0.05, c * 0.2, t);
        return true; // boss cells are drawn as one big rock over the top
      },
      drawOver(ctx, G, c, t) {
        const D = G.data;
        const b = G.b;
        for (let i = 0; i < b.size; i++) if (D.ice[i] > 0) drawIce(ctx, Engine.colOf(b, i) * c, Engine.rowOf(b, i) * c, c, D.ice[i], D.iceMax[i], t);
        const k = S.cursorCell(G.players[0]);
        const lx = (Engine.colOf(b, k) + 0.5) * c;
        const ly = (Engine.rowOf(b, k) + 0.5) * c;
        if (D.bossHp > 0 && D.bossCells.length) {
          let r0 = 99;
          let c0 = 99;
          for (const q of D.bossCells) {
            r0 = Math.min(r0, Engine.rowOf(b, q));
            c0 = Math.min(c0, Engine.colOf(b, q));
          }
          S.drawRock(ctx, (c0 + 1) * c, (r0 + 1) * c + Math.sin(t * 3) * 1.5, c * 0.85, D.bossHp, D.L.boss, lx, ly);
        }
        if (D.night && !D.finale) {
          const grad = ctx.createRadialGradient(lx, ly, c * 1.1, lx, ly, c * 2.4);
          grad.addColorStop(0, "rgba(6,10,24,0)");
          grad.addColorStop(1, "rgba(6,10,24,0.93)");
          ctx.fillStyle = grad;
          ctx.fillRect(-2, -2, b.cols * c + 4, b.rows * c + 4);
        }
      },
    },
  });
  void rockCount;

  // ---------- the "?" card animations ----------
  function helpGoals(g, w, h, t) {
    const items = ["rock", "ice", "zzz"];
    items.forEach((ic, k) => {
      const x = w * (0.22 + k * 0.28);
      const done = (t * 0.6) % 3 > k;
      Art.rrect(g, x - 30, h * 0.35, 60, 40, 14, done ? "#cfe8c8" : "#fffdf8");
      g.fillStyle = done ? "#2c6b39" : "#5d6d5f";
      g.font = "700 18px Fredoka, system-ui";
      g.textAlign = "center";
      g.fillText(done ? "✓" : ["2", "3", "1/2"][k], x + 8, h * 0.35 + 27);
      drawMini(g, ic, x - 14, h * 0.35 + 20);
    });
    g.textAlign = "start";
  }
  function drawMini(g, kind, x, y) {
    if (kind === "rock") Art.ellipse(g, x, y, 9, 7, 0, "#8a8f99");
    else if (kind === "ice") Art.rrect(g, x - 8, y - 8, 16, 16, 4, "rgba(150,210,255,0.9)");
    else Art.drawSheep(g, x, y, 6, SLEEP);
  }
  function helpBreak(g, w, h, t) {
    const c = 34;
    const x0 = w / 2 - 1.5 * c;
    const y0 = 12;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
      g.fillStyle = (r + k) % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0 + k * c, y0 + r * c, c, c);
    }
    const p = (t % 2.5) / 2.5;
    const hp = p < 0.5 ? 2 : 1;
    S.drawRock(g, x0 + 2.5 * c, y0 + 1.5 * c, c * 0.4, hp, 2, x0, y0);
    Art.drawSheep(g, x0 + 1.5 * c + (p > 0.4 && p < 0.5 ? (p - 0.4) * 10 * c : 0), y0 + 1.5 * c, 7, "#ff5a5f");
  }
  function helpStars(g, w, h, t) {
    for (let k = 0; k < 3; k++) {
      const on = (t * 0.8) % 4 > k + 1;
      g.fillStyle = on ? "#ffcf4a" : "rgba(43,58,47,0.2)";
      g.beginPath();
      Art.starPath(g, w * (0.3 + k * 0.2), h * 0.4 - (k === 1 ? 10 : 0), 22, 9);
      g.fill();
    }
    Art.drawSheep(g, w * 0.2 + ((t * 60) % (w * 0.6)), h * 0.78, 9, "#ffcf4a");
  }
})();
