// ======================= GUARD THE FOLD =======================
// Wolves trot down the dirt path towards the fold. Bursts that reach the path give them a fright;
// when a wolf's pips run out he turns tail and runs off. Keep the lambs safe until sunset!
(() => {
  const S = Core;
  const FOLD = {
    hearts: 5,
    waves: 10,
    restMs: 7000, // rest between waves (call the next one early for wool)
    firstRestMs: 9000, // build-up time before wave 1
    spawnGapMs: 1300, // between wolves in a wave
    teamPace: [1.6, 1.25, 1.22, 1.18], // wolves trot slower for smaller teams (x step time for 1-4 flocks)
    teamCount: [1, 1.15, 1.15, 1.2], // ...and more of them come for bigger teams
    teamPips: [0.75, 0.9, 0.85, 0.85], // ...with a few more pips each
    fill: 0.6, // the pasture starts this full of the team's sheep, and regroups to it after each wave
    regroupMs: 6000, // and tops up this often during a wave
    earlyWool: 3, // calling a wave early earns this much wool
    runOffMs: 1000, // a frightened wolf scampering back up the path
    sunsetMs: 3200,
    types: {
      pup: { pips: 1, stepMs: 700, size: 0.6, name: "Pup" },
      wolf: { pips: 3, stepMs: 1000, size: 0.8, name: "Wolf" },
      big: { pips: 8, stepMs: 1600, size: 1.05, name: "Big Wolf" },
      sneaky: { pips: 3, stepMs: 1000, size: 0.8, name: "Sneaky Wolf" },
      grand: { pips: 14, stepMs: 1900, size: 1.3, name: "Grandfather Wolf" },
    },
    // what each wave sends, in order (wave 10 brings the Grandfather Wolf)
    waveList: [
      "pup pup pup",
      "wolf pup wolf",
      "pup pup wolf pup wolf",
      "wolf sneaky wolf sneaky",
      "big pup pup pup pup",
      "wolf wolf sneaky wolf wolf sneaky",
      "big wolf wolf pup pup pup pup",
      "sneaky sneaky big sneaky sneaky",
      "big big wolf wolf wolf pup pup",
      "pup pup wolf grand wolf pup pup",
    ],
    // paths from the top edge down to the fold, as [row, col], on the 9 x 6 pasture
    maps: [
      { key: "zigzag", name: "Zigzag", path: [[0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [5, 1], [6, 1], [6, 2], [6, 3], [6, 4], [7, 4], [8, 4]] },
      { key: "middle", name: "Middle Road", path: [[0, 2], [1, 2], [2, 2], [2, 3], [3, 3], [4, 3], [4, 2], [5, 2], [6, 2], [6, 3], [7, 3], [8, 3]], pace: 1 },
      { key: "hill", name: "Hillside", path: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [5, 1], [6, 1], [7, 1], [7, 2], [7, 3], [8, 3]], pace: 1 },
    ],
  };
  const ICON = { pup: "wolf", wolf: "wolf", big: "wolf", sneaky: "sheep", grand: "crown" };
  const MAP = (key) => FOLD.maps.find((m) => m.key === key) ?? FOLD.maps[0];
  const prog = () => {
    const p = Save.mode("guard").progress;
    p.stars ??= {};
    p.endless ??= {};
    return p;
  };
  const cleared = (key) => Save.data.dev.unlockAll || !!prog().stars[key];
  const mapOpen = (k) => k === 0 || cleared(FOLD.maps[k - 1].key);
  const starsFor = (hearts) => (hearts >= 5 ? 3 : hearts >= 3 ? 2 : 1);

  // Endless: waves keep coming, a little bigger each time, with a Grandfather every 10th
  function endlessWave(n, r) {
    const pool = n < 4 ? ["pup", "wolf"] : n < 8 ? ["pup", "wolf", "sneaky", "big"] : ["wolf", "sneaky", "big", "big"];
    const list = [];
    for (let k = 0; k < 3 + Math.floor(n * 0.7); k++) list.push(r.pick(pool));
    if (n % 10 === 0) list.splice(Math.floor(list.length / 2), 0, "grand");
    return list;
  }
  // bigger teams meet more wolves: extra pups and wolves are slipped into the wave
  function scaled(list, flocks, r) {
    const out = list.slice();
    const extra = Math.round(list.length * (FOLD.teamCount[flocks - 1] - 1));
    for (let k = 0; k < extra; k++) out.splice(1 + r.int(out.length), 0, r.pick(["pup", "wolf"]));
    return out;
  }

  Modes.register({
    key: "guard",
    title: "Guard the Fold",
    how: ["Wolves trot down the dirt path. Bursts that reach the path give them a fright.", "When a wolf's pips run out he runs off. Keep the fold safe until sunset!"],
    music: { song: "shepherdsMarch", style: "march", bpm: 112 },
    setupDefaults: { n: 1, map: "zigzag", endless: false },
    solo: (s) => s.n === 1,
    players: (s) => Array.from({ length: s.n }, (_, p) => ({ seat: p, team: 0 })),
    options(ui, s) {
      const p = prog();
      if (!mapOpen(FOLD.maps.findIndex((m) => m.key === s.map))) s.map = "zigzag";
      if (s.endless && !cleared(s.map)) s.endless = false;
      ui.seg("Flocks", "n", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], "Teammates can be people or AI");
      ui.seats(s.n);
      ui.seg("Fold", "map", FOLD.maps.filter((m, k) => mapOpen(k)).map((m) => [m.key, `${m.name}${p.stars[m.key] ? ` ${"★".repeat(p.stars[m.key])}` : ""}`]));
      if (!mapOpen(FOLD.maps.length - 1)) ui.note("Guard this fold till sunset to open the next one.");
      if (cleared(s.map)) {
        ui.seg("Waves", "endless", [[false, "10 waves"], [true, "Endless"]]);
        if (s.endless) ui.note(p.endless[s.map] ? `Your best here: ${p.endless[s.map]} waves` : "The wolves keep coming. How many waves can you hold?");
      } else ui.note("Clear all 10 waves to open Endless on this fold.");
    },
    playLabel: (s) => (s.endless ? "Start the night watch" : `Guard the ${MAP(s.map).name} fold`),
    againLabel: () => "Guard again",
    tips: [
      { id: "path", on: "start", icon: "flag", text: "Burst next to the path!" },
      { id: "early", on: "rest", icon: "wool", text: "Tap Go now for wool" },
      { id: "sneaky", on: "sneaky", icon: "eye", text: "That sheep is a wolf!" },
    ],
    help: [
      { title: "Bursts by the path", text: "A burst that spills onto the path gives the wolf there a fright. Line and Bomb sheep frighten every wolf they reach.", draw: (g, w, h, t) => helpPath(g, w, h, t) },
      { title: "Pips run out, wolf runs off", text: "Each fright takes a pip. When his pips run out he turns tail and runs. Nobody is hurt.", draw: (g, w, h, t) => helpPips(g, w, h, t) },
      { title: "Guard the hearts", text: "A wolf who reaches the fold costs a heart. Keep 5 hearts for 3 stars. Between waves, tap Go to call the next wave early for wool.", draw: (g, w, h, t) => helpHearts(g, w, h, t) },
    ],
    badges: [
      { id: "win", icon: "shield", name: "Safe till sunset", desc: "Guard a fold through all 10 waves", test: (c) => c.G.data.won },
      { id: "flawless", icon: "heart", name: "Not one lost", desc: "Win without losing a heart", test: (c) => c.G.data.won && c.G.data.hearts === FOLD.hearts },
      { id: "solo", icon: "user", name: "Lone shepherd", desc: "Win alone", test: (c) => c.G.data.won && c.setup.n === 1 },
      { id: "grand", icon: "crown", name: "Grandfather ran off", desc: "Chase off the Grandfather Wolf", test: (c) => c.G.data.grandGone > 0 },
      { id: "eager", icon: "bolt", name: "Bring it on", desc: "Call 5 waves early in one game", test: (c) => c.G.data.early >= 5 },
      { id: "all", icon: "star", name: "Every fold", desc: "Win on all three folds", test: () => FOLD.maps.every((m) => prog().stars[m.key]) },
      { id: "endless15", icon: "moon", name: "Night watch", desc: "Hold 15 waves in Endless", test: (c) => c.setup.endless && c.G.data.wave - 1 >= 15 },
    ],
    results(sum) {
      const D = sum.G.data;
      const s = sum.setup;
      const p = prog();
      const out = { records: [], recordNames: {}, ctx: {}, wool: D.early * FOLD.earlyWool };
      if (D.endless) {
        const held = D.wave - 1;
        const prev = p.endless[s.map] || 0;
        p.endless[s.map] = Math.max(prev, held);
        out.wool += held * 2;
        out.html = `<p class="score">${held} waves</p><p class="note">${held > prev ? `${Icons.get("trophy")} A new best on ${esc(MAP(s.map).name)}!` : `Your best: ${Math.max(prev, held)} waves`}</p>`;
        out.shareLine = `Night watch on ${MAP(s.map).name}: ${held} waves held`;
      } else {
        const st = D.won ? starsFor(D.hearts) : 0;
        const k = FOLD.maps.findIndex((m) => m.key === s.map);
        const opened = st && !p.stars[s.map] && FOLD.maps[k + 1];
        if (st) {
          p.stars[s.map] = Math.max(p.stars[s.map] || 0, st);
          p.cleared = Object.keys(p.stars).length;
          out.wool += 10 + st * 5;
        }
        if (opened) {
          out.next = () => {
            Save.mode("guard").setup = { ...Save.mode("guard").setup, map: FOLD.maps[k + 1].key, endless: false };
            App.play("guard", App.loadSetup(Modes.get("guard")));
          };
        }
        out.html = `${st ? `<div class="stars">${[0, 1, 2].map((q) => Icons.get(q < st ? "star" : "starOutline")).join("")}</div>` : ""}<p class="note">${Icons.get("heart")} ${Math.max(0, D.hearts)} of ${FOLD.hearts} hearts${D.early ? ` · ${D.early} waves called early (+${D.early * FOLD.earlyWool} wool)` : ""}</p>${opened ? `<p class="note">${Icons.get("check")} ${esc(FOLD.maps[k + 1].name)} is open, and Endless here.</p>` : ""}`;
        out.shareLine = st ? `${MAP(s.map).name} fold: ${"⭐".repeat(st)}` : "";
      }
      Save.save();
      return out;
    },
    drawResult(g, w, h, t, won, sum) {
      if (!won || !sum?.G?.data?.won) return false;
      drawSunset(g, w, h, t);
      return true;
    },
    hooks: {
      setup(G, s) {
        const b = G.b;
        const M = MAP(s.map);
        const path = M.path.map(([r, c]) => r * b.cols + c);
        for (const i of path) b.kind[i] = "path";
        const flocks = Math.min(4, G.players.length);
        G.data = {
          path, wolves: [], runners: [], wave: 0, hearts: FOLD.hearts, queue: [], nextSpawn: 0, restUntil: FOLD.firstRestMs, resting: true, won: false, wonAt: 0,
          endless: !!s.endless, flocks, pace: FOLD.teamPace[flocks - 1] * (M.pace || 1), pips: FOLD.teamPips[flocks - 1], nextRegroup: FOLD.regroupMs,
          early: 0, grandGone: 0, lostAt: -1e9, next: [],
        };
        G.data.next = waveFor(G, 1);
        regroup(G);
        for (const pl of G.players) pl.damage = 0;
      },
      hud: (G) => hud(G),
      noElimination: true,
      roundSecs: () => Infinity,
      timerHtml: (G) => `${Icons.get("flag")} ${G.data.wave ? `Wave ${G.data.wave}${G.data.endless ? "" : ` of ${FOLD.waves}`}` : "Get ready"}`,
      inPath: (G, i) => G.b.kind[i] !== "path",
      blocked: (G, i) => G.b.kind[i] === "path",
      land(G, b, from, to, who) {
        if (b.kind[to] !== "path") return false;
        // a sheep spilling onto the path frightens the wolf there, or just trots back to the flock
        const w = G.data.wolves.find((x) => G.data.path[x.idx] === to);
        if (w) fright(G, w, who);
        return true;
      },
      specialHit(G, k, who) {
        if (G.b.kind[k] !== "path") return false;
        // Line and Bomb sheep frighten every wolf in their area
        for (const w of G.data.wolves.slice()) if (G.data.path[w.idx] === k) fright(G, w, who);
        return true;
      },
      onAction(G, code) {
        // "Go": call the next wave early
        const D = G.data;
        if (code !== 0 || !D.resting || D.won || D.hearts <= 0) return;
        D.restUntil = G.time;
        D.early++;
        if (!S.quiet) {
          S.shout(null, `+${FOLD.earlyWool} wool`, 1.1, "#ffcf4a");
          Sfx.coin(4);
        }
      },
      aiValue(G, pl, i) {
        const b = G.b;
        const D = G.data;
        let near = 0;
        let wolfNear = 0;
        for (const k of Engine.neighbours(b, i)) {
          if (b.kind[k] !== "path") continue;
          near++;
          const at = D.path.indexOf(k);
          for (const w of D.wolves) if (at >= w.idx && at <= w.idx + 2) wolfNear += at === w.idx ? 2 : 1;
        }
        if (!near) return 0;
        const bursts = b.count[i] + 1 >= Engine.capacity(b, i);
        return wolfNear ? (bursts ? 6 + wolfNear * 2 : 2) : bursts ? 0.5 : 2.5;
      },
      update(G, now) {
        const D = G.data;
        for (let k = D.runners.length - 1; k >= 0; k--) if (now - D.runners[k].at > FOLD.runOffMs) D.runners.splice(k, 1);
        if (D.hearts <= 0 || D.won) return;
        if (now >= D.nextRegroup) {
          D.nextRegroup = now + FOLD.regroupMs;
          regroup(G);
        }
        // a wave is over: rest (or tap Go), then the next one sets off
        if (!D.resting && !D.queue.length && !D.wolves.length) {
          if (!D.endless && D.wave >= FOLD.waves) {
            D.won = true;
            D.wonAt = now;
            if (!S.quiet) {
              S.shout(null, "Safe till sunset!", 1.6, "#ffcf4a");
              Sfx.shepherd();
              Music.setLayer(1);
            }
            for (const pl of G.players) S.mood(pl, "cheer", 3000);
            hud(G);
            return;
          }
          D.resting = true;
          D.restUntil = now + FOLD.restMs;
          D.next = waveFor(G, D.wave + 1);
          regroup(G);
          if (!S.quiet) {
            S.shout(null, "Wave cleared!", 1.3, "#7be0a8");
            Sfx.chime(7);
          }
          S.tip("rest");
        }
        if (D.resting && now >= D.restUntil) {
          D.resting = false;
          D.wave++;
          D.queue = D.next.slice();
          D.nextSpawn = now;
          const boss = D.queue.includes("grand");
          if (!S.quiet) {
            S.shout(null, boss ? "Grandfather Wolf!" : `Wave ${D.wave}`, 1.6, boss ? "#ff9a5c" : "#ffcf4a");
            Sfx.howl();
            Music.setLayer(boss ? 2 : 1);
          }
        }
        if (D.queue.length && now >= D.nextSpawn) {
          const type = D.queue.shift();
          const T = FOLD.types[type];
          const pips = Math.max(1, Math.round(T.pips * D.pips));
          D.wolves.push({ type, hp: pips, max: pips, idx: 0, from: -1, at: now, next: now + T.stepMs * D.pace, hitAt: -1e9 });
          D.nextSpawn = now + FOLD.spawnGapMs * (type === "big" || type === "grand" ? 1.5 : 1);
        }
        // the wolves trot on
        for (let k = D.wolves.length - 1; k >= 0; k--) {
          const w = D.wolves[k];
          if (now < w.next) continue;
          w.from = w.idx;
          w.idx++;
          w.at = now;
          w.next = now + FOLD.types[w.type].stepMs * D.pace;
          if (w.type === "sneaky" && w.idx === half(D)) {
            if (!S.quiet) S.shout(null, "Sneaky!", 1.2, "#c7c3d6");
            S.tip("sneaky");
          }
          if (w.idx >= D.path.length) {
            // he slips into the fold: a heart lost (the lambs just get a fright)
            D.wolves.splice(k, 1);
            D.hearts--;
            D.lostAt = now;
            if (!S.quiet) {
              S.shout(null, "Oh no!", 1.6, "#ff6b6b");
              Sfx.lose();
              S.shake(10);
              buzz([100, 50, 100]);
            }
          }
        }
        hud(G);
      },
      endCheck(G, now) {
        const D = G.data;
        if (D.hearts <= 0) {
          if (D.endless) return { team: 0, title: `${D.wave - 1} waves held!`, sub: "The night watch is over. Rest well, little flock.", color: "#d9a12a" };
          return { team: -1, title: "The wolves slipped in", sub: `You held them to wave ${D.wave} of ${FOLD.waves}. The lambs are fine, just startled. One more go?`, sad: true };
        }
        if (D.won && now - D.wonAt > FOLD.sunsetMs) return { team: 0, title: "Safe till sunset!", sub: `${D.hearts} of ${FOLD.hearts} hearts kept. The lambs are asleep in the fold.`, color: "#d9a12a" };
        return null;
      },
      drawCell(ctx, G, i, x, y, c) {
        if (G.b.kind[i] !== "path") return false;
        ctx.fillStyle = "#8a6a45";
        ctx.fillRect(x, y, c, c);
        for (let k = 0; k < 4; k++) Art.circle(ctx, x + (((i * 7 + k * 23) % 80) / 100) * c + c * 0.1, y + (((i * 13 + k * 31) % 80) / 100) * c + c * 0.1, c * 0.05, "#a07c52");
        return true;
      },
      drawOver(ctx, G, c, t, now) {
        const D = G.data;
        const b = G.b;
        drawFold(ctx, G, c, t, now);
        for (const w of D.wolves) drawWolfOnPath(ctx, G, w, c, t, now);
        // wolves running off, tails between their legs
        for (const r of D.runners) {
          const p = (now - r.at) / FOLD.runOffMs;
          const x = (Engine.colOf(b, r.cell) + 0.5) * c;
          const y = (Engine.rowOf(b, r.cell) + 0.5) * c;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - p * 1.2);
          ctx.translate(x + p * c * 2.5 * r.dir, y - p * c * 1.2);
          if (r.dir > 0) ctx.scale(-1, 1);
          Art.drawWolfRunning(ctx, 0, 0, c * FOLD.types[r.type].size, t);
          ctx.restore();
        }
        if (now - D.lostAt < 500) {
          ctx.fillStyle = `rgba(255,80,80,${0.25 * (1 - (now - D.lostAt) / 500)})`;
          ctx.fillRect(0, 0, b.cols * c, b.rows * c);
        }
        // sunset falls over the safe fold
        if (D.won) {
          const p = Math.min(1, (now - D.wonAt) / FOLD.sunsetMs);
          const gr = ctx.createLinearGradient(0, 0, 0, b.rows * c);
          gr.addColorStop(0, `rgba(255,140,90,${0.5 * p})`);
          gr.addColorStop(1, `rgba(120,70,140,${0.4 * p})`);
          ctx.fillStyle = gr;
          ctx.fillRect(0, 0, b.cols * c, b.rows * c);
        }
      },
    },
  });

  const half = (D) => Math.floor(D.path.length / 2);
  function waveFor(G, n) {
    const D = G.data;
    const list = D.endless ? endlessWave(n, G.rng) : FOLD.waveList[n - 1].split(" ");
    return scaled(list, D.flocks, G.rng);
  }

  // ---------- the flock ----------
  // Empty squares fill back up with the team's sheep, shared out between the flocks.
  function regroup(G) {
    const b = G.b;
    let filled = 0;
    for (let i = 0; i < b.size; i++) if (b.owner[i] >= 0) filled++;
    const room = b.size - G.data.path.length;
    for (let i = 0; i < b.size && filled < room * FOLD.fill; i++) {
      if (b.kind[i] || b.owner[i] >= 0 || G.rng() > FOLD.fill) continue;
      b.owner[i] = G.rng.int(G.players.length);
      b.count[i] = 1 + G.rng.int(Math.max(1, Engine.capacity(b, i) - 1));
      G.popAt[i] = G.time;
      filled++;
    }
  }

  // ---------- frights ----------
  function fright(G, w, who) {
    const D = G.data;
    if (w.hp <= 0) return;
    w.hp--;
    w.hitAt = G.time;
    const pl = G.players[who];
    if (pl) pl.damage = (pl.damage || 0) + 1;
    const cell = D.path[Math.min(w.idx, D.path.length - 1)];
    if (!S.quiet) {
      Sfx.hit(w.hp);
      S.puff(cell, "#ffffff", 2);
    }
    if (w.hp > 0) return;
    // out of pips: he turns tail and runs off
    D.wolves.splice(D.wolves.indexOf(w), 1);
    if (w.type === "grand") {
      D.grandGone++;
      if (!S.quiet) {
        S.shout(null, "Hallelujah!", 1.8, "#ffcf4a");
        Music.setLayer(1);
      }
    }
    D.runners.push({ type: w.type, at: G.time, cell, dir: Engine.colOf(G.b, cell) < G.b.cols / 2 ? -1 : 1 });
    if (!S.quiet) Sfx.blip(520, 0.25, "triangle", 0.07, 900);
  }

  // hearts; during a wave, how many wolves are left; between waves, what's coming and a Go button
  function hud(G) {
    const D = G.data;
    const hearts = Array.from({ length: FOLD.hearts }, (_, k) => `<i class="${k < D.hearts ? "on" : ""}">${Icons.get("heart")}</i>`).join("");
    let right = "";
    if (D.won) right = `<span class="gf-next">${Icons.get("moon")} Sunset</span>`;
    else if (D.resting) {
      const counts = {};
      for (const ty of D.next) counts[ty] = (counts[ty] || 0) + 1;
      const secs = Math.max(0, Math.ceil((D.restUntil - G.time) / 1000));
      right = `<span class="gf-next">${Object.entries(counts).map(([ty, n]) => `<b class="gf-${ty}" title="${esc(FOLD.types[ty].name)}">${Icons.get(ICON[ty])}${n > 1 ? `×${n}` : ""}</b>`).join("")}</span><button class="gf-go" onclick="Core.act(0)" aria-label="Call the next wave now">Go ${secs}</button>`;
    } else right = `<span class="gf-next">${Icons.get("wolf")} ${D.wolves.length + D.queue.length} left</span>`;
    S.setHud(`<div class="gf-hud"><span class="gf-hearts">${hearts}</span>${right}</div>`);
  }

  // ---------- drawing ----------
  // the fold at the end of the path: a little fence with lambs inside
  function drawFold(ctx, G, c, t, now) {
    const D = G.data;
    const b = G.b;
    const end = D.path[D.path.length - 1];
    const x = Engine.colOf(b, end) * c;
    const y = Engine.rowOf(b, end) * c;
    const asleep = D.won && now - D.wonAt > 600;
    const scared = now - D.lostAt < 1200;
    const mood = asleep ? "sleep" : scared ? "shock" : "happy";
    Art.drawLamb(ctx, x + c * 0.32, y + c * 0.6, c * 0.42, { t, mood, zzz: false });
    Art.drawLamb(ctx, x + c * 0.68, y + c * 0.64, c * 0.38, { t: t + 1, mood, flip: true, look: Progress.look(), zzz: asleep });
    ctx.fillStyle = "#b07a40";
    for (let k = 0; k < 4; k++) ctx.fillRect(x + c * (0.06 + k * 0.29), y + c * 0.5, c * 0.07, c * 0.46);
    ctx.fillRect(x + c * 0.04, y + c * 0.62, c * 0.92, c * 0.06);
    ctx.fillRect(x + c * 0.04, y + c * 0.84, c * 0.92, c * 0.06);
    // between waves, a shadowy wolf waits at the top of the path
    if (D.resting && !D.won && D.next.length) {
      const top = D.path[0];
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.15 * Math.sin(t * 4);
      Art.drawWolf(ctx, (Engine.colOf(b, top) + 0.5) * c, Engine.rowOf(b, top) * c + c * 0.4, c * 0.6, { t, color: "#2b2430" });
      ctx.restore();
    }
  }

  function drawWolfOnPath(ctx, G, w, c, t, now) {
    const D = G.data;
    const b = G.b;
    const T = FOLD.types[w.type];
    const p = w.from < 0 ? 1 : Math.min(1, (now - w.at) / Math.min(320, T.stepMs * D.pace));
    const a = D.path[Math.max(0, w.from)];
    const z = D.path[Math.min(w.idx, D.path.length - 1)];
    const x = (Engine.colOf(b, a) + (Engine.colOf(b, z) - Engine.colOf(b, a)) * p + 0.5) * c;
    const bob = Save.settings.reduced ? 0 : Math.abs(Math.sin(t * 10)) * c * 0.05;
    const y = (Engine.rowOf(b, a) + (Engine.rowOf(b, z) - Engine.rowOf(b, a)) * p + 0.5) * c - bob;
    const hidden = w.type === "sneaky" && w.idx < half(D);
    const hit = now - w.hitAt < 140;
    if (hidden) {
      Art.drawSheep(ctx, x, y, c * 0.2, hit ? "#ffffff" : "#e8e8ef");
      // ...except for the wagging tail
      if ((now / 700) % 3 < 1) {
        ctx.fillStyle = "#6f7380";
        ctx.beginPath();
        ctx.ellipse(x + c * 0.26, y + c * 0.08, c * 0.1, c * 0.04, -0.6 + Math.sin(t * 14) * 0.3, 0, Art.TAU);
        ctx.fill();
      }
    } else {
      const color = hit ? "#ffffff" : w.type === "big" ? "#6a6576" : w.type === "grand" ? "#a3a7b4" : undefined;
      Art.drawWolf(ctx, x, y + c * 0.05, c * T.size, { t, mood: hit ? "scared" : undefined, color });
      if (w.type === "grand") Art.ellipse(ctx, x, y + c * T.size * 0.3, c * 0.16, c * 0.12, 0, "#f3f1f6"); // a fine white beard
    }
    if (!hidden) {
      // pips above his head
      const n = Math.min(w.max, 10);
      const gap = Math.min(6, (c * 0.9) / n);
      const lit = Math.ceil((w.hp * n) / w.max);
      for (let k = 0; k < n; k++) Art.circle(ctx, x - ((n - 1) / 2) * gap + k * gap, y - c * T.size * 0.55, Math.min(2.4, gap * 0.42), k < lit ? "#ffcf4a" : "rgba(0,0,0,0.35)");
    }
  }

  // the results scene: sunset, and the lambs asleep in the fold
  function drawSunset(g, w, h, t) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#5b4b8a");
    sky.addColorStop(0.55, "#ff9e7a");
    sky.addColorStop(1, "#ffd9a8");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    Art.circle(g, w * 0.8, h * 0.66, h * 0.18, "#ffdf8a");
    g.fillStyle = "#4b6a3c";
    g.fillRect(0, h * 0.72, w, h * 0.28);
    const lambs = [[0.3, "#ff5a5f"], [0.5, null], [0.68, "#3fa7ff"]];
    for (const [fx, scarf] of lambs) Art.drawLamb(g, w * fx, h * 0.8, scarf ? 40 : 50, { t, mood: "sleep", still: true, scarf: scarf ?? undefined, look: scarf ? null : Progress.look(), zzz: !scarf, flip: fx > 0.6 });
    g.fillStyle = "#8a5a3a";
    for (let k = 0; k < 9; k++) g.fillRect(w * 0.16 + k * w * 0.085, h * 0.62, 5, h * 0.3);
    g.fillRect(w * 0.16, h * 0.7, w * 0.69, 4);
    g.fillRect(w * 0.16, h * 0.84, w * 0.69, 4);
  }

  // ---------- the "?" card animations ----------
  function strip(g, w, c) {
    for (let k = 0; k < 5; k++) {
      g.fillStyle = k === 3 ? "#8a6a45" : k % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(w / 2 - 2.5 * c + k * c, 40, c, c);
    }
  }
  function helpPath(g, w, h, t) {
    const c = 36;
    strip(g, w, c);
    const p = t % 2;
    Art.drawWolf(g, w / 2 + c, 40 + c * 0.55, c * 0.8, { t, mood: p > 1 ? "scared" : undefined, color: p > 1 && p < 1.15 ? "#ffffff" : undefined });
    Art.drawSheep(g, w / 2 + c * Math.min(0, -1 + p), 40 + c / 2, 7, "#ff5a5f");
  }
  function helpPips(g, w, h, t) {
    const n = 3 - (Math.floor(t * 1.2) % 4);
    if (n > 0) Art.drawWolf(g, w / 2, h * 0.58, 60, { t });
    else Art.drawWolfRunning(g, w / 2 + ((t * 1.2) % 1) * 90, h * 0.58, 60, t);
    for (let k = 0; k < 3; k++) Art.circle(g, w / 2 - 12 + k * 12, h * 0.22, 5, k < n ? "#ffcf4a" : "rgba(43,58,47,0.25)");
  }
  function helpHearts(g, w, h, t) {
    const lost = Math.floor(t) % 3;
    for (let k = 0; k < 5; k++) {
      g.fillStyle = k < 5 - lost ? "#ff6b6b" : "rgba(43,58,47,0.2)";
      g.beginPath();
      Art.heartPath(g, w / 2 - 48 + k * 24, h * 0.35, 10);
      g.fill();
    }
    for (let k = 0; k < 3; k++) {
      g.fillStyle = k < 3 - lost ? "#ffcf4a" : "rgba(43,58,47,0.2)";
      g.beginPath();
      Art.starPath(g, w / 2 - 24 + k * 24, h * 0.7, 10, 4.5);
      g.fill();
    }
  }
})();
