// ======================= SHARED STAMPEDE CORE =======================
// Real-time Chain Reaction: sweeping cursors, one button per player, the sheep pen,
// chain rewards and special sheep, shouts, lambs on the buttons, AI seats, Stampede
// Time, pause and the tuning panel. Each version calls Stampede.run(version) with
// its own rules as hooks, so all versions can later share one menu.
const Stampede = (() => {
  const { $ } = Kit;
  const COLORS = ["#ff5a5f", "#3fa7ff", "#ffc93c", "#2fd38a"];
  const NAMES = ["Red", "Blue", "Yellow", "Green"];
  const SEATS = ["p0", "p1", "p2", "p3"]; // bottom-left, top-right, top-left, bottom-right
  const FLIPPED = [false, true, true, false];
  const RANK = { line: 1, bomb: 2, overflow: 3 };
  const SHOUTS = [[5, "Nice!", 1], [8, "Baa-rilliant!", 1.25], [12, "Overflowing!", 1.5], [16, "Hallelujah!", 1.85]];
  const LOCK_MS = 1000;
  const WAVE_MS = 140;
  const MAX_RUN = 60; // waves in a row before a runaway cascade settles
  const NEUTRAL = 90; // owner id for grey neutral sheep: they never burst, and a burst claims them
  // AI skill: how picky it is, how often it taps anyway, how often it fumbles, reaction time
  const AI = {
    easy: { pick: 7, idle: 0.05, miss: 0.15, react: [260, 350] },
    normal: { pick: 4, idle: 0.08, miss: 0.05, react: [190, 330] },
    hard: { pick: 2, idle: 0.03, miss: 0, react: [150, 250] },
  };
  const BASE_TUNE = { pen: 5, refill: 1.1, cursorMs: 380, roundSecs: 90, stampedeSecs: 20, lineAt: 5, plusAt: 6, bombAt: 9, fullAt: 10, overflowAt: 14 };
  const TUNE_INFO = [
    ["pen", "Pen size", 1, 10, 1, " sheep"],
    ["refill", "Refill time (2 players; scales up for 3–4)", 0.3, 3, 0.1, " s"],
    ["cursorMs", "Cursor step", 150, 800, 10, " ms"],
    ["roundSecs", "Round length", 20, 300, 5, " s"],
    ["stampedeSecs", "Stampede Time", 0, 60, 5, " s"],
    ["lineAt", "Line sheep at chain", 2, 20, 1, ""],
    ["plusAt", "+2 sheep at chain", 2, 20, 1, ""],
    ["bombAt", "Bomb sheep at chain", 2, 25, 1, ""],
    ["fullAt", "Full pen at chain", 2, 25, 1, ""],
    ["overflowAt", "Overflow sheep at chain", 2, 30, 1, ""],
  ];
  const REFILL_SCALE = [1, 1, 1, 1.4 / 1.1, 1.7 / 1.1]; // by number of players

  let V = null; // the version being played
  let H = {}; // its hooks
  let tune = {};
  let setup = {};
  let G = null;
  let geo = { cell: 40, dpr: 1, w: 0, h: 0 };
  let canvas;
  let ctx;

  const load = (k, d) => {
    try {
      return { ...d, ...(JSON.parse(localStorage.getItem(k)) || {}) };
    } catch {
      return { ...d };
    }
  };
  const save = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
  const defaults = () => ({ ...BASE_TUNE, ...(V.tune || {}) });
  const saveTune = () => save(`cfl-${V.key}-tune`, tune);
  const saveSetup = () => save(`cfl-${V.key}-setup`, setup);

  // ---------- helpers ----------
  const cellsOf = (p) => G.b.owner.reduce((n, o) => n + (o === p ? 1 : 0), 0);
  const orbsOf = (p) => G.b.owner.reduce((n, o, i) => n + (o === p ? G.b.count[i] : 0), 0);
  const sameTeam = (a, b) => a === b || (G.players[a] && G.players[b] && G.players[a].team === G.players[b].team);
  const cursorCell = (pl) => {
    const len = G.path.length;
    return G.path[((pl.pos % len) + len) % len];
  };

  function buildPath() {
    const b = G.b;
    const path = [];
    for (let r = 0; r < b.rows; r++)
      for (let k = 0; k < b.cols; k++) {
        const i = r * b.cols + (r % 2 ? b.cols - 1 - k : k);
        if (!b.rock[i] && (H.inPath?.(G, i) ?? true)) path.push(i);
      }
    G.path = path.length ? path : [0];
  }

  // ---------- game ----------
  function start() {
    saveSetup();
    const now = performance.now();
    const b = Engine.createBoard(V.rows ?? 9, V.cols ?? 6, { tag: null, kind: null, hp: 0 });
    const players = V.players(setup).map((p, id) => ({
      id, seat: -1, kind: "human", level: setup.level || "normal", team: id, color: COLORS[id % 4], name: NAMES[id % 4],
      speed: 1, dir: 1, pen: tune.pen, refillAt: 0, lockUntil: 0, special: null, lineDir: "row",
      alive: true, placed: false, chain: 0, best: 0, mood: null, moodUntil: 0, aiPlan: null, score: 0, nextStep: now, pos: null,
      ...p,
    }));
    G = { b, players, path: [], start: now, waveAt: now, effects: [], flights: [], over: false, paused: false, rush: false, solo: !!V.solo, data: {} };
    H.setup?.(G, setup);
    buildPath();
    players.forEach((pl, k) => {
      if (pl.pos === null) pl.pos = Math.floor((k * G.path.length) / players.length) + 3;
    });
    $("app").classList.remove("rush");
    for (const id of ["intro", "end", "tune"]) Kit.hide(id);
    resize();
  }

  const refillMs = (pl) => {
    const n = G.players.length;
    const base = H.refillMs?.(G, pl) ?? tune.refill * 1000 * (G.solo ? 1 : REFILL_SCALE[Math.min(4, n)]);
    return base / (G.rush ? 2 : 1);
  };

  function defaultCanDrop(pl, i) {
    const b = G.b;
    if (b.rock[i] || H.blocked?.(G, i, pl)) return false;
    const o = b.owner[i];
    return o === -1 || o === pl.id || (o >= 0 && o < G.players.length && sameTeam(o, pl.id));
  }

  // The one action: drop a sheep (or the loaded special) where your cursor is.
  function drop(pl, now = performance.now()) {
    if (!G || G.over || G.paused || !pl.alive || now < pl.lockUntil) return;
    if (pl.pen <= 0) {
      Kit.tone(180, 0.06, "square", 0.04);
      return;
    }
    const i = cursorCell(pl);
    pl.pen--;
    if (!pl.refillAt) pl.refillAt = now + refillMs(pl);
    if (!(H.canDrop ? H.canDrop(G, pl, i, defaultCanDrop) : defaultCanDrop(pl, i))) {
      pl.lockUntil = now + LOCK_MS;
      mood(pl, "oops", LOCK_MS);
      Kit.sfx.bad();
      H.onWaste?.(G, pl, i);
      return;
    }
    pl.placed = true;
    const special = pl.special;
    pl.special = null;
    const b = G.b;
    const o = b.owner[i];
    if (o >= 0 && o !== pl.id && sameTeam(o, pl.id)) b.count[i]++; // a teammate's square: help it along
    else Engine.place(b, i, pl.id);
    H.afterDrop?.(G, pl, i, special, now);
    if (special === "overflow") overflow(pl, now);
    else if (special) {
      b.tag[i] = { type: special, dir: special === "line" ? pl.lineDir : null };
      if (special === "line") pl.lineDir = pl.lineDir === "row" ? "col" : "row";
      Kit.tone(special === "bomb" ? 200 : 600, 0.15, "triangle", 0.1, special === "bomb" ? 120 : 900);
    } else Kit.sfx.place();
  }

  function overflow(pl, now) {
    const cells = [];
    for (let i = 0; i < G.b.size; i++)
      if (G.b.owner[i] === pl.id) {
        G.b.count[i]++;
        cells.push(i);
      }
    G.effects.push({ type: "overflow", cells, color: pl.color, t0: now });
    shout(pl, "Overflow!", 1.3);
    [523, 659, 784, 1047].forEach((f, k) => Kit.tone(f, 0.2, "triangle", 0.08, 0, k * 0.06));
  }

  function landOn(to, who) {
    const b = G.b;
    const v = b.owner[to];
    if (v >= 0 && v < G.players.length && v !== who && sameTeam(v, who)) {
      b.count[to]++;
      return;
    }
    b.owner[to] = who;
    b.count[to]++;
  }

  // ---------- live waves ----------
  function tickWave(now) {
    const n = G.players.length;
    const bursts = new Array(n).fill(0);
    const pending = [];
    const rules = {
      canBurst: (b, i) => {
        const o = b.owner[i];
        return o >= 0 && o < n && G.players[o].alive && (H.canBurst?.(G, b, i) ?? true);
      },
      targets: (b, i) => {
        const who = b.owner[i];
        bursts[who]++;
        if (b.tag[i]) {
          pending.push({ cell: i, ...b.tag[i], who });
          b.tag[i] = null;
        }
        const t = Engine.neighbours(b, i);
        return H.targets ? H.targets(G, b, i, t) : t;
      },
      emptied: (b, i) => {
        b.owner[i] = -1;
        H.emptied?.(G, b, i);
      },
      land: (b, from, to, who) => {
        if (!G.players[who].alive) return;
        if (H.land?.(G, b, from, to, who)) return;
        landOn(to, who);
      },
      maxWaves: 1,
    };
    const { waves } = Engine.resolve(G.b, rules, false);
    G.flights = waves.length ? waves[0].bursts.map((x) => ({ ...x, t0: now })) : [];
    // a board packed full can burst forever: after MAX_RUN waves in a row, let it settle
    G.run = waves.length ? (G.run || 0) + 1 : 0;
    if (G.run > (V.maxRun ?? MAX_RUN)) {
      for (let i = 0; i < G.b.size; i++) if (G.b.owner[i] >= 0 && !G.b.rock[i]) G.b.count[i] = Math.min(G.b.count[i], Engine.capacity(G.b, i) - 1);
      G.run = 0;
    }
    for (const sp of pending) special(sp, now);
    chains(bursts, now);
    H.afterWave?.(G, now, bursts);
    if (!H.noElimination) eliminate();
  }

  function areaFor(type, dir, i) {
    const b = G.b;
    const r0 = Engine.rowOf(b, i);
    const c0 = Engine.colOf(b, i);
    const out = [];
    const add = (r, c) => Engine.inside(b, r, c) && out.push(r * b.cols + c);
    if (type === "line") for (let k = 0; k < (dir === "row" ? b.cols : b.rows); k++) dir === "row" ? add(r0, k) : add(k, c0);
    else if (type === "bomb") for (const [dr, dc] of Engine.ALL8) add(r0 + dr, c0 + dc);
    else if (type === "cross") {
      for (let k = 0; k < b.cols; k++) add(r0, k);
      for (let k = 0; k < b.rows; k++) if (k !== r0) add(k, c0);
    } else if (type === "bigcross") {
      for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) if (Math.abs(r - r0) <= 1 || Math.abs(c - c0) <= 1) add(r, c);
    } else if (type === "blast") for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) add(r0 + dr, c0 + dc);
    return out.filter((k) => k !== i);
  }

  const COMBOS = { "line+line": "cross", "bomb+line": "bigcross", "bomb+bomb": "blast" };
  const COMBO_SHOUT = { cross: "Cross!", bigcross: "Mega cross!", blast: "Kaboom!" };

  // A special sheep's square burst: take its area, combining with any special it sets off.
  function special(sp, now) {
    const b = G.b;
    let type = sp.type;
    let area = areaFor(type, sp.dir, sp.cell);
    const other = area.find((k) => b.tag[k]);
    if (other !== undefined) {
      const combo = COMBOS[[type, b.tag[other].type].sort().join("+")];
      b.tag[other] = null;
      if (combo) {
        type = combo;
        area = areaFor(combo, null, sp.cell);
        shout(G.players[sp.who], COMBO_SHOUT[combo], 1.4);
      }
    }
    for (const k of area) {
      if (b.rock[k] || H.specialHit?.(G, k, sp.who)) continue;
      landOn(k, sp.who);
    }
    G.effects.push({ type, dir: sp.dir, cell: sp.cell, cells: area, color: G.players[sp.who].color, t0: now });
    Kit.tone(type === "line" || type === "cross" ? 900 : 160, 0.3, "sawtooth", 0.07, type === "line" || type === "cross" ? 300 : 60);
    H.onSpecial?.(G, sp, type, area);
  }

  function loadSpecial(pl, type) {
    if (pl.special && RANK[type] <= RANK[pl.special]) return;
    pl.special = type;
    Kit.tone(type === "overflow" ? 1200 : 800, 0.18, "triangle", 0.09, type === "overflow" ? 1800 : 1200);
  }

  function chains(bursts, now) {
    let top = 0;
    G.players.forEach((pl, p) => {
      if (bursts[p] > 0) {
        const prev = pl.chain;
        pl.chain += bursts[p];
        rewards(pl, prev, pl.chain);
        H.onChain?.(G, pl, prev, pl.chain, now);
        top = Math.max(top, pl.chain);
      } else if (pl.chain > 0) {
        pl.best = Math.max(pl.best, pl.chain);
        H.chainEnd?.(G, pl, pl.chain, now);
        pl.chain = 0;
      }
    });
    if (!top) return;
    Kit.sfx.burst(top);
    if (top >= 2) Kit.popText($("chain"), `Chain x${top}!`);
    if (top === 6) Kit.shake($("stage"));
    if (top === 12) Kit.shake($("stage"), true);
  }

  const crossed = (prev, now, at) => prev < at && now >= at;
  function rewards(pl, prev, now) {
    if (crossed(prev, now, tune.lineAt)) loadSpecial(pl, "line");
    if (crossed(prev, now, tune.plusAt)) pl.pen = Math.min(tune.pen, pl.pen + 2);
    if (crossed(prev, now, tune.bombAt)) loadSpecial(pl, "bomb");
    if (crossed(prev, now, tune.fullAt)) pl.pen = tune.pen;
    if (crossed(prev, now, tune.overflowAt)) loadSpecial(pl, "overflow");
    for (const [at, word, scale] of SHOUTS) if (crossed(prev, now, at)) shout(pl, word, scale);
    if (now >= 6) mood(pl, "cheer", 1400);
  }

  // Knock out flocks with no sheep once everyone has dropped at least once.
  function eliminate() {
    const live = G.players.filter((pl) => !pl.observer);
    if (!live.every((pl) => pl.placed || !pl.alive)) return;
    for (const pl of live) {
      if (pl.alive && orbsOf(pl.id) === 0) {
        pl.alive = false;
        pl.special = null;
        Kit.sfx.howl();
        shout(pl, "Out!", 1.2);
      }
    }
  }

  // Default ending: last team standing, or most squares when time runs out.
  function defaultEnd(left) {
    const teams = new Map();
    for (const pl of G.players) if (!pl.observer) teams.set(pl.team, (teams.get(pl.team) || false) || pl.alive);
    const alive = [...teams].filter(([, a]) => a).map(([t]) => t);
    if (alive.length === 1 && teams.size > 1) return { team: alive[0], why: "last" };
    if (left <= 0) {
      const score = (t) => G.players.filter((pl) => pl.team === t && pl.alive).reduce((s, pl) => s + cellsOf(pl.id) * 1000 + orbsOf(pl.id), 0);
      const ranked = [...teams.keys()].sort((a, b) => score(b) - score(a));
      return { team: score(ranked[0]) === score(ranked[1]) ? -1 : ranked[0], why: "time" };
    }
    return null;
  }

  function finish(res) {
    G.over = true;
    const t = $("end-title");
    const winners = res.team >= 0 ? G.players.filter((pl) => pl.team === res.team) : [];
    const color = res.color ?? winners[0]?.color;
    t.textContent = res.title ?? (res.team < 0 ? "It's a tie!" : winners.length > 1 ? `${winners.map((w) => w.name).join(" & ")} win!` : `${winners[0].name} wins!`);
    t.style.color = color ?? "";
    $("end-sub").textContent = res.sub ?? (res.why === "last" ? "Last flock standing." : `Time's up! Squares: ${G.players.filter((p) => !p.observer).map((p) => `${p.name} ${cellsOf(p.id)}`).join(" · ")}`);
    $("end-extra").replaceChildren();
    H.endExtra?.(G, res, $("end-extra"));
    const g = Kit.sharp($("hero-end"), 220, 120);
    Kit.drawLamb(g, 110, 66, 104, { scarf: color, mood: res.sad ? "sad" : "happy" });
    (res.sad ? Kit.sfx.lose : Kit.sfx.win)();
    setTimeout(() => Kit.show("end"), 700);
  }

  // ---------- AI ----------
  function aiStep(pl, now) {
    if (pl.kind !== "ai" || !pl.alive || pl.pen <= 0 || now < pl.lockUntil) return;
    const skill = AI[pl.level] ?? AI.normal;
    const i = cursorCell(pl);
    let ok = H.canDrop ? H.canDrop(G, pl, i, defaultCanDrop) : defaultCanDrop(pl, i);
    // a fumble: tap anyway on a bad square now and then
    if (!ok && Math.random() >= skill.miss) return;
    let gain = 0;
    if (ok) {
      const b = G.b;
      const score = (bb) => Kit.evaluate(bb, (o) => o === pl.id || (o < G.players.length && o >= 0 && sameTeam(o, pl.id)), (o) => o >= 0 && o < G.players.length && !sameTeam(o, pl.id), (c) => Engine.capacity(bb, c));
      const after = Engine.clone(b);
      Engine.place(after, i, pl.id);
      Engine.resolve(after, { maxWaves: 40, canBurst: (bb, c) => bb.owner[c] >= 0 && bb.owner[c] < G.players.length }, false);
      gain = score(after) - score(b) + (H.aiValue?.(G, pl, i) ?? 0);
      if (pl.special && pl.special !== "overflow") gain += Engine.neighbours(b, i, Engine.ALL8).filter((k) => b.owner[k] >= 0 && b.owner[k] < G.players.length && !sameTeam(b.owner[k], pl.id)).length * 2;
    }
    // keep a sheep in reserve unless the move is good
    const reserve = pl.level === "hard" && pl.pen <= 1 && gain < skill.pick * 2;
    if (!pl.placed || (ok && !reserve && (gain >= skill.pick || Math.random() < skill.idle)) || !ok) {
      const [lo, hi] = skill.react;
      pl.aiPlan = { cell: i, at: now + lo + Math.random() * (hi - lo) };
    }
  }

  // ---------- loop ----------
  function update(now) {
    const elapsed = (now - G.start) / 1000;
    const secs = H.roundSecs ? H.roundSecs(G) : tune.roundSecs;
    const left = secs - elapsed;
    if (Number.isFinite(secs) && left <= tune.stampedeSecs && left > 0 && !G.rush) {
      G.rush = true;
      $("app").classList.add("rush");
      shout(null, "STAMPEDE!", 1.6, "#ff6b6b");
      Kit.sfx.howl();
    }
    for (const pl of G.players) {
      if (!pl.alive || pl.observer) continue;
      const stepMs = (H.stepMs?.(G, pl) ?? tune.cursorMs) / pl.speed / (G.rush ? 1.2 : 1);
      if (now >= pl.nextStep) {
        pl.nextStep = Math.max(pl.nextStep + stepMs, now - stepMs);
        pl.pos += pl.dir;
        H.onStep?.(G, pl, now);
        aiStep(pl, now);
      }
      if (pl.aiPlan && now >= pl.aiPlan.at) {
        if (cursorCell(pl) === pl.aiPlan.cell) drop(pl, now);
        pl.aiPlan = null;
      }
      if (pl.pen < tune.pen) {
        if (!pl.refillAt) pl.refillAt = now + refillMs(pl);
        if (now >= pl.refillAt) {
          pl.pen++;
          pl.refillAt = pl.pen < tune.pen ? now + refillMs(pl) : 0;
        }
      } else pl.refillAt = 0;
    }
    if (now - G.waveAt >= WAVE_MS) {
      G.waveAt = now;
      tickWave(now);
    }
    H.update?.(G, now, left);
    if (G.over) return;
    const txt = Number.isFinite(secs) ? `${Math.floor(Math.max(0, Math.ceil(left)) / 60)}:${String(Math.max(0, Math.ceil(left)) % 60).padStart(2, "0")}` : H.timerText?.(G) ?? "";
    $("timer").textContent = txt;
    $("timer-top").textContent = txt;
    if (G.rush && Math.ceil(left) !== G.lastTick) {
      G.lastTick = Math.ceil(left);
      Kit.tone(1000, 0.04, "square", 0.04);
    }
    const res = H.endCheck ? H.endCheck(G, now, left, defaultEnd) : defaultEnd(left);
    if (res) finish(res);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (G && !G.over && !G.paused) update(now);
    drawBoard(now);
    renderButtons(now);
  }

  function pause() {
    if (!G || G.over) return;
    G.paused = true;
    G.pauseAt = performance.now();
    openTune(true);
  }

  function resume() {
    Kit.hide("tune");
    if (!G || !G.paused) return;
    const d = performance.now() - G.pauseAt;
    G.start += d;
    G.waveAt += d;
    for (const pl of G.players) {
      pl.nextStep += d;
      if (pl.refillAt) pl.refillAt += d;
      pl.lockUntil += d;
      pl.moodUntil += d;
      if (pl.aiPlan) pl.aiPlan.at += d;
    }
    H.shift?.(G, d);
    G.paused = false;
  }

  // ---------- shouts and moods ----------
  const lastShout = new Map(); // one shout per player on screen; a new one replaces it
  function shout(pl, text, scale = 1, color) {
    lastShout.get(pl?.id ?? -1)?.remove();
    const el = document.createElement("div");
    lastShout.set(pl?.id ?? -1, el);
    el.className = "shout" + (pl && FLIPPED[pl.seat] ? " flip" : "");
    el.textContent = text;
    el.style.color = color ?? pl?.color ?? "#ffcf4a";
    el.style.fontSize = `${2 * scale}rem`;
    if (pl && pl.seat >= 0) el.style.top = FLIPPED[pl.seat] ? "36%" : "64%";
    $("shouts").append(el);
    setTimeout(() => el.remove(), 1000);
    if (text.endsWith("!") && scale >= 1.5) Kit.sfx.bleat(1.2);
  }

  function mood(pl, kind, ms) {
    pl.mood = kind;
    pl.moodUntil = performance.now() + ms;
  }

  // ---------- drawing ----------
  function resize() {
    if (!G) return;
    geo = Kit.fitBoard(canvas, $("stage"), G.b.cols, G.b.rows);
  }

  const SPOTS = {
    1: [[0, 0]],
    2: [[-0.2, 0], [0.2, 0.02]],
    3: [[-0.2, 0.12], [0.2, 0.12], [0, -0.16]],
    4: [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.17], [0.2, 0.17]],
  };

  // Special sheep: Line has stripes showing its direction, Bomb is a round woolly ball, Overflow is golden.
  function drawSpecial(g, x, y, r, type, color, dir, t) {
    if (type === "bomb") {
      Kit.circle(g, x, y, r * 1.15, color);
      g.strokeStyle = Kit.shade(color, 0.5);
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
      Kit.circle(g, x + r * 1.45, y - r * 1.15, r * (0.2 + 0.1 * Math.sin(t * 20)), "#ffcf4a");
      return;
    }
    Kit.drawSheep(g, x, y, r, type === "overflow" ? "#ffcf4a" : color);
    if (type === "overflow") {
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 6);
      Kit.circle(g, x, y, r * 1.6, "rgba(255,220,100,0.35)");
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

  function drawBoard(now) {
    const t = now / 1000;
    ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!G) return;
    const b = G.b;
    const c = geo.cell;
    const incoming = new Array(b.size).fill(0);
    const fp = Math.min(1, (now - (G.flights[0]?.t0 ?? 0)) / WAVE_MS);
    if (fp < 1) for (const f of G.flights) for (const d of f.to) incoming[d]++;
    for (let i = 0; i < b.size; i++) {
      const x = Engine.colOf(b, i) * c;
      const y = Engine.rowOf(b, i) * c;
      if (b.rock[i]) {
        ctx.fillStyle = "#59605a";
        ctx.fillRect(x, y, c, c);
        H.drawCell?.(ctx, G, i, x, y, c, t);
        continue;
      }
      ctx.fillStyle = (Engine.rowOf(b, i) + Engine.colOf(b, i)) % 2 ? "#3d7a45" : "#46874e";
      ctx.fillRect(x, y, c, c);
      const o = b.owner[i];
      if (o >= 0 && o < G.players.length) {
        ctx.fillStyle = G.players[o].color + "40";
        ctx.fillRect(x, y, c, c);
      }
      if (H.drawCell?.(ctx, G, i, x, y, c, t)) continue;
      const n = b.count[i] - incoming[i];
      if (n <= 0 || o < 0) continue;
      const color = o === NEUTRAL ? "#9a9aa8" : G.players[o]?.color ?? "#fff";
      const k = Math.min(n, 4);
      const nervous = o !== NEUTRAL && n >= Engine.capacity(b, i) - 1;
      for (let s = 0; s < k; s++) {
        const [dx, dy] = SPOTS[k][s];
        const jx = nervous ? Math.sin(t * 40 + i * 3 + s) * c * 0.02 : 0;
        const sx = x + (0.5 + dx) * c + jx;
        const sy = y + (0.5 + dy) * c;
        if (s === 0 && b.tag[i]) drawSpecial(ctx, sx, sy, c * 0.14, b.tag[i].type, color, b.tag[i].dir, t);
        else Kit.drawSheep(ctx, sx, sy, c * 0.14, color, { flip: s % 2 === 1 });
      }
      if (n > 4) {
        ctx.fillStyle = "#ffcf4a";
        ctx.font = `900 ${Math.round(c * 0.24)}px system-ui`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(n, x + c * 0.72, y + c * 0.95);
      }
    }
    if (fp < 1) {
      const e = 1 - (1 - fp) * (1 - fp);
      for (const { from, to, who } of G.flights) {
        const fx = (Engine.colOf(b, from) + 0.5) * c;
        const fy = (Engine.rowOf(b, from) + 0.5) * c;
        for (const d of to) {
          const tx = (Engine.colOf(b, d) + 0.5) * c;
          const ty = (Engine.rowOf(b, d) + 0.5) * c;
          Kit.drawSheep(ctx, fx + (tx - fx) * e, fy + (ty - fy) * e - Math.sin(Math.PI * fp) * c * 0.3, c * 0.14, G.players[who]?.color ?? "#fff", { flip: tx < fx });
        }
      }
    }
    // special effects, about half a second each
    G.effects = G.effects.filter((f) => now - f.t0 < 500);
    for (const f of G.effects) {
      const p = (now - f.t0) / 500;
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = f.type === "overflow" ? "#ffe680" : f.color;
      for (const k of f.cells) {
        const x = Engine.colOf(b, k) * c;
        const y = Engine.rowOf(b, k) * c;
        if (f.type === "overflow") Kit.circle(ctx, x + c / 2, y + c / 2 - p * c * 0.4, c * 0.12, "#ffe680");
        else ctx.fillRect(x + c * 0.1 * p, y + c * 0.1 * p, c * (1 - 0.2 * p), c * (1 - 0.2 * p));
      }
      if (f.cell !== undefined && ["bomb", "blast"].includes(f.type)) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc((Engine.colOf(b, f.cell) + 0.5) * c, (Engine.rowOf(b, f.cell) + 0.5) * c, c * (0.5 + p * (f.type === "blast" ? 2.5 : 1.5)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    H.drawOver?.(ctx, G, c, t, now);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 1; col < b.cols; col++) {
      ctx.moveTo(col * c, 0);
      ctx.lineTo(col * c, geo.h);
    }
    for (let row = 1; row < b.rows; row++) {
      ctx.moveTo(0, row * c);
      ctx.lineTo(geo.w, row * c);
    }
    ctx.stroke();
    // cursors: a thick ring in each player's colour, inset so shared squares show every ring
    G.players.forEach((pl, q) => {
      if (!pl.alive || pl.observer || H.hideCursor?.(G, pl)) return;
      const i = cursorCell(pl);
      const x = Engine.colOf(b, i) * c;
      const y = Engine.rowOf(b, i) * c;
      const inset = 2 + (q % 4) * 4;
      ctx.strokeStyle = pl.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = now < pl.lockUntil ? 0.35 : 1;
      ctx.strokeRect(x + inset, y + inset, c - inset * 2, c - inset * 2);
      if (pl.special) drawSpecial(ctx, x + c - inset - c * 0.12, y + inset + c * 0.12, c * 0.08, pl.special, pl.color, pl.lineDir, t);
      ctx.globalAlpha = 1;
    });
  }

  // Each button: player colour, the lamb, the pen ring and any loaded special.
  function renderButtons(now) {
    const t = now / 1000;
    SEATS.forEach((id, seat) => {
      const btn = $(id);
      const pl = G?.players.find((x) => x.seat === seat);
      btn.classList.toggle("empty", !pl);
      if (!pl) return;
      btn.classList.toggle("flip", FLIPPED[seat]);
      const cv = btn.querySelector("canvas");
      const w = btn.clientWidth;
      const h = btn.clientHeight;
      if (!w) return;
      const g = Kit.sharp(cv, w, h);
      const empty = pl.pen <= 0;
      const locked = now < pl.lockUntil;
      g.fillStyle = !pl.alive || empty ? "#7b7f86" : pl.color;
      g.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 + 2;
      const R = Math.min(w, h) * 0.42;
      // pen ring: one segment per sheep; the next one fills as it refills
      const n = tune.pen;
      const gap = n > 1 ? 0.32 : 0;
      for (let k = 0; k < n; k++) {
        const a0 = -Math.PI / 2 + (k / n) * Math.PI * 2 + gap / 2;
        const a1 = -Math.PI / 2 + ((k + 1) / n) * Math.PI * 2 - gap / 2;
        g.lineWidth = 7;
        g.lineCap = "round";
        g.strokeStyle = "rgba(0,0,0,0.25)";
        g.beginPath();
        g.arc(cx, cy, R, a0, a1);
        g.stroke();
        let fill = k < pl.pen ? 1 : 0;
        if (k === pl.pen && pl.refillAt) fill = Math.max(0, 1 - (pl.refillAt - now) / refillMs(pl));
        if (fill > 0) {
          g.strokeStyle = "#fffaf0";
          g.beginPath();
          g.arc(cx, cy, R, a0, a0 + (a1 - a0) * fill);
          g.stroke();
        }
      }
      // the lamb reacts
      const m = now < pl.moodUntil ? pl.mood : null;
      const panic = empty && pl.alive;
      const jump = m === "cheer" ? Math.abs(Math.sin(t * 10)) * 8 : 0;
      const jit = panic ? Math.sin(t * 50) * 2 : 0;
      Kit.drawLamb(g, cx + jit, cy + 6 - jump, R * 1.25, { scarf: pl.color, t, mood: !pl.alive ? "sleep" : m === "oops" ? "sleep" : panic ? "shock" : "happy" });
      if (m === "oops") {
        // hooves over his eyes
        for (const side of [-1, 1]) Kit.circle(g, cx + R * 0.27 + side * R * 0.09, cy + 6 - R * 0.26, R * 0.09, "#3b3340");
      }
      if (panic) {
        Kit.ellipse(g, cx + R * 0.55, cy - R * 0.25, R * 0.06, R * 0.1, 0, "#8fd3ff");
      }
      if (pl.special) {
        Kit.circle(g, w - 22, 22, 17, "rgba(0,0,0,0.3)");
        drawSpecial(g, w - 22, 23, 9, pl.special, pl.color, pl.lineDir, t);
      }
      if (pl.kind === "ai") {
        g.fillStyle = "rgba(0,0,0,0.45)";
        g.font = "900 12px system-ui";
        g.fillText("AI", 10, h - 10);
      }
      if (locked) {
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "#fff";
        g.lineWidth = 5;
        g.beginPath();
        g.arc(cx, cy, R * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ((pl.lockUntil - now) / LOCK_MS));
        g.stroke();
      }
      if (!pl.alive) {
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#fff";
        g.font = "900 22px system-ui";
        g.textAlign = "center";
        g.fillText("OUT", cx, cy + 8);
        g.textAlign = "start";
      }
    });
  }

  // ---------- start screen helpers ----------
  const ui = {
    clear: () => $("opts").replaceChildren(),
    row(label, el) {
      const r = document.createElement("div");
      r.className = "optrow";
      r.innerHTML = `<span class="lbl">${label}</span>`;
      r.append(el);
      $("opts").append(r);
      return r;
    },
    seg(label, key, options, after) {
      const s = document.createElement("div");
      s.className = "seg";
      for (const [value, text] of options) {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.className = setup[key] === value ? "on" : "";
        btn.addEventListener("click", () => {
          setup[key] = value;
          saveSetup();
          renderOptions();
          after?.();
        });
        s.append(btn);
      }
      return ui.row(label, s);
    },
    stepper(label, key, min, max) {
      const s = document.createElement("div");
      s.className = "stepper";
      s.innerHTML = `<button aria-label="Fewer">−</button><output>${setup[key]}</output><button aria-label="More">+</button>`;
      const [less, , more] = s.children;
      less.addEventListener("click", () => {
        setup[key] = Math.max(min, setup[key] - 1);
        saveSetup();
        renderOptions();
      });
      more.addEventListener("click", () => {
        setup[key] = Math.min(max, setup[key] + 1);
        saveSetup();
        renderOptions();
      });
      return ui.row(label, s);
    },
    seats(count) {
      const box = document.createElement("div");
      box.className = "seats";
      setup.seats ??= ["human", "ai", "ai", "ai"];
      for (let p = 0; p < count; p++) {
        const row = document.createElement("div");
        row.className = "seat";
        row.innerHTML = `<span class="dot" style="color:${COLORS[p]}"></span><span class="nm">${NAMES[p]}</span>`;
        const seg = document.createElement("div");
        seg.className = "seg";
        for (const [k, text] of [["human", "Human"], ["ai", "AI"]]) {
          const btn = document.createElement("button");
          btn.textContent = text;
          btn.className = setup.seats[p] === k ? "on" : "";
          btn.addEventListener("click", () => {
            setup.seats[p] = k;
            saveSetup();
            renderOptions();
          });
          seg.append(btn);
        }
        row.append(seg);
        box.append(row);
      }
      $("opts").append(box);
    },
    level() {
      return ui.seg("AI", "level", [["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"]]);
    },
  };

  function renderOptions() {
    ui.clear();
    V.options?.(ui, setup);
  }

  // ---------- tuning panel ----------
  function openTune(inGame) {
    const box = $("sliders");
    box.replaceChildren();
    for (const [key, label, min, max, step, unit] of TUNE_INFO.concat(V.tuneInfo || [])) {
      const el = document.createElement("label");
      el.innerHTML = `<span>${label}</span><output></output><input type="range" min="${min}" max="${max}" step="${step}" />`;
      const input = el.querySelector("input");
      const out = el.querySelector("output");
      input.value = tune[key];
      out.textContent = tune[key] + unit;
      input.addEventListener("input", () => {
        tune[key] = Number(input.value);
        out.textContent = tune[key] + unit;
        saveTune();
        if (key === "pen" && G) for (const pl of G.players) pl.pen = Math.min(pl.pen, tune.pen);
      });
      box.append(el);
    }
    $("tune-done").textContent = inGame ? "Resume" : "Done";
    $("tune-restart").parentElement.hidden = !inGame;
    Kit.show("tune");
  }

  // ---------- wiring ----------
  function run(version) {
    V = version;
    H = V.hooks || {};
    tune = load(`cfl-${V.key}-tune`, defaults());
    setup = load(`cfl-${V.key}-setup`, V.setupDefaults || {});
    canvas = $("board");
    ctx = canvas.getContext("2d");
    $("title").textContent = V.title;
    $("how").innerHTML = V.how.join("<br>");
    if (V.solo) $("app").classList.add("solo");
    SEATS.forEach((id) =>
      $(id).addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const pl = G?.players.find((x) => x.seat === SEATS.indexOf(id));
        if (pl && pl.kind === "human") drop(pl);
      })
    );
    $("play").addEventListener("click", () => (V.onPlay ? V.onPlay(start) : start()));
    $("again").addEventListener("click", () => (V.onAgain ? V.onAgain(start) : start()));
    $("end-menu").addEventListener("click", menu);
    $("pause").addEventListener("click", pause);
    $("gear").addEventListener("click", () => openTune(false));
    $("tune-done").addEventListener("click", resume);
    $("tune-restart").addEventListener("click", () => (V.onAgain ? V.onAgain(start) : start()));
    $("tune-menu").addEventListener("click", menu);
    $("tune-reset").addEventListener("click", () => {
      tune = defaults();
      saveTune();
      openTune(!!G && G.paused);
    });
    Kit.muteButton($("mute"));
    new ResizeObserver(resize).observe($("stage"));
    renderOptions();
    const g = Kit.sharp($("hero-intro"), 220, 120);
    if (V.hero) V.hero(g);
    else {
      COLORS.forEach((col, k) => Kit.drawSheep(g, 30 + k * 54, 108 - (k % 2) * 6, 12, col, { flip: k > 1 }));
      Kit.drawLamb(g, 110, 60, 96, { scarf: COLORS[0], mood: "happy" });
    }
    requestAnimationFrame(frame);
  }

  function menu() {
    if (G) G.over = true;
    G = null;
    $("app").classList.remove("rush");
    for (const id of ["end", "tune"]) Kit.hide(id);
    renderOptions();
    V.onMenu?.();
    Kit.show("intro");
  }

  return {
    run, start, menu, drop, shout, mood, loadSpecial, landOn, buildPath, cursorCell, cellsOf, orbsOf, sameTeam, refillMs, resize, ui, renderOptions,
    COLORS, NAMES, NEUTRAL, RANK, FLIPPED,
    get G() { return G; }, get tune() { return tune; }, get setup() { return setup; }, get geo() { return geo; },
  };
})();
// ===================== END SHARED STAMPEDE CORE =====================
