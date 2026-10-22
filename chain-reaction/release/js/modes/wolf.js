// ======================= BIG BAD WOLF =======================
// Team up against a cheeky boss. Bursts next to the wolf knock the bluster out of him; when it
// runs out he flees from the Shepherd's light. Nobody gets hurt: he just runs off over the hill.
(() => {
  const S = Core;
  const WOLF = {
    introMs: 2400, // the boss's card before play starts
    warnMs: 1000, // every attack flashes this long first
    howlMs: 3000, // cursors run backwards this long
    pupGrowMs: 3000, // pup dens gain a sheep this often
    pupScale: [1.7, 1.25, 1, 1], // ...this much slower with fewer flocks
    shadowLose: 0.7, // the shadow covering this share of the field loses
    hpScale: [0.6, 1, 1.6, 3.6], // bluster x this for 1, 2, 3, 4 flocks
    attackScale: [1.35, 1.1, 1, 1], // attacks come this much slower with fewer flocks
    diffs: { normal: { hp: 1, attack: 1 }, hard: { hp: 1.3, attack: 0.75 }, heroic: { hp: 1.6, attack: 0.6 } },
    help: { hp: 0.8, attack: 1.25 }, // the Shepherd's help after 2 losses in a row
    angryAttack: 0.6, // phase 2 attacks come this much sooner
    revealMs: 1200, // a hit shows the disguised wolf this long
    fleeMs: 2600, // the Shepherd's light and the wolf running off
    roundSecs: 140,
    rushSecs: 330,
    bosses: [
      { name: "Big Bad Wolf", icon: "wolf", hp: 60, attackSecs: 7, cells: [20, 21, 26, 27], color: "#8b8f9c", attacks: { swipe: 1, howl: 1, pups: 1, stomp: 1 } },
      { name: "Alpha of the Pack", icon: "crown", hp: 70, attackSecs: 6, cells: [20, 21, 26, 27], color: "#5f5874", attacks: { pups: 3, howl: 2, swipe: 1, stomp: 1 }, shield: true, pupsPerCall: [2, 3] },
      { name: "Wolf in Sheep's Clothing", icon: "sheep", hp: 40, attackSecs: 7, cells: [26], color: "#8b8f9c", attacks: { swipe: 1, stomp: 1, pups: 1 }, disguise: true, swapSecs: [5, 3] },
    ],
  };
  const SHADOW = "#3b2d52";
  const SHOUT = { swipe: "Swipe!", howl: "Howl!", pups: "Pups!", stomp: "Stomp!" };
  const ATTACK_ICON = { swipe: "minus", howl: "refresh", pups: "wolf", stomp: "sparkle" };
  const prog = () => {
    const p = Save.mode("wolf").progress;
    p.beatenList ??= [];
    p.hard ??= [];
    p.heroic ??= [];
    p.losses ??= 0;
    p.rush ??= false;
    return p;
  };
  const unlocked = () => (Save.data.dev.unlockAll ? 3 : Math.min(3, prog().beatenList.filter(Boolean).length + 1));
  const rushOpen = () => Save.data.dev.unlockAll || prog().beatenList.filter(Boolean).length >= 3;

  Modes.register({
    key: "wolf",
    title: "Big Bad Wolf",
    how: ["Burst next to the wolf to knock the bluster out of him.", "Watch for his flashing attacks and chase him off together!"],
    music: { song: "shepherdsMarch", style: "march", bpm: 126 },
    setupDefaults: { n: 1, boss: 1, diff: "normal" },
    solo: (s) => s.n === 1,
    tuneFor: (s) => ({ roundSecs: s.boss === "rush" ? WOLF.rushSecs : WOLF.roundSecs }),
    players(s) {
      const list = Array.from({ length: s.n }, (_, p) => ({ seat: p, team: 0 }));
      // the shadow: a flock with no cursor or button, made of the wolf's pups and their spread
      list.push({ seat: -1, kind: "none", team: 1, observer: true, color: SHADOW, name: "Shadow", placed: true, symIndex: 0 });
      return list;
    },
    options(ui, s) {
      if (s.boss !== "rush") s.boss = Math.min(s.boss || 1, unlocked());
      if (s.boss === "rush" && !rushOpen()) s.boss = 1;
      ui.seg("Flocks", "n", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], "Teammates can be people or AI");
      ui.seats(s.n);
      const bosses = WOLF.bosses.map((b, k) => [k + 1, k + 1 <= unlocked() ? b.name : `Boss ${k + 1} · locked`]).filter(([k]) => k <= unlocked());
      if (rushOpen()) bosses.push(["rush", "Boss Rush"]);
      ui.seg("Boss", "boss", bosses);
      if (unlocked() < 3) ui.note("Chase off this wolf to meet the next one.");
      ui.seg("Difficulty", "diff", [["normal", "Normal"], ["hard", "Hard"], ["heroic", "Heroic"]]);
      if (prog().losses >= 2) ui.note("The Shepherd will help this time: the wolf is less bold and slower to attack.");
    },
    playLabel: (s) => (s.boss === "rush" ? "Start the Boss Rush" : `Face the ${WOLF.bosses[(s.boss || 1) - 1].name}`),
    tips: [
      { id: "warn", on: "start", icon: "flag", text: "Red squares? Move away!" },
      { id: "shield", on: "start", icon: "shield", text: "Clear the pups to drop his shield", when: (G) => G.data.B.shield },
      { id: "disguise", on: "start", icon: "eye", text: "Watch for the wagging tail!", when: (G) => G.data.B.disguise },
    ],
    help: [
      { title: "Burst by the wolf", text: "Every burst that reaches him knocks some bluster out. Build up next to him, then set it off.", draw: (g, w, h, t) => helpBurst(g, w, h, t) },
      { title: "Red means move", text: "Squares flash red before he swipes or stomps. Sheep there are scattered.", draw: (g, w, h, t) => helpWarn(g, w, h, t) },
      { title: "Keep the shadow back", text: "His pups spread a shadow. If it covers most of the field, he wins this time.", draw: (g, w, h, t) => helpShadow(g, w, h, t) },
    ],
    badges: [
      { id: "b1", icon: "wolf", name: "Huff and puff", desc: "Chase off the Big Bad Wolf", test: (c) => c.won && c.G.data.beaten.includes(1) },
      { id: "b2", icon: "crown", name: "Pack scattered", desc: "Chase off the Alpha of the Pack", test: (c) => c.won && c.G.data.beaten.includes(2) },
      { id: "b3", icon: "eye", name: "Unmasked", desc: "Find the Wolf in Sheep's Clothing", test: (c) => c.won && c.G.data.beaten.includes(3) },
      { id: "rush", icon: "timer", name: "Boss Rush", desc: "Chase off all three in a row", test: (c) => c.won && c.setup.boss === "rush" },
      { id: "hard", icon: "shield", name: "Brave flock", desc: "Win on Hard", test: (c) => c.won && c.setup.diff === "hard" },
      { id: "heroic", icon: "star", name: "Heroic", desc: "Win on Heroic", test: (c) => c.won && c.setup.diff === "heroic" },
      { id: "solo", icon: "heart", name: "Lion-hearted lamb", desc: "Win alone", test: (c) => c.won && c.setup.n === 1 },
      { id: "fast", icon: "bolt", name: "Swift", desc: "Win in under a minute", test: (c) => c.won && c.boss !== "rush" && c.secs < 60 },
      { id: "clean", icon: "sparkle", name: "Steady hooves", desc: "Win without a lockout", test: (c) => c.won && c.humans.every((p) => p.wastes === 0) },
    ],
    results(sum) {
      const G = sum.G;
      const D = G.data;
      const p = prog();
      const out = { records: [], recordNames: {}, ctx: { boss: sum.setup.boss } };
      if (sum.won) {
        for (const k of D.beaten) {
          p.beatenList[k - 1] = true;
          if (D.diff === "hard") p.hard[k - 1] = true;
          if (D.diff === "heroic") p.heroic[k - 1] = true;
        }
        if (D.rush) p.rush = true;
        p.beaten = p.beatenList.filter(Boolean).length;
        p.losses = 0;
        const key = `time-${D.rush ? "rush" : D.bossNo}-${D.diff}`;
        out.records.push({ key, value: Math.round((D.wonAt - D.startAt) / 1000), higher: false });
        out.recordNames[key] = "time";
        out.wool = 10 + D.beaten.length * 8 + (D.diff === "hard" ? 10 : D.diff === "heroic" ? 20 : 0);
        const next = !D.rush && D.bossNo < 3 && unlocked() > D.bossNo;
        if (next) {
          out.next = () => {
            const s = { ...Save.mode("wolf").setup, boss: D.bossNo + 1 };
            Save.mode("wolf").setup = s;
            App.play("wolf", { ...App.loadSetup(Modes.get("wolf")), boss: D.bossNo + 1 });
          };
        }
      } else p.losses++;
      Save.save();
      // bursts on the wolf, per flock
      const live = G.players.filter((q) => !q.observer || q.seat >= 0);
      const top = Math.max(1, ...live.map((q) => q.damage || 0));
      out.html = `<div class="dmg">${live.filter((q) => q.seat >= 0).map((q) => `<div><span style="color:${q.color}">${esc(q.name)}</span><i style="width:${(100 * (q.damage || 0)) / top}%;background:${q.color}"></i><span>${q.damage || 0}</span></div>`).join("")}</div><p class="note">Bursts that reached the wolf</p>`;
      out.shareLine = sum.won ? `${D.rush ? "Boss Rush" : D.B.name} chased off!` : "";
      return out;
    },
    drawResult(g, w, h, t, won) {
      if (!won) return false;
      drawVictory(g, w, h, t);
      return true;
    },
    hooks: {
      setup(G, s) {
        const p = prog();
        const rush = s.boss === "rush";
        const flocks = G.players.length - 1;
        const D = (G.data = {
          rush, order: rush ? [1, 2, 3] : [Math.min(s.boss || 1, unlocked())], beaten: [], diff: s.diff || "normal", help: p.losses >= 2,
          flocks, attack: null, howlUntil: 0, pups: [], hitAt: 0, angry: false, won: 0, wonAt: 0, startAt: 0, fleeAt: 0, revealUntil: 0, shieldAt: 0,
        });
        G.shadow = G.players.length - 1;
        G.players[G.shadow].sym = null;
        for (const pl of G.players) pl.damage = 0;
        nextBoss(G, 0);
      },
      hud: (G) => hud(G),
      noElimination: true, // a wiped-out flock can always drop back in
      inPath: (G, i) => G.b.kind[i] !== "wolf",
      blocked: (G, i) => G.b.kind[i] === "wolf",
      land(G, b, from, to, who) {
        if (b.kind[to] !== "wolf") return false;
        if (who !== G.shadow) hurt(G, who);
        return true;
      },
      specialHit(G, k, who) {
        if (G.b.kind[k] !== "wolf") return false;
        if (who !== G.shadow) hurt(G, who);
        return true;
      },
      aiValue(G, pl, i) {
        const b = G.b;
        const D = G.data;
        const now = G.time;
        const seen = !D.B.disguise || now < D.revealUntil || tailOut(G, now);
        const near = Engine.neighbours(b, i);
        const bursts = b.count[i] + 1 >= Engine.capacity(b, i);
        let wolf = 0;
        let pups = 0;
        for (const k of near) {
          if (seen && b.kind[k] === "wolf") wolf++;
          if (b.owner[k] === G.shadow) pups++;
        }
        const warned = D.attack && D.attack.cells.includes(i) ? -6 : 0;
        // build up close to the wolf so chains end on him
        const r = Engine.rowOf(b, i);
        const c = Engine.colOf(b, i);
        const close = seen && D.cells.some((w) => Math.abs(Engine.rowOf(b, w) - r) + Math.abs(Engine.colOf(b, w) - c) <= 2);
        const ours = b.owner[i] === -1 || G.players[b.owner[i]]?.team === 0;
        // will this drop's cascade reach him? (simulated on a scratch board)
        let reach = 0;
        if (bursts && ours && seen) {
          const sc = G.scratch;
          for (let k = 0; k < b.size; k++) {
            sc.owner[k] = b.owner[k];
            sc.count[k] = b.count[k];
            sc.rock[k] = b.rock[k];
          }
          sc.owner[i] = pl.id;
          sc.count[i] = b.count[i] + 1;
          Engine.resolve(sc, {
            maxWaves: 30,
            canBurst: (bb, c) => bb.owner[c] >= 0 && G.players[bb.owner[c]]?.team === 0 && bb.kind?.[c] !== "wolf",
            targets: (bb, c) => {
              const t2 = Engine.neighbours(bb, c);
              for (const k of t2) if (b.kind[k] === "wolf") reach++;
              return t2.filter((k) => b.kind[k] !== "wolf");
            },
          }, false);
        }
        return wolf * (bursts ? 5 : 1) + pups * (bursts ? 2 : 0) + (close && ours ? 4 : 0) + warned + Math.min(12, reach * 3);
      },
      update(G, now) {
        const D = G.data;
        if (D.fleeAt) {
          // the wolf runs from the light; in the Boss Rush the next one comes over the hill
          if (now - D.fleeAt > WOLF.fleeMs && D.beaten.length < D.order.length) nextBoss(G, now);
          return;
        }
        if (now < G.holdUntil) return;
        if (now >= D.pupAt) {
          D.pupAt = now + WOLF.pupGrowMs * WOLF.pupScale[Math.min(4, D.flocks) - 1];
          D.pups = D.pups.filter((i) => G.b.owner[i] === G.shadow);
          for (const i of D.pups) G.b.count[i]++;
        }
        if (!D.attack && now >= D.nextAttack) warn(G, now);
        if (D.attack && now >= D.attack.at) strike(G, now);
        if (D.howlUntil && now >= D.howlUntil) {
          D.howlUntil = 0;
          for (const pl of G.players) pl.dir = 1;
        }
        if (D.B.disguise && now >= D.nextSwap) swap(G, now);
        if (!D.angry && D.hp <= D.max / 2) {
          // phase 2: a big grumble, faster attacks, the music builds
          D.angry = true;
          S.shout(null, "GRRR!", 1.9, "#ff6b6b");
          Sfx.grumble();
          S.shake(12);
          buzz([120, 60, 120]);
          if (!S.quiet) Music.setLayer(2);
          D.nextAttack = Math.min(D.nextAttack, now + 1500);
        }
        hud(G);
      },
      endCheck(G, now, left) {
        const D = G.data;
        if (D.won) return now - D.won < WOLF.fleeMs + 600 ? null : { team: 0, title: D.rush ? "The pack ran off!" : `${D.B.name} ran off!`, sub: D.rush ? "All three wolves chased away. Rejoice!" : D.bossNo < 3 ? "Another wolf is waiting." : "Every wolf has run from the light.", color: "#d9a12a" };
        if (D.fleeAt) return null;
        const field = G.b.size - D.cells.length;
        if (S.cellsOf(G.shadow) >= field * WOLF.shadowLose) return { team: 1, title: "The shadow spread", sub: "So close! The Shepherd will help next time.", sad: true };
        if (left <= 0) return { team: 1, title: "He's still blustering", sub: `${D.B.name} had ${D.hp} bluster left. One more go?`, sad: true };
        return null;
      },
      drawCell: (ctx, G, i) => G.b.kind[i] === "wolf",
      drawOver(ctx, G, c, t, now) {
        const D = G.data;
        const b = G.b;
        if (D.attack && D.attack.cells.length) {
          ctx.fillStyle = `rgba(255,60,60,${Save.settings.fewerFlashes ? 0.3 : 0.25 + 0.25 * Math.sin(t * 25)})`;
          for (const k of D.attack.cells) ctx.fillRect(Engine.colOf(b, k) * c, Engine.rowOf(b, k) * c, c, c);
        }
        for (const i of D.pups)
          if (b.owner[i] === G.shadow) {
            ctx.strokeStyle = "#b39ad1";
            ctx.lineWidth = 2;
            ctx.strokeRect(Engine.colOf(b, i) * c + 3, Engine.rowOf(b, i) * c + 3, c - 6, c - 6);
          }
        drawBoss(ctx, G, c, t, now);
        if (D.fleeAt) drawFlee(ctx, G, c, t, now);
        if (D.howlUntil) {
          ctx.fillStyle = `rgba(180,140,255,${0.12 + 0.08 * Math.sin(t * 12)})`;
          ctx.fillRect(0, 0, b.cols * c, b.rows * c);
        }
      },
    },
  });

  // ---------- the boss ----------
  function nextBoss(G, now) {
    const D = G.data;
    const b = G.b;
    const no = D.order[D.beaten.length];
    const B = WOLF.bosses[no - 1];
    for (let i = 0; i < b.size; i++) if (b.kind[i] === "wolf") b.kind[i] = null;
    const diff = WOLF.diffs[D.diff];
    const hp = Math.round(B.hp * WOLF.hpScale[Math.min(4, D.flocks) - 1] * diff.hp * (D.help ? WOLF.help.hp : 1));
    Object.assign(D, {
      bossNo: no, B, hp, max: hp, cells: [...B.cells], attack: null, angry: false, won: 0, fleeAt: 0, pups: D.pups || [], howlUntil: 0,
      nextAttack: now + WOLF.introMs + 4000, pupAt: now + WOLF.introMs + WOLF.pupGrowMs, tailAt: now + 2500, nextSwap: now + WOLF.introMs + (B.swapSecs?.[0] ?? 0) * 1000,
      attackMul: diff.attack * (D.help ? WOLF.help.attack : 1) * WOLF.attackScale[Math.min(4, D.flocks) - 1], last: "",
    });
    for (const i of D.cells) {
      b.kind[i] = "wolf";
      b.owner[i] = -1;
      b.count[i] = 0;
      b.tag[i] = null;
    }
    for (const pl of G.players) {
      pl.dir = 1;
      if (pl.seat >= 0) pl.observer = false;
    }
    if (G.tick > 0) S.rebuildPath();
    G.holdUntil = now + WOLF.introMs;
    if (!D.startAt) D.startAt = G.holdUntil;
    Music.setLayer(1);
    S.banner(`${introArt(B)}<small>${D.rush ? `Boss ${D.beaten.length + 1} of 3` : "Here comes"}</small><b>${esc(B.name)}</b><div class="attacks">${Object.keys(B.attacks).map((a) => Icons.get(ATTACK_ICON[a])).join("")}</div>${D.help ? `<small>${Icons.get("crook")} ${esc(STRINGS.helpOn)}</small>` : ""}`, WOLF.introMs, "intro");
    Sfx.howl();
  }
  // the intro card's silhouette, drawn to a data URL once per boss
  const silhouettes = {};
  function introArt(B) {
    if (!silhouettes[B.name]) {
      const cv = document.createElement("canvas");
      cv.width = 240;
      cv.height = 150;
      const g = cv.getContext("2d");
      g.scale(2, 2);
      g.fillStyle = "#2b2430";
      const sky = g.createLinearGradient(0, 0, 0, 75);
      sky.addColorStop(0, "#5b4b8a");
      sky.addColorStop(1, "#ffb38a");
      g.fillStyle = sky;
      g.beginPath();
      g.roundRect(0, 0, 120, 75, 12);
      g.fill();
      if (B.disguise) Art.drawSheep(g, 60, 44, 18, "#2b2430");
      else Art.drawWolf(g, 60, 44, 62, { color: "#2b2430" });
      if (B.disguise) {
        g.fillStyle = "#2b2430";
        g.beginPath();
        g.ellipse(84, 50, 10, 4, -0.6, 0, Art.TAU);
        g.fill();
      }
      silhouettes[B.name] = cv.toDataURL();
    }
    return `<img src="${silhouettes[B.name]}" width="120" height="75" alt="">`;
  }
  const shielded = (G) => G.data.B.shield && G.data.cells.some((w) => Engine.neighbours(G.b, w).some((k) => G.b.owner[k] === G.shadow));
  const tailOut = (G, now) => (now - G.data.tailAt) % 4200 < 700;

  function hurt(G, who) {
    const D = G.data;
    if (D.won || D.fleeAt) return;
    const now = G.time;
    if (shielded(G)) {
      // pups next to the Alpha shield him: clear them first
      if (now - D.shieldAt > 250) {
        D.shieldAt = now;
        Sfx.blip(1500, 0.06, "sine", 0.04, 900);
      }
      return;
    }
    D.hp--;
    D.hitAt = now;
    if (D.B.disguise) D.revealUntil = now + WOLF.revealMs;
    if (S.isPlayer(who)) G.players[who].damage = (G.players[who].damage || 0) + 1;
    Sfx.hit(4);
    for (const i of D.cells) S.puff(i, "#c7cad1", 1);
    if (D.hp > 0) return;
    // out of bluster: he flees from the Shepherd's light
    D.hp = 0;
    D.beaten.push(D.bossNo);
    D.fleeAt = now;
    D.attack = null;
    D.howlUntil = 0;
    for (const pl of G.players) {
      pl.dir = 1;
      if (pl.seat >= 0) S.mood(pl, "cheer", 3000);
    }
    for (const i of D.cells) G.b.kind[i] = null;
    S.rebuildPath();
    hud(G);
    S.shout(null, "Hallelujah!", 1.9, "#ffcf4a");
    Sfx.shepherd();
    buzz([80, 50, 160]);
    if (D.beaten.length >= D.order.length) {
      D.won = now;
      D.wonAt = now;
      for (const pl of G.players) pl.observer = true;
    }
  }

  function hud(G) {
    const D = G.data;
    const icon = D.attack ? ATTACK_ICON[D.attack.type] : shielded(G) ? "shield" : D.B.icon;
    const html = `<div class="wolfbar${D.angry ? " angry" : ""}">${Icons.get(icon)}<div class="meter"><i style="width:${(100 * Math.max(0, D.hp)) / D.max}%"></i><b>${esc(D.B.name)}${D.rush ? ` · ${D.beaten.length + (D.fleeAt ? 0 : 1)}/3` : ""}</b></div></div>`;
    S.setHud(html);
  }

  const teamIds = (G) => G.players.filter((p) => p.team === 0).map((p) => p.id);
  function around(b, i) {
    const out = [i];
    for (const [dr, dc] of Engine.ALL8) {
      const r = Engine.rowOf(b, i) + dr;
      const c = Engine.colOf(b, i) + dc;
      if (Engine.inside(b, r, c)) out.push(r * b.cols + c);
    }
    return out;
  }

  // Choose the attack and mark where it will land.
  function warn(G, now) {
    const D = G.data;
    const b = G.b;
    const bag = [];
    for (const [k, w] of Object.entries(D.B.attacks)) for (let n = 0; n < w; n++) bag.push(k);
    const type = G.rng.pick(bag);
    const ids = teamIds(G);
    const mine = (i) => ids.includes(b.owner[i]);
    let cells = [];
    if (type === "swipe") {
      let bestRow = 0;
      let most = -1;
      for (let r = 0; r < b.rows; r++) {
        let n = 0;
        for (let c = 0; c < b.cols; c++) if (mine(r * b.cols + c)) n += b.count[r * b.cols + c];
        if (n > most) [most, bestRow] = [n, r];
      }
      for (let c = 0; c < b.cols; c++) cells.push(bestRow * b.cols + c);
    } else if (type === "stomp") {
      let bestAt = 0;
      let most = -1;
      for (let i = 0; i < b.size; i++) {
        const n = around(b, i).reduce((s, k) => s + (mine(k) ? b.count[k] : 0), 0);
        if (n > most) [most, bestAt] = [n, i];
      }
      cells = around(b, bestAt);
    } else if (type === "pups") {
      const free = [];
      for (let i = 0; i < b.size; i++) if (b.owner[i] === -1 && !b.kind[i]) free.push(i);
      G.rng.shuffle(free);
      // the Alpha calls his pups to his side
      if (D.B.shield) {
        const nearWolf = (i) => D.cells.some((w) => Engine.neighbours(b, w).includes(i));
        free.sort((a, c) => nearWolf(c) - nearWolf(a));
      }
      cells = free.slice(0, Math.min(D.flocks, D.B.pupsPerCall ? D.B.pupsPerCall[D.angry ? 1 : 0] : 2));
    }
    cells = cells.filter((k) => b.kind[k] !== "wolf");
    D.attack = { type, at: now + WOLF.warnMs, cells };
    S.shout(null, SHOUT[type], 1.5, "#ff6b6b");
    Sfx.blip(110, 0.5, "triangle", 0.08, 70);
  }

  function strike(G, now) {
    const D = G.data;
    const b = G.b;
    const { type, cells } = D.attack;
    D.attack = null;
    D.nextAttack = now + D.B.attackSecs * 1000 * (D.angry ? WOLF.angryAttack : 1) * D.attackMul;
    if (type === "howl") {
      D.howlUntil = now + WOLF.howlMs;
      for (const pl of G.players) pl.dir = -1;
      Sfx.howl();
      return;
    }
    if (type === "pups") {
      for (const i of cells) {
        if (b.owner[i] !== -1) continue;
        b.owner[i] = G.shadow;
        b.count[i] = 2;
        D.pups.push(i);
        S.puff(i, SHADOW, 5);
      }
      Sfx.blip(300, 0.2, "triangle", 0.06, 500);
      return;
    }
    // swipe and stomp scatter the sheep there (they skip back to the meadow, nobody is hurt)
    for (const i of cells) {
      if (b.kind[i]) continue;
      b.owner[i] = -1;
      b.count[i] = 0;
      b.tag[i] = null;
      S.puff(i, "#ffffff", 2);
    }
    S.shake(type === "stomp" ? 12 : 7);
    buzz(type === "stomp" ? 90 : 50);
    Sfx.blip(90, 0.3, "triangle", 0.1, 40);
  }

  // The Wolf in Sheep's Clothing swaps places with a random square.
  function swap(G, now) {
    const D = G.data;
    const b = G.b;
    D.nextSwap = now + D.B.swapSecs[D.angry ? 1 : 0] * 1000;
    const from = D.cells[0];
    const options = [];
    for (let i = 0; i < b.size; i++) if (!b.kind[i] && !b.rock[i]) options.push(i);
    const to = G.rng.pick(options);
    b.owner[from] = b.owner[to];
    b.count[from] = b.count[to];
    b.tag[from] = b.tag[to];
    b.kind[from] = null;
    b.owner[to] = -1;
    b.count[to] = 0;
    b.tag[to] = null;
    b.kind[to] = "wolf";
    D.cells[0] = to;
    S.rebuildPath();
    Sfx.blip(600, 0.08, "sine", 0.04, 900);
  }

  // ---------- drawing ----------
  function bossSpot(G, c) {
    const D = G.data;
    const b = G.b;
    if (D.B.disguise) {
      const i = D.cells[0];
      return [(Engine.colOf(b, i) + 0.5) * c, (Engine.rowOf(b, i) + 0.5) * c];
    }
    let r0 = 99;
    let c0 = 99;
    for (const q of D.cells) {
      r0 = Math.min(r0, Engine.rowOf(b, q));
      c0 = Math.min(c0, Engine.colOf(b, q));
    }
    return [(c0 + 1) * c, (r0 + 1) * c + 0.22 * c];
  }
  function drawBoss(ctx, G, c, t, now) {
    const D = G.data;
    if (D.fleeAt) return;
    const hit = now - D.hitAt < 150;
    const [x, y] = bossSpot(G, c);
    if (D.B.disguise) {
      const seen = now < D.revealUntil;
      if (seen) Art.drawWolf(ctx, x, y + c * 0.08, c * 0.95, { t, color: hit ? "#ffffff" : undefined });
      else {
        // a sheep like any other... except for the tail
        Art.drawSheep(ctx, x - c * 0.12, y, c * 0.17, "#ececf2");
        Art.drawSheep(ctx, x + c * 0.14, y + c * 0.05, c * 0.17, "#ececf2", { flip: true });
        if (tailOut(G, now)) {
          ctx.fillStyle = "#6f7380";
          ctx.beginPath();
          ctx.ellipse(x + c * 0.36, y + c * 0.12, c * 0.12, c * 0.05, -0.6 + Math.sin(t * 14) * 0.3, 0, Art.TAU);
          ctx.fill();
        }
      }
      return;
    }
    const jitter = D.angry && !Save.settings.reduced ? Math.sin(t * 30) * 1.5 : 0;
    Art.drawWolf(ctx, x, y + jitter, c * 1.9, { t, color: hit ? "#ffffff" : D.angry ? "#a0707a" : D.B.color });
    if (D.B.shield) {
      // the Alpha's golden mane, and his shield while pups guard him
      ctx.fillStyle = "#ffcf4a";
      ctx.beginPath();
      for (let k = 0; k < 5; k++) ctx.lineTo(x - c * 0.4 + k * c * 0.2, y - c * (k % 2 ? 0.95 : 1.1));
      ctx.lineTo(x + c * 0.4, y - c * 0.85);
      ctx.lineTo(x - c * 0.4, y - c * 0.85);
      ctx.fill();
      if (shielded(G)) {
        ctx.strokeStyle = `rgba(140,200,255,${0.5 + 0.3 * Math.sin(t * 6)})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y - 0.22 * c, c * 1.05, 0, Art.TAU);
        ctx.stroke();
      }
    }
    if (D.angry) {
      ctx.strokeStyle = "#2a2530";
      ctx.lineWidth = c * 0.07;
      ctx.beginPath();
      ctx.moveTo(x - c * 0.42, y - c * 0.38);
      ctx.lineTo(x - c * 0.12, y - c * 0.26);
      ctx.moveTo(x + c * 0.42, y - c * 0.38);
      ctx.lineTo(x + c * 0.12, y - c * 0.26);
      ctx.stroke();
    }
  }
  // the Shepherd's light shines from the hill; the wolf runs off; the lambs leap for joy
  function drawFlee(ctx, G, c, t, now) {
    const D = G.data;
    const b = G.b;
    const W = b.cols * c;
    const H = b.rows * c;
    const p = Math.min(1, (now - D.fleeAt) / WOLF.fleeMs);
    const fade = Math.min(1, p * 3) * (p > 0.85 ? (1 - p) / 0.15 : 1);
    ctx.save();
    ctx.globalAlpha = fade * 0.55;
    const glow = ctx.createRadialGradient(W * 0.85, 0, 4, W * 0.85, 0, H * 0.9);
    glow.addColorStop(0, "rgba(255,236,170,1)");
    glow.addColorStop(1, "rgba(255,236,170,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    Art.drawShepherd(ctx, W * 0.84, H * 0.42, H * 0.38, { t });
    ctx.restore();
    // the wolf scampers off to the left, tail between his legs
    const [x0, y0] = bossSpot(G, c);
    const x = x0 - p * W * 1.1;
    if (x > -c * 2) Art.drawWolfRunning(ctx, x, y0 + Math.sin(p * 30) * c * 0.06, c * 1.4, t);
    for (let k = 0; k < 10; k++) {
      const px = ((k * 0.37 + p * 0.3) % 1) * W;
      const py = (0.15 + ((k * 0.61) % 0.75)) * H - Math.abs(Math.sin(t * 8 + k)) * c * 0.4;
      const pl = G.players[k % Math.max(1, G.players.length - 1)];
      Art.drawSheep(ctx, px, py, c * 0.16, pl.color, { flip: k % 2 === 1 });
    }
  }
  function drawVictory(g, w, h, t) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#ffe9b0");
    sky.addColorStop(1, "#fff8ec");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#9fd77f";
    g.beginPath();
    g.moveTo(0, h);
    g.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.6, h * 0.75);
    g.quadraticCurveTo(w * 0.85, h * 0.85, w, h * 0.7);
    g.lineTo(w, h);
    g.fill();
    Art.drawShepherd(g, w * 0.8, h * 0.92, h * 0.78, { t });
    const run = (t * 0.25) % 1.3;
    Art.drawWolfRunning(g, w * 0.3 - run * w * 0.5, h * 0.72, 46, t);
    const jump = Save.settings.reduced ? 0 : Math.abs(Math.sin(t * 5)) * 8;
    Art.drawLamb(g, w * 0.52, h * 0.66 - jump, 90, { t, mood: "joy", look: Progress.look() });
  }

  // ---------- the "?" card animations ----------
  function field(g, w, cols, rows, c) {
    const x0 = (w - cols * c) / 2;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      g.fillStyle = (r + k) % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0 + k * c, 8 + r * c, c, c);
    }
    return x0;
  }
  function helpBurst(g, w, h, t) {
    const c = 32;
    const x0 = field(g, w, 5, 4, c);
    Art.drawWolf(g, x0 + 3.5 * c, 8 + 2 * c, c * 1.6, { t });
    const p = (t % 2) / 2;
    Art.drawSheep(g, x0 + 0.5 * c + p * c * 1.5, 8 + 2 * c, 8, "#3fa7ff");
    Art.rrect(g, x0, 8 + 4 * c + 6, 5 * c, 10, 5, "rgba(0,0,0,0.15)");
    Art.rrect(g, x0, 8 + 4 * c + 6, 5 * c * (1 - (Math.floor(t / 2) % 5) * 0.15), 10, 5, "#ffcf4a");
  }
  function helpWarn(g, w, h, t) {
    const c = 32;
    const x0 = field(g, w, 5, 4, c);
    g.fillStyle = `rgba(255,60,60,${0.3 + 0.3 * Math.sin(t * 12)})`;
    g.fillRect(x0, 8 + c, 5 * c, c);
    Art.drawSheep(g, x0 + 1.5 * c, 8 + 1.5 * c, 8, "#ff5a5f");
    Art.drawSheep(g, x0 + 2.5 * c, 8 + 2.5 * c + Math.min(0, Math.sin(t * 2)) * c, 8, "#3fa7ff");
  }
  function helpShadow(g, w, h, t) {
    const c = 32;
    const x0 = field(g, w, 5, 4, c);
    const n = Math.floor((t * 2) % 12);
    for (let k = 0; k < n; k++) {
      g.fillStyle = "rgba(59,45,82,0.55)";
      g.fillRect(x0 + (k % 5) * c, 8 + Math.floor(k / 5) * c, c, c);
    }
    Art.drawWolf(g, x0 + 4.2 * c, 8 + 3.2 * c, c, { t });
  }
})();
