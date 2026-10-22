// ======================= BRIDGE =======================
// Two sides race to build a bridge: one links the left edge to the right, the other the top
// to the bottom. Side-by-side squares only. The first bridge across wins, and the lamb runs over it.
(() => {
  const S = Core;
  const BR = {
    sizes: { 5: { secs: 120, cursorMs: 380 }, 7: { secs: 180, cursorMs: 300 }, 9: { secs: 240, cursorMs: 240 } },
    runMs: 1900, // the lamb running across the winning bridge
    tenseMs: 650, // the tension note repeats this often while a side is one square away
  };
  const SIDES = ["Sunrise", "Moonrise"]; // team 0 links left to right, team 1 links top to bottom
  const prog = () => Save.mode("bridge").progress;

  const along = (b, t, i) => (t === 0 ? Engine.colOf(b, i) : Engine.rowOf(b, i)); // how far across this square is
  const last = (b, t) => (t === 0 ? b.cols : b.rows) - 1;

  // Every connected group of a side's squares; the best one spans furthest (then is biggest).
  function groups(G, t, own) {
    const b = G.b;
    const seen = new Int8Array(b.size);
    let best = null;
    let win = null;
    for (let s = 0; s < b.size; s++) {
      if (seen[s] || !own(s)) continue;
      const cells = [s];
      seen[s] = 1;
      let lo = 99;
      let hi = -1;
      for (let q = 0; q < cells.length; q++) {
        const i = cells[q];
        const a = along(b, t, i);
        lo = Math.min(lo, a);
        hi = Math.max(hi, a);
        for (const k of Engine.neighbours(b, i)) if (!seen[k] && own(k)) {
          seen[k] = 1;
          cells.push(k);
        }
      }
      const g = { cells, lo, hi, span: hi - lo + 1 };
      if (!best || g.span > best.span || (g.span === best.span && cells.length > best.cells.length)) best = g;
      if (lo === 0 && hi === last(b, t)) win = g;
    }
    return { best, win };
  }
  // the lamb's way across a winning group: the shortest walk from one edge to the other
  function crossing(G, t, g) {
    const b = G.b;
    const inG = new Set(g.cells);
    const prev = new Map();
    const queue = g.cells.filter((i) => along(b, t, i) === 0);
    for (const i of queue) prev.set(i, -1);
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      if (along(b, t, i) === last(b, t)) {
        const path = [];
        for (let k = i; k !== -1; k = prev.get(k)) path.unshift(k);
        return path;
      }
      for (const k of Engine.neighbours(b, i)) if (inG.has(k) && !prev.has(k)) {
        prev.set(k, i);
        queue.push(k);
      }
    }
    return g.cells;
  }

  Modes.register({
    key: "bridge",
    title: "Bridge",
    how: ["Sunrise links the left edge to the right. Moonrise links the top to the bottom.", "Side-by-side squares only, no diagonals. First bridge across wins!"],
    music: { song: "meadowDash", style: "bright", bpm: 116 },
    match: true,
    setupDefaults: { n: 2, size: 7, bestOf: 3 },
    board: (s) => ({ rows: s.size, cols: s.size }),
    tuneFor: (s) => ({ roundSecs: BR.sizes[s.size].secs, cursorMs: BR.sizes[s.size].cursorMs }),
    players: (s) =>
      Array.from({ length: s.n }, (_, p) => {
        const team = s.n === 4 ? (p === 0 || p === 3 ? 0 : 1) : p;
        return { seat: p, team, colorIndex: s.seats[team].color, symIndex: s.seats[p].color };
      }),
    options(ui, s) {
      ui.seg("Sides", "n", [[2, "1 v 1"], [4, "2 v 2"]], s.n === 4 ? "Bottom-left and top-right build Sunrise together" : "Anyone can be a person or an AI");
      ui.seats(s.n);
      ui.seg("Board", "size", [[5, "5 × 5"], [7, "7 × 7"], [9, "9 × 9"]]);
      ui.seg("Match", "bestOf", [[1, "Single"], [3, "Best of 3"], [5, "Best of 5"]]);
    },
    playLabel: (s) => (s.bestOf > 1 ? `Play best of ${s.bestOf}` : "Play"),
    againLabel: (sum) => (sum.humans.length > 1 ? "Rematch" : "Play again"),
    tips: [
      { id: "sides", on: "start", icon: "bridge", text: "Link your two edges!" },
      { id: "close", on: "close", icon: "flag", text: "One square away! Block it!" },
    ],
    help: [
      { title: "Link your edges", text: "Sunrise links the left and right edges, Moonrise the top and bottom. Only side-by-side squares count.", draw: (g, w, h, t) => helpLink(g, w, h, t) },
      { title: "Steal and block", text: "Bursts take squares from the other side. Break their bridge and fill the gap with yours.", draw: (g, w, h, t) => helpBlock(g, w, h, t) },
      { title: "Listen for the gap", text: "When a side is one square from across, that square flashes and the music climbs. Block it!", draw: (g, w, h, t) => helpGap(g, w, h, t) },
    ],
    badges: [
      { id: "win", icon: "bridge", name: "Bridge builder", desc: "Win a match", test: (c) => c.won },
      { id: "sweep", icon: "trophy", name: "Clean sweep", desc: "Win a best of 3 two rounds to none", test: (c) => c.won && c.match && c.setup.bestOf === 3 && Object.values(c.match.wins).reduce((a, x) => a + x, 0) === 2 },
      { id: "moon", icon: "moon", name: "Night crossing", desc: "Win a round as Moonrise", test: (c) => c.won && c.res.team === 1 },
      { id: "big", icon: "grid", name: "Long bridge", desc: "Win on the 9 × 9 board", test: (c) => c.won && c.setup.size === 9 },
      { id: "expert", icon: "star", name: "Master builder", desc: "Beat an Expert AI 1 v 1", test: (c) => c.won && c.setup.n === 2 && c.G.players.some((p) => p.kind === "ai" && p.level === "expert") },
      { id: "block", icon: "shield", name: "Not today", desc: "Block a bridge one square from across, then win", test: (c) => c.won && c.G.players.some((p) => p.human && p.blocks > 0) },
    ],
    results(sum) {
      const p = prog();
      if (sum.won) p.bridges = (p.bridges || 0) + 1;
      Save.save();
      const G = sum.G;
      const D = G.data;
      const bar = (t) => {
        const pl = G.players.find((q) => q.team === t);
        const n = last(G.b, t) + 1;
        return `<div>${App.symSvg(pl.sym, pl.color)}<span>${SIDES[t]}</span><span class="meter"><i style="width:${(100 * (D.span[t] || 0)) / n}%;background:${pl.color}"></i></span><b>${D.span[t] || 0}/${n}</b></div>`;
      };
      return {
        html: `<div class="ll-bars br-bars">${bar(0)}${bar(1)}</div>`,
        shareLine: sum.won ? `Built a bridge on the ${sum.setup.size} × ${sum.setup.size}!` : "",
      };
    },
    drawResult(g, w, h, t, won, sum) {
      if (!won) return false;
      const pl = sum.G.players.find((q) => q.team === sum.res?.team);
      drawCrossing(g, w, h, t, pl?.color ?? "#ffcf4a");
      return true;
    },
    hooks: {
      setup(G) {
        G.data = { won: null, wonAt: 0, best: [null, null], span: [0, 0], crit: [[], []], tense: -1, tenseN: 0, nextTense: 0, closes: 0 };
        for (const pl of G.players) pl.blocks = 0;
      },
      hud: (G) => hud(G),
      noElimination: true,
      afterWave(G, now) {
        if (!G.data.won) check(G, now);
      },
      afterDrop(G, pl, i) {
        if (!G.data.won) {
          const D = G.data;
          // dropping onto the other side's last gap counts as a block
          if (D.crit[1 - pl.team].includes(i)) pl.blocks++;
          check(G, G.time);
        }
      },
      aiValue(G, pl, i) {
        const b = G.b;
        const D = G.data;
        const t = pl.team;
        if (D.crit[t].includes(i)) return 40; // this square wins it
        if (D.crit[1 - t].includes(i)) return 25; // this square stops them winning
        const best = D.best[t];
        const theirs = D.best[1 - t];
        let v = 0;
        const near = Engine.neighbours(b, i);
        if (best && near.some((k) => best.cells.includes(k))) {
          const a = along(b, t, i);
          v += 2 + (a < best.lo || a > best.hi ? 4 : 0); // stretch the bridge further
        } else if (!best) v += along(b, t, i) === 0 || along(b, t, i) === last(b, t) ? 1.5 : 0.5;
        // sit across their bridge's path
        if (theirs && near.some((k) => theirs.cells.includes(k))) {
          const a = along(b, 1 - t, i);
          v += a < theirs.lo || a > theirs.hi ? 2.5 : 1;
        }
        return v;
      },
      update(G, now) {
        const D = G.data;
        if (!D.won && D.tense >= 0 && now >= D.nextTense) {
          // a rising note while a side is one square from across
          D.nextTense = now + BR.tenseMs;
          D.tenseN = Math.min(12, D.tenseN + 1);
          if (!S.quiet) Sfx.blip(330 * Math.pow(2, D.tenseN / 12), 0.18, "triangle", 0.05, 0);
        }
        hud(G);
      },
      endCheck(G, now, left) {
        const D = G.data;
        if (D.won) return now - D.wonAt > BR.runMs + 300 ? { team: D.won.team, sub: `${SIDES[D.won.team]} built a bridge across!` } : null;
        if (left > 0) return null;
        if (D.span[0] === D.span[1]) return { team: -1, sub: "Time's up: both bridges reach as far." };
        const t = D.span[0] > D.span[1] ? 0 : 1;
        return { team: t, sub: `Time's up: ${SIDES[t]}'s bridge reaches furthest.` };
      },
      drawOver(ctx, G, c, t, now) {
        const D = G.data;
        const b = G.b;
        const W = b.cols * c;
        const H = b.rows * c;
        const col = (tm) => G.players.find((q) => q.team === tm).color;
        // each side's edges
        ctx.fillStyle = col(0);
        ctx.fillRect(-S.PAD + 1, 0, S.PAD - 3, H);
        ctx.fillRect(W + 2, 0, S.PAD - 3, H);
        ctx.fillStyle = col(1);
        ctx.fillRect(0, -S.PAD + 1, W, S.PAD - 3);
        ctx.fillRect(0, H + 2, W, S.PAD - 3);
        // each side's best bridge so far glows
        const flash = !Save.settings.fewerFlashes;
        for (let tm = 0; tm < 2; tm++) {
          const g = D.won ? null : D.best[tm];
          if (!g || g.span < 2) continue;
          ctx.save();
          ctx.globalAlpha = 0.5 + (flash ? 0.15 * Math.sin(t * 3 + tm * 2) : 0);
          ctx.strokeStyle = col(tm);
          ctx.lineWidth = 3;
          ctx.shadowColor = col(tm);
          ctx.shadowBlur = Save.settings.quality === "low" ? 0 : 8;
          for (const i of g.cells) ctx.strokeRect(Engine.colOf(b, i) * c + 3, Engine.rowOf(b, i) * c + 3, c - 6, c - 6);
          ctx.restore();
          // the last gap flashes
          for (const i of D.crit[tm]) {
            ctx.save();
            ctx.globalAlpha = flash ? 0.25 + 0.25 * Math.sin(t * 12) : 0.4;
            ctx.fillStyle = col(tm);
            ctx.fillRect(Engine.colOf(b, i) * c + 2, Engine.rowOf(b, i) * c + 2, c - 4, c - 4);
            ctx.restore();
          }
        }
        if (!D.won) return;
        // the winning bridge glows and the lamb runs across it
        const path = D.won.path;
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 8);
        for (const i of path) Art.circle(ctx, (Engine.colOf(b, i) + 0.5) * c, (Engine.rowOf(b, i) + 0.5) * c, c * 0.45, "#fff4c2");
        ctx.restore();
        const p = Math.min(0.999, (now - D.wonAt) / BR.runMs) * (path.length - 1);
        const a = path[Math.floor(p)];
        const z = path[Math.min(path.length - 1, Math.floor(p) + 1)];
        const f = p - Math.floor(p);
        const x = (Engine.colOf(b, a) + (Engine.colOf(b, z) - Engine.colOf(b, a)) * f + 0.5) * c;
        const hop = Save.settings.reduced ? 0 : Math.abs(Math.sin(t * 14)) * c * 0.15;
        const y = (Engine.rowOf(b, a) + (Engine.rowOf(b, z) - Engine.rowOf(b, a)) * f + 0.5) * c - hop;
        const winner = G.players.find((q) => q.team === D.won.team && q.human) ?? G.players.find((q) => q.team === D.won.team);
        Art.drawLamb(ctx, x, y, c * 0.95, { t, look: winner.look, scarf: winner.look ? undefined : winner.color, mood: "joy", flip: Engine.colOf(b, z) < Engine.colOf(b, a) });
      },
    },
  });

  // ---------- the bridges ----------
  function check(G, now) {
    const D = G.data;
    const b = G.b;
    let tense = -1;
    for (let t = 0; t < 2; t++) {
      const own = (i) => S.isPlayer(b.owner[i]) && G.players[b.owner[i]].team === t;
      const { best, win } = groups(G, t, own);
      D.best[t] = best;
      D.span[t] = best ? best.span : 0;
      if (win && !D.won) {
        D.won = { team: t, path: crossing(G, t, win) };
        D.wonAt = now;
        D.crit = [[], []];
        for (const p of G.players) {
          p.observer = true;
          if (p.team === t) S.mood(p, "cheer", 2500);
        }
        if (!S.quiet) {
          S.shout(null, "Bridge!", 1.8, G.players.find((q) => q.team === t).color);
          Sfx.chime(7);
          buzz([60, 40, 120]);
        }
        Music.setRate(1);
        return;
      }
      // the gaps: empty squares that would finish a bridge right now
      const crit = [];
      for (let i = 0; i < b.size; i++) {
        if (b.owner[i] >= 0 || b.rock[i] || b.kind[i]) continue;
        const near = Engine.neighbours(b, i).filter(own);
        if (!near.length && along(b, t, i) !== 0 && along(b, t, i) !== last(b, t)) continue;
        if (groups(G, t, (k) => k === i || own(k)).win) crit.push(i);
      }
      D.crit[t] = crit;
      if (crit.length) tense = t;
    }
    if (tense !== D.tense) {
      if (tense >= 0 && D.tense < 0) {
        D.tenseN = 0;
        D.nextTense = now;
        D.closes++;
        S.tip("close");
        if (!S.quiet) {
          Music.setLayer(2);
          Music.setRate(1.06);
        }
      } else if (tense < 0 && !S.quiet) {
        Music.setLayer(1);
        Music.setRate(1);
      }
      D.tense = tense;
    }
  }

  function hud(G) {
    const D = G.data;
    const b = G.b;
    const side = (t) => {
      const pl = G.players.find((q) => q.team === t);
      const n = last(b, t) + 1;
      return `<span class="br-side${D.crit[t].length ? " close" : ""}">${App.symSvg(pl.sym, pl.color)}<span class="meter"><i style="width:${(100 * D.span[t]) / n}%;background:${pl.color}"></i></span></span>`;
    };
    S.setHud(`<div class="br-hud">${side(0)}${Icons.get("bridge")}${side(1)}</div>`);
  }

  // ---------- the results scene: the lamb runs over a little bridge ----------
  function drawCrossing(g, w, h, t, color) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#9ed8ff");
    sky.addColorStop(1, "#e6f6ff");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8cc96b";
    g.fillRect(0, h * 0.66, w, h * 0.34);
    // the stream
    g.fillStyle = "#4fa8e0";
    g.fillRect(w * 0.3, h * 0.66, w * 0.4, h * 0.34);
    g.fillStyle = "rgba(255,255,255,0.5)";
    for (let k = 0; k < 6; k++) g.fillRect(w * 0.32 + ((k * 37 + t * 30) % (w * 0.36)), h * (0.75 + (k % 3) * 0.07), 18, 3);
    // the bridge
    g.strokeStyle = "#8a5a3a";
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(w * 0.22, h * 0.68);
    g.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.78, h * 0.68);
    g.stroke();
    g.lineWidth = 3;
    for (let k = 1; k < 8; k++) {
      const x = w * (0.22 + k * 0.07);
      const yb = h * 0.68 - Math.sin((k / 8) * Math.PI) * h * 0.09;
      g.beginPath();
      g.moveTo(x, yb);
      g.lineTo(x, yb - h * 0.08);
      g.stroke();
    }
    const p = (t * 0.3) % 1.2;
    const x = w * (0.1 + Math.min(1, p) * 0.8);
    const yb = h * 0.68 - (x > w * 0.22 && x < w * 0.78 ? Math.sin(((x - w * 0.22) / (w * 0.56)) * Math.PI) * h * 0.09 * 2 : 0);
    const hop = Save.settings.reduced ? 0 : Math.abs(Math.sin(t * 10)) * 6;
    Art.drawLamb(g, x, yb - 26 - hop, 56, { t, look: Progress.look(), scarf: color, mood: "joy" });
  }

  // ---------- the "?" card animations ----------
  function grid(g, w, n, c, y0) {
    const x0 = (w - n * c) / 2;
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      g.fillStyle = (r + k) % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0 + k * c, y0 + r * c, c, c);
    }
    return x0;
  }
  function helpLink(g, w, h, t) {
    const c = 26;
    const x0 = grid(g, w, 5, c, 14);
    const n = Math.floor(t * 1.5) % 7;
    for (let k = 0; k < Math.min(5, n); k++) Art.drawSheep(g, x0 + k * c + c / 2, 14 + 2 * c + c / 2, 6, "#ffb020");
    g.fillStyle = "#ffb020";
    g.fillRect(x0 - 6, 14, 4, 5 * c);
    g.fillRect(x0 + 5 * c + 2, 14, 4, 5 * c);
    if (n >= 5) Art.drawLamb(g, x0 + ((t * 2) % 1) * 5 * c, 14 + 2 * c + c / 2 - 6, 24, { t, mood: "joy" });
  }
  function helpBlock(g, w, h, t) {
    const c = 26;
    const x0 = grid(g, w, 5, c, 14);
    for (let k = 0; k < 5; k++) if (k !== 2) Art.drawSheep(g, x0 + k * c + c / 2, 14 + 2 * c + c / 2, 6, "#ffb020");
    for (let r = 0; r < 5; r++) if (r !== 2 || (t % 2) > 1) Art.drawSheep(g, x0 + 2 * c + c / 2, 14 + r * c + c / 2, 6, "#5b8cff");
  }
  function helpGap(g, w, h, t) {
    const c = 26;
    const x0 = grid(g, w, 5, c, 14);
    for (let k = 0; k < 5; k++) if (k !== 3) Art.drawSheep(g, x0 + k * c + c / 2, 14 + 2 * c + c / 2, 6, "#ffb020");
    g.fillStyle = `rgba(255,176,32,${0.3 + 0.3 * Math.sin(t * 10)})`;
    g.fillRect(x0 + 3 * c + 2, 14 + 2 * c + 2, c - 4, c - 4);
  }
})();
