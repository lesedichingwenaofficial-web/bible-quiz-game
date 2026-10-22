// ======================= LOST LAMB =======================
// A little lamb wanders the pasture. Own the square he stands on to fill your bar; a burst on
// his square startles him away. First to fill the bar has found him!
(() => {
  const S = Core;
  const LOST = {
    hopMs: 2000, // he hops to a neighbouring square this often
    scoreMs: 500, // the owner of his square scores this often
    target: 60, // first to this many points wins the round
    hopAnimMs: 320,
    napChance: 0.18, // after a hop: yawn, then nap
    zoomChance: 0.15, // after a hop: wiggle, then zoomies
    warnMs: 900, // a yawn or a wiggle shows this long first
    napMs: 4000,
    zoomGap: 260, // ms between zoomie hops
    goldenEverySecs: 30, // a golden moment this often
    goldenSecs: 5, // lasting this long, points double
    arenas: {
      open: { name: "Open", stones: [], rocks: [] },
      rocky: { name: "Rocky", stones: [], rocks: [[2, 1, 2], [2, 4, 2], [6, 1, 2], [6, 4, 2]] }, // [row, col, hits]
      ring: { name: "Ring", stones: [[2, 2], [2, 3], [6, 2], [6, 3], [4, 1], [4, 4]], rocks: [] }, // stones ring the middle
    },
  };
  const prog = () => Save.mode("lostlamb").progress;

  Modes.register({
    key: "lostlamb",
    title: "Lost Lamb",
    how: ["Own the square the lamb stands on to fill your bar.", "Burst his square to startle him away. When he glows gold, points double!"],
    music: { song: "greenPastures", style: "bright", bpm: 120 },
    match: true,
    setupDefaults: { n: 2, arena: "open", bestOf: 3 },
    players: (s) => Array.from({ length: s.n }, (_, p) => ({ seat: p })),
    options(ui, s) {
      ui.seg("Flocks", "n", [[2, "2"], [3, "3"], [4, "4"]]);
      ui.seats(s.n);
      ui.seg("Arena", "arena", Object.entries(LOST.arenas).map(([k, a]) => [k, a.name]));
      ui.seg("Match", "bestOf", [[1, "Single"], [3, "Best of 3"], [5, "Best of 5"]]);
    },
    playLabel: (s) => (s.bestOf > 1 ? `Play best of ${s.bestOf}` : "Play"),
    againLabel: (sum) => (sum.humans.length > 1 ? "Rematch" : "Play again"),
    tips: [
      { id: "own", on: "start", icon: "heart", text: "Own his square to score" },
      { id: "golden", on: "golden", icon: "sparkle", text: "Golden lamb: double points!" },
      { id: "moods", on: "yawn", icon: "zzz", text: "A yawn means a nap" },
      { id: "zoom", on: "wiggle", icon: "bolt", text: "A wiggle means zoomies!" },
    ],
    help: [
      { title: "Stand with the lamb", text: "Every half second, whoever owns the lamb's square fills their bar a little.", draw: (g, w, h, t) => helpOwn(g, w, h, t) },
      { title: "Startle him", text: "A burst on his square makes him jump two squares away. Use it to steal him back!", draw: (g, w, h, t) => helpStartle(g, w, h, t) },
      { title: "Read his mood", text: "A yawn means he'll nap where he is. A wiggle means zoomies. Gold means double points.", draw: (g, w, h, t) => helpMood(g, w, h, t) },
    ],
    badges: [
      { id: "win", icon: "heart", name: "Found him!", desc: "Win a game", test: (c) => c.won },
      { id: "gold", icon: "sparkle", name: "Golden touch", desc: "Score 15 points in golden moments in a round", test: (c) => c.G.players.some((p) => p.human && p.gold >= 15) },
      { id: "startle", icon: "bolt", name: "Boo!", desc: "Startle him 5 times in a round", test: (c) => c.G.players.some((p) => p.human && p.startles >= 5) },
      { id: "nap", icon: "zzz", name: "Nap guard", desc: "Hold him through a whole nap", test: (c) => c.G.players.some((p) => p.human && p.napHeld) },
      { id: "sweep", icon: "trophy", name: "Clean sweep", desc: "Win a best of 3 two rounds to none", test: (c) => c.won && c.match && Object.values(c.match.wins).reduce((a, b) => a + b, 0) === 2 },
      { id: "four", icon: "party", name: "Party shepherd", desc: "Win a 4-flock game", test: (c) => c.won && c.setup.n === 4 },
      { id: "ring", icon: "refresh", name: "Ring master", desc: "Win in the Ring arena", test: (c) => c.won && c.setup.arena === "ring" },
    ],
    results(sum) {
      const p = prog();
      if (sum.won) p.found = (p.found || 0) + 1;
      Save.save();
      const G = sum.G;
      return {
        html: `<div class="ll-bars">${G.players.map((q) => `<div>${App.symSvg(q.sym, q.color)}<span class="meter"><i style="width:${(100 * q.score) / LOST.target}%;background:${q.color}"></i></span><b>${q.score}</b></div>`).join("")}</div>`,
        shareLine: sum.won ? "Found the lost lamb!" : "",
      };
    },
    hooks: {
      setup(G, s) {
        const arena = LOST.arenas[s.arena] ?? LOST.arenas.open;
        const b = G.b;
        for (const [r, c] of arena.stones) b.rock[r * b.cols + c] = true;
        for (const [r, c, hp] of arena.rocks) {
          const i = r * b.cols + c;
          b.kind[i] = "rock";
          b.hp[i] = b.mhp[i] = hp;
        }
        const start = s.arena === "ring" ? 4 * b.cols + 2 : 4 * b.cols + 2 + G.rng.int(2);
        G.data = {
          lamb: start, from: start, hopAt: 0, nextHop: LOST.hopMs, nextScore: LOST.scoreMs, startled: false, shockUntil: 0,
          state: "walk", stateUntil: 0, zoomLeft: 0, nextGolden: LOST.goldenEverySecs * 1000, goldenUntil: 0, napOwner: -1, look: Progress.look(),
        };
        for (const pl of G.players) pl.gold = pl.startles = pl.score = 0;
      },
      noElimination: true, // a wiped-out flock just drops back in: only the lamb decides
      targets(G, b, i, t) {
        if (i === G.data.lamb) {
          G.data.startled = true;
          const p = G.players[b.owner[i]];
          if (p) p.startles++;
        }
        return t;
      },
      afterWave(G, now) {
        const D = G.data;
        if (!D.startled) return;
        // startled: he bounces two squares away, even out of a nap
        D.startled = false;
        const b = G.b;
        const far = [];
        for (let k = 0; k < b.size; k++) {
          const d = Math.abs(Engine.rowOf(b, k) - Engine.rowOf(b, D.lamb)) + Math.abs(Engine.colOf(b, k) - Engine.colOf(b, D.lamb));
          if (d === 2 && !b.rock[k] && b.kind[k] !== "rock") far.push(k);
        }
        if (far.length) hop(G, G.rng.pick(far), now);
        D.state = "walk";
        D.shockUntil = now + 700;
        D.nextHop = now + LOST.hopMs;
        Sfx.bleat(1.4);
      },
      update(G, now) {
        const D = G.data;
        lambBrain(G, now);
        if (now >= D.nextGolden) {
          D.nextGolden = now + LOST.goldenEverySecs * 1000;
          D.goldenUntil = now + LOST.goldenSecs * 1000;
          S.shout(null, "Golden!", 1.6, "#ffcf4a");
          Sfx.chime(12);
          buzz(60);
          S.tip("golden");
        }
        const golden = now < D.goldenUntil;
        if (now >= D.nextScore) {
          D.nextScore = now + LOST.scoreMs;
          const o = G.b.owner[D.lamb];
          const pl = G.players[o];
          if (pl && pl.alive) {
            const pts = golden ? 2 : 1;
            pl.score = Math.min(LOST.target, pl.score + pts);
            if (golden) pl.gold += pts;
            Sfx.blip(660 + o * 110, 0.05, "sine", golden ? 0.05 : 0.025);
            if (pl.score >= LOST.target - 10 && pl.score - pts < LOST.target - 10) S.shout(pl, "Nearly!", 1.1);
          }
        }
        bars(G, golden);
      },
      // the AI reads the lamb: where he'll be, not just where he is
      aiValue(G, pl, i) {
        const D = G.data;
        const L = D.lamb;
        const b = G.b;
        const now = G.time;
        const gold = now < D.goldenUntil || D.nextGolden - now < 1500 ? 2 : 1;
        const burst = b.count[i] + 1 >= Engine.capacity(b, i);
        const ownsLamb = S.sameTeam(b.owner[L], pl.id);
        const stays = D.state === "yawn" || D.state === "nap"; // a yawn means he'll nap right there
        const hopSoon = !stays && D.nextHop - now < 900;
        if (i === L) {
          // never startle him off your own square; do startle him off someone else's
          if (burst && ownsLamb) return -8;
          return (stays ? 9 : hopSoon ? 3 : 6) * gold;
        }
        const nb = Engine.neighbours(b, L);
        if (nb.includes(i)) {
          // his next hop lands on one of these: be there first
          const odds = 1 / nb.length;
          return ((burst && !ownsLamb ? 5 : 1.5) + (hopSoon ? 6 * odds : 0)) * gold;
        }
        return 0;
      },
      endCheck(G, now, left) {
        const win = G.players.find((p) => p.score >= LOST.target);
        if (win) return { team: win.team, sub: "Filled the bar first!" };
        if (left > 0) return null;
        const ranked = [...G.players].sort((a, b) => b.score - a.score);
        const sub = "Time's up! Most time with the lamb.";
        if (ranked.length > 1 && ranked[0].score === ranked[1].score) return { team: -1, sub };
        return { team: ranked[0].team, sub };
      },
      drawOver(ctx, G, c, t, now) {
        const D = G.data;
        const b = G.b;
        const p = Math.min(1, (now - D.hopAt) / LOST.hopAnimMs);
        const fx = (Engine.colOf(b, D.from) + 0.5) * c;
        const fy = (Engine.rowOf(b, D.from) + 0.5) * c;
        const tx = (Engine.colOf(b, D.lamb) + 0.5) * c;
        const ty = (Engine.rowOf(b, D.lamb) + 0.5) * c;
        const x = fx + (tx - fx) * p;
        const y = fy + (ty - fy) * p - Math.sin(Math.PI * p) * c * 0.5;
        const o = b.owner[D.lamb];
        const owner = p >= 1 && S.isPlayer(o) ? G.players[o] : null;
        const golden = now < D.goldenUntil;
        if (owner || golden) {
          ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 6);
          Art.circle(ctx, tx, ty, c * (golden ? 0.62 : 0.5), golden ? "#ffcf4a" : owner.color);
          ctx.globalAlpha = 1;
        }
        // his mood shows what he's about to do
        const reduced = Save.settings.reduced;
        const wiggle = D.state === "wiggle" && !reduced ? Math.sin(t * 40) * c * 0.06 : 0;
        const looksLeft = owner ? owner.seat === 0 || owner.seat === 2 : Math.sin(t) > 0;
        const mood = now < D.shockUntil ? "shock" : D.state === "nap" ? "sleep" : D.state === "yawn" ? "shock" : D.state === "zoom" ? "joy" : "happy";
        Art.drawLamb(ctx, x + wiggle, y - c * 0.08, c * 0.85, { t, look: { ...D.look, scarf: undefined }, scarf: owner ? owner.color : "#fffaf0", mood, flip: looksLeft, glow: golden ? "rgba(255,220,120,0.6)" : undefined, zzz: false });
        if (owner) Art.mark(ctx, x - c * 0.3, y - c * 0.38, c * 0.16, owner.sym);
        if (D.state === "nap" || D.state === "yawn") {
          ctx.fillStyle = "#e8f0ff";
          ctx.font = `700 ${Math.round(c * 0.28)}px Fredoka, system-ui`;
          ctx.fillText(D.state === "nap" ? "z z" : "~", x + c * 0.25, y - c * 0.45 - Math.sin(t * 2) * c * 0.06);
        }
        if (D.state === "wiggle") {
          ctx.strokeStyle = "#ffcf4a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (const sd of [-1, 1]) {
            ctx.moveTo(x + sd * c * 0.42, y - c * 0.2);
            ctx.lineTo(x + sd * c * 0.55, y - c * 0.3);
            ctx.moveTo(x + sd * c * 0.44, y);
            ctx.lineTo(x + sd * c * 0.6, y);
          }
          ctx.stroke();
        }
      },
    },
  });

  // ---------- the lamb ----------
  // Walks, and now and then yawns into a nap or wiggles into zoomies.
  function lambBrain(G, now) {
    const D = G.data;
    const b = G.b;
    if (D.state === "yawn" && now >= D.stateUntil) {
      D.state = "nap";
      D.stateUntil = now + LOST.napMs;
      D.napOwner = b.owner[D.lamb];
      D.napHeld = true;
      return;
    }
    if (D.state === "nap") {
      if (b.owner[D.lamb] !== D.napOwner) D.napHeld = false;
      if (now < D.stateUntil) return;
      const p = G.players[D.napOwner];
      if (D.napHeld && p) p.napHeld = true;
      D.state = "walk";
      D.nextHop = now + 400;
    }
    if (D.state === "wiggle" && now >= D.stateUntil) {
      D.state = "zoom";
      D.zoomLeft = 2;
      D.nextHop = now;
    }
    if (now < D.nextHop) return;
    const n = Engine.neighbours(b, D.lamb).filter((k) => b.kind[k] !== "rock");
    if (n.length) hop(G, G.rng.pick(n), now);
    if (D.state === "zoom") {
      D.zoomLeft--;
      D.nextHop = now + LOST.zoomGap;
      if (D.zoomLeft <= 0) {
        D.state = "walk";
        D.nextHop = now + LOST.hopMs;
      }
      return;
    }
    D.nextHop = now + LOST.hopMs;
    const r = G.rng();
    if (r < LOST.napChance) {
      D.state = "yawn";
      D.stateUntil = now + LOST.warnMs;
      D.nextHop = Infinity;
      Sfx.blip(300, 0.6, "sine", 0.04, 180);
      S.tip("yawn");
    } else if (r < LOST.napChance + LOST.zoomChance) {
      D.state = "wiggle";
      D.stateUntil = now + LOST.warnMs;
      D.nextHop = Infinity;
      Sfx.blip(900, 0.3, "triangle", 0.04, 1400);
      S.tip("wiggle");
    }
  }
  function hop(G, to, now) {
    const D = G.data;
    D.from = D.lamb;
    D.lamb = to;
    D.hopAt = now;
    Sfx.blip(520, 0.08, "triangle", 0.04, 780);
  }
  // every flock's bar, with its shape so colour is never the only clue
  function bars(G, golden) {
    let top = 0;
    for (const p of G.players) top = Math.max(top, p.score);
    S.setHud(`<div class="ll-hud${golden ? " golden" : ""}">${G.players.map((p) => `<div class="llbar${p.score === top && top > 0 ? " lead" : ""}">${App.symSvg(p.sym, p.color)}<span><i style="width:${Math.round((100 * p.score) / LOST.target)}%;background:${p.color}"></i></span></div>`).join("")}</div>`);
  }

  // ---------- the "?" card animations ----------
  function grid(g, w, cols, rows, c) {
    const x0 = (w - cols * c) / 2;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      g.fillStyle = (r + k) % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0 + k * c, 10 + r * c, c, c);
    }
    return x0;
  }
  function helpOwn(g, w, h, t) {
    const c = 34;
    const x0 = grid(g, w, 3, 3, c);
    g.fillStyle = "rgba(255,90,95,0.35)";
    g.fillRect(x0 + c, 10 + c, c, c);
    Art.drawLamb(g, x0 + 1.5 * c, 10 + 1.4 * c, c * 0.85, { t, scarf: "#ff5a5f" });
    Art.rrect(g, w / 2 - 60, h - 26, 120, 12, 6, "rgba(43,58,47,0.15)");
    Art.rrect(g, w / 2 - 60, h - 26, 120 * ((t * 0.3) % 1), 12, 6, "#ff5a5f");
  }
  function helpStartle(g, w, h, t) {
    const c = 34;
    const x0 = grid(g, w, 4, 3, c);
    const p = (t % 2) / 2;
    const from = [x0 + 0.5 * c, 10 + 1.5 * c];
    const to = [x0 + 2.5 * c, 10 + 1.5 * c];
    const e = p < 0.5 ? 0 : Math.min(1, (p - 0.5) * 3);
    Art.drawLamb(g, from[0] + (to[0] - from[0]) * e, from[1] - Math.sin(Math.PI * e) * c * 0.6, c * 0.85, { t, mood: e > 0 && e < 1 ? "shock" : "happy" });
    if (p > 0.4 && p < 0.55) Art.circle(g, from[0], from[1], c * 0.5, "rgba(255,255,255,0.6)");
  }
  function helpMood(g, w, h, t) {
    const phase = Math.floor(t / 1.5) % 3;
    Art.drawLamb(g, w / 2, h * 0.55, 80, { t, mood: phase === 0 ? "sleep" : phase === 1 ? "joy" : "happy", glow: phase === 2 ? "rgba(255,220,120,0.7)" : undefined, zzz: phase === 0 });
  }
})();
