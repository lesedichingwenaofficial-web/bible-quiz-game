// ===================== SHARED CARD SYSTEM =====================
// Card pool, card effects, targeting, reveal scenes, board effects and card AI
// for demos 11-18. Game state shape (plain data, so structuredClone works):
//   st = { b, n, ps[], alive[], moved[], current, dir, turn, round, turnsInRound,
//          winner, wolf, forced, extraTurn, events[], seed }
//   ps[p] = { hand[], gifts: { tongues, mercy, leadership }, discern, skip, den, give }
// Board extras used here: still (player protecting, -1), mustard (owner, -1).
// Each demo sets Cards.hooks for its own rules (blocked cells, extra land rules).
const Cards = (() => {
  const W = "John 10:12"; // reference for the wolf tricks
  const DEF = {
    sea: { name: "Part the Sea", icon: "🌊", ref: "Exodus 14", text: "Empty every enemy square in one row or column.", group: "miracle", target: "line" },
    fire: { name: "Fire from Heaven", icon: "🔥", ref: "1 Kings 18", text: "Empty every enemy square in a 3×3 area.", group: "miracle", target: "area" },
    sling: { name: "David's Sling", icon: "🪨", ref: "1 Samuel 17", text: "Empty the enemy square with the most sheep.", group: "miracle", target: "none" },
    loaves: { name: "Loaves & Fishes", icon: "🍞", ref: "Matthew 14", text: "Double the sheep in one of your squares.", group: "miracle", target: "mine" },
    manna: { name: "Manna", icon: "☁️", ref: "Exodus 16", text: "3 sheep land on random squares of yours.", group: "miracle", target: "none" },
    water: { name: "Walking on Water", icon: "👣", ref: "Matthew 14", text: "Place a sheep on any square, even an enemy's. It becomes yours.", group: "miracle", target: "any" },
    call: { name: "Shepherd's Call", icon: "📯", ref: "John 10:27", text: "Your sheep next to one of your squares all run into it.", group: "miracle", target: "mine" },
    still: { name: "Be Still", icon: "🕊️", ref: "Psalm 46:10", text: "Nothing in a 3×3 area can flip or burst until your next turn.", group: "miracle", target: "area" },
    jericho: { name: "Jericho", icon: "🎺", ref: "Joshua 6", text: "Empty every enemy square on the edge of the board.", group: "miracle", target: "none" },
    mustard: { name: "Mustard Seed", icon: "🌱", ref: "Matthew 13:31", text: "Plant on an empty square. It grows +1 each of your turns until it bursts.", group: "miracle", target: "empty" },
    sabbath: { name: "Sabbath", icon: "🌙", ref: "Exodus 20:8", text: "The next player skips their turn.", group: "parable", target: "none" },
    cheek: { name: "Turn the Other Cheek", icon: "🔄", ref: "Matthew 5:39", text: "Turn order reverses.", group: "parable", target: "none" },
    double: { name: "Double Portion", icon: "✌️", ref: "2 Kings 2:9", text: "Take another turn right away.", group: "parable", target: "none" },
    twobytwo: { name: "Two by Two", icon: "👯", ref: "Genesis 7", text: "Choose where the next player's next 2 sheep go.", group: "parable", target: "cells" },
    give: { name: "Give and It Will Be Given", icon: "🎁", ref: "Luke 6:38", text: "Give 1 sheep to an enemy square. Next turn, 3 land on yours.", group: "parable", target: "enemy" },
    last: { name: "The Last Shall Be First", icon: "🔃", ref: "Matthew 20:16", text: "Whoever has the fewest squares takes 3 from whoever has the most.", group: "parable", target: "none", instant: true },
    den: { name: "Lions' Den", icon: "🦁", ref: "Daniel 6", text: "You skip your next turn, but none of your squares can be flipped until you're back.", group: "parable", target: "none", instant: true },
    tongues: { name: "Tongues", icon: "🗣️", ref: "1 Corinthians 12", text: "For 3 turns, your bursts also hit diagonal neighbours.", group: "gift", target: "none" },
    mercy: { name: "Mercy", icon: "💗", ref: "Romans 12", text: "For 3 turns, enemy bursts take 1 sheep from your squares instead of flipping them.", group: "gift", target: "none" },
    leadership: { name: "Leadership", icon: "👑", ref: "Romans 12", text: "For 3 turns, place 2 sheep per turn.", group: "gift", target: "none" },
    faith: { name: "Faith", icon: "⛰️", ref: "Matthew 17:20", text: "Move all the sheep from one of your squares to any empty square.", group: "gift", target: "faith" },
    discern: { name: "Discernment", icon: "👁️", ref: "1 Corinthians 12", text: "For the whole game, see inside every gift box and face-down card.", group: "gift", target: "none" },
    wolfdoor: { name: "Wolf at the Door", icon: "🐺", ref: W, text: "Your biggest square is emptied.", group: "wolf", target: "none", instant: true },
    scatter: { name: "Scatter", icon: "🐺", ref: W, text: "Your squares with exactly 1 sheep are emptied.", group: "wolf", target: "none", instant: true },
    wolfin: { name: "The Wolf Gets In", icon: "🐺", ref: W, text: "A wolf sneaks onto the board and raids a neighbouring square every round.", group: "wolf", target: "none", instant: true },
    grace: { name: "Grace", icon: "🛡️", ref: "Ephesians 2:8", text: "Keep it: it cancels the next wolf trick or enemy card aimed at you.", group: "grace", target: "none", auto: true },
    pentecost: { name: "Pentecost", icon: "🌟", ref: "Acts 2", text: "Every square you own gets +1.", group: "golden", target: "none" },
  };

  // Draw weights: more good cards than bad, wolf tricks about 15%.
  const POOL = {
    sea: 6, fire: 5, sling: 6, loaves: 6, manna: 7, water: 6, call: 5, still: 4, jericho: 4, mustard: 6,
    sabbath: 5, cheek: 4, double: 5, twobytwo: 4, give: 4, last: 3, den: 2,
    tongues: 4, mercy: 4, leadership: 4, faith: 3, discern: 2, grace: 4, pentecost: 1,
    wolfdoor: 7, scatter: 7, wolfin: 6,
  };

  let speed = 1; // animation time multiplier (tests use a small value)
  let safeRounds = 2; // nobody can be knocked out during the first rounds
  let hooks = {}; // per-demo: { blocked(st, i), land(st, b, from, to, who) -> true if handled, emptied(st, b, i) }

  function draw(pool = POOL, filter = () => true, rand = Math.random) {
    const keys = Object.keys(pool).filter((k) => pool[k] > 0 && filter(k));
    const total = keys.reduce((n, k) => n + pool[k], 0);
    let r = rand() * total;
    for (const k of keys) if ((r -= pool[k]) < 0) return k;
    return keys[keys.length - 1];
  }

  // ---------- state ----------
  function newPlayer() {
    return { hand: [], gifts: { tongues: 0, mercy: 0, leadership: 0 }, discern: false, skip: 0, den: false, give: false };
  }

  function newState(b, n) {
    return {
      b, n,
      ps: Array.from({ length: n }, newPlayer),
      alive: new Array(n).fill(true),
      moved: new Array(n).fill(false),
      current: 0, dir: 1, turn: 0, round: 1, turnsInRound: 0, winner: -1,
      wolf: -1, forced: null, extraTurn: false, events: [],
    };
  }

  const clone = (st) => structuredClone(st);
  const orbs = (b, p) => b.owner.reduce((n, o, i) => n + (o === p ? b.count[i] : 0), 0);
  const cells = (b, p) => b.owner.reduce((n, o) => n + (o === p ? 1 : 0), 0);
  const mine = (st, p) => st.b.owner.flatMap((o, i) => (o === p ? [i] : []));
  const enemy = (st, p, i) => st.b.owner[i] >= 0 && st.b.owner[i] !== p && st.b.owner[i] < st.n;
  const aliveCount = (st) => st.alive.filter(Boolean).length;

  function nextIndex(st, from = st.current, dir = st.dir) {
    let q = from;
    for (let k = 0; k < st.n; k++) {
      q = (q + dir + st.n) % st.n;
      if (st.alive[q]) return q;
    }
    return from;
  }

  function canPlace(st, p, i) {
    const b = st.b;
    if (i < 0 || i >= b.size || b.rock[i] || i === st.wolf) return false;
    if (hooks.blocked?.(st, i, p)) return false;
    return b.owner[i] === -1 || b.owner[i] === p;
  }

  function emptyCell(st, i) {
    const b = st.b;
    b.owner[i] = -1;
    b.count[i] = 0;
    b.mustard[i] = -1;
    hooks.emptied?.(st, b, i);
  }

  // Grace: if v holds it, it's used up and the effect on v is cancelled.
  function guard(st, v) {
    const k = st.ps[v].hand.indexOf("grace");
    if (k < 0) return true;
    st.ps[v].hand.splice(k, 1);
    st.events.push({ type: "grace", p: v });
    return false;
  }

  function rules(st) {
    const b = st.b;
    return {
      canBurst: (bb, i) => bb.owner[i] >= 0 && bb.owner[i] < st.n && st.alive[bb.owner[i]] && bb.still[i] < 0 && !(hooks.canBurst && !hooks.canBurst(st, bb, i)),
      targets: (bb, i) => {
        const who = bb.owner[i];
        bb.mustard[i] = -1;
        const t = Engine.neighbours(bb, i, st.ps[who]?.gifts.tongues > 0 ? Engine.ALL8 : Engine.ORTHO);
        return hooks.targets ? hooks.targets(st, bb, i, t) : t;
      },
      emptied: (bb, i) => {
        bb.owner[i] = -1;
        hooks.emptied?.(st, bb, i);
      },
      land: (bb, from, to, who) => {
        if (!st.alive[who]) return;
        if (to === st.wolf) {
          st.wolf = -1;
          st.events.push({ type: "wolfchased", cell: to });
        }
        if (hooks.land?.(st, bb, from, to, who)) return;
        const v = bb.owner[to];
        if (v >= 0 && v < st.n && v !== who) {
          if (bb.still[to] >= 0 || st.ps[v].den) return; // protected: the sheep is turned away
          if (st.ps[v].gifts.mercy > 0) {
            bb.count[to]--;
            if (bb.count[to] <= 0) emptyCell(st, to);
            return;
          }
          bb.mustard[to] = -1;
        }
        bb.owner[to] = who;
        bb.count[to]++;
      },
      done: () => settled(st) && st.alive.filter((a, p) => a && orbs(b, p) > 0).length <= 1,
      maxWaves: 200,
    };
  }

  function resolve(st, record = true) {
    const r = Engine.resolve(st.b, rules(st), record);
    settle(st);
    return r.waves;
  }

  // Knock out flocks with no sheep (only once everyone has moved) and find a winner.
  const settled = (st) => st.moved.every(Boolean) && st.round > safeRounds;

  function settle(st) {
    if (!settled(st)) return;
    for (let p = 0; p < st.n; p++) {
      if (!st.alive[p] || orbs(st.b, p) > 0 || hooks.keepsAlive?.(st, p)) continue;
      st.alive[p] = false;
      st.events.push({ type: "out", p });
      for (let i = 0; i < st.b.size; i++) if (st.b.owner[i] === p) emptyCell(st, i);
    }
    if (aliveCount(st) === 1) st.winner = st.alive.indexOf(true);
  }

  function place(st, p, i, record = true) {
    Engine.place(st.b, i, p);
    st.moved[p] = true;
    return resolve(st, record);
  }

  // ---------- turn flow ----------
  // Start of p's turn. Returns { skipped, waves, notes }.
  function beginTurn(st, record = true) {
    const p = st.current;
    const ps = st.ps[p];
    st.events = [];
    if (ps.skip > 0) {
      ps.skip--;
      return { skipped: true, waves: [] };
    }
    ps.den = false;
    const b = st.b;
    for (let i = 0; i < b.size; i++) if (b.still[i] === p) b.still[i] = -1;
    for (const k in ps.gifts) if (ps.gifts[k] > 0) ps.gifts[k]--;
    let grew = false;
    for (let i = 0; i < b.size; i++)
      if (b.mustard[i] === p && b.owner[i] === p) {
        b.count[i]++;
        grew = true;
      }
    let given = [];
    if (ps.give) {
      ps.give = false;
      given = randomMine(st, p, 3);
      for (const i of given) Engine.place(b, i, p);
    }
    const waves = grew || given.length ? resolve(st, record) : [];
    return { skipped: false, waves, given, grew };
  }

  function randomMine(st, p, k) {
    const own = mine(st, p);
    const pool = own.length ? own : st.b.owner.flatMap((o, i) => (o === -1 && canPlace(st, p, i) ? [i] : []));
    return Array.from({ length: k }, () => pool[Math.floor(Math.random() * pool.length)]).filter((i) => i !== undefined);
  }

  // Move to the next player. Returns the list of events (round ends, wolf raids).
  function endTurn(st) {
    st.turn++;
    if (st.winner >= 0) return;
    if (st.extraTurn) {
      st.extraTurn = false;
      return;
    }
    st.current = nextIndex(st);
    st.turnsInRound++;
    if (st.turnsInRound >= aliveCount(st)) {
      st.turnsInRound = 0;
      st.round++;
      endRound(st);
    }
  }

  // The roaming wolf raids the biggest neighbouring square and moves onto it.
  function endRound(st) {
    if (st.wolf < 0) return;
    const b = st.b;
    const around = Engine.neighbours(b, st.wolf);
    let best = -1;
    for (const n of around) if (b.count[n] > 0 && (best < 0 || b.count[n] > b.count[best])) best = n;
    const to = best >= 0 ? best : around[Math.floor(Math.random() * around.length)];
    if (best >= 0 && b.owner[best] < st.n && (b.owner[best] < 0 || guard(st, b.owner[best]))) emptyCell(st, best);
    st.events.push({ type: "wolfmove", from: st.wolf, to, raided: best });
    st.wolf = to;
    settle(st);
  }

  // ---------- targets ----------
  // Cells the actor may tap for this card, given the picks so far.
  function selectable(st, p, key, picks = []) {
    const b = st.b;
    const all = [...Array(b.size).keys()].filter((i) => !b.rock[i]);
    switch (DEF[key].target) {
      case "line":
      case "area":
        return all;
      case "mine":
        return all.filter((i) => b.owner[i] === p);
      case "any":
        return all.filter((i) => i !== st.wolf && !hooks.blocked?.(st, i, p));
      case "empty":
        return all.filter((i) => b.owner[i] === -1 && canPlace(st, p, i));
      case "enemy":
        return all.filter((i) => enemy(st, p, i));
      case "cells": {
        const v = nextIndex(st, p);
        return all.filter((i) => canPlace(st, v, i) && !picks.includes(i));
      }
      case "faith":
        return picks.length === 0 ? all.filter((i) => b.owner[i] === p && b.count[i] > 0) : all.filter((i) => b.owner[i] === -1 && canPlace(st, p, i));
      default:
        return [];
    }
  }

  // How many taps a card needs.
  const picksNeeded = (key, st) => ({ none: 0, line: 1, area: 1, mine: 1, any: 1, empty: 1, enemy: 1, faith: 2, cells: st?.forcedNext ?? 2 })[DEF[key].target];

  const area = (b, c) => Engine.neighbours(b, c, Engine.ALL8).concat([c]).filter((i) => !b.rock[i]);
  const lineCells = (b, t) => (t.axis === "row" ? [...Array(b.cols).keys()].map((c) => t.index * b.cols + c) : [...Array(b.rows).keys()].map((r) => r * b.cols + t.index));
  const edge = (b) => [...Array(b.size).keys()].filter((i) => { const r = Engine.rowOf(b, i), c = Engine.colOf(b, i); return r === 0 || c === 0 || r === b.rows - 1 || c === b.cols - 1; });

  // Empties enemy cells of p in the list, respecting each victim's Grace.
  function wipe(st, p, list) {
    const victims = new Set(list.filter((i) => enemy(st, p, i)).map((i) => st.b.owner[i]));
    const spared = new Set([...victims].filter((v) => !guard(st, v)));
    const hit = list.filter((i) => enemy(st, p, i) && !spared.has(st.b.owner[i]));
    for (const i of hit) emptyCell(st, i);
    return hit;
  }

  // Plays card `key` for player p with target t. Mutates st. Returns { waves, fx }.
  // The card must already be removed from p's hand by the caller.
  function apply(st, p, key, t, record = true) {
    const b = st.b;
    st.events.push({ type: "card", p, key });
    let fx = { kind: key };
    let waves = [];
    const res = () => {
      if (record && !fx.mid) fx.mid = Engine.clone(b); // the board after the card, before any bursts
      waves = waves.concat(resolve(st, record));
    };
    switch (key) {
      case "sea": fx.cells = lineCells(b, t); fx.hit = wipe(st, p, fx.cells); fx.axis = t.axis; break;
      case "fire": fx.cells = area(b, t); fx.hit = wipe(st, p, fx.cells); break;
      case "sling": {
        let best = -1;
        for (let i = 0; i < b.size; i++) if (enemy(st, p, i) && (best < 0 || b.count[i] > b.count[best])) best = i;
        fx.cells = best >= 0 ? [best] : [];
        if (best >= 0) fx.hit = wipe(st, p, [best]);
        break;
      }
      case "loaves": fx.cells = [t]; b.count[t] *= 2; res(); break;
      case "manna": fx.cells = randomMine(st, p, 3); for (const i of fx.cells) Engine.place(b, i, p); res(); break;
      case "water": {
        fx.cells = [t];
        const v = b.owner[t];
        if (enemy(st, p, t) && !guard(st, v)) break;
        b.owner[t] = p;
        b.count[t]++;
        b.mustard[t] = -1;
        res();
        break;
      }
      case "call": {
        const from = Engine.neighbours(b, t).filter((n) => b.owner[n] === p && b.count[n] > 0);
        fx.cells = [t];
        fx.from = from;
        for (const n of from) {
          b.count[t] += b.count[n];
          emptyCell(st, n);
        }
        res();
        break;
      }
      case "still": fx.cells = area(b, t); for (const i of fx.cells) b.still[i] = p; break;
      case "jericho": fx.cells = edge(b); fx.hit = wipe(st, p, fx.cells); break;
      case "mustard": fx.cells = [t]; b.owner[t] = p; b.count[t] = 1; b.mustard[t] = p; res(); break;
      case "sabbath": { const v = nextIndex(st, p); fx.p = v; if (guard(st, v)) st.ps[v].skip++; break; }
      case "cheek":
        if (aliveCount(st) <= 2) { const v = nextIndex(st, p); fx.p = v; if (guard(st, v)) st.ps[v].skip++; }
        else st.dir *= -1;
        break;
      case "double": st.extraTurn = true; break;
      case "twobytwo": {
        const v = nextIndex(st, p);
        fx.cells = t;
        fx.p = v;
        if (guard(st, v)) st.forced = { victim: v, cells: t.slice(), by: p };
        break;
      }
      case "give": { fx.cells = [t]; const v = b.owner[t]; if (guard(st, v)) { b.count[t]++; res(); } st.ps[p].give = true; break; }
      case "last": {
        const live = st.alive.flatMap((a, q) => (a ? [q] : []));
        const few = live.reduce((x, q) => (cells(b, q) < cells(b, x) ? q : x), live[0]);
        const most = live.reduce((x, q) => (cells(b, q) > cells(b, x) ? q : x), live[0]);
        fx.from = most;
        fx.to = few;
        if (few !== most && guard(st, most)) {
          const take = shuffle(mine(st, most)).slice(0, 3);
          for (const i of take) b.owner[i] = few;
          fx.cells = take;
        }
        settle(st);
        break;
      }
      case "den": st.ps[p].skip++; st.ps[p].den = true; break;
      // counts down at the start of each of your turns, so it covers your next 3 turns
      case "tongues": case "mercy": case "leadership": st.ps[p].gifts[key] = 4; fx.cells = mine(st, p); break;
      case "faith": {
        const [from, to] = t;
        fx.cells = [from, to];
        b.owner[to] = p;
        b.count[to] = b.count[from];
        emptyCell(st, from);
        res();
        break;
      }
      case "discern": st.ps[p].discern = true; break;
      case "wolfdoor": {
        const own = mine(st, p);
        const big = own.reduce((x, i) => (x < 0 || b.count[i] > b.count[x] ? i : x), -1);
        fx.cells = big >= 0 ? [big] : [];
        if (big >= 0 && guard(st, p)) emptyCell(st, big);
        settle(st);
        break;
      }
      case "scatter": {
        fx.cells = mine(st, p).filter((i) => b.count[i] === 1);
        if (fx.cells.length && guard(st, p)) for (const i of fx.cells) emptyCell(st, i);
        settle(st);
        break;
      }
      case "wolfin": {
        const spots = [...Array(b.size).keys()].filter((i) => !b.rock[i] && !hooks.blocked?.(st, i, -1));
        st.wolf = spots[Math.floor(Math.random() * spots.length)];
        fx.cells = [st.wolf];
        break;
      }
      case "grace": st.ps[p].hand.push("grace"); break;
      case "pentecost": fx.cells = mine(st, p); for (const i of fx.cells) b.count[i]++; res(); break;
    }
    return { waves, fx };
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- AI ----------
  function score(st, p) {
    if (st.winner >= 0) return st.winner === p ? 1e6 : -1e6;
    if (!st.alive[p]) return -1e6;
    const b = st.b;
    let s = Kit.evaluate(b, (o) => o === p, (o) => o !== p && o >= 0 && o < st.n, (i) => Engine.capacity(b, i));
    s += cells(b, p) * 2;
    for (let q = 0; q < st.n; q++) if (q !== p && st.alive[q]) s -= cells(b, q) * 1.2;
    s += st.alive.filter((a, q) => !a && q !== p).length * 60;
    const g = st.ps[p].gifts;
    s += (g.tongues + g.mercy + g.leadership) * 2 + (st.ps[p].hand.includes("grace") ? 4 : 0);
    if (st.ps[p].skip) s -= 8;
    return s;
  }

  // Candidate targets for a card (sampled to keep the AI quick).
  function aiTargets(st, p, key) {
    const b = st.b;
    const T = DEF[key].target;
    const enemyLoad = (list) => list.reduce((n, i) => n + (enemy(st, p, i) ? b.count[i] + 1 : 0), 0);
    if (T === "none") return [null];
    if (T === "line") {
      const lines = [...Array(b.rows).keys()].map((r) => ({ axis: "row", index: r })).concat([...Array(b.cols).keys()].map((c) => ({ axis: "col", index: c })));
      return lines.sort((x, y) => enemyLoad(lineCells(b, y)) - enemyLoad(lineCells(b, x))).slice(0, 4);
    }
    if (T === "area") return [...Array(b.size).keys()].sort((x, y) => enemyLoad(area(b, y)) - enemyLoad(area(b, x))).slice(0, 5);
    if (T === "cells") {
      const v = nextIndex(st, p);
      const opts = selectable(st, p, key);
      // put their sheep where they are weakest: next to my nearly full squares
      const risk = (i) => Engine.neighbours(b, i).reduce((n, j) => n + (b.owner[j] === p && b.count[j] >= Engine.capacity(b, j) - 1 ? 3 : b.owner[j] === p ? 1 : 0), 0) - (b.owner[i] === v ? b.count[i] : 0);
      return [opts.sort((x, y) => risk(y) - risk(x)).slice(0, st.forcedNext ?? 2)];
    }
    if (T === "faith") {
      const own = mine(st, p).filter((i) => b.count[i] > 0).sort((x, y) => b.count[y] - b.count[x]).slice(0, 2);
      const empt = selectable(st, p, key, [0]).sort((x, y) => enemyLoad(Engine.neighbours(b, y)) - enemyLoad(Engine.neighbours(b, x))).slice(0, 3);
      return own.flatMap((f) => empt.map((e) => [f, e]));
    }
    const opts = selectable(st, p, key);
    return shuffle(opts).slice(0, 10);
  }

  // Best placement for p by one-ply simulation. Returns { cell, score }.
  function bestPlace(st, p, legal, scoreFn = score) {
    let best = { cell: -1, score: -Infinity };
    for (const i of legal) {
      const s2 = clone(st);
      place(s2, p, i, false);
      const sc = scoreFn(s2, p);
      if (sc > best.score) best = { cell: i, score: sc };
    }
    return best;
  }

  // AI plan for one turn: optionally one card (before placing), then a placement.
  // legalPlace(st) lists placement cells; playable(st, p) lists hand cards it may play.
  function aiPlan(st, p, { legalPlace, playable = (s) => s.ps[p].hand, margin = 2, mistake = 0.15, score: scoreFn = score, place: doPlace = true }) {
    const base = doPlace ? bestPlace(st, p, legalPlace(st), scoreFn) : { cell: -1, score: scoreFn(st, p) };
    let plan = { card: null, target: null, cell: base.cell, score: base.score };
    for (const key of new Set(playable(st, p))) {
      if (DEF[key].auto) continue;
      for (const t of aiTargets(st, p, key)) {
        const s2 = clone(st);
        const k = s2.ps[p].hand.indexOf(key);
        if (k >= 0) s2.ps[p].hand.splice(k, 1);
        apply(s2, p, key, t, false);
        const after = s2.winner >= 0 || !doPlace ? { cell: -1, score: scoreFn(s2, p) } : bestPlace(s2, p, legalPlace(s2), scoreFn);
        if (after.score > plan.score + margin) plan = { card: key, target: t, cell: after.cell, score: after.score };
      }
    }
    if (Math.random() < mistake && plan.card === null) {
      const legal = legalPlace(st);
      plan.cell = legal[Math.floor(Math.random() * legal.length)] ?? plan.cell;
    }
    return plan;
  }

  // ---------- look and feel ----------
  const GROUP_COL = { miracle: "#3b6fb6", parable: "#7a5aa8", gift: "#2f8f6b", wolf: "#5b5468", grace: "#c99a2e", golden: "#d4a017" };

  function cardHTML(key, o = {}) {
    if (o.faceDown) return `<div class="ccard down${o.small ? " small" : ""}"><span class="ic">🎁</span><b>Gift</b></div>`;
    const d = DEF[key];
    return `<div class="ccard ${d.group}${o.small ? " small" : ""}${o.on ? " on" : ""}" style="--g:${GROUP_COL[d.group]}"><span class="ic">${d.icon}</span><b>${d.name}</b>${o.small ? "" : `<span class="tx">${d.text}</span>`}<small>${d.ref}</small>${o.cost !== undefined ? `<i class="cost">${o.cost}</i>` : ""}</div>`;
  }

  // Card sounds.
  function sound(key) {
    const T = Kit.tone;
    const d = DEF[key];
    if (d.group === "wolf") return Kit.sfx.howl();
    ({
      sea: () => { T(500, 0.7, "sawtooth", 0.05, 120); T(300, 0.8, "triangle", 0.06, 90, 0.1); },
      fire: () => [0, 0.12, 0.24].forEach((dl) => T(180, 0.4, "sawtooth", 0.07, 60, dl)),
      sling: () => { T(400, 0.35, "sine", 0.08, 1400); T(90, 0.25, "square", 0.08, 50, 0.4); },
      loaves: () => [523, 784].forEach((f, k) => T(f, 0.2, "triangle", 0.1, 0, k * 0.1)),
      manna: () => [1046, 1318, 1568].forEach((f, k) => T(f, 0.25, "sine", 0.06, 0, k * 0.12)),
      water: () => T(700, 0.5, "sine", 0.08, 350),
      call: () => { T(392, 0.25, "triangle", 0.1); T(523, 0.4, "triangle", 0.1, 0, 0.22); },
      still: () => T(330, 1, "sine", 0.06, 300),
      jericho: () => [262, 330, 392, 523].forEach((f, k) => T(f, 0.25, "square", 0.05, 0, k * 0.12)),
      mustard: () => T(300, 0.5, "triangle", 0.08, 700),
      grace: () => [784, 988, 1175].forEach((f, k) => T(f, 0.35, "sine", 0.07, 0, k * 0.08)),
      pentecost: () => [523, 659, 784, 1047, 1319].forEach((f, k) => T(f, 0.3, "triangle", 0.08, 0, k * 0.09)),
    }[key] ?? (() => Kit.sfx.chime(5)))();
  }

  // ---------- board effects ----------
  // Demos call Cards.fx.draw(ctx, b, cell, now) after drawing their board.
  const fx = {
    cur: null,
    play(f, ms = 1000) {
      return new Promise((done) => {
        this.cur = { ...f, t0: performance.now(), ms: Math.max(16, ms * speed), done };
      });
    },
    draw(ctx, b, c, now) {
      const f = this.cur;
      if (!f) return;
      const p = Math.min(1, (now - f.t0) / f.ms);
      const cx = (i) => (Engine.colOf(b, i) + 0.5) * c;
      const cy = (i) => (Engine.rowOf(b, i) + 0.5) * c;
      const W2 = b.cols * c;
      const H2 = b.rows * c;
      const cellsOf = f.cells ?? [];
      ctx.save();
      switch (f.kind) {
        case "sea": {
          // water rushes in along the line, then parts outward
          for (const i of cellsOf) {
            const x = Engine.colOf(b, i) * c;
            const y = Engine.rowOf(b, i) * c;
            const split = Math.max(0, p - 0.35) / 0.65;
            ctx.fillStyle = `rgba(60,140,220,${0.75 * (1 - split * 0.6)})`;
            if (f.axis === "row") {
              ctx.fillRect(x, y - split * c * 0.5, c, c * 0.5);
              ctx.fillRect(x, y + c * 0.5 + split * c * 0.5, c, c * 0.5);
            } else {
              ctx.fillRect(x - split * c * 0.5, y, c * 0.5, c);
              ctx.fillRect(x + c * 0.5 + split * c * 0.5, y, c * 0.5, c);
            }
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + c / 2, y + c / 2, c * 0.3 * (1 + split), 0, Math.PI * 2 * Math.min(1, p * 2));
            ctx.stroke();
          }
          break;
        }
        case "fire": case "pentecost": {
          for (const [k, i] of cellsOf.entries()) {
            const drop = Math.min(1, p * 1.6 - (k % 4) * 0.08);
            if (drop <= 0) continue;
            const y = cy(i) - c * 3 * (1 - drop);
            const g = ctx.createRadialGradient(cx(i), y, 0, cx(i), y, c * 0.45);
            g.addColorStop(0, f.kind === "pentecost" ? "rgba(255,240,170,0.95)" : "rgba(255,230,120,0.95)");
            g.addColorStop(0.5, f.kind === "pentecost" ? "rgba(255,170,60,0.7)" : "rgba(255,110,30,0.75)");
            g.addColorStop(1, "rgba(255,60,0,0)");
            Kit.circle(ctx, cx(i), y, c * 0.45, g);
          }
          break;
        }
        case "sling": {
          const i = cellsOf[0];
          if (i === undefined) break;
          const sx = W2 / 2;
          const sy = H2 + c;
          const x = sx + (cx(i) - sx) * p;
          const y = sy + (cy(i) - sy) * p - Math.sin(Math.PI * p) * c * 2;
          Kit.circle(ctx, x, y, c * 0.14, "#8a8f99");
          if (p > 0.85) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx(i), cy(i), c * (0.2 + (p - 0.85) * 4), 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }
        case "manna": {
          for (const [k, i] of cellsOf.entries()) for (let s = 0; s < 6; s++) {
            const y = cy(i) - c * 2.5 * (1 - Math.min(1, p * 1.3 - s * 0.05 - k * 0.1)) + s * 3;
            Kit.circle(ctx, cx(i) + Math.sin(s * 2 + k) * c * 0.25, y, c * 0.05, "rgba(255,255,255,0.9)");
          }
          break;
        }
        case "water": case "loaves": case "mustard": case "faith": case "give": case "call": {
          for (const i of cellsOf) {
            ctx.strokeStyle = f.kind === "water" ? "rgba(140,210,255,0.9)" : f.kind === "mustard" ? "rgba(140,220,120,0.9)" : "rgba(255,220,120,0.9)";
            ctx.lineWidth = 3;
            for (const ring of [0, 0.3, 0.6]) {
              const q = (p + ring) % 1;
              ctx.globalAlpha = 1 - q;
              ctx.beginPath();
              ctx.arc(cx(i), cy(i), c * (0.15 + q * 0.6), 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          if (f.from) for (const n of f.from) {
            const t = cellsOf[0];
            Kit.drawSheep(ctx, cx(n) + (cx(t) - cx(n)) * p, cy(n) + (cy(t) - cy(n)) * p, c * 0.14, "#ffffff");
          }
          break;
        }
        case "still": {
          ctx.globalAlpha = 0.5 * Math.sin(Math.PI * Math.min(1, p * 1.2));
          for (const i of cellsOf) {
            ctx.fillStyle = "rgba(170,210,255,0.8)";
            ctx.fillRect(Engine.colOf(b, i) * c, Engine.rowOf(b, i) * c, c, c);
          }
          break;
        }
        case "jericho": {
          for (const i of cellsOf) {
            const shake = Math.sin(now / 25 + i) * c * 0.06 * (1 - p);
            ctx.fillStyle = `rgba(210,170,110,${0.6 * (1 - p)})`;
            ctx.fillRect(Engine.colOf(b, i) * c + shake, Engine.rowOf(b, i) * c, c, c);
          }
          break;
        }
        case "tongues": case "mercy": case "leadership": {
          ctx.strokeStyle = f.color ?? "#ffffff";
          ctx.lineWidth = 4;
          ctx.globalAlpha = 1 - p;
          for (const i of cellsOf) ctx.strokeRect(Engine.colOf(b, i) * c + 2, Engine.rowOf(b, i) * c + 2, c - 4, c - 4);
          break;
        }
        case "wolfdoor": case "scatter": case "wolfin": {
          for (const i of cellsOf) Kit.drawWolf(ctx, cx(i), cy(i) - Math.sin(Math.PI * p) * c * 0.4, c * (0.5 + 0.4 * Math.sin(Math.PI * p)), { mood: "happy" });
          break;
        }
        case "twobytwo": {
          for (const i of cellsOf) Kit.drawSheep(ctx, cx(i), cy(i) - (1 - p) * c, c * 0.16, "#ffffff");
          break;
        }
      }
      ctx.restore();
      if (p >= 1) {
        this.cur = null;
        f.done();
      }
    },
  };

  // ---------- reveal scene ----------
  // A big card pops up with the lamb (scarf in the player's colour) unwrapping it,
  // or the wolf jumping out for a wolf trick. Tap to skip.
  let revealEl = null;
  function reveal(key, color, o = {}) {
    if (!revealEl) {
      revealEl = document.createElement("div");
      revealEl.className = "reveal";
      revealEl.innerHTML = `<div class="rv-in"><canvas></canvas><div class="rv-card"></div><p class="rv-who"></p></div>`;
      document.body.append(revealEl);
    }
    const d = DEF[key];
    revealEl.querySelector(".rv-card").innerHTML = cardHTML(key);
    revealEl.querySelector(".rv-who").textContent = o.label ?? "";
    revealEl.hidden = false;
    const cv = revealEl.querySelector("canvas");
    const g = Kit.sharp(cv, 220, 120);
    const t0 = performance.now();
    const wolf = d.group === "wolf";
    sound(key);
    if (!wolf && !o.played) Kit.sfx.bleat(1.1);
    let raf;
    const paint = (now) => {
      const s = Math.min(1, (now - t0) / 500);
      g.clearRect(0, 0, 220, 120);
      if (!o.played) {
        // the box lid flies off
        g.fillStyle = o.golden ? "#e7b416" : "#c84b5a";
        g.fillRect(150, 70, 44, 40);
        g.fillStyle = o.golden ? "#fff2a8" : "#ffd25a";
        g.fillRect(168, 70, 8, 40);
        g.save();
        g.translate(172, 68 - s * 30);
        g.rotate(s * 0.6);
        g.fillStyle = o.golden ? "#f2c629" : "#e05a6a";
        g.fillRect(-25, -6, 50, 10);
        g.restore();
      } else {
        // the card rises from the lamb's hoof
        g.font = `${28 + s * 14}px system-ui`;
        g.fillText(d.icon, 140, 80 - s * 20);
      }
      if (wolf) {
        Kit.drawWolf(g, 172, 70 - s * 30, 40 + s * 30, { mood: "happy", t: now / 1000 });
        Kit.drawLamb(g, 70, 70, 90, { mood: "shock", scarf: color, flip: false });
      } else {
        Kit.drawLamb(g, 70, 70 - Math.abs(Math.sin(now / 160)) * 6, 90, { mood: "happy", scarf: color, t: now / 1000 });
      }
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return new Promise((done) => {
      const finish = () => {
        cancelAnimationFrame(raf);
        revealEl.hidden = true;
        revealEl.onclick = null;
        clearTimeout(timer);
        done();
      };
      const timer = setTimeout(finish, (o.ms ?? 1500) * speed);
      revealEl.onclick = finish;
    });
  }

  // ---------- pass the phone ----------
  let passEl = null;
  function passPhone(name, color) {
    if (!passEl) {
      passEl = document.createElement("div");
      passEl.className = "overlay";
      passEl.innerHTML = `<div class="card"><canvas class="hero"></canvas><h2></h2><p>Hand the phone over. Cards stay hidden until you're ready.</p><button class="big">I'm ready</button></div>`;
      document.body.append(passEl);
    }
    passEl.querySelector("h2").textContent = `Pass to ${name}`;
    passEl.querySelector("h2").style.color = color;
    const g = Kit.sharp(passEl.querySelector("canvas"), 200, 110);
    Kit.drawLamb(g, 100, 62, 96, { scarf: color, mood: "happy" });
    passEl.hidden = false;
    return new Promise((done) => {
      passEl.querySelector("button").onclick = () => {
        passEl.hidden = true;
        done();
      };
    });
  }

  // A small lamb icon for player chips.
  function lambIcon(cv, color, mood = "happy") {
    const g = Kit.sharp(cv, 34, 30);
    Kit.drawLamb(g, 17, 17, 30, { scarf: color, mood });
  }

  return {
    DEF, POOL, GROUP_COL,
    set hooks(h) { hooks = h; }, get hooks() { return hooks; },
    set speed(v) { speed = v; }, get speed() { return speed; },
    set safeRounds(v) { safeRounds = v; }, get safeRounds() { return safeRounds; },
    draw, newState, newPlayer, clone, orbs, cells, mine, enemy, aliveCount, nextIndex, canPlace, emptyCell, guard,
    rules, resolve, settle, place, beginTurn, endTurn, endRound, randomMine,
    selectable, picksNeeded, area, lineCells, edge, apply, shuffle,
    score, aiTargets, bestPlace, aiPlan,
    cardHTML, sound, fx, reveal, passPhone, lambIcon,
  };
})();
// =================== END SHARED CARD SYSTEM ===================
