// ============================== CORE ==============================
// The Stampede match core: real-time Chain Reaction with one button per player.
// The simulation runs in fixed 60 Hz steps from a seed, and every button press is logged by
// step number, so a match can be replayed exactly (Chain of the Match, Save Clip) and
// inputs could one day come over a network. Modes plug in their rules as hooks.
const Core = (() => {
  // ---------------- constants ----------------
  const STEP_MS = 1000 / 60;
  const RANK = { line: 1, bomb: 2, overflow: 3 };
  const SHOUTS = [[5, "Nice!", 1], [8, "Baa-rilliant!", 1.25], [12, "Overflowing!", 1.5], [16, "Hallelujah!", 1.85]];
  const LOCK_MS = 1000;
  const WAVE_MS = 140;
  const MAX_RUN = 60; // waves in a row before a runaway cascade settles
  const NEUTRAL = 90; // owner id of grey sheep: they never burst, and a burst claims them
  const PAD = 8; // board margin, where the edge-bar pen display lives
  const ROW_H = 22; // strip above each button for the sheep-row pen display
  const BOTTOM = [true, false, false, true]; // seat 0 bottom-left, 1 top-right, 2 top-left, 3 bottom-right
  const OWN_LEFT = [true, true, false, false]; // left side as that player sees it
  const KEYS = ["A", "P", "Q", "L"]; // keyboard key per seat
  // AI levels: pick = gain needed to drop, idle = chance to drop anyway, miss = chance of a wasted drop,
  // react = human-like reaction time (ms), look = squares ahead it considers, depth = how far into
  // a cascade it can foresee (its skill, really: nobody sees the whole stampede coming)
  const AI = {
    easy: { pick: 7, idle: 0.05, miss: 0.15, react: [300, 420], look: 0, depth: 6 },
    normal: { pick: 4, idle: 0.08, miss: 0.05, react: [210, 340], look: 0, depth: 20 },
    hard: { pick: 2, idle: 0.03, miss: 0.01, react: [170, 260], look: 1, depth: 70, pounce: 0.65 },
    expert: { pick: 1.5, idle: 0.02, miss: 0, react: [150, 230], look: 2, depth: 160, pounce: 0.5 },
  };
  // named personalities: a bold chain-seeker, a patient defender, a sneaky stealer
  const PERSONAS = {
    bold: { name: "Bolt", desc: "chases big chains", chain: 0.6, steal: 0, guard: 0, reserve: 0 },
    patient: { name: "Mossy", desc: "guards and waits", chain: 0, steal: 0, guard: 1.2, reserve: 2 },
    sneaky: { name: "Nibbles", desc: "steals your sheep", chain: 0, steal: 1.4, guard: 0, reserve: 0 },
  };
  const PERSONA_ORDER = ["bold", "sneaky", "patient"];
  const REFILL_SCALE = [1, 1, 1, 1.4 / 1.1, 1.7 / 1.1]; // by number of players

  // ---------------- state ----------------
  let V = null; // the mode
  let H = {}; // its hooks
  let G = null; // the round being played
  let setup = null;
  let tune = null;
  let match = null;
  let opts = {};
  let phase = "idle"; // idle | play | paused | between | over | replay
  let quiet = false; // fast-forwarding a replay: no sound, shouts or effects
  const geo = { cell: 40, dpr: 1, w: 0, h: 0, lowRes: false };
  const band = { top: { w: 0, h: 0 }, bottom: { w: 0, h: 0 } };
  const rects = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const seatPlayer = [null, null, null, null];
  let boardCv;
  let ctx;
  let topCv;
  let topCtx;
  let botCv;
  let botCtx;
  let acc = 0;
  let lastFrame = 0;
  let frameNo = 0;
  let rafId = 0;
  const EMPTY = [];
  const settings = () => Save.settings;

  const now = () => (G ? G.time : 0);

  // ---------------- board helpers ----------------
  const isPlayer = (o) => o >= 0 && o < G.players.length;
  const cellsOf = (p) => {
    let n = 0;
    for (let i = 0; i < G.b.size; i++) if (G.b.owner[i] === p) n++;
    return n;
  };
  const orbsOf = (p) => {
    let n = 0;
    for (let i = 0; i < G.b.size; i++) if (G.b.owner[i] === p) n += G.b.count[i];
    return n;
  };
  const sameTeam = (a, b) => a === b || (isPlayer(a) && isPlayer(b) && G.players[a].team === G.players[b].team);
  const cursorCell = (pl) => {
    const len = G.path.length;
    return G.path[((pl.pos % len) + len) % len];
  };
  const humans = () => G.players.filter((p) => p.human);

  function buildPath() {
    const b = G.b;
    G.path.length = 0;
    for (let r = 0; r < b.rows; r++)
      for (let k = 0; k < b.cols; k++) {
        const i = r * b.cols + (r % 2 ? b.cols - 1 - k : k);
        if (!b.rock[i] && (H.inPath ? H.inPath(G, i) : b.kind[i] !== "rock")) G.path.push(i);
      }
    if (!G.path.length) G.path.push(0);
  }
  // rebuild the path but keep each cursor on the square it was on
  function rebuildPath() {
    const at = G.players.map((pl) => cursorCell(pl));
    const oldLen = G.path.length;
    buildPath();
    G.players.forEach((pl, k) => {
      const p = G.path.indexOf(at[k]);
      pl.pos = p >= 0 ? p : Math.floor((((pl.pos % oldLen) + oldLen) % oldLen) * (G.path.length / oldLen));
    });
  }

  // ---------------- players ----------------
  // seat config (from the setup screen): { kind, level, persona, name, color, look, assist, speed, pen }
  function newPlayer(p, id) {
    const seatCfg = (p.seat >= 0 && setup.seats?.[p.seat]) || {};
    const pal = App.palette();
    const ci = p.colorIndex ?? seatCfg.color ?? (p.seat >= 0 ? p.seat : id) % 4;
    const kind = p.kind ?? seatCfg.kind ?? "human";
    const level = kind === "ai" ? resolveLevel(p.level ?? seatCfg.level ?? "normal") : null;
    const persona = kind === "ai" ? p.persona ?? seatCfg.persona ?? PERSONA_ORDER[id % 3] : null;
    const assist = !!(p.assist ?? seatCfg.assist);
    const speed = (p.speed ?? seatCfg.speed ?? 1) * (assist ? 0.75 : 1);
    const basePen = p.penMax ?? (seatCfg.pen ? seatCfg.pen : null);
    const pl = {
      id, seat: -1, team: id, kind, level, persona,
      color: pal.colors[ci], colorIndex: ci, sym: Art.SYMBOLS[p.symIndex ?? ci],
      name: kind === "ai" ? `${PERSONAS[persona]?.name ?? "AI"}` : seatCfg.name || (id === 0 && p.seat === 0 ? Save.profile.name : pal.names[ci]),
      look: seatCfg.look || null, trail: null, burst: null,
      speed, dir: 1, penMax: basePen !== null ? basePen + (assist ? 2 : 0) : assist ? tune.pen + 2 : undefined,
      pen: 0, refillAt: 0, lockUntil: 0, special: null, lineDir: "row",
      alive: true, placed: false, chain: 0, chainStart: 0, best: 0, mood: null, moodUntil: 0, aiPlan: null, score: 0, nextStep: 0, pos: null,
      observer: false, pressAt: -1e9, lastTapAt: 0, taps: 0, drops: 0, wastes: 0, empties: 0, bursts: 0, specials: 0,
      lockRun: 0, hintUntil: 0, hintDrops: 0, worstRank: 0,
      ...p,
    };
    pl.kind = kind;
    pl.human = kind === "human"; // stays true even while a game borrows the seat
    pl.pen = penCap(pl);
    // the main player wears their wardrobe; other humans pick a look on the setup screen
    if (pl.human && !pl.look && pl.seat === firstHumanSeat()) {
      const eq = Save.profile.equipped;
      pl.look = { hat: eq.hat, scarf: eq.scarf, bell: eq.bell, glasses: eq.glasses, wool: eq.wool };
      pl.trail = eq.trail;
      pl.burst = eq.burst;
      pl.pattern = eq.pattern;
    }
    return pl;
  }
  function firstHumanSeat() {
    const list = V.players(setup);
    for (const p of list) {
      const k = p.kind ?? setup.seats?.[p.seat]?.kind ?? "human";
      if (k === "human" && p.seat >= 0) return p.seat;
    }
    return -1;
  }
  // "auto" follows how well you've been doing against the AI
  function resolveLevel(level) {
    if (level !== "auto") return AI[level] ? level : "normal";
    const r = Save.profile.ai.rating;
    return r < 0.25 ? "easy" : r < 0.5 ? "normal" : r < 0.75 ? "hard" : "expert";
  }
  const penCap = (pl) => pl.penMax ?? tune.pen;

  // ---------------- rounds ----------------
  function startRound(seed) {
    const dims = V.board ? V.board(setup) : { rows: V.rows ?? 9, cols: V.cols ?? 6 };
    const b = Engine.createBoard(dims.rows, dims.cols, { tag: null, kind: null, hp: 0, mhp: 0 });
    G = {
      b, players: [], path: [], time: 0, tick: 0, waveAt: 0, run: 0, over: false, rush: false, solo: false, data: {},
      seed: seed >>> 0, rng: RNG(seed), log: [], replay: null,
      flights: EMPTY, flightAt: 0, popAt: new Float64Array(b.size), incoming: new Int16Array(b.size), lastTimer: "",
      shakeAmp: 0, shakeAt: 0, bgDirty: true, bob: 0, lastHud: "", bestChain: null, fs: null, tipsShown: 0, rankAt: 0,
      t0: 0, holdUntil: 0, startedAt: Date.now(), scratch: Engine.createBoard(dims.rows, dims.cols),
    };
    G.players = V.players(setup).map((p, id) => newPlayer(p, id));
    // two AI lambs with the same personality get told apart
    const named = new Map();
    for (const pl of G.players) {
      const n = named.get(pl.name) || 0;
      named.set(pl.name, n + 1);
      if (n && pl.kind === "ai") pl.name += n === 1 ? " Jr" : ` ${n + 1}`;
    }
    G.solo = typeof V.solo === "function" ? !!V.solo(setup) : !!V.solo;
    seatPlayer.fill(null);
    for (const pl of G.players) if (pl.seat >= 0) seatPlayer[pl.seat] = pl;
    if (opts.firstSteps) G.fs = { stage: 0, at: 0 };
    H.setup?.(G, setup, match, opts);
    buildPath();
    // fair starts: each player's cursor begins in the board corner on their side
    const corners = [(b.rows - 1) * b.cols, b.cols - 1, 0, b.size - 1];
    G.players.forEach((pl, k) => {
      if (pl.pos !== null) return;
      const at = pl.seat >= 0 ? G.path.indexOf(corners[pl.seat]) : -1;
      pl.pos = at >= 0 ? at : Math.floor((k * G.path.length) / G.players.length);
    });
    $("game").classList.toggle("solo", G.solo);
    $("game").classList.toggle("left", G.solo && settings().leftHanded);
    $("game").classList.remove("rush");
    G.lastHud = "";
    $("hud").textContent = "";
    H.hud?.(G);
    layout();
    acc = 0;
    showTip("start");
  }

  // a new game (not the next round of a match). o: { seed, firstSteps, onEnd, onBetween, record }
  function start(mode, s, o = {}) {
    stopLoop();
    V = mode;
    H = V.hooks || {};
    setup = s;
    opts = o;
    tune = { ...CONFIG.tune, ...(V.tune || {}), ...(V.tuneFor?.(s) || {}) };
    match = V.match && s.bestOf > 1 ? { round: 1, wins: {}, need: Math.ceil(s.bestOf / 2), recs: [] } : null;
    phase = "play";
    quiet = false;
    Sound.quiet = false;
    startRound(o.seed ?? (Math.random() * 4294967296) >>> 0);
    musicFor(false);
    startLoop();
  }
  function nextRound() {
    if (phase !== "between") return;
    match.round++;
    phase = "play";
    startRound((G.seed * 1103515245 + 12345) >>> 0);
    musicFor(false);
  }
  function musicFor(rush) {
    if (quiet) return;
    const m = App.musicFor(V);
    Music.play(m.song, m.style, m.bpm);
    Music.setLayer(rush ? 2 : 1);
    Music.setRate(rush ? 1.12 : 1);
  }

  const refillMs = (pl) => {
    let n = 0;
    for (const p of G.players) if (!p.observer) n++;
    const base = H.refillMs?.(G, pl) ?? tune.refill * 1000 * (G.solo ? 1 : REFILL_SCALE[Math.min(4, n)]);
    return base / (G.rush ? 2 : 1);
  };

  function defaultCanDrop(pl, i) {
    const b = G.b;
    if (b.rock[i] || (H.blocked ? H.blocked(G, i, pl) : b.kind[i])) return false;
    const o = b.owner[i];
    return o === -1 || o === pl.id || (isPlayer(o) && sameTeam(o, pl.id));
  }
  const canDropAt = (pl, i) => (H.canDrop ? H.canDrop(G, pl, i, defaultCanDrop) : defaultCanDrop(pl, i));

  // ---------------- input ----------------
  // A button press from any controller (touch, keyboard; one day the network).
  function press(seat) {
    if (!G || phase !== "play" || G.over) return;
    const pl = seatPlayer[seat];
    if (!pl || pl.kind !== "human") return;
    pl.pressAt = G.time;
    pl.lastTapAt = G.time;
    G.log.push(G.tick, pl.id);
    drop(pl);
  }

  // The one action: drop a sheep (or the loaded special) where the cursor is.
  function drop(pl) {
    if (!G || G.over || !pl.alive || pl.observer) return;
    const t = G.time;
    if (t < G.holdUntil) return;
    if (pl.kind === "human") pl.taps++;
    if (t < pl.lockUntil) return;
    if (pl.pen <= 0) {
      if (pl.kind === "human") {
        pl.empties++;
        Sfx.empty();
        hapt(35);
      }
      return;
    }
    H.beforeDrop?.(G, pl, t);
    const i = cursorCell(pl);
    pl.pen--;
    if (!pl.refillAt) pl.refillAt = t + refillMs(pl);
    if (!canDropAt(pl, i)) {
      pl.lockUntil = t + LOCK_MS;
      pl.wastes++;
      pl.lockRun++;
      mood(pl, "oops", LOCK_MS);
      Sfx.waste();
      if (pl.kind === "human") {
        hapt([40, 60, 40]);
        smartHint(pl);
        showTip("lock", pl);
      }
      H.onWaste?.(G, pl, i);
      return;
    }
    pl.lockRun = 0;
    pl.placed = true;
    pl.drops++;
    if (pl.hintUntil) pl.hintDrops++;
    const special = pl.special;
    pl.special = null;
    const b = G.b;
    const o = b.owner[i];
    if (o >= 0 && o !== pl.id && sameTeam(o, pl.id)) b.count[i]++;
    else Engine.place(b, i, pl.id);
    G.popAt[i] = t;
    if (pl.kind === "human") {
      hapt(8);
      if (G.fs && G.fs.stage === 0) firstStepsNext(1);
    }
    H.afterDrop?.(G, pl, i, special, t);
    if (special) pl.specials++;
    if (special === "overflow") overflow(pl, t);
    else if (special) {
      b.tag[i] = { type: special, dir: special === "line" ? pl.lineDir : null };
      if (special === "line") pl.lineDir = pl.lineDir === "row" ? "col" : "row";
      Sfx.load(special);
    } else Sfx.drop();
  }

  function overflow(pl, t) {
    const b = G.b;
    const fx = effect("overflow", -1, pl.color, t);
    for (let i = 0; i < b.size; i++)
      if (b.owner[i] === pl.id) {
        b.count[i]++;
        G.popAt[i] = t;
        if (fx) fx.cells[fx.n++] = i;
      }
    shout(pl, "Overflow!", 1.3);
    Sfx.special("overflow");
  }

  function landOn(to, who) {
    const b = G.b;
    const v = b.owner[to];
    if (isPlayer(v) && v !== who && sameTeam(v, who)) b.count[to]++;
    else {
      b.owner[to] = who;
      b.count[to]++;
    }
    G.popAt[to] = G.time;
  }

  // Core blockers: Grumpy Rocks (take hits) and gift boxes (open into a special).
  function hitKind(i, who) {
    const b = G.b;
    const kind = b.kind[i];
    if (kind === "rock") {
      b.hp[i]--;
      Sfx.hit(b.hp[i]);
      effect("hit", i, "#ffffff", G.time);
      puff(i, "#c7cad1", 3);
      if (b.hp[i] <= 0) {
        b.kind[i] = null;
        Sfx.crack();
        puff(i, "#9aa0aa", 8);
        H.onRockBreak?.(G, i, who);
        rebuildPath();
        showTip("rock");
      }
      return true;
    }
    if (kind === "box") {
      b.kind[i] = null;
      const pick = V.boxSpecials || ["line", "line", "bomb", "bomb", "overflow"];
      if (isPlayer(who)) {
        loadSpecial(G.players[who], pick[G.rng.int(pick.length)]);
        shout(G.players[who], "Gift!", 1.1);
      }
      Sfx.chime(4);
      puff(i, "#e050ad", 8);
      H.onBox?.(G, i, who);
      return true;
    }
    return false;
  }

  // ---------------- waves ----------------
  const burstsBy = new Int32Array(8);
  const pending = [];
  const landQ = [];
  const waveRules = {
    canBurst: (b, i) => {
      const o = b.owner[i];
      return isPlayer(o) && G.players[o].alive && (H.canBurst ? H.canBurst(G, b, i) : true);
    },
    targets: (b, i) => {
      const who = b.owner[i];
      burstsBy[who]++;
      if (b.tag[i]) {
        pending.push(b.tag[i].type, b.tag[i].dir, i, who);
        b.tag[i] = null;
      }
      const t = Engine.neighbours(b, i);
      return H.targets ? H.targets(G, b, i, t) : t;
    },
    emptied: (b, i) => {
      b.owner[i] = -1;
      H.emptied?.(G, b, i);
    },
    // landings wait until the wave is over, then go down in a shuffled (seeded) order:
    // the engine lands bursts in board order, which would hand contested squares to one flock
    land: (b, from, to, who) => landQ.push(from, to, who),
    maxWaves: 1,
  };
  function applyLandings() {
    const b = G.b;
    const n = landQ.length / 3;
    for (let k = n - 1; k > 0; k--) {
      const j = G.rng.int(k + 1);
      for (let f = 0; f < 3; f++) {
        const tmp = landQ[k * 3 + f];
        landQ[k * 3 + f] = landQ[j * 3 + f];
        landQ[j * 3 + f] = tmp;
      }
    }
    for (let k = 0; k < n; k++) {
      const from = landQ[k * 3];
      const to = landQ[k * 3 + 1];
      const who = landQ[k * 3 + 2];
      if (!G.players[who].alive) continue;
      if (H.land?.(G, b, from, to, who)) continue;
      if (b.kind[to] && hitKind(to, who)) continue;
      landOn(to, who);
    }
    landQ.length = 0;
  }

  function tickWave() {
    const n = G.players.length;
    burstsBy.fill(0);
    pending.length = 0;
    const { waves } = Engine.resolve(G.b, waveRules, false);
    applyLandings();
    G.flights = waves.length ? waves[0].bursts : EMPTY;
    G.flightAt = G.time;
    if (!quiet) for (const f of G.flights) puff(f.from, G.players[f.who]?.color ?? "#fff", 3, G.players[f.who]?.burst);
    for (let k = 0; k < pending.length; k += 4) special(pending[k], pending[k + 1], pending[k + 2], pending[k + 3]);
    G.run = waves.length ? G.run + 1 : 0;
    if (G.run > (V.maxRun ?? MAX_RUN)) {
      for (let i = 0; i < G.b.size; i++) if (G.b.owner[i] >= 0 && !G.b.rock[i]) G.b.count[i] = Math.min(G.b.count[i], Engine.capacity(G.b, i) - 1);
      G.run = 0;
    }
    chains(n);
    H.afterWave?.(G, G.time, burstsBy);
    if (!H.noElimination && !G.fs) eliminate();
  }

  function areaFor(type, dir, i) {
    const b = G.b;
    const r0 = Engine.rowOf(b, i);
    const c0 = Engine.colOf(b, i);
    const out = [];
    const add = (r, c) => Engine.inside(b, r, c) && r * b.cols + c !== i && out.push(r * b.cols + c);
    if (type === "line") for (let k = 0; k < (dir === "row" ? b.cols : b.rows); k++) dir === "row" ? add(r0, k) : add(k, c0);
    else if (type === "bomb") for (const [dr, dc] of Engine.ALL8) add(r0 + dr, c0 + dc);
    else if (type === "cross") {
      for (let k = 0; k < b.cols; k++) add(r0, k);
      for (let k = 0; k < b.rows; k++) if (k !== r0) add(k, c0);
    } else if (type === "bigcross") {
      for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (Math.abs(r - r0) <= 1 || Math.abs(c - c0) <= 1) add(r, c);
    } else if (type === "blast") for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) add(r0 + dr, c0 + dc);
    return out;
  }
  const COMBOS = { "line+line": "cross", "bomb+line": "bigcross", "bomb+bomb": "blast" };
  const COMBO_SHOUT = { cross: "Cross!", bigcross: "Mega cross!", blast: "Ka-baa-m!" };

  // A special sheep's square burst: it takes its area, combining with any special it sets off.
  function special(type, dir, cell, who) {
    const b = G.b;
    let area = areaFor(type, dir, cell);
    const other = area.find((k) => b.tag[k]);
    if (other !== undefined) {
      const combo = COMBOS[[type, b.tag[other].type].sort().join("+")];
      b.tag[other] = null;
      if (combo) {
        type = combo;
        area = areaFor(combo, null, cell);
        shout(G.players[who], COMBO_SHOUT[combo], 1.4);
      }
    }
    for (const k of area) {
      if (b.rock[k] || H.specialHit?.(G, k, who)) continue;
      if (b.kind[k] && hitKind(k, who)) continue;
      landOn(k, who);
    }
    const fx = effect(type, cell, G.players[who].color, G.time);
    if (fx) for (const k of area) fx.cells[fx.n++] = k;
    shake(type === "blast" || type === "bigcross" ? 9 : 5);
    Sfx.special(type);
    hapt(type === "blast" ? 80 : 40);
    H.onSpecial?.(G, { type, cell, who }, type, area);
  }

  function loadSpecial(pl, type) {
    if (pl.special && RANK[type] <= RANK[pl.special]) return;
    pl.special = type;
    Sfx.load(type);
    if (pl.human) showTip("special", pl);
  }

  function chains(n) {
    let top = 0;
    for (let p = 0; p < n; p++) {
      const pl = G.players[p];
      const k = burstsBy[p];
      if (pl.noChain) continue; // a mode's celebration fireworks don't count as a chain
      if (k > 0) {
        const prev = pl.chain;
        if (prev === 0) pl.chainStart = G.tick;
        pl.chain += k;
        pl.bursts += k;
        rewards(pl, prev, pl.chain);
        H.onChain?.(G, pl, prev, pl.chain, G.time);
        if (pl.chain > top) top = pl.chain;
      } else if (pl.chain > 0) endChain(pl);
    }
    if (!top) return;
    Sfx.burst(top);
    if (top >= 2) shout(null, `Chain x${top}!`, 0.9, "#ffcf4a", "chain");
    shake(Math.min(10, 1 + top * 0.35));
    if (top === 8 || top === 16) hapt(top === 16 ? 120 : 60);
    if (G.fs && G.fs.stage === 1 && top >= 3) firstStepsNext(2);
  }
  function endChain(pl) {
    pl.best = Math.max(pl.best, pl.chain);
    H.chainEnd?.(G, pl, pl.chain, G.time);
    if (!G.bestChain || pl.chain > G.bestChain.len) G.bestChain = { pid: pl.id, len: pl.chain, from: pl.chainStart, to: G.tick };
    pl.chain = 0;
  }

  const crossed = (prev, cur, at) => prev < at && cur >= at;
  function rewards(pl, prev, cur) {
    if (crossed(prev, cur, pl.lineAt ?? tune.lineAt)) loadSpecial(pl, "line");
    if (crossed(prev, cur, tune.plusAt)) pl.pen = Math.min(penCap(pl), pl.pen + 2);
    if (crossed(prev, cur, tune.bombAt)) loadSpecial(pl, "bomb");
    if (crossed(prev, cur, tune.fullAt)) pl.pen = penCap(pl);
    if (crossed(prev, cur, pl.overflowAt ?? tune.overflowAt)) loadSpecial(pl, "overflow");
    for (let lvl = 0; lvl < SHOUTS.length; lvl++) {
      const [at, word, scale] = SHOUTS[lvl];
      if (crossed(prev, cur, at)) {
        shout(pl, word, scale);
        Sfx.shout(lvl);
        if (lvl >= 2) Sfx.bleat(1.2);
      }
    }
    if (cur >= 6) mood(pl, "cheer", 1400);
  }

  // Knock out flocks with no sheep once everyone has dropped at least once.
  function eliminate() {
    let ready = true;
    for (const pl of G.players) if (!pl.observer && pl.alive && !pl.placed) ready = false;
    if (!ready) return;
    for (const pl of G.players) {
      if (pl.observer || !pl.alive || orbsOf(pl.id) > 0) continue;
      pl.alive = false;
      pl.special = null;
      Sfx.howl();
      shout(pl, V.outShout ?? "Resting!", 1.2);
      hapt(100);
    }
  }

  // Default ending: last team standing, or most squares (then most sheep) when time runs out.
  function defaultEnd(left) {
    const teams = new Map();
    for (const pl of G.players) if (!pl.observer) teams.set(pl.team, teams.get(pl.team) || pl.alive);
    const alive = [...teams].filter(([, a]) => a).map(([t]) => t);
    if (alive.length === 1 && teams.size > 1) return { team: alive[0], why: "last" };
    if (left <= 0) {
      const score = (t) => G.players.filter((pl) => pl.team === t && pl.alive).reduce((s, pl) => s + cellsOf(pl.id) * 1000 + orbsOf(pl.id), 0);
      const ranked = [...teams.keys()].sort((a, b) => score(b) - score(a));
      return { team: ranked.length > 1 && score(ranked[0]) === score(ranked[1]) ? -1 : ranked[0], why: "time" };
    }
    return null;
  }

  const counted = (p) => p.seat >= 0 || !p.observer;
  const teamName = (t) => G.players.filter((p) => p.team === t && counted(p)).map((p) => p.name).join(" & ");
  const teamColor = (t) => G.players.find((p) => p.team === t)?.color ?? "#ffcf4a";
  const humanWon = (res) => res.team >= 0 && G.players.some((p) => p.human && p.team === res.team);

  // A round has ended: next round of a match, or the results.
  function endRound(res) {
    if (G.over) return;
    G.over = true;
    G.res = res;
    for (const pl of G.players) if (pl.chain > 0) endChain(pl);
    if (phase === "replay") return;
    $("game").classList.remove("rush");
    hideHint();
    const rec = { seed: G.seed, log: G.log.slice(), setup: structuredClone(setup), round: match?.round ?? 1, best: G.bestChain, players: G.players.map((p) => ({ level: p.level, persona: p.persona })), endTick: G.tick, hash: boardHash() };
    if (match) match.recs.push(rec);
    if (match && res.team !== undefined && !res.final) {
      if (res.team >= 0) match.wins[res.team] = (match.wins[res.team] || 0) + 1;
      const champ = Object.keys(match.wins).find((t) => match.wins[t] >= match.need);
      if (champ === undefined) {
        phase = "between";
        Music.setLayer(0);
        (humanWon(res) ? Sfx.chime(5) : Sfx.chime(0));
        setTimeout(() => opts.onBetween?.(roundSummary(res)), 650);
        return;
      }
      res.matchWon = Number(champ);
      res.team = Number(champ);
    }
    phase = "over";
    const sum = summary(res, rec);
    (res.sad ?? (!humanWon(res) && humans().length)) ? Sfx.lose() : Sfx.win();
    Music.setLayer(0);
    Music.setRate(1);
    const ended = G;
    setTimeout(() => G === ended && opts.onEnd?.(sum), 700);
  }

  function roundSummary(res) {
    const teams = [...new Set(G.players.filter(counted).map((p) => p.team))];
    return {
      res, title: res.team >= 0 ? `${teamName(res.team)} take${teamName(res.team).includes("&") ? "" : "s"} the round!` : "Tied round!",
      color: res.team >= 0 ? teamColor(res.team) : null,
      teams: teams.map((t) => ({ team: t, name: teamName(t), color: teamColor(t), sym: G.players.find((p) => p.team === t).sym, wins: match.wins[t] || 0 })),
      need: match.need, round: match.round, humanWon: humanWon(res),
    };
  }

  // Everything the results screen needs.
  function summary(res, rec) {
    const live = G.players.filter(counted);
    const hs = humans();
    const won = humanWon(res);
    const stat = (p) => ({
      id: p.id, name: p.name, color: p.color, sym: p.sym, team: p.team, human: p.human, kind: p.kind, level: p.level, persona: p.persona,
      best: Math.max(p.best, p.chain), drops: p.drops, wastes: p.wastes, bursts: p.bursts, specials: p.specials, cells: cellsOf(p.id), worstRank: p.worstRank, look: p.look,
    });
    const players = live.map(stat);
    // awards (only when more than one flock played)
    const awards = [];
    if (live.length > 1) {
      const top = (key, list = players) => list.reduce((a, b) => (b[key] > a[key] ? b : a), list[0]);
      const ch = top("best");
      if (ch.best >= 3) awards.push({ id: "chain", who: ch, value: `x${ch.best}` });
      const winners = res.team >= 0 ? players.filter((p) => p.team === res.team) : [];
      const teams = new Set(players.map((p) => p.team)).size;
      const back = teams > 1 ? winners.filter((p) => p.worstRank === live.length && live.length > 1) : [];
      if (back.length) awards.push({ id: "comeback", who: back[0], value: "" });
      const shooters = players.filter((p) => p.drops >= 5);
      if (shooters.length) {
        const acc2 = (p) => p.drops / (p.drops + p.wastes);
        const best = shooters.reduce((a, b) => (acc2(b) > acc2(a) ? b : a));
        awards.push({ id: "sharp", who: best, value: `${Math.round(acc2(best) * 100)}%` });
      }
      const bee = top("drops");
      if (bee.drops > 0) awards.push({ id: "busy", who: bee, value: `${bee.drops}` });
    }
    // the best chain of the whole match, with the round that holds it
    let chainRec = null;
    for (const r of match ? match.recs : [rec]) if (r.best && (!chainRec || r.best.len > chainRec.best.len)) chainRec = r;
    return {
      res, won, mode: V.key, setup, firstSteps: !!opts.firstSteps, solo: G.solo,
      title: res.title ?? (res.team < 0 ? STRINGS.results.tie : hs.length === 1 ? (won ? STRINGS.results.win : STRINGS.results.lose) : `${teamName(res.team)} win${teamName(res.team).includes("&") ? "" : "s"}!`),
      sub: res.sub ?? (res.team >= 0 && hs.length === 1 && won ? STRINGS.results.winSub : res.matchWon !== undefined ? "Match won!" : res.why === "last" ? "Last flock grazing." : res.why === "time" ? "Most squares when time ran out." : ""),
      color: res.color ?? (res.team >= 0 ? teamColor(res.team) : null),
      players, humans: players.filter((p) => p.human), awards, chainRec: chainRec?.best?.len >= 4 && !opts.firstSteps ? chainRec : null,
      match: match ? { wins: { ...match.wins }, need: match.need, teams: [...new Set(players.map((p) => p.team))].map((t) => ({ team: t, name: teamName(t), color: teamColor(t), wins: match.wins[t] || 0 })) } : null,
      secs: Math.round(G.time / 1000), G,
    };
  }

  // ---------------- AI ----------------
  // Values a drop on square i by simulating it on a scratch board. Never peeks at anything a
  // player couldn't see, and never at the random numbers to come.
  function copyInto(dst, src) {
    for (let i = 0; i < src.size; i++) {
      dst.owner[i] = src.owner[i];
      dst.count[i] = src.count[i];
      dst.rock[i] = src.rock[i];
    }
  }
  const aiRules = { maxWaves: 40, canBurst: (bb, c) => isPlayer(bb.owner[c]) };
  function valueAt(pl, i, depth = 40) {
    const b = G.b;
    if (!canDropAt(pl, i)) return -Infinity;
    const mine = (o) => o === pl.id || (isPlayer(o) && sameTeam(o, pl.id));
    const theirs = (o) => isPlayer(o) && !sameTeam(o, pl.id);
    const score = (bb) => evaluate(bb, mine, theirs);
    const after = G.scratch;
    copyInto(after, b);
    Engine.place(after, i, pl.id);
    let theirsBefore = 0;
    for (let k = 0; k < b.size; k++) if (theirs(b.owner[k])) theirsBefore++;
    aiRules.maxWaves = depth;
    const { waves } = Engine.resolve(after, aiRules, false);
    let gain = score(after) - score(b) + (H.aiValue?.(G, pl, i) ?? 0);
    const P = PERSONAS[pl.persona];
    if (P) {
      gain += waves.length * P.chain;
      if (P.steal) {
        let theirsAfter = 0;
        for (let k = 0; k < b.size; k++) if (theirs(after.owner[k])) theirsAfter++;
        gain += (theirsBefore - theirsAfter) * P.steal * 0.5;
      }
      if (P.guard) {
        // shoring up a square that an enemy is about to burst into
        for (const k of Engine.neighbours(b, i)) if (theirs(b.owner[k]) && b.count[k] >= Engine.capacity(b, k) - 1) gain += P.guard;
      }
    }
    if (pl.special && pl.special !== "overflow") for (const k of Engine.neighbours(b, i, Engine.ALL8)) if (theirs(b.owner[k])) gain += 2;
    return gain;
  }
  function evaluate(b, isMine, isFoe) {
    let score = 0;
    for (let i = 0; i < b.size; i++) {
      const own = b.owner[i];
      if (own < 0 || b.count[i] === 0) continue;
      const mine = isMine(own);
      if (!mine && !isFoe(own)) continue;
      const c = Engine.capacity(b, i);
      let v = b.count[i] * 2 + 3;
      let threatened = false;
      let prey = 0;
      for (const n of Engine.neighbours(b, i)) {
        const o2 = b.owner[n];
        if (o2 < 0 || b.count[n] === 0) continue;
        if (isMine(o2) === mine) continue;
        if (b.count[n] >= Engine.capacity(b, n) - 1) threatened = true;
        prey += b.count[n];
      }
      if (threatened) v -= 5 - c + b.count[i];
      else {
        if (c === 2) v += 3;
        else if (c === 3) v += 2;
        if (b.count[i] >= c - 1) v += 2 + prey;
      }
      score += mine ? v : -v;
    }
    return score;
  }

  function aiStep(pl) {
    if (pl.kind !== "ai" || !pl.alive || pl.pen <= 0 || G.time < pl.lockUntil) return;
    const skill = AI[pl.level] ?? AI.normal;
    // a mode with its own idea of a good drop (it may hand a seat back to the usual AI)
    if (H.aiDecide && H.aiDecide(G, pl, G.time, skill) !== "default") return;
    const i = cursorCell(pl);
    const ok = canDropAt(pl, i);
    if (!ok && G.rng() >= skill.miss) return;
    let gain = 0;
    if (ok) {
      gain = valueAt(pl, i, skill.depth);
      // better players wait for a clearly better square just ahead (never when this one is great)
      for (let k = 1; k <= skill.look && gain < 20; k++) {
        const ahead = G.path[(((pl.pos + pl.dir * k) % G.path.length) + G.path.length) % G.path.length];
        if (valueAt(pl, ahead, skill.depth) > gain + 6) {
          gain = -Infinity;
          break;
        }
      }
    }
    const P = PERSONAS[pl.persona];
    const reserve = (pl.level === "hard" || pl.level === "expert" || P?.reserve) && pl.pen <= 1 + (P?.reserve ?? 0) / 2 && gain < skill.pick * 2;
    if (!pl.placed || (ok && !reserve && (gain >= skill.pick || G.rng() < skill.idle)) || !ok) {
      if (gain === -Infinity && pl.placed && ok) return;
      const [lo, hi] = skill.react;
      // sharp players pounce on a big chance; First Steps opponents take their time
      const slow = G.fs ? 1.6 : skill.pounce && gain > 25 ? skill.pounce : 1;
      pl.aiPlan = { cell: i, at: H.aiTime?.(G, pl, G.time, skill) ?? G.time + (lo + G.rng() * (hi - lo)) * slow };
    }
  }

  // ---------------- the simulation step ----------------
  function step() {
    G.time += STEP_MS;
    G.tick++;
    const t = G.time;
    // a mode can hold play for a moment (an intro card); the clock starts after it
    if (t < G.holdUntil) {
      G.t0 = G.holdUntil;
      G.waveAt = t;
      for (const pl of G.players) pl.nextStep = Math.max(pl.nextStep, G.holdUntil);
      H.update?.(G, t, Infinity);
      return;
    }
    const secs = H.roundSecs ? H.roundSecs(G) : tune.roundSecs;
    const left = secs - (t - G.t0) / 1000;
    if (Number.isFinite(secs) && left <= tune.stampedeSecs && left > 0 && !G.rush && !G.fs) {
      G.rush = true;
      if (!quiet) {
        $("game").classList.add("rush");
        shout(null, "STAMPEDE!", 1.6, "#ff6b6b");
        Sfx.howl();
        musicFor(true);
        hapt(80);
        showTip("rush");
      }
    }
    for (const pl of G.players) {
      if (!pl.alive || pl.observer) continue;
      const stepMs = (H.stepMs?.(G, pl) ?? tune.cursorMs) / pl.speed / (G.rush ? 1.2 : 1) / (G.fs && pl.kind === "ai" ? 0.75 : 1);
      // First Steps: your cursor waits on the ready square until your first tap
      if (G.fs && G.fs.stage === 0 && pl.kind === "human") pl.nextStep = t + stepMs;
      if (t >= pl.nextStep) {
        pl.nextStep = Math.max(pl.nextStep + stepMs, t - stepMs);
        pl.pos += pl.dir;
        H.onStep?.(G, pl, t);
        if (pl.trail && !quiet) trailPuff(pl);
        aiStep(pl);
      }
      if (pl.aiPlan && t >= pl.aiPlan.at) {
        if (cursorCell(pl) === pl.aiPlan.cell) drop(pl);
        pl.aiPlan = null;
      }
      if (pl.pen < penCap(pl)) {
        if (!pl.refillAt) pl.refillAt = t + refillMs(pl);
        if (t >= pl.refillAt) {
          pl.pen++;
          pl.refillAt = pl.pen < penCap(pl) ? t + refillMs(pl) : 0;
          if (pl.kind === "human" && !quiet) pl.pen === penCap(pl) ? Sfx.full() : Sfx.tick();
        }
      } else pl.refillAt = 0;
    }
    if (t - G.waveAt >= WAVE_MS) {
      G.waveAt = t;
      tickWave();
    }
    // every 2 seconds note who's at the back (for the Comeback Lamb award)
    if (t - G.rankAt >= 2000 && t > 8000) {
      G.rankAt = t;
      const live = G.players.filter((p) => counted(p) && p.alive);
      if (live.length > 1) {
        const sorted = live.map((p) => [p, cellsOf(p.id)]).sort((a, b) => a[1] - b[1]);
        sorted[0][0].worstRank = live.length;
      }
    }
    H.update?.(G, t, left);
    if (G.replay?.probe && G.tick === G.replay.probe.tick) G.replay.probe.hash = boardHash();
    if (G.over) return;
    if (!quiet) {
      const txt = Number.isFinite(secs) && !G.fs ? fmtTime(Math.max(0, Math.ceil(left))) : H.timerHtml?.(G) ?? "";
      if (txt !== G.lastTimer) {
        G.lastTimer = txt;
        $("timer").innerHTML = txt;
        $("timer-top").innerHTML = txt;
        if (G.rush) Sfx.tickTock(left <= 5);
      }
      idleHint(t);
    }
    if (G.fs) {
      firstStepsTick(t);
      return;
    }
    const res = H.endCheck ? H.endCheck(G, t, left, defaultEnd) : defaultEnd(left);
    if (res) endRound(res);
  }

  // a fingerprint of the board, to check that replays match the real thing
  function boardHash() {
    let h = 2166136261;
    const b = G.b;
    for (let i = 0; i < b.size; i++) h = Math.imul(h ^ ((b.owner[i] + 2) * 64 + b.count[i]), 16777619);
    return (h >>> 0).toString(16);
  }

  // ---------------- the loop ----------------
  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(100, ts - (lastFrame || ts));
    lastFrame = ts;
    frameNo++;
    try {
      if (G && (phase === "play" || phase === "replay") && !G.over) {
        acc += dt;
        let steps = 0;
        while (acc >= STEP_MS && steps < 6) {
          if (G.replay) applyReplayInputs();
          step();
          acc -= STEP_MS;
          steps++;
          if (G.over && phase !== "replay") break;
          if (G.replay && G.tick >= G.replay.until) break;
        }
        if (acc > STEP_MS * 6) acc = 0; // a long stall: carry on rather than racing to catch up
        if (G.replay && G.tick >= G.replay.until) finishReplay();
      } else if (G && G.replay && G.over) {
        // the round ended inside the replay: hold the last moment briefly, then finish
        G.replay.overAt ??= ts;
        if (ts - G.replay.overAt > 1200) finishReplay();
      }
      // battery saver draws every other frame (about 30 fps); the simulation keeps its pace
      if (G && !gameScreen.hidden && band.bottom.w > 0 && !(settings().battery && frameNo % 2)) {
        const t0 = performance.now();
        drawBoard(dt);
        drawBands();
        Perf.sample(performance.now() - t0, dt);
      }
    } catch (e) {
      ErrorLog.add(e.message, e.stack);
      stopLoop();
      App.crash(e);
    }
  }
  function startLoop() {
    cancelAnimationFrame(rafId);
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // Automatic quality: if drawing is slow for a couple of seconds, drop to 1x resolution.
  const Perf = (() => {
    let n = 0;
    let sum = 0;
    let fps = 60;
    return {
      sample(ms, dt) {
        fps = fps * 0.95 + (1000 / Math.max(1, dt)) * 0.05;
        if (settings().quality !== "auto" || geo.lowRes) return;
        sum += ms;
        if (++n < 120) return;
        if (sum / n > 9 || fps < 45) {
          geo.lowRes = true;
          layout();
        }
        n = 0;
        sum = 0;
      },
      get fps() { return fps; },
    };
  })();

  function pause() {
    if (!G || phase !== "play" || G.over) return false;
    phase = "paused";
    Music.setLayer(0);
    return true;
  }
  function resume() {
    if (!G || phase !== "paused") return;
    phase = "play";
    acc = 0;
    lastFrame = 0;
    Sound.unlock();
    musicFor(G.rush);
  }
  function quit() {
    stopLoop();
    if (G) G.over = true;
    G = null;
    V = null;
    match = null;
    phase = "idle";
    quiet = false;
    Sound.quiet = false;
    hideHint();
    hideTip();
    $("ghost").hidden = true;
    $("banner").hidden = true;
    for (const cv of [topCv, botCv, boardCv]) cv && cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    $("timer").textContent = "";
    $("timer-top").textContent = "";
    $("hud").textContent = "";
    $("game").classList.remove("rush", "replaying");
    for (const p of parts) p.on = false;
    for (const f of fxPool) f.on = false;
    sprites.clear();
  }

  // ---------------- replays ----------------
  // Re-runs a recorded round from its seed and inputs: quietly up to a moment before `from`,
  // then for real until `to`. The original round's result is untouched.
  let replayDone = null;
  function replay(mode, rec, from, to, onFrame, probe) {
    return new Promise((done) => {
      stopLoop();
      V = mode;
      H = V.hooks || {};
      setup = structuredClone(rec.setup);
      tune = { ...CONFIG.tune, ...(V.tune || {}), ...(V.tuneFor?.(setup) || {}) };
      match = null;
      phase = "replay";
      quiet = true;
      Sound.quiet = true;
      // AI seats play exactly as they did, whatever "auto" means today
      const seats = setup.seats || [];
      startRound(rec.seed);
      G.players.forEach((p, k) => {
        if (rec.players[k]) {
          p.level = rec.players[k].level;
          p.persona = rec.players[k].persona;
        }
      });
      void seats;
      G.replay = { log: rec.log, at: 0, from: Math.max(0, from - 90), until: Math.min(to + 75, rec.endTick ?? Infinity), onFrame, probe };
      $("game").classList.add("replaying");
      while (G.tick < G.replay.from && !G.over) {
        applyReplayInputs();
        step();
      }
      quiet = false;
      Sound.quiet = false;
      G.bgDirty = true;
      replayDone = done;
      startLoop();
    });
  }
  function applyReplayInputs() {
    const R = G.replay;
    while (R.at < R.log.length && R.log[R.at] === G.tick) {
      const pl = G.players[R.log[R.at + 1]];
      if (pl) {
        pl.pressAt = G.time;
        drop(pl);
      }
      R.at += 2;
    }
  }
  function finishReplay() {
    stopLoop();
    $("game").classList.remove("replaying");
    phase = "idle";
    const d = replayDone;
    replayDone = null;
    d?.();
  }

  // ---------------- hints and tips ----------------
  // Smart hints: after 3 lockouts in a row, show which squares are yours to use. After 5
  // seconds without a tap, the button pulses. Each retires once you've shown you know it.
  function smartHint(pl) {
    const P = Save.profile.hints;
    if (!settings().hints || P.validLearned || pl.lockRun < 3) return;
    pl.hintUntil = G.time + 4000;
    pl.hintDrops = 0;
    P.validShown++;
    showHint("valid", STRINGS.hints.valid, pl);
    Save.save();
  }
  function idleHint(t) {
    if (!settings().hints || G.fs || Save.profile.hints.pulseLearned) return;
    for (const pl of G.players) {
      if (pl.kind !== "human" || !pl.alive || pl.observer) continue;
      const idle = t - pl.lastTapAt > 5000 && t - G.t0 > 5000 && pl.pen > 0;
      if (idle && !pl.pulsing) {
        pl.pulsing = true;
        Save.profile.hints.pulses = (Save.profile.hints.pulses || 0) + 1;
      } else if (!idle && pl.pulsing) {
        pl.pulsing = false;
        // tapped after a pulse: three of those and it's learned
        if ((Save.profile.hints.pulses || 0) >= 3) Save.profile.hints.pulseLearned = true;
      }
    }
    for (const pl of G.players) {
      if (pl.hintUntil && t > pl.hintUntil) {
        pl.hintUntil = 0;
        hideHint();
        if (pl.hintDrops >= 3 || Save.profile.hints.validShown >= 3) Save.profile.hints.validLearned = true;
      }
    }
  }
  let hintTimer = 0;
  function showHint(kind, text) {
    if (quiet) return;
    const el = $("hint");
    el.innerHTML = `${Icons.get(kind === "valid" ? "grid" : "tap")}<span>${esc(text)}</span>`;
    el.hidden = false;
    el.classList.remove("go");
    void el.offsetWidth;
    el.classList.add("go");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 3600);
  }
  function hideHint() {
    clearTimeout(hintTimer);
    const el = $("hint");
    if (el) el.hidden = true;
  }

  // Per-mode tips: one animated icon and a few words, shown once ever, never pausing play.
  let tipTimer = 0;
  function showTip(event, pl) {
    if (quiet || !G || G.fs || !V.tips) return;
    if (pl && !pl.human) return;
    const seen = Save.profile.tips;
    for (const tip of V.tips) {
      const id = `${V.key}.${tip.id}`;
      if (seen[id] || tip.on !== event) continue;
      if (tip.when && !tip.when(G, pl, setup)) continue;
      seen[id] = 1;
      Save.save();
      const el = $("tip");
      el.innerHTML = `<i class="tip-ico">${Icons.get(tip.icon || "sparkle")}</i><span>${esc(tip.text)}</span>`;
      el.hidden = false;
      el.classList.remove("go");
      void el.offsetWidth;
      el.classList.add("go");
      clearTimeout(tipTimer);
      tipTimer = setTimeout(hideTip, 3800);
      return;
    }
  }
  function hideTip() {
    clearTimeout(tipTimer);
    const el = $("tip");
    if (el) el.hidden = true;
  }

  // ---------------- First Steps ----------------
  // The very first match: a ghost thumb shows the button until the first good drop, the board
  // is seeded so a chain comes quickly, and the AI takes it easy.
  function firstStepsNext(stage) {
    const F = G.fs;
    F.stage = stage;
    F.at = G.time;
    if (stage === 1) {
      $("ghost").hidden = true;
      shout(null, STRINGS.firstSteps.go, 1.1, "#ffcf4a");
      Sfx.chime(7);
    } else if (stage === 2) {
      shout(null, STRINGS.firstSteps.done, 1.4, "#ffcf4a");
      Sfx.levelUp();
    }
  }
  function firstStepsTick(t) {
    const F = G.fs;
    if (F.stage === 0) placeGhost();
    // after the lesson, the match plays out normally
    if (F.stage === 2 && t - F.at > 2500) {
      G.fs = null;
      G.t0 = t; // the round's clock starts now
      for (const pl of G.players) pl.lastTapAt = t;
    }
  }
  function placeGhost() {
    const h = G.players.find((p) => p.kind === "human");
    if (!h) return;
    const el = $("ghost");
    const cv = BOTTOM[h.seat] ? botCv : topCv;
    const r = cv.getBoundingClientRect();
    const R = rects[h.seat];
    const B = BOTTOM[h.seat] ? band.bottom : band.top;
    const bx = BOTTOM[h.seat] ? R.x + R.w / 2 : B.w - R.x - R.w / 2;
    const by = BOTTOM[h.seat] ? R.y + R.h / 2 : B.h - R.y - R.h / 2;
    el.style.left = `${r.left + bx}px`;
    el.style.top = `${r.top + by}px`;
    if (el.hidden) {
      el.hidden = false;
      el.querySelector("span").textContent = STRINGS.firstSteps.tap;
      el.querySelector("b").innerHTML = Icons.get("tap");
    }
  }

  // ---------------- shouts and moods ----------------
  const shoutPool = [];
  const shoutOwner = new Map();
  function shout(pl, text, scale = 1, color, slot) {
    if (quiet) return;
    const id = slot ?? pl?.id ?? -1;
    let el = shoutOwner.get(id);
    if (!el) {
      // a free one, or else the one that has been showing longest
      const busy = new Set(shoutOwner.values());
      el = shoutPool.find((e) => !busy.has(e)) || shoutPool.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
      for (const [k, v] of shoutOwner) if (v === el) shoutOwner.delete(k);
      shoutOwner.set(id, el);
    }
    const t = performance.now();
    el.textContent = text;
    el.style.color = color ?? pl?.color ?? "#ffcf4a";
    el.style.fontSize = `${2 * scale}rem`;
    if (el.owner !== id || t - el.startedAt > 450) {
      el.owner = id;
      el.startedAt = t;
      el.className = "shout" + (pl && pl.seat >= 0 && !BOTTOM[pl.seat] && !G.solo ? " flip" : "");
      el.style.top = slot === "chain" ? "40%" : pl && pl.seat >= 0 && !G.solo ? (BOTTOM[pl.seat] ? "64%" : "36%") : "50%";
      void el.offsetWidth;
      el.classList.add("go");
    }
    clearTimeout(el.done);
    el.done = setTimeout(() => {
      if (shoutOwner.get(id) === el) shoutOwner.delete(id);
    }, 1000);
  }
  function mood(pl, kind, ms) {
    pl.mood = kind;
    pl.moodUntil = G.time + ms;
  }
  function shake(amp) {
    if (quiet) return;
    const lvl = settings().shake === "off" ? 0 : settings().shake === "low" ? 0.4 : 1;
    const a = amp * lvl * (settings().reduced ? 0.25 : 1);
    const t = performance.now();
    if (a > G.shakeAmp * Math.max(0, 1 - (t - G.shakeAt) / 300)) {
      G.shakeAmp = a;
      G.shakeAt = t;
    }
  }
  function hapt(p) {
    if (!quiet) buzz(p);
  }

  // ---------------- particles and effects (pooled) ----------------
  const P_MAX = 260;
  const parts = Array.from({ length: P_MAX }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, r: 1, c: "#fff", shape: 0 }));
  let pNext = 0;
  const BURST_STYLES = {
    "burst-puff": null,
    "burst-confetti": { colors: ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff", "#9b7bff"], shape: 1 },
    "burst-flowers": { colors: ["#ff9ac1", "#ffffff", "#ffd84a"], shape: 2 },
    "burst-stars": { colors: ["#ffe680", "#ffffff"], shape: 3 },
    "burst-hearts": { colors: ["#ff6f91", "#ffb3c6"], shape: 4 },
    "burst-gold": { colors: ["#ffcf4a", "#fff3b8", "#e0a82e"], shape: 3 },
  };
  function puff(cell, color, n, style) {
    if (!G || quiet) return;
    const c = geo.cell;
    const cx = (Engine.colOf(G.b, cell) + 0.5) * c;
    const cy = (Engine.rowOf(G.b, cell) + 0.5) * c;
    spray(cx, cy, color, n, style);
  }
  function spray(cx, cy, color, n, style) {
    const c = geo.cell;
    const S = style ? BURST_STYLES[style] : null;
    const count = settings().reduced ? Math.ceil(n / 2) : n;
    for (let k = 0; k < count; k++) {
      const p = parts[pNext];
      pNext = (pNext + 1) % P_MAX;
      const a = Math.random() * Art.TAU;
      const s = (0.4 + Math.random() * 0.9) * c * 0.004;
      p.on = true;
      p.x = cx;
      p.y = cy;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - c * 0.0015;
      p.t = 0;
      p.life = 380 + Math.random() * 260;
      p.r = c * (0.06 + Math.random() * 0.06);
      p.c = S ? S.colors[k % S.colors.length] : k % 2 ? "#ffffff" : color;
      p.shape = S ? S.shape : 0;
    }
  }
  const TRAILS = { "trail-sparkle": ["#fff6c8", "#ffffff"], "trail-hearts": ["#ff8fb1"], "trail-stars": ["#ffe680"], "trail-petals": ["#ffc2d9", "#ffffff"], "trail-rainbow": ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff", "#9b7bff"], "trail-fireflies": ["#fff27a", "#e4ff8a"] };
  function trailPuff(pl) {
    const cols = TRAILS[pl.trail];
    if (!cols) return;
    const i = cursorCell(pl);
    const c = geo.cell;
    const p = parts[pNext];
    pNext = (pNext + 1) % P_MAX;
    p.on = true;
    p.x = (Engine.colOf(G.b, i) + 0.2 + Math.random() * 0.6) * c;
    p.y = (Engine.rowOf(G.b, i) + 0.8) * c;
    p.vx = 0;
    p.vy = -c * 0.0006;
    p.t = 0;
    p.life = 500;
    p.r = c * 0.06;
    p.c = cols[(G.tick >> 2) % cols.length];
    p.shape = pl.trail === "trail-hearts" ? 4 : pl.trail === "trail-stars" ? 3 : pl.trail === "trail-petals" ? 2 : 0;
  }

  const FX_MAX = 16;
  const fxPool = Array.from({ length: FX_MAX }, () => ({ on: false, type: "", cell: -1, color: "", t0: 0, n: 0, cells: new Int16Array(160) }));
  let fxNext = 0;
  function effect(type, cell, color, t0) {
    if (quiet) return null;
    const f = fxPool[fxNext];
    fxNext = (fxNext + 1) % FX_MAX;
    f.on = true;
    f.type = type;
    f.cell = cell;
    f.color = color;
    f.t0 = t0;
    f.n = 0;
    if (type === "hit" && cell >= 0) f.cells[f.n++] = cell;
    return f;
  }

  // ---------------- rendering ----------------
  function sizeCanvas(cv, w, h) {
    const d = geo.dpr;
    const W = Math.max(1, Math.round(w * d));
    const Hh = Math.max(1, Math.round(h * d));
    if (cv.width !== W || cv.height !== Hh) {
      cv.width = W;
      cv.height = Hh;
    }
  }
  function targetDpr() {
    const q = settings().quality;
    const dev = Math.min(2, window.devicePixelRatio || 1);
    if (q === "low" || (q === "auto" && (geo.lowRes || App.lowEnd))) return 1;
    return dev;
  }
  const BTN = { S: 0.82, M: 1, L: 1.2 };
  function layout() {
    if (!boardCv) return;
    geo.dpr = targetDpr();
    const size = BTN[settings().btnSize] || 1;
    document.documentElement.style.setProperty("--band-scale", size);
    for (const [name, cv] of [["top", topCv], ["bottom", botCv]]) {
      band[name].w = cv.clientWidth;
      band[name].h = cv.clientHeight;
      sizeCanvas(cv, band[name].w, band[name].h);
    }
    for (let s = 0; s < 4; s++) {
      const B = BOTTOM[s] ? band.bottom : band.top;
      const r = rects[s];
      const solo = G?.solo;
      const wide = B.w > 700;
      r.w = solo ? Math.min(200 * size, B.w * 0.5) : Math.min((wide ? 220 : 152) * size, (B.w - 112) / 2);
      r.h = B.h - ROW_H - 6;
      r.y = ROW_H;
      if (solo) r.x = settings().leftHanded ? 10 : B.w - r.w - 10;
      else r.x = OWN_LEFT[s] ? 6 : B.w - 6 - r.w;
    }
    if (!G) return;
    const st = $("stage");
    const cols = G.b.cols;
    const rows = G.b.rows;
    geo.cell = Math.max(8, Math.floor(Math.min((st.clientWidth - PAD * 2) / cols, (st.clientHeight - PAD * 2) / rows)));
    geo.w = cols * geo.cell + PAD * 2;
    geo.h = rows * geo.cell + PAD * 2;
    boardCv.style.width = `${geo.w}px`;
    boardCv.style.height = `${geo.h}px`;
    sizeCanvas(boardCv, geo.w, geo.h);
    sprites.clear();
    G.bgDirty = true;
  }

  // Sheep sprites are drawn once per colour, mark, pattern and size, then copied.
  const sprites = new Map();
  function sprite(color, sym, flip, r, pattern) {
    const k = `${color}|${sym}|${flip}|${r}|${pattern || ""}`;
    let cv = sprites.get(k);
    if (cv) return cv;
    if (sprites.size > 300) sprites.clear();
    cv = document.createElement("canvas");
    const L = Math.ceil(r * 3.4);
    cv.width = cv.height = Math.ceil(L * geo.dpr);
    cv.L = L;
    const g = cv.getContext("2d");
    g.scale(geo.dpr, geo.dpr);
    Art.drawSheep(g, L / 2, L / 2, r, color, { flip, pattern });
    if (sym) Art.mark(g, L / 2 + (flip ? r * 0.12 : -r * 0.12), L / 2 - r * 0.05, r * 0.42, sym);
    sprites.set(k, cv);
    return cv;
  }

  // the board's grass, stones and grid, drawn once into a cached background
  let bg = null;
  const ARENAS = {
    "arena-meadow": { grass: ["#3d7a45", "#46874e"], edge: "#24402c" },
    "arena-autumn": { grass: ["#7a6a3d", "#86763f"], edge: "#4a3a22", tuft: "rgba(255,180,90,0.18)" },
    "arena-snow": { grass: ["#cfdbe6", "#dde7ef"], edge: "#8aa0b4", tuft: "rgba(255,255,255,0.4)", line: "rgba(60,80,110,0.18)" },
    "arena-oasis": { grass: ["#c9a96b", "#d6b779"], edge: "#8a6a3b", tuft: "rgba(80,140,70,0.3)" },
    "arena-night": { grass: ["#1f3a3f", "#25454b"], edge: "#0f2024", tuft: "rgba(255,255,200,0.12)" },
    "arena-gold": { grass: ["#9a7a2a", "#ab8932"], edge: "#5e4614", tuft: "rgba(255,240,170,0.3)" },
    "arena-valley": { grass: ["#2b4f4a", "#325a54"], edge: "#16282a", tuft: "rgba(255,255,200,0.16)" },
    "arena-bethlehem": { grass: ["#3a4a6a", "#425378"], edge: "#1f2840", tuft: "rgba(255,248,210,0.2)" },
    "arena-garden": { grass: ["#5f9b55", "#6aa85f"], edge: "#3c6a37", tuft: "rgba(255,200,230,0.35)" },
  };
  function theme() {
    return V.theme?.(setup) ?? ARENAS[setup?.arenaTheme] ?? ARENAS[Save.profile.equipped.arena] ?? ARENAS["arena-meadow"];
  }
  function drawBackground() {
    const b = G.b;
    const c = geo.cell;
    bg ??= document.createElement("canvas");
    sizeCanvas(bg, geo.w, geo.h);
    const g = bg.getContext("2d");
    g.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    g.clearRect(0, 0, geo.w, geo.h);
    const th = theme();
    const hc = settings().contrast;
    g.fillStyle = hc ? "#0b120e" : th.edge;
    g.beginPath();
    g.roundRect(0, 0, geo.w, geo.h, 12);
    g.fill();
    g.translate(PAD, PAD);
    const [g1, g2] = hc ? ["#1e3a26", "#24452d"] : th.grass;
    for (let i = 0; i < b.size; i++) {
      const x = Engine.colOf(b, i) * c;
      const y = Engine.rowOf(b, i) * c;
      if (b.rock[i]) {
        drawStone(g, x, y, c, i);
        continue;
      }
      g.fillStyle = (Engine.rowOf(b, i) + Engine.colOf(b, i)) % 2 ? g1 : g2;
      g.fillRect(x, y, c, c);
      g.strokeStyle = th.tuft || "rgba(255,255,255,0.07)";
      g.lineWidth = 1.5;
      g.beginPath();
      const tx = x + (((i * 37) % 70) / 100) * c + c * 0.12;
      const ty = y + (((i * 53) % 60) / 100) * c + c * 0.25;
      g.moveTo(tx, ty);
      g.lineTo(tx - 2, ty - 5);
      g.moveTo(tx + 3, ty);
      g.lineTo(tx + 4, ty - 6);
      g.stroke();
    }
    g.strokeStyle = hc ? "rgba(255,255,255,0.45)" : th.line || "rgba(255,255,255,0.14)";
    g.lineWidth = hc ? 1.5 : 1;
    g.beginPath();
    for (let col = 1; col < b.cols; col++) {
      g.moveTo(col * c, 0);
      g.lineTo(col * c, b.rows * c);
    }
    for (let row = 1; row < b.rows; row++) {
      g.moveTo(0, row * c);
      g.lineTo(b.cols * c, row * c);
    }
    g.stroke();
    H.drawBackground?.(g, G, c);
    G.bgDirty = false;
  }
  function drawStone(g, x, y, c, i) {
    g.fillStyle = "#5f645c";
    g.fillRect(x, y, c, c);
    for (const [dx, dy, w, h] of STONES) {
      g.fillStyle = (i + dx * 10) % 2 > 1 ? "#80847b" : "#767a71";
      g.beginPath();
      g.roundRect(x + dx * c, y + dy * c, w * c, h * c, c * 0.08);
      g.fill();
    }
  }
  const STONES = [[0.08, 0.1, 0.5, 0.36], [0.6, 0.1, 0.32, 0.36], [0.08, 0.52, 0.3, 0.38], [0.42, 0.52, 0.5, 0.38]];

  // A Grumpy Rock: eyes follow the nearest cursor, brows and cracks grow with each hit.
  function drawRock(g, cx, cy, r, hp, maxHp, lookX, lookY) {
    Art.ellipse(g, cx, cy + r * 0.08, r * 0.95, r * 0.8, 0, "#7d828d");
    Art.ellipse(g, cx - r * 0.25, cy - r * 0.2, r * 0.45, r * 0.3, -0.3, "#9599a3");
    const hits = Math.max(0, maxHp - hp);
    g.strokeStyle = "#3e4048";
    g.lineWidth = Math.max(1.5, r * 0.07);
    for (let k = 0; k < hits; k++) {
      const a = k * 2.1 + 0.6;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.7);
      g.lineTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a + 0.4) * r * 0.4);
      g.lineTo(cx + Math.cos(a + 0.3) * r * 0.2, cy + Math.sin(a) * r * 0.25);
      g.stroke();
    }
    const anger = Math.min(4, hits + (maxHp > 3 ? 1 : 0));
    for (let side = -1; side <= 1; side += 2) {
      const ex = cx + side * r * 0.32;
      const ey = cy - r * 0.05;
      Art.circle(g, ex, ey, r * 0.2, "#fff");
      const dx = lookX - ex;
      const dy = lookY - ey;
      const d = Math.hypot(dx, dy) || 1;
      Art.circle(g, ex + (dx / d) * r * 0.08, ey + (dy / d) * r * 0.08, r * 0.1, "#1a1622");
      g.strokeStyle = "#2e2a33";
      g.lineWidth = r * 0.09;
      g.beginPath();
      g.moveTo(ex - side * r * 0.2, ey - r * (0.3 - anger * 0.06));
      g.lineTo(ex + side * r * 0.18, ey - r * (0.3 + anger * 0.06));
      g.stroke();
    }
    if (hp > 5) {
      g.fillStyle = "#ffcf4a";
      g.font = `700 ${Math.round(r * 0.34)}px Fredoka, system-ui`;
      g.textAlign = "center";
      g.fillText(hp, cx, cy + r * 0.68);
      g.textAlign = "start";
    } else for (let k = 0; k < hp; k++) Art.circle(g, cx - ((hp - 1) / 2) * r * 0.22 + k * r * 0.22, cy + r * 0.6, r * 0.07, "#ffcf4a");
  }

  // Special sheep: Line has stripes showing its direction, Bomb is a round woolly ball, Overflow is golden.
  function drawSpecial(g, x, y, r, type, color, dir, t) {
    if (type === "bomb") {
      Art.circle(g, x, y, r * 1.15, color);
      g.strokeStyle = Art.shade(color, -0.5);
      g.lineWidth = r * 0.18;
      g.beginPath();
      g.arc(x, y, r * 0.6, 0.5, 4.5);
      g.stroke();
      g.strokeStyle = "#5b4630";
      g.lineWidth = r * 0.16;
      g.beginPath();
      g.moveTo(x + r * 0.7, y - r * 0.8);
      g.quadraticCurveTo(x + r * 1.1, y - r * 1.3, x + r * 1.4, y - r * 1.1);
      g.stroke();
      Art.circle(g, x + r * 1.45, y - r * 1.15, r * (0.2 + 0.1 * Math.sin(t * 20)), "#ffcf4a");
      return;
    }
    Art.drawSheep(g, x, y, r, type === "overflow" ? "#ffcf4a" : color);
    if (type === "overflow") {
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
      Art.circle(g, x, y, r * 1.6, "rgba(255,220,100,0.35)");
      g.globalAlpha = 1;
      return;
    }
    g.strokeStyle = "rgba(255,255,255,0.95)";
    g.lineWidth = r * 0.22;
    g.beginPath();
    for (const k of [-0.45, 0, 0.45]) {
      if (dir === "row") {
        g.moveTo(x - r * 0.8, y + k * r);
        g.lineTo(x + r * 0.8, y + k * r);
      } else {
        g.moveTo(x + k * r, y - r * 0.7);
        g.lineTo(x + k * r, y + r * 0.7);
      }
    }
    g.stroke();
  }

  const SPOTS = [null, [[0, 0]], [[-0.2, 0], [0.2, 0.02]], [[-0.2, 0.12], [0.2, 0.12], [0, -0.16]], [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.17], [0.2, 0.17]]];
  const tints = new Map();
  const tint = (color) => {
    let t = tints.get(color);
    if (!t) tints.set(color, (t = Art.alpha(color, settings().contrast ? 0.42 : 0.25)));
    return t;
  };
  function nearestCursor(cell) {
    const b = G.b;
    let best = null;
    let d = 1e9;
    for (const pl of G.players) {
      if (pl.observer || !pl.alive) continue;
      const k = cursorCell(pl);
      const dd = Math.abs(Engine.rowOf(b, k) - Engine.rowOf(b, cell)) + Math.abs(Engine.colOf(b, k) - Engine.colOf(b, cell));
      if (dd < d) [d, best] = [dd, k];
    }
    return best ?? cell;
  }

  function drawBoard(dt) {
    if (G.bgDirty) drawBackground();
    const t = G.time / 1000;
    const wall = performance.now();
    const b = G.b;
    const c = geo.cell;
    ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    ctx.clearRect(0, 0, geo.w, geo.h);
    const sk = G.shakeAmp * Math.max(0, 1 - (wall - G.shakeAt) / 300);
    if (sk) ctx.translate(Math.sin(wall * 0.09) * sk, Math.cos(wall * 0.11) * sk * 0.7);
    const bob = G.bob || 0;
    if (bob) {
      ctx.translate(geo.w / 2, geo.h / 2);
      ctx.scale(1 + 0.012 * bob, 1 + 0.012 * bob);
      ctx.translate(-geo.w / 2, -geo.h / 2);
    }
    ctx.drawImage(bg, 0, 0, geo.w, geo.h);
    ctx.translate(PAD, PAD);
    const inc = G.incoming;
    inc.fill(0);
    const fp = Math.min(1, (G.time - G.flightAt) / WAVE_MS);
    if (fp < 1) for (const f of G.flights) for (const d of f.to) inc[d]++;
    const r = c * 0.14;
    const reduced = settings().reduced;
    // smart hint: glow on the squares you may use
    const hinted = G.players.find((p) => p.hintUntil && p.kind === "human");
    for (let i = 0; i < b.size; i++) {
      if (b.rock[i]) continue;
      const x = Engine.colOf(b, i) * c;
      const y = Engine.rowOf(b, i) * c;
      const o = b.owner[i];
      if (isPlayer(o)) {
        ctx.fillStyle = tint(G.players[o].color);
        ctx.fillRect(x, y, c, c);
      }
      if (hinted && canDropAt(hinted, i)) {
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 6);
        ctx.fillStyle = "#fff6c8";
        ctx.fillRect(x + 2, y + 2, c - 4, c - 4);
        ctx.globalAlpha = 1;
      }
      if (H.drawCell?.(ctx, G, i, x, y, c, t, G.time)) continue;
      const kind = b.kind[i];
      if (kind === "rock") {
        const k = nearestCursor(i);
        drawRock(ctx, x + c / 2, y + c / 2, c * 0.4, b.hp[i], b.mhp[i] || b.hp[i], (Engine.colOf(b, k) + 0.5) * c, (Engine.rowOf(b, k) + 0.5) * c);
        continue;
      }
      if (kind === "box") {
        Art.drawGift(ctx, x + c / 2, y + c / 2 + c * 0.05, c * 0.28, t + i);
        continue;
      }
      const n = b.count[i] - inc[i];
      if (n <= 0 || o < 0) continue;
      const pl = G.players[o];
      const color = o === NEUTRAL ? "#a9a9b6" : pl?.color ?? "#fff";
      const sym = o === NEUTRAL ? null : pl?.sym;
      const k = Math.min(n, 4);
      const nervous = o !== NEUTRAL && n >= Engine.capacity(b, i) - 1;
      const pa = (G.time - G.popAt[i]) / 220;
      const squash = pa < 1 && !reduced ? Math.sin(Math.PI * pa) * (1 - pa) * 0.45 : 0;
      for (let s = 0; s < k; s++) {
        const sp = SPOTS[k][s];
        const jx = nervous && !reduced ? Math.sin(t * 40 + i * 3 + s) * c * 0.02 : 0;
        const px = x + (0.5 + sp[0]) * c + jx;
        const py = y + (0.5 + sp[1]) * c;
        if (s === 0 && b.tag[i]) {
          drawSpecial(ctx, px, py, r, b.tag[i].type, color, b.tag[i].dir, t);
          continue;
        }
        const img = sprite(color, sym, s % 2 === 1, Math.round(r * 2) / 2, pl?.pattern);
        const w = img.L * (1 + squash * 0.5);
        const h = img.L * (1 - squash);
        ctx.drawImage(img, px - w / 2, py + img.L / 2 - h, w, h);
      }
      if (n > 4) {
        ctx.fillStyle = "#ffcf4a";
        ctx.font = `700 ${Math.round(c * 0.26)}px Fredoka, system-ui`;
        ctx.fillText(n, x + c * 0.72, y + c * 0.95);
      }
    }
    // sheep in flight
    if (fp < 1) {
      const e = 1 - (1 - fp) * (1 - fp);
      for (const f of G.flights) {
        const fx = (Engine.colOf(b, f.from) + 0.5) * c;
        const fy = (Engine.rowOf(b, f.from) + 0.5) * c;
        const pl = G.players[f.who];
        for (const d of f.to) {
          const tx = (Engine.colOf(b, d) + 0.5) * c;
          const ty = (Engine.rowOf(b, d) + 0.5) * c;
          const img = sprite(pl?.color ?? "#fff", pl?.sym, tx < fx, Math.round(r * 2) / 2, pl?.pattern);
          ctx.drawImage(img, fx + (tx - fx) * e - img.L / 2, fy + (ty - fy) * e - Math.sin(Math.PI * fp) * c * 0.3 - img.L / 2, img.L, img.L);
        }
      }
    }
    // special and hit effects, about half a second each
    const flashes = !settings().fewerFlashes;
    for (const f of fxPool) {
      if (!f.on) continue;
      const p = (G.time - f.t0) / 500;
      if (p >= 1 || p < 0) {
        f.on = false;
        continue;
      }
      ctx.globalAlpha = (1 - p) * (flashes ? 1 : 0.45);
      ctx.fillStyle = f.type === "overflow" ? "#ffe680" : f.color;
      for (let k = 0; k < f.n; k++) {
        const x = Engine.colOf(b, f.cells[k]) * c;
        const y = Engine.rowOf(b, f.cells[k]) * c;
        if (f.type === "overflow") Art.circle(ctx, x + c / 2, y + c / 2 - p * c * 0.4, c * 0.12, "#ffe680");
        else ctx.fillRect(x + c * 0.1 * p, y + c * 0.1 * p, c * (1 - 0.2 * p), c * (1 - 0.2 * p));
      }
      if (f.cell >= 0 && (f.type === "bomb" || f.type === "blast" || f.type === "bigcross")) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc((Engine.colOf(b, f.cell) + 0.5) * c, (Engine.rowOf(b, f.cell) + 0.5) * c, c * (0.5 + p * (f.type === "bomb" ? 1.5 : 2.5)), 0, Art.TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    drawParts(ctx, dt, c);
    H.drawOver?.(ctx, G, c, t, G.time);
    drawCursors(t);
    if (settings().pen === "bar") drawEdgeBars();
    if (opts.onFrame) opts.onFrame(boardCv);
    if (G.replay?.onFrame) G.replay.onFrame(boardCv, G);
  }
  function drawParts(g, dt, c) {
    for (const p of parts) {
      if (!p.on) continue;
      p.t += dt;
      if (p.t >= p.life) {
        p.on = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.00002 * c * dt;
      g.globalAlpha = 1 - p.t / p.life;
      const rr = p.r * (1 + p.t / p.life);
      if (p.shape === 0) Art.circle(g, p.x, p.y, rr, p.c);
      else {
        g.fillStyle = p.c;
        g.beginPath();
        if (p.shape === 1) g.rect(p.x - rr * 0.6, p.y - rr * 0.3, rr * 1.2, rr * 0.6);
        else if (p.shape === 2) Art.ellipse(g, p.x, p.y, rr, rr * 0.55, p.t * 0.01, p.c);
        else if (p.shape === 3) Art.starPath(g, p.x, p.y, rr * 1.3, rr * 0.55);
        else Art.heartPath(g, p.x, p.y, rr);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  function drawCursors(t) {
    const c = geo.cell;
    const b = G.b;
    const hc = settings().contrast;
    G.players.forEach((pl, q) => {
      if (!pl.alive || pl.observer || H.hideCursor?.(G, pl)) return;
      const i = cursorCell(pl);
      const x = Engine.colOf(b, i) * c;
      const y = Engine.rowOf(b, i) * c;
      const inset = 2 + (q % 4) * 4;
      const dots = settings().pen === "dots" && pl.kind === "human";
      const empty = pl.pen <= 0;
      const last = pl.pen === 1;
      const lw = hc ? 6 : 4;
      ctx.globalAlpha = G.time < pl.lockUntil ? 0.35 : 1;
      if (hc) {
        ctx.strokeStyle = "#000";
        ctx.lineWidth = lw + 3;
        ctx.strokeRect(x + inset, y + inset, c - inset * 2, c - inset * 2);
      }
      ctx.lineWidth = dots && last ? lw + 2 * Math.abs(Math.sin(t * 9)) : lw;
      ctx.strokeStyle = dots && empty ? "#8a8f96" : pl.color;
      if (dots && empty) ctx.setLineDash(DASH);
      ctx.strokeRect(x + inset, y + inset, c - inset * 2, c - inset * 2);
      ctx.setLineDash(EMPTY);
      if (pl.special) drawSpecial(ctx, x + c - inset - c * 0.12, y + inset + c * 0.12, c * 0.08, pl.special, pl.color, pl.lineDir, t);
      if (dots) {
        // one dot per sheep in the pen, on the side of the cursor facing its player
        const n = penCap(pl);
        const gap = Math.max(2, (c - inset * 2 - 8) / n);
        const yy = pl.seat >= 0 && !BOTTOM[pl.seat] && !G.solo ? y + inset + 5 : y + c - inset - 5;
        for (let k = 0; k < n; k++) {
          const xx = x + inset + 4 + gap * (k + 0.5);
          ctx.beginPath();
          ctx.arc(xx, yy, Math.max(0.8, Math.min(3.2, gap * 0.32)), 0, Art.TAU);
          if (k < pl.pen) {
            ctx.fillStyle = "#fffaf0";
            ctx.fill();
          } else {
            ctx.strokeStyle = "rgba(255,255,255,0.45)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    });
  }
  const DASH = [5, 4];

  // Edge bar: a segmented bar along each human's side of the board.
  function drawEdgeBars() {
    const W = G.b.cols * geo.cell;
    const Hh = G.b.rows * geo.cell;
    const bottoms = G.players.filter((p) => p.seat >= 0 && (BOTTOM[p.seat] || G.solo) && p.kind === "human" && !p.observer);
    const tops = G.players.filter((p) => p.seat >= 0 && !BOTTOM[p.seat] && !G.solo && p.kind === "human" && !p.observer);
    for (const [list, y] of [[bottoms, Hh + 2], [tops, -PAD + 1]]) {
      list.forEach((pl) => {
        const span = W / list.length;
        const x0 = list.length === 1 ? 0 : OWN_LEFT[pl.seat] === BOTTOM[pl.seat] ? 0 : span;
        const n = penCap(pl);
        const seg = span / n;
        for (let s = 0; s < n; s++) {
          let fill = s < pl.pen ? 1 : 0;
          if (s === pl.pen && pl.refillAt) fill = Math.max(0, 1 - (pl.refillAt - G.time) / refillMs(pl));
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(x0 + s * seg + 1, y, seg - 2, PAD - 3);
          if (fill > 0) {
            ctx.fillStyle = pl.pen <= 1 && fill >= 1 ? "#ff8a8a" : pl.color;
            ctx.fillRect(x0 + s * seg + 1, y, (seg - 2) * fill, PAD - 3);
          }
        }
      });
    }
  }

  // The bands: each player's button with its lamb, pen display, special and lock.
  function drawBands() {
    const t = G.time / 1000;
    for (const [name, g] of [["top", topCtx], ["bottom", botCtx]]) {
      const B = band[name];
      g.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
      g.clearRect(0, 0, B.w, B.h);
      if (name === "top") {
        if (G.solo) continue;
        g.translate(B.w, B.h);
        g.rotate(Math.PI);
      }
      for (let s = 0; s < 4; s++) {
        const pl = seatPlayer[s];
        if (!pl) continue;
        const onBottom = G.solo ? true : BOTTOM[s];
        if (onBottom !== (name === "bottom")) continue;
        drawButton(g, pl, rects[s], t);
      }
    }
  }

  function drawButton(g, pl, R, t) {
    if (R.w < 20 || R.h < 20) return;
    const empty = pl.pen <= 0;
    const locked = G.time < pl.lockUntil;
    const press = Math.max(0, 1 - (G.time - pl.pressAt) / 120);
    const pulse = pl.pulsing && !settings().reduced ? Math.abs(Math.sin(t * 5)) : 0;
    const x = R.x - pulse * 3;
    const y = R.y + press * 3 - pulse * 3;
    const w = R.w + pulse * 6;
    const h = R.h + pulse * 3;
    if (settings().zone === "corner" && pl.kind === "human") {
      g.fillStyle = "rgba(255,255,255,0.04)";
      const B = BOTTOM[pl.seat] || G.solo ? band.bottom : band.top;
      const zx = G.solo ? 0 : OWN_LEFT[pl.seat] ? 0 : B.w / 2;
      g.fillRect(zx, 0, G.solo ? B.w : B.w / 2, B.h);
    }
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath();
    g.roundRect(x, R.y + 5, w, h, 24);
    g.fill();
    g.fillStyle = !pl.alive ? "#7b7f86" : empty ? Art.shade(pl.color, -0.45) : pl.color;
    g.beginPath();
    g.roundRect(x, y, w, h, 24);
    g.fill();
    if (settings().contrast) {
      g.strokeStyle = "#ffffff";
      g.lineWidth = 3;
      g.stroke();
    }
    if (pulse) {
      g.strokeStyle = `rgba(255,246,200,${0.4 + pulse * 0.5})`;
      g.lineWidth = 4;
      g.stroke();
    }
    const cx = x + w / 2;
    const cy = y + h / 2 + 2;
    const R2 = Math.min(w, h) * 0.42;
    if (settings().pen === "ring") {
      const n = penCap(pl);
      g.lineWidth = 7;
      g.lineCap = "round";
      for (let k = 0; k < n; k++) {
        const gap = n > 1 ? 0.32 : 0;
        const a0 = -Math.PI / 2 + (k / n) * Art.TAU + gap / 2;
        const a1 = -Math.PI / 2 + ((k + 1) / n) * Art.TAU - gap / 2;
        g.strokeStyle = "rgba(0,0,0,0.25)";
        g.beginPath();
        g.arc(cx, cy, R2, a0, a1);
        g.stroke();
        let fill = k < pl.pen ? 1 : 0;
        if (k === pl.pen && pl.refillAt) fill = Math.max(0, 1 - (pl.refillAt - G.time) / refillMs(pl));
        if (fill > 0) {
          g.strokeStyle = "#fffaf0";
          g.beginPath();
          g.arc(cx, cy, R2, a0, a0 + (a1 - a0) * fill);
          g.stroke();
        }
      }
    }
    if (settings().pen === "row" && pl.kind === "human") {
      const n = penCap(pl);
      const size = Math.min(7, (w - 8) / n / 2.6);
      for (let k = 0; k < n; k++) {
        const sx = cx + (k - (n - 1) / 2) * size * 2.6;
        let fill = k < pl.pen ? 1 : 0;
        if (k === pl.pen && pl.refillAt) fill = Math.max(0, 1 - (pl.refillAt - G.time) / refillMs(pl));
        g.globalAlpha = fill >= 1 ? 1 : 0.25 + fill * 0.4;
        const img = sprite(fill >= 1 ? pl.color : "#8a8f96", null, false, size);
        g.drawImage(img, sx - img.L / 2, ROW_H / 2 - img.L / 2, img.L, img.L);
      }
      g.globalAlpha = 1;
    }
    const m = G.time < pl.moodUntil ? pl.mood : null;
    const panic = empty && pl.alive;
    const reduced = settings().reduced;
    const jump = m === "cheer" ? Math.abs(Math.sin(t * 10)) * (reduced ? 3 : 8) : 0;
    const jit = panic && !reduced ? Math.sin(t * 50) * 2 : 0;
    const bob = (G.bob || 0) * 5;
    if (pl.wolf) Art.drawWolf(g, cx + jit, cy + 4 - jump - bob, R2 * 1.5, { t, mood: m === "oops" ? "sad" : "happy" });
    else Art.drawLamb(g, cx + jit, cy + 6 - jump - bob, R2 * 1.25, { scarf: pl.look ? undefined : pl.color, look: pl.look ? { ...pl.look, scarf: undefined } : null, t, mood: !pl.alive ? "sleep" : m === "oops" ? "sad" : m === "cheer" ? "joy" : panic ? "shock" : "happy", zzz: !pl.alive });
    if (panic) Art.ellipse(g, cx + R2 * 0.55, cy - R2 * 0.25, R2 * 0.06, R2 * 0.1, 0, "#8fd3ff");
    Art.mark(g, x + 16, y + 16, 12, pl.sym);
    if (pl.special) {
      Art.circle(g, x + w - 22, y + 22, 17, "rgba(0,0,0,0.3)");
      drawSpecial(g, x + w - 22, y + 23, 9, pl.special, pl.color, pl.lineDir, t);
    }
    if (pl.kind === "ai") {
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.font = "700 12px Fredoka, system-ui";
      g.fillText(pl.name, x + 10, y + h - 9);
    } else if (!G.solo && !pl.wolf) {
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.font = "700 12px Fredoka, system-ui";
      g.fillText(KEYS[pl.seat] && App.hasKeyboard ? `${pl.name} · ${KEYS[pl.seat]}` : pl.name, x + 10, y + h - 9);
    }
    if (locked) {
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.beginPath();
      g.roundRect(x, y, w, h, 24);
      g.fill();
      g.strokeStyle = "#fff";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(cx, cy, R2 * 0.5, -Math.PI / 2, -Math.PI / 2 + Art.TAU * ((pl.lockUntil - G.time) / LOCK_MS));
      g.stroke();
    }
    if (!pl.alive) {
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.beginPath();
      g.roundRect(x, y, w, h, 24);
      g.fill();
      g.fillStyle = "#fff";
      g.font = "700 20px Fredoka, system-ui";
      g.textAlign = "center";
      g.fillText(pl.team !== pl.id && V.outLabel ? V.outLabel : "RESTING", cx, cy + 8);
      g.textAlign = "start";
    }
  }

  // ---------------- pointer input ----------------
  function onBandDown(e, name) {
    e.preventDefault();
    Sound.unlock();
    if (!G || phase !== "play") return;
    const cv = name === "top" ? topCv : botCv;
    const B = band[name];
    const r = cv.getBoundingClientRect();
    let x = e.clientX - r.left;
    let y = e.clientY - r.top;
    if (name === "top") {
      x = B.w - x;
      y = B.h - y;
    }
    for (let s = 0; s < 4; s++) {
      const pl = seatPlayer[s];
      if (!pl || pl.kind !== "human") continue;
      const onBottom = G.solo ? true : BOTTOM[s];
      if (onBottom !== (name === "bottom")) continue;
      const R = rects[s];
      const hit = settings().zone === "corner" ? G.solo || (OWN_LEFT[s] ? x < B.w / 2 : x >= B.w / 2) : x >= R.x - 10 && x <= R.x + R.w + 10 && y >= R.y - ROW_H && y <= R.y + R.h + 10;
      if (hit) {
        press(s);
        return;
      }
    }
  }

  let gameScreen = null;
  // a card in the middle of the field (a boss's name, a round's start); not during fast-forward
  let bannerTimer = 0;
  function banner(html, ms = 2000, cls = "") {
    if (quiet) return;
    const el = $("banner");
    el.className = `banner ${cls}`;
    el.innerHTML = html;
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add("go");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => (el.hidden = true), ms);
  }

  function mount() {
    gameScreen = $("scr-game");
    boardCv = $("board");
    ctx = boardCv.getContext("2d");
    topCv = $("band-top");
    botCv = $("band-bottom");
    topCtx = topCv.getContext("2d");
    botCtx = botCv.getContext("2d");
    for (let k = 0; k < 6; k++) {
      const el = document.createElement("div");
      el.className = "shout";
      el.startedAt = 0;
      $("shouts").append(el);
      shoutPool.push(el);
    }
    // every finger is handled the moment it lands, all at once
    topCv.addEventListener("pointerdown", (e) => onBandDown(e, "top"));
    botCv.addEventListener("pointerdown", (e) => onBandDown(e, "bottom"));
    new ResizeObserver(() => layout()).observe($("stage"));
    window.addEventListener("resize", () => layout());
  }

  return {
    mount, start, nextRound, pause, resume, quit, replay, press, layout, drop, shout, mood, shake, puff, spray, effect, loadSpecial, landOn, hitKind,
    buildPath, rebuildPath, cursorCell, cellsOf, orbsOf, sameTeam, isPlayer, refillMs, endRound, canDropAt, valueAt,
    drawRock, drawSpecial, sprite, penCap, now, setHud, firstHumanSeat, banner, tip: (event, pl) => showTip(event, pl),
    NEUTRAL, RANK, BOTTOM, PAD, AI, PERSONAS, PERSONA_ORDER, KEYS, ARENAS, STEP_MS,
    get G() { return G; }, get tune() { return tune; }, get setup() { return setup; }, get geo() { return geo; }, get phase() { return phase; },
    get match() { return match; }, get mode() { return V; }, get quiet() { return quiet; }, get fps() { return Perf.fps; }, get rng() { return G.rng; },
    seat: (s) => seatPlayer[s],
  };

  // HUD text above the board; skipped while a replay fast-forwards
  function setHud(html) {
    if (quiet || !G || html === G.lastHud) return;
    G.lastHud = html;
    $("hud").innerHTML = html;
  }
})();
