// ======================= FLOCK FALL =======================
// Two boards side by side, split by a stone column. Your cursor sweeps the top of your board;
// tap to drop a sheep down that column. Chains of 4 or more pop and send rocks to your rival.
// The top player's board is turned round, so from their side of the phone their sheep fall down too.
(() => {
  const S = Core;
  const FALL = {
    rows: 10,
    width: 5, // each versus board
    endless: { rows: 11, width: 6, firstMs: 6000, faster: 0.95, minMs: 1600 },
    rockFrom: 4, // a chain this long pops (its burst squares clear) and sends rocks
    maxRocks: 6, // most rocks one chain can send
    rockHits: 2,
    incomingMs: 2200, // rocks wait above the board this long (shown) before they drop
    dangerFrom: 2, // a column within this many squares of the top is in danger
    // per AI level: the chain worth popping, how often it builds anyway, how often it slips
    ai: { easy: { chain: 2, build: 0.45, slip: 0.15 }, normal: { chain: 3, build: 0.55, slip: 0.05 }, hard: { chain: 4, build: 0.65, slip: 0.02 }, expert: { chain: 5, build: 0.75, slip: 0 } },
  };
  const FIELDS = ["owner", "count", "tag", "kind", "hp", "mhp"];

  // geometry for player p (0 = bottom player on the left, 1 = top player on the right)
  const geom = (D, p) => ({ c0: p === 0 ? 0 : D.W + 1, floor: p === 0 ? D.rows - 1 : 0, top: p === 0 ? 0 : D.rows - 1, up: p === 0 ? -1 : 1 });
  const at = (D, r, c) => r * D.cols + c;
  // column k as player p sees it (left to right from their seat)
  const screenCol = (D, p, k) => (p === 0 ? k : D.cols - 1 - k);
  const displayCell = (D, p, k) => at(D, geom(D, p).top, screenCol(D, p, k));
  const sideOf = (D, b, i) => (Engine.colOf(b, i) < D.W ? 0 : Engine.colOf(b, i) > D.W ? 1 : -1);

  // where a sheep dropped down column k lands: the top of the stack (+1 if it is mine), or null when full
  function landing(G, p, k) {
    const D = G.data;
    const b = G.b;
    const g = geom(D, p);
    const c = screenCol(D, p, k);
    let prev = null;
    for (let r = g.top; r !== g.floor - g.up; r -= g.up) {
      const i = at(D, r, c);
      if (b.owner[i] >= 0 || b.kind[i]) return b.owner[i] === p && !b.kind[i] ? i : prev;
      prev = i;
    }
    return prev;
  }
  function heightOf(G, p, k) {
    const D = G.data;
    const g = geom(D, p);
    let h = 0;
    for (let r = g.floor; r !== g.top + g.up; r += g.up) if (G.b.owner[at(D, r, screenCol(D, p, k))] >= 0 || G.b.kind[at(D, r, screenCol(D, p, k))]) h++;
    return h;
  }
  const tallest = (G, p) => {
    let h = 0;
    for (let k = 0; k < G.data.W; k++) h = Math.max(h, heightOf(G, p, k));
    return h;
  };

  // after every wave, everything falls down to fill the gaps
  function gravity(G) {
    const D = G.data;
    const b = G.b;
    for (let p = 0; p < D.sides; p++) {
      const g = geom(D, p);
      for (let k = 0; k < D.W; k++) {
        const c = screenCol(D, p, k);
        let write = g.floor;
        for (let r = g.floor; r !== g.top + g.up; r += g.up) {
          const i = at(D, r, c);
          if (b.owner[i] < 0 && !b.kind[i]) continue;
          if (r !== write) {
            const j = at(D, write, c);
            for (const f of FIELDS) b[f][j] = b[f][i];
            b.owner[i] = -1;
            b.count[i] = 0;
            b.tag[i] = null;
            b.kind[i] = null;
            G.popAt[j] = G.time;
          }
          write += g.up;
        }
      }
    }
  }

  // rocks for player `to`: they hang above the board (shown), then drop
  function queueRocks(G, to, n) {
    const D = G.data;
    D.incoming[to].push({ n, at: G.time + FALL.incomingMs });
  }
  function dropRocks(G, to, n) {
    const D = G.data;
    const b = G.b;
    for (let k = 0; k < n; k++) {
      // both players draw rock columns from the same sequence, so neither gets luckier rocks
      const col = D.rockRng[to].int(D.W);
      const g = geom(D, to);
      let cell = null;
      for (let r = g.floor; r !== g.top + g.up; r += g.up) {
        const j = at(D, r, screenCol(D, to, col));
        if (b.owner[j] < 0 && !b.kind[j]) {
          cell = j;
          break;
        }
      }
      if (cell === null) {
        D.topped = to;
        return;
      }
      b.kind[cell] = "rock";
      b.hp[cell] = b.mhp[cell] = FALL.rockHits;
      S.puff(cell, "#9aa0aa", 4);
    }
    Sfx.crack();
    S.shake(4);
  }

  Modes.register({
    key: "flockfall",
    title: "Flock Fall",
    how: ["Your cursor sweeps the top of your board: tap to drop a sheep down that column.", "Chains of 4 or more pop and send rocks to your rival. Reach the top and you lose!"],
    music: { song: "rockyRidge", style: "bright", bpm: 128 },
    maxRun: 20, // a cascade settles after 20 waves
    setupDefaults: { vs: "ai" },
    solo: (s) => s.vs === "endless",
    board: (s) => (s.vs === "endless" ? { rows: FALL.endless.rows, cols: FALL.endless.width } : { rows: FALL.rows, cols: FALL.width * 2 + 1 }),
    players: (s) => (s.vs === "endless" ? [{ seat: 0, kind: "human", col: 0, cdir: 1 }] : [{ seat: 0, col: 0, cdir: 1 }, { seat: 1, kind: s.vs === "friend" ? "human" : "ai", col: FALL.width - 1, cdir: -1 }]),
    options(ui, s) {
      ui.seg("Play", "vs", [["ai", "Against the AI"], ["friend", "Against a friend"], ["endless", "Endless"]]);
      if (s.vs === "ai") ui.seats(2, { kinds: ["human", "ai"], labels: [null, null] });
      else if (s.vs === "friend") ui.seats(2, { kinds: ["human", "human"] });
      else {
        const best = Save.mode("flockfall").records.endless;
        ui.note(best ? `Your Endless best: ${fmtNum(best)}` : "Rocks fall faster and faster. How long can your flock keep going?");
      }
    },
    playLabel: (s) => (s.vs === "endless" ? "Play Endless" : "Play"),
    againLabel: (sum) => (sum.setup.vs === "friend" ? "Rematch" : "Play again"),
    tips: [
      { id: "pop", on: "start", icon: "bolt", text: "Chain 4 to send rocks!", when: (G) => G.data.sides === 2 },
      { id: "incoming", on: "incoming", icon: "rocks", text: "Rocks coming! Pop them free" },
      { id: "endless", on: "start", icon: "timer", text: "Rocks fall faster and faster", when: (G) => G.data.sides === 1 },
    ],
    help: [
      { title: "Drop down a column", text: "Your cursor sweeps the top of your board. Tap and your sheep falls down that column.", draw: (g, w, h, t) => helpDrop(g, w, h, t) },
      { title: "Chain 4 to pop", text: "A chain of 4 or more pops: those squares clear, and rocks go over to your rival.", draw: (g, w, h, t) => helpPop(g, w, h, t) },
      { title: "Mind the top", text: "Rocks show up top before they drop. Keep every column below the red line.", draw: (g, w, h, t) => helpTop(g, w, h, t) },
    ],
    badges: [
      { id: "win", icon: "trophy", name: "Steady as a rock", desc: "Win a match", test: (c) => c.won && c.setup.vs !== "endless" },
      { id: "rocks", icon: "rocks", name: "Avalanche", desc: "Send 6 rocks in one game", test: (c) => c.G.players.some((p) => p.human && p.sent >= 6) },
      { id: "chain8", icon: "bolt", name: "Cascade", desc: "Make an 8-chain", test: (c) => c.humans.some((p) => p.best >= 8) },
      { id: "expert", icon: "crown", name: "Rock solid", desc: "Beat the Expert AI", test: (c) => c.won && c.G.players.some((p) => p.kind === "ai" && p.level === "expert") },
      { id: "endless", icon: "timer", name: "Endurance", desc: "Last 3 minutes in Endless", test: (c) => c.setup.vs === "endless" && c.secs >= 180 },
    ],
    results(sum) {
      const D = sum.G.data;
      if (D.sides === 1) {
        return {
          records: [{ key: "endless", value: D.score }],
          recordNames: { endless: "Endless score" },
          html: `<p class="score">${fmtNum(D.score)}</p><p class="note">${Icons.get("timer")} ${fmtTime(sum.secs)} · ${D.rocksCleared} rocks broken</p>`,
          wool: Math.min(30, Math.floor(D.score / 400)),
          shareLine: `Endless: ${fmtNum(D.score)}`,
        };
      }
      return { shareLine: sum.won ? "Won at Flock Fall!" : "" };
    },
    hooks: {
      setup(G, s) {
        const b = G.b;
        const endless = s.vs === "endless";
        const W = endless ? FALL.endless.width : FALL.width;
        const D = (G.data = {
          W, rows: b.rows, cols: b.cols, sides: endless ? 1 : 2, topped: -1, incoming: [[], []], danger: false,
          rockRng: [RNG(G.seed ^ 0x51ed), RNG(G.seed ^ 0x51ed)], score: 0, rocksCleared: 0, nextSky: FALL.endless.firstMs, skyMs: FALL.endless.firstMs,
        });
        if (!endless) for (let r = 0; r < D.rows; r++) b.rock[at(D, r, W)] = true; // the stone divider
        for (const pl of G.players) {
          pl.sent = 0;
          pl.burst = new Set();
          pl.pos = null;
          pl.placed = true;
        }
      },
      hud(G) {
        for (const pl of G.players) pl.pos = G.path.indexOf(displayCell(G.data, pl.id, pl.col));
        hud(G);
      },
      noElimination: true,
      roundSecs: () => Infinity,
      timerHtml: (G) => (G.data.sides === 1 ? `${Icons.get("star")} ${fmtNum(G.data.score)}` : ""),
      inPath: () => true, // the cursor is placed by this game, so every square is reachable
      onStep(G, pl) {
        // back and forth along the top of my board
        const D = G.data;
        pl.col += pl.cdir;
        if (pl.col < 0 || pl.col >= D.W) {
          pl.cdir = -pl.cdir;
          pl.col += pl.cdir * 2;
        }
        pl.pos = G.path.indexOf(displayCell(D, pl.id, pl.col));
      },
      // drop down the column: point the core at the landing square, then back at the cursor
      beforeDrop(G, pl) {
        const i = landing(G, pl.id, pl.col);
        pl.pos = G.path.indexOf(i ?? displayCell(G.data, pl.id, pl.col));
        pl.full = i === null;
      },
      canDrop: (G, pl, i, def) => !pl.full && def(pl, i),
      afterDrop(G, pl) {
        pl.pos = G.path.indexOf(displayCell(G.data, pl.id, pl.col));
        checkTop(G);
      },
      onWaste(G, pl) {
        pl.pos = G.path.indexOf(displayCell(G.data, pl.id, pl.col));
      },
      // a Line or Bomb sheep's area stops at the stone divider
      specialHit: (G, k, who) => G.data.sides === 2 && sideOf(G.data, G.b, k) !== who,
      onRockBreak(G) {
        G.data.rocksCleared++;
        G.data.score += 50;
      },
      targets(G, b, i, t) {
        G.players[b.owner[i]]?.burst?.add(i);
        return t;
      },
      afterWave(G, now, bursts) {
        if (G.data.sides === 1 && bursts[0]) G.data.score += bursts[0] * 10 * Math.min(10, G.players[0].chain);
        gravity(G);
        checkTop(G);
      },
      chainEnd(G, pl, chain, now) {
        const D = G.data;
        const popped = [...pl.burst];
        pl.burst.clear();
        if (chain < FALL.rockFrom) return;
        // a big chain pops: the squares that burst clear, and everything falls
        const b = G.b;
        const fx = S.effect("overflow", -1, pl.color, now);
        for (const i of popped) {
          if (b.owner[i] !== pl.id) continue;
          b.owner[i] = -1;
          b.count[i] = 0;
          b.tag[i] = null;
          if (fx && fx.n < fx.cells.length) fx.cells[fx.n++] = i;
          S.puff(i, pl.color, 2);
        }
        gravity(G);
        if (D.sides === 1) {
          D.score += chain * chain * 20;
          S.shout(pl, `+${fmtNum(chain * chain * 20)}`, 1.2, "#ffcf4a");
          return;
        }
        const n = Math.min(FALL.maxRocks, chain - FALL.rockFrom + 1);
        pl.sent += n;
        queueRocks(G, 1 - pl.id, n);
        S.shout(G.players[1 - pl.id], n > 1 ? `${n} rocks!` : "Rock!", 1.3, "#c7cad1");
        S.tip("incoming", G.players[1 - pl.id]);
        Sfx.blip(260, 0.25, "triangle", 0.08, 120);
      },
      aiDecide(G, pl, now, skill) {
        const D = G.data;
        const lv = FALL.ai[pl.level] || FALL.ai.normal;
        const i = landing(G, pl.id, pl.col);
        if (i === null || pl.pen <= 0 || now < pl.lockUntil) return;
        const b = G.b;
        const h = heightOf(G, pl.id, pl.col);
        const cap = Engine.capacity(b, i);
        const mine = b.owner[i] === pl.id;
        const danger = tallest(G, pl.id) >= D.rows - FALL.dangerFrom - 1 || D.incoming[pl.id].length > 0;
        let go = false;
        if (mine && b.count[i] + 1 >= cap) {
          // a burst: how big a chain? (better players wait for a bigger one)
          const sc = G.scratch;
          for (let k = 0; k < b.size; k++) {
            sc.owner[k] = b.owner[k];
            sc.count[k] = b.count[k];
            sc.rock[k] = b.rock[k] || !!b.kind[k];
          }
          sc.count[i]++;
          let n = 0;
          Engine.resolve(sc, { maxWaves: 30, canBurst: (bb, c) => bb.owner[c] === pl.id, targets: (bb, c) => (n++, Engine.neighbours(bb, c)) }, false);
          go = n >= lv.chain || (danger && n >= 2) || h >= D.rows - 2 || G.rng() < lv.slip * 3;
        } else if (h < D.rows - 3) go = G.rng() < (mine ? lv.build : lv.build * 0.4);
        if (!go) return;
        const [lo, hi] = skill.react;
        pl.aiPlan = { cell: displayCell(D, pl.id, pl.col), at: now + lo * 0.7 + G.rng() * (hi - lo) * 0.7 };
      },
      update(G, now) {
        const D = G.data;
        // incoming rocks land when their time comes
        for (let p = 0; p < D.sides; p++) {
          const q = D.incoming[p];
          while (q.length && now >= q[0].at) dropRocks(G, p, q.shift().n);
        }
        // Endless: rocks from the sky, faster and faster
        if (D.sides === 1 && now >= D.nextSky) {
          D.skyMs = Math.max(FALL.endless.minMs, D.skyMs * FALL.endless.faster);
          D.nextSky = now + D.skyMs;
          queueRocks(G, 0, 1 + (G.rng() < 0.3 ? 1 : 0));
        }
        // danger: a column near the top makes everything tenser
        let danger = false;
        for (let p = 0; p < D.sides; p++) if (tallest(G, p) >= D.rows - FALL.dangerFrom) danger = true;
        if (danger !== D.danger) {
          D.danger = danger;
          if (!S.quiet) {
            Music.setLayer(danger ? 2 : 1);
            Music.setRate(danger ? 1.12 : 1);
            $("game").classList.toggle("rush", danger);
          }
          if (danger) Sfx.tickTock(true);
        }
        hud(G);
      },
      endCheck(G) {
        const D = G.data;
        const t = D.topped;
        if (t < 0) return null;
        if (D.sides === 1) return { team: 0, title: "Your flock stacked up!", sub: `${fmtNum(D.score)} points`, color: "#d9a12a" };
        return { team: 1 - t, sub: `${G.players[t].name}'s flock reached the top.` };
      },
      drawOver(ctx, G, c, t, now) {
        const D = G.data;
        const b = G.b;
        for (let p = 0; p < D.sides; p++) {
          const g = geom(D, p);
          const x0 = g.c0 * c;
          // the red line, pulsing harder when a column is close
          const near = tallest(G, p) >= D.rows - FALL.dangerFrom;
          ctx.fillStyle = `rgba(255,80,80,${near ? 0.25 + 0.15 * Math.sin(t * 10) : 0.12 + 0.05 * Math.sin(t * 4)})`;
          ctx.fillRect(x0, g.top * c, D.W * c, c);
          const pl = G.players[p];
          const i = landing(G, p, pl.col);
          const col = screenCol(D, p, pl.col);
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(col * c, 0, c, b.rows * c);
          if (i !== null && b.owner[i] < 0) {
            ctx.globalAlpha = 0.35;
            Art.drawSheep(ctx, (col + 0.5) * c, (Engine.rowOf(b, i) + 0.5) * c, c * 0.14, pl.color);
            ctx.globalAlpha = 1;
          }
          // incoming rocks hang above the board, shaking as they get close
          let n = 0;
          for (const q of D.incoming[p]) n += q.n;
          if (n) {
            const soon = Math.max(0, 1 - (D.incoming[p][0].at - now) / FALL.incomingMs);
            const y = (g.top + (p === 0 ? 0.5 : 0.5)) * c;
            for (let k = 0; k < Math.min(n, D.W); k++) {
              const jx = Math.sin(t * 30 + k) * soon * 2;
              S.drawRock(ctx, x0 + (k + 0.5) * c + jx, y, c * 0.28, FALL.rockHits, FALL.rockHits, x0 + (k + 0.5) * c, y + c);
            }
            if (n > D.W) {
              ctx.fillStyle = "#fff";
              ctx.font = `700 ${Math.round(c * 0.3)}px Fredoka, system-ui`;
              ctx.fillText(`+${n - D.W}`, x0 + D.W * c - c * 0.5, y - c * 0.2);
            }
          }
        }
      },
    },
  });

  function checkTop(G) {
    const D = G.data;
    if (D.topped >= 0) return;
    for (let p = 0; p < D.sides; p++)
      for (let k = 0; k < D.W; k++) {
        const i = displayCell(D, p, k);
        if (G.b.owner[i] >= 0 || G.b.kind[i]) {
          D.topped = p;
          Sfx.howl();
          return;
        }
      }
  }

  function hud(G) {
    const D = G.data;
    S.setHud(G.players.map((p) => {
      let inc = 0;
      for (const q of D.incoming[p.id]) inc += q.n;
      const h = tallest(G, p.id);
      return `<span class="ff-side${h >= D.rows - FALL.dangerFrom ? " danger" : ""}" style="color:${p.color}">${App.symSvg(p.sym, p.color)} ${h}/${D.rows}${D.sides === 2 ? ` · ${Icons.get("rocks")} ${p.sent}` : ""}${inc ? ` <b class="incoming">${Icons.get("rocks")}+${inc}</b>` : ""}</span>`;
    }).join(""));
  }

  // ---------- the "?" card animations ----------
  function column(g, x0, rows, c) {
    for (let r = 0; r < rows; r++) {
      g.fillStyle = r % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0, 8 + r * c, c, c);
    }
  }
  function helpDrop(g, w, h, t) {
    const c = 26;
    for (let k = 0; k < 5; k++) column(g, w / 2 - 2.5 * c + k * c, 5, c);
    const k = Math.floor(t * 1.5) % 5;
    g.strokeStyle = "#ff5a5f";
    g.lineWidth = 3;
    g.strokeRect(w / 2 - 2.5 * c + k * c + 2, 10, c - 4, c - 4);
    const p = (t * 1.5) % 1;
    Art.drawSheep(g, w / 2 - 2.5 * c + (k + 0.5) * c, 8 + (0.5 + p * 4) * c, 7, "#ff5a5f");
  }
  function helpPop(g, w, h, t) {
    const c = 26;
    for (let k = 0; k < 5; k++) column(g, w / 2 - 2.5 * c + k * c, 5, c);
    const pop = (t % 2) > 1;
    for (let k = 0; k < 4; k++) if (!pop) Art.drawSheep(g, w / 2 - 2.5 * c + (k + 0.5) * c, 8 + 4.5 * c, 7, "#ff5a5f");
    if (pop) for (let k = 0; k < 3; k++) S.drawRock(g, w / 2 + 3.5 * c, 20 + k * 20, 8, 2, 2, 0, 0);
  }
  function helpTop(g, w, h, t) {
    const c = 26;
    for (let k = 0; k < 5; k++) column(g, w / 2 - 2.5 * c + k * c, 5, c);
    g.fillStyle = `rgba(255,80,80,${0.3 + 0.2 * Math.sin(t * 8)})`;
    g.fillRect(w / 2 - 2.5 * c, 8, 5 * c, c);
    for (let r = 1; r < 5; r++) Art.drawSheep(g, w / 2 + 0.5 * c, 8 + (r + 0.5) * c, 7, "#3fa7ff");
  }
})();
