// ======================= SHEEP RUSH =======================
// A one-minute score attack. Bursts claim grey sheep and smash rocks; chains close together
// raise the multiplier. The Daily Rush is the same board for everyone, each day.
(() => {
  const S = Core;
  const N = S.NEUTRAL;
  const RUSH = {
    seconds: 60,
    comboMs: 2000, // chains closer than this raise the multiplier; this long without one resets it
    bonusSecs: 3, // for breaking a rock, a 20-chain or a clock
    bonusChain: 20,
    maxBonusSecs: 30, // at most this much extra time per run
    start: { own: 0.3, neutral: 0.4, rocks: 3 },
    neutralEveryMs: 3500, // new grey sheep drop in this often (2 at a time)
    rockEveryMs: 12000,
    pickupEveryMs: 8000, // a pickup drops in this often
    pickups: ["clock", "gold", "box"],
    goldenMs: 5000, // golden sheep: double points this long
    pointsPerBurst: 10,
    chainCap: 20, // chain size counts up to this in the points
    homePoints: 5, // per square cleared when a chain ends
    refill: { upTo: 0.5, own: 0.4 }, // after a chain clears, sheep drop in until half the board is full
    medals: [["bronze", "Bronze", 100000, "#d08a4a"], ["silver", "Silver", 250000, "#c7ced8"], ["gold", "Gold", 500000, "#ffcf4a"], ["plat", "Platinum", 900000, "#bfe9ff"]],
    shareEmoji: { bronze: "🥉", silver: "🥈", gold: "🥇", plat: "💎" }, // for the text people paste into chats
  };
  const medalFor = (score) => RUSH.medals.filter(([, , at]) => score >= at).pop();
  const medalSvg = (m, size = 28) => `<svg class="medal-ico" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z" fill="#3fa7ff"/><circle cx="12" cy="15" r="7" fill="${m ? m[3] : "#d5dbd3"}" stroke="rgba(0,0,0,0.25)" stroke-width="1.2"/><path d="M12 11l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" fill="rgba(255,255,255,0.75)"/></svg>`;
  const prog = () => {
    const p = Save.mode("rush").progress;
    p.daily ??= {};
    p.ghost ??= {};
    return p;
  };
  const ghostKey = (daily) => (daily ? `daily-${Dates.today()}` : "free");

  Modes.register({
    key: "rush",
    title: "Sheep Rush",
    how: ["One minute. Burst grey sheep, smash rocks, grab clocks and gold.", "Chains close together raise your multiplier!"],
    solo: true,
    maxRun: 14, // a cascade settles after 14 waves (about 2 s), then its squares clear
    music: { song: "meadowDash", style: "bright", bpm: 140 },
    tune: { roundSecs: RUSH.seconds },
    setupDefaults: { mode: "daily" },
    players: (s) => [{ seat: 0, kind: s.bot ? "ai" : "human", level: s.bot || null }],
    options(ui, s) {
      ui.seg("Mode", "mode", [["daily", `Daily Rush #${Dates.dailyNumber()}`], ["free", "Free Play"]]);
      const p = prog();
      const best = s.mode === "daily" ? p.daily[Dates.today()] : Save.mode("rush").records.score;
      if (best) ui.custom(UI.h("p", { class: "note best-line", html: `${medalSvg(medalFor(best), 22)} ${s.mode === "daily" ? "Today's best" : "Your best"}: <b>${fmtNum(best)}</b>` }));
      ui.custom(UI.h("div", { class: "medal-row", html: RUSH.medals.map((m) => `<span>${medalSvg(m, 24)}<small>${m[2] / 1000}k</small></span>`).join("") }));
    },
    playLabel: (s) => (s.mode === "daily" ? `Play Daily Rush #${Dates.dailyNumber()}` : "Play"),
    // the Daily hub opens straight into today's run
    daily: () => App.play("rush", { ...App.loadSetup(Modes.get("rush")), mode: "daily" }, { seed: hashStr("rush-play-" + Dates.today()) }),
    seedFor: (s) => (s.mode === "daily" ? hashStr("rush-play-" + Dates.today()) : undefined),
    tips: [
      { id: "combo", on: "start", icon: "bolt", text: "Quick chains raise the multiplier" },
      { id: "pickups", on: "box", icon: "timer", text: "Burst into clocks for time" },
    ],
    help: [
      { title: "Burst the grey sheep", text: "Grey sheep don't burst by themselves. Your bursts claim them, and big chains score big.", draw: (g, w, h, t) => helpGrey(g, w, h, t) },
      { title: "Keep the combo going", text: "Start a new chain within two seconds of the last to raise your multiplier.", draw: (g, w, h, t) => helpCombo(g, w, h, t) },
      { title: "Grab the pickups", text: "Clocks add time, golden sheep double your points, gifts load a special.", draw: (g, w, h, t) => helpPickups(g, w, h, t) },
    ],
    badges: [
      { id: "bronze", icon: "star", name: "Bronze", desc: "Score 100,000", test: (c) => c.score >= RUSH.medals[0][2] },
      { id: "silver", icon: "star", name: "Silver", desc: "Score 250,000", test: (c) => c.score >= RUSH.medals[1][2] },
      { id: "gold", icon: "star", name: "Gold", desc: "Score 500,000", test: (c) => c.score >= RUSH.medals[2][2] },
      { id: "plat", icon: "crown", name: "Platinum", desc: "Score 900,000", test: (c) => c.score >= RUSH.medals[3][2] },
      { id: "daily", icon: "calendar", name: "Daily rusher", desc: "Play a Daily Rush", test: (c) => c.setup.mode === "daily" },
      { id: "x5", icon: "bolt", name: "On fire", desc: "Reach a ×5 multiplier", test: (c) => c.G.data.topMult >= 5 },
      { id: "rocks", icon: "rocks", name: "Quarry", desc: "Smash 8 rocks in one rush", test: (c) => c.G.data.rocksBroken >= 8 },
      { id: "time", icon: "timer", name: "Overtime", desc: "Earn the full +30 seconds", test: (c) => c.G.data.bonus >= RUSH.maxBonusSecs },
      { id: "golden", icon: "sparkle", name: "Golden fleece", desc: "Grab 3 golden sheep in one rush", test: (c) => c.G.data.goldGrabs >= 3 },
    ],
    results(sum) {
      const D = sum.G.data;
      const p = prog();
      const daily = D.daily;
      const medal = medalFor(D.score);
      const key = ghostKey(daily);
      const prevBest = daily ? p.daily[Dates.today()] || 0 : Save.mode("rush").records.score || 0;
      const isBest = D.score > prevBest;
      if (daily) p.daily[Dates.today()] = Math.max(prevBest, D.score);
      // the ghost of your best run, for next time
      if (isBest) {
        p.ghost[key] = D.trace;
        // keep only today's daily ghost
        for (const k of Object.keys(p.ghost)) if (k.startsWith("daily-") && k !== key) delete p.ghost[k];
      }
      Save.save();
      const line = `🐑 Sheep Rush${daily ? ` Daily #${Dates.dailyNumber()}` : ""}: ${fmtNum(D.score)} ${medal ? RUSH.shareEmoji[medal[0]] : ""} · chain ${D.best} · x${D.topMult} · ${CONFIG.siteUrl}`;
      return {
        records: daily ? [] : [{ key: "score", value: D.score }],
        recordNames: { score: "Sheep Rush score" },
        ctx: { score: D.score },
        wool: Math.min(30, Math.floor(D.score / 40000)) + (daily ? 10 : 0),
        html: `<div class="rush-medal">${medalSvg(medal, 64)}</div><p class="score">${fmtNum(D.score)}</p>
          <div class="medal-row">${RUSH.medals.map((m) => `<span class="${D.score >= m[2] ? "got" : ""}">${medalSvg(m, 24)}<small>${m[2] / 1000}k</small></span>`).join("")}</div>
          <p class="note">${isBest ? `${Icons.get("trophy")} A new best!` : `Best: ${fmtNum(Math.max(prevBest, D.score))}`} · chain ×${D.best} · multiplier ×${D.topMult}</p>
          <div class="share-line"><span>${esc(line)}</span><button class="btn small" id="rush-copy">${Icons.get("check")}<span>Copy</span></button></div>`,
        after() {
          $("rush-copy").onclick = () => Share.text(line);
        },
        againLabel: daily ? "Run it again" : "Play again",
        again: () => (daily ? Modes.get("rush").daily() : App.play("rush", { ...App.loadSetup(Modes.get("rush")), mode: "free" })),
        shareLine: `${fmtNum(D.score)} points${medal ? ` · ${medal[1]}` : ""}`,
        shareText: line,
      };
    },
    hooks: {
      setup(G, s) {
        const daily = s.mode === "daily";
        const b = G.b;
        const r = daily ? RNG(hashStr("rush-board-" + Dates.today())) : G.rng;
        const ghost = prog().ghost[ghostKey(daily)] || null;
        G.data = {
          daily, burst: new Set(), score: 0, mult: 1, topMult: 1, lastBurst: -1e9, bonus: 0, best: 0, rocksBroken: 0, goldGrabs: 0, goldUntil: 0,
          nextNeutral: RUSH.neutralEveryMs, nextRock: RUSH.rockEveryMs, nextPickup: RUSH.pickupEveryMs / 2, pick: 0, trace: [], ghost,
        };
        const cells = r.shuffle([...Array(b.size).keys()]);
        cells.slice(0, RUSH.start.rocks).forEach((i) => addRock(G, i, r));
        for (const i of cells.slice(RUSH.start.rocks)) {
          const x = r();
          if (x < RUSH.start.own) fill(b, i, 0, r);
          else if (x < RUSH.start.own + RUSH.start.neutral) fill(b, i, N, r);
        }
        G.players[0].placed = true;
      },
      noElimination: true,
      roundSecs: (G) => S.tune.roundSecs + G.data.bonus,
      land(G, b, from, to) {
        const kind = b.kind[to];
        if (kind === "rock") G.data.score += 25 * G.data.mult; // the core takes the hit
        if (kind === "clock" || kind === "gold") {
          grab(G, to, kind);
          return true;
        }
        return false;
      },
      specialHit(G, k) {
        const kind = G.b.kind[k];
        if (kind === "clock" || kind === "gold") {
          grab(G, k, kind);
          return true;
        }
        return false;
      },
      onRockBreak(G) {
        const D = G.data;
        D.rocksBroken++;
        D.score += 100 * D.mult;
        bonus(G);
      },
      targets(G, b, i, t) {
        if (b.owner[i] === 0) G.data.burst.add(i);
        return t;
      },
      afterWave(G, now, bursts) {
        const D = G.data;
        const pl = G.players[0];
        if (!bursts[0]) return;
        if (pl.chain === bursts[0]) {
          // a new chain: close to the last one raises the multiplier
          D.mult = now - D.lastBurst < RUSH.comboMs ? D.mult + 1 : 1;
          D.topMult = Math.max(D.topMult, D.mult);
          if (D.mult > 1) Sfx.blip(400 + D.mult * 80, 0.12, "triangle", 0.07, 700 + D.mult * 80);
          if (D.mult === 3 || D.mult === 5 || D.mult === 8) S.shout(pl, `×${D.mult}!`, 1.2 + D.mult * 0.05, "#ff9a5c");
        }
        D.lastBurst = now;
        D.score += bursts[0] * RUSH.pointsPerBurst * Math.min(pl.chain, RUSH.chainCap) * D.mult * (now < D.goldUntil ? 2 : 1);
      },
      onChain(G, pl, prev, cur) {
        if (prev < RUSH.bonusChain && cur >= RUSH.bonusChain) bonus(G);
      },
      chainEnd(G, pl, chain, now) {
        const D = G.data;
        const b = G.b;
        D.best = Math.max(D.best, chain);
        // the sheep that burst find their way home: their squares clear, so the board never clogs
        const fx = S.effect("overflow", -1, "#ffe680", now);
        let cleared = 0;
        for (const i of D.burst) {
          if (b.owner[i] !== 0) continue;
          b.owner[i] = -1;
          b.count[i] = 0;
          b.tag[i] = null;
          if (fx && fx.n < fx.cells.length) fx.cells[fx.n++] = i;
          cleared++;
        }
        D.burst.clear();
        D.score += cleared * RUSH.homePoints * D.mult;
        if (cleared >= 8) Sfx.blip(1046, 0.2, "sine", 0.05, 1568);
        // fresh sheep drop into the gaps
        const empty = [];
        for (let i = 0; i < b.size; i++) if (b.owner[i] === -1 && !b.kind[i]) empty.push(i);
        let room = Math.floor(b.size * RUSH.refill.upTo) - (b.size - empty.length);
        while (room-- > 0 && empty.length) {
          const i = empty.splice(G.rng.int(empty.length), 1)[0];
          fill(b, i, G.rng() < RUSH.refill.own ? 0 : N, G.rng);
          S.puff(i, "#fffaf0", 2);
        }
      },
      update(G, now) {
        const D = G.data;
        // the trace of this run, one point a second, to race against next time
        const sec = Math.floor((now - G.t0) / 1000);
        while (D.trace.length <= sec) D.trace.push(D.score);
        if (D.mult > 1 && now - D.lastBurst > RUSH.comboMs) {
          D.mult = 1;
          Sfx.blip(300, 0.15, "sine", 0.04, 180);
        }
        if (now >= D.nextNeutral) {
          D.nextNeutral = now + RUSH.neutralEveryMs;
          for (let k = 0; k < 2; k++) {
            const i = randomEmpty(G);
            if (i >= 0) {
              fill(G.b, i, N, G.rng);
              S.puff(i, "#c9c9d4", 4);
            }
          }
        }
        if (now >= D.nextRock) {
          D.nextRock = now + RUSH.rockEveryMs;
          const i = randomEmpty(G);
          if (i >= 0) addRock(G, i, G.rng);
        }
        if (now >= D.nextPickup) {
          D.nextPickup = now + RUSH.pickupEveryMs;
          const i = randomEmpty(G);
          if (i >= 0) {
            G.b.kind[i] = RUSH.pickups[D.pick++ % RUSH.pickups.length];
            S.puff(i, "#ffcf4a", 6);
            Sfx.chime(2);
            S.tip("box");
          }
        }
        hud(G, now);
      },
      endCheck(G, now, left) {
        if (left > 0) return null;
        const D = G.data;
        D.best = Math.max(D.best, G.players[0].chain);
        const medal = medalFor(D.score);
        return { team: 0, title: medal ? `${medal[1]} medal!` : "Time!", sub: `${fmtNum(D.score)} points`, color: "#d9a12a" };
      },
      aiValue: (G, pl, i) => {
        let n = 0;
        for (const k of Engine.neighbours(G.b, i)) if (G.b.kind[k] || G.b.owner[k] === N) n++;
        return n;
      },
      drawCell(ctx, G, i, x, y, c, t) {
        const kind = G.b.kind[i];
        if (kind !== "clock" && kind !== "gold") return false;
        const cx = x + c / 2;
        const cy = y + c / 2 + Math.sin(t * 4 + i) * c * 0.03;
        if (kind === "clock") {
          Art.circle(ctx, cx, cy, c * 0.3, "#fffaf0");
          ctx.strokeStyle = "#ff6b6b";
          ctx.lineWidth = c * 0.06;
          ctx.beginPath();
          ctx.arc(cx, cy, c * 0.3, 0, Art.TAU);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy - c * 0.18);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(t * 3) * c * 0.14, cy + Math.sin(t * 3) * c * 0.14);
          ctx.stroke();
        } else {
          ctx.globalAlpha = 0.4 + 0.25 * Math.sin(t * 6);
          Art.circle(ctx, cx, cy, c * 0.42, "#ffe680");
          ctx.globalAlpha = 1;
          Art.drawSheep(ctx, cx, cy, c * 0.2, "#ffcf4a");
        }
        return true;
      },
    },
  });

  // the score, the combo meter, gold, and the ghost of your best run
  function hud(G, now) {
    const D = G.data;
    const left = Math.max(0, 1 - (now - D.lastBurst) / RUSH.comboMs);
    const gold = now < D.goldUntil;
    let ghost = "";
    if (D.ghost && D.ghost.length) {
      const sec = Math.min(D.ghost.length - 1, Math.floor((now - G.t0) / 1000));
      const diff = D.score - D.ghost[Math.max(0, sec)];
      const end = Math.max(1, D.score, D.ghost[D.ghost.length - 1]);
      ghost = `<div class="ghost-bar${diff >= 0 ? " ahead" : ""}" title="Your best run"><i class="me" style="left:${Math.min(100, (100 * D.score) / end)}%"></i><i class="gh" style="left:${Math.min(100, (100 * D.ghost[Math.max(0, sec)]) / end)}%"></i><b>${diff >= 0 ? "+" : "−"}${fmtNum(Math.abs(diff))}</b></div>`;
    }
    S.setHud(`${gold ? `<span class="goldtag">${Icons.get("sparkle")}×2</span>` : ""}<div class="combo"><i style="width:${D.mult > 1 ? Math.round(left * 20) * 5 : 0}%"></i><b>×${D.mult}</b></div><span class="score">${fmtNum(D.score)}</span>${ghost}`);
  }

  function grab(G, i, kind) {
    const D = G.data;
    G.b.kind[i] = null;
    S.puff(i, "#ffcf4a", 8);
    if (kind === "clock") bonus(G);
    else {
      D.goldUntil = G.time + RUSH.goldenMs;
      D.goldGrabs++;
      S.shout(G.players[0], "Golden!", 1.4, "#ffcf4a");
      Sfx.chime(12);
    }
  }
  function fill(b, i, who, r) {
    b.owner[i] = who;
    b.count[i] = 1 + r.int(Engine.capacity(b, i) - 1);
  }
  function randomEmpty(G) {
    const b = G.b;
    let n = 0;
    for (let i = 0; i < b.size; i++) if (b.owner[i] === -1 && !b.kind[i]) n++;
    if (!n) return -1;
    let k = G.rng.int(n);
    for (let i = 0; i < b.size; i++) if (b.owner[i] === -1 && !b.kind[i] && k-- === 0) return i;
    return -1;
  }
  function addRock(G, i, r) {
    const b = G.b;
    b.owner[i] = -1;
    b.count[i] = 0;
    b.kind[i] = "rock";
    b.hp[i] = b.mhp[i] = 1 + r.int(3);
    if (G.path.length) S.rebuildPath();
  }
  function bonus(G) {
    if (G.data.bonus >= RUSH.maxBonusSecs) return;
    G.data.bonus += RUSH.bonusSecs;
    S.shout(G.players[0], `+${RUSH.bonusSecs}s`, 1.3, "#7be0a8");
    Sfx.blip(880, 0.12, "sine", 0.06, 1320);
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
  function helpGrey(g, w, h, t) {
    const c = 34;
    const x0 = grid(g, w, 4, 3, c);
    const p = (t % 2) / 2;
    Art.drawSheep(g, x0 + 1.5 * c, 10 + 1.5 * c, 8, "#ff5a5f");
    Art.drawSheep(g, x0 + 2.5 * c, 10 + 1.5 * c, 8, p > 0.5 ? "#ff5a5f" : "#a9a9b6");
    Art.drawSheep(g, x0 + 1.5 * c, 10 + 0.5 * c, 8, p > 0.6 ? "#ff5a5f" : "#a9a9b6");
  }
  function helpCombo(g, w, h, t) {
    const m = 1 + Math.floor((t * 1.5) % 5);
    Art.rrect(g, w / 2 - 70, h / 2 - 14, 140, 28, 14, "rgba(43,58,47,0.15)");
    Art.rrect(g, w / 2 - 70, h / 2 - 14, 140 * (1 - ((t * 1.5) % 1)), 28, 14, "#ff9a5c");
    g.fillStyle = "#2b3a2f";
    g.font = "700 22px Fredoka, system-ui";
    g.textAlign = "center";
    g.fillText(`×${m}`, w / 2, h / 2 + 8);
    g.textAlign = "start";
  }
  function helpPickups(g, w, h, t) {
    const y = h * 0.45;
    Art.circle(g, w * 0.25, y, 18, "#fffaf0");
    g.strokeStyle = "#ff6b6b";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(w * 0.25, y, 18, 0, Art.TAU);
    g.moveTo(w * 0.25, y);
    g.lineTo(w * 0.25 + Math.cos(t * 3) * 12, y + Math.sin(t * 3) * 12);
    g.stroke();
    Art.drawSheep(g, w * 0.5, y, 14, "#ffcf4a");
    Art.drawGift(g, w * 0.75, y + 4, 14, t);
  }
})();
