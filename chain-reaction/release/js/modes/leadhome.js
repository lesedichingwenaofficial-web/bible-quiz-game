// ======================= LEAD HIM HOME =======================
// The lost lamb walks only on your flock's squares. Build him a road home to the Shepherd,
// while wolves try to scare him back. Solo, or two shepherds together.
(() => {
  const S = Core;
  const LEAD = {
    stepMs: 1500, // the lamb takes a step this often (twice as long through mud)
    scaredSteps: 3, // a wolf burst on his square sends him back this many steps
    braveMs: 4000, // after a scare he can't be scared again for this long
    denMs: 3600, // wolf dens gain a sheep this often
    wolfRefill: 2.6, // seconds per sheep for a wolf's pen (they're pests, not a rival flock)
    endMs: 4200, // the Shepherd lifting him onto his shoulders
    hintAfter: 3, // fails before the Shepherd marks a path
    par: { base: 12, perStep: 2.3 }, // 3 stars under base + steps x perStep seconds; 2 stars under 1.6 x that
    wolfColor: "#8b8f9c",
  };
  const WORLDS = [
    { name: "Meadow Lane", secs: 120, sky: ["#8fd0ff", "#cdeec0"], theme: { grass: ["#3d7a45", "#46874e"], edge: "#24402c" }, music: { song: "greenPastures", style: "bright", bpm: 104 } },
    { name: "Muddy Hills", secs: 140, sky: ["#f2c98e", "#b9c48a"], theme: { grass: ["#6b7a45", "#76854d"], edge: "#3c4128" }, music: { song: "rockyRidge", style: "march", bpm: 108 } },
    { name: "Wolf Wood", secs: 150, sky: ["#3a4a6a", "#5f7a6a"], theme: { grass: ["#2f5a44", "#36634b"], edge: "#16282a" }, music: { song: "stillWaters", style: "gentle", bpm: 100 } },
  ];
  const PER_WORLD = 10;
  // . grass  R rock  B boulder  T thorns  M mud  D wolf den  S the lamb  H home
  // wolves: AI wolf levels; speed: their cursor speed; teach: the new idea this level brings
  const LEVELS = [
    { teach: "path", map: "...... ...... ...... ...... ...... ...H.. ...... ...... S....." },
    { map: ".....H ...... ...... ...... ...... ...... ...... ...... S....." },
    { teach: "rock", map: ".....H ...... ..R... ...... ...R.. ...... .R.... ...... S....." },
    { map: ".....H ...... RRRR.. ...... ...... ..RRRR ...... ...... S....." },
    { teach: "wolf", wolves: ["easy"], speed: 0.8, map: ".....H ...... ...... ...... ...... ...... ...... ...... S....." },
    { wolves: ["easy"], speed: 0.9, map: ".....H ...... ...R.. ...... .R..R. ...... ..R... ...... S....." },
    { teach: "thorn", map: ".....H ...... ...T.. ..T... ...T.. ..T... ...... ...... S....." },
    { wolves: ["easy"], speed: 0.9, map: ".....H ...... TTT.TT ...... ...... TT.TTT ...... ...... S....." },
    { wolves: ["normal"], speed: 1, map: ".....H ..R... ...T.. .T.R.. ..T... ...R.. ...... ...... S....." },
    { wolves: ["easy", "easy"], speed: 0.9, boss: true, map: "....RH ...... .RR... ...T.. ...... ..T.R. ...... .R.... S....." },
    { teach: "mud", map: ".....H ...... MMMM.. MMMM.. ...... ..MMMM ..MMMM ...... S....." },
    { wolves: ["easy"], speed: 1, map: ".....H ...MM. ...MM. .MM... .MM... ...MM. ...... MM.... S....." },
    { teach: "boulder", map: ".....H ...... BB.BBB ...... ...... BBB.BB ...... ...... S....." },
    { wolves: ["normal"], speed: 1, map: "....BH ....M. .BB.M. ..M... ..M.B. .B..M. ..MM.. ...... S....." },
    { wolves: ["normal"], speed: 1, secs: 170, map: ".....H RRRR.. ...... ..RRRR ...... RRRR.. ...... ..RRRR S....." },
    { teach: "flip", wolves: ["normal"], speed: 1.05, map: "S..... ...... ..T... ...T.. .T..T. ..T... ....T. ...... .....H" },
    { wolves: ["hard"], speed: 1, map: ".....H ...... T.TTTT ...... TTTT.T ...... T.TTTT ...... S....." },
    { wolves: ["normal", "easy"], speed: 1, map: ".....H .MMMM. .M..M. .M..M. .MMMM. ...... MMM.MM ...... S....." },
    { wolves: ["hard"], speed: 1.05, map: "...T.H ..B... .T..B. B..T.. ..B..T .T..B. B..T.. ...... S....." },
    { wolves: ["normal", "normal"], speed: 1.05, boss: true, secs: 180, map: ".....H RRRM.. ...... ..MRRR ...... RRRM.. ...... ..MRRR S....." },
    { teach: "den", map: ".....H ...... ...... ...D.. ...... ...... ...... ...... S....." },
    { wolves: ["easy"], speed: 1, map: ".....H ..R... ....D. ...... .D..R. ...... ..R... ...... S....." },
    { map: ".....H ...T.. .D.... ..T.T. ....D. .T.... ...... ...... S....." },
    { wolves: ["normal"], speed: 1.05, map: "....MH ..D.M. MM.... ...MM. .D.... ..MM.D ...... M..... S....." },
    { wolves: ["hard"], speed: 1.1, map: ".....H .T..T. ..TT.. ...... T.TT.T ...... ..TT.. .T..T. S....." },
    { wolves: ["easy"], speed: 1, secs: 170, map: "...D.H ....D. ...... ..R... ...... ...R.. ...... ...... S....." },
    { wolves: ["normal", "normal"], speed: 1.05, secs: 170, map: ".....H ..B... ...D.. .B..B. ...... ..D... .B..B. ...... S....." },
    { wolves: ["hard"], speed: 1.1, secs: 180, map: ".....H RRRR.. ...D.. ..RRRR ...... RRRR.. ..D... ..RRRR S....." },
    { wolves: ["hard", "hard"], speed: 1.1, map: ".....H ..T... .B..M. ...T.. .M..B. ..T... .B..M. ...... S....." },
    { wolves: ["easy", "normal", "hard"], speed: 1.1, boss: true, secs: 170, map: "..D..H ...T.. .B..D. ..M... D..B.. ..T..M .M..B. ...... S....." },
  ];
  const TEACH = {
    path: ["sheep", "Build a road to the Shepherd"],
    rock: ["rock", "Bursts crack rocks"],
    wolf: ["wolf", "Wolves scare him back!"],
    thorn: ["thorn", "Burst the thorns away"],
    mud: ["grass", "Mud slows him down"],
    boulder: ["rock", "Boulders need 4 cracks"],
    flip: ["flag", "Home is somewhere new"],
    den: ["wolf", "Dens grow wolf sheep"],
  };
  const worldOf = (n) => Math.min(2, Math.floor((n - 1) / PER_WORLD));
  const prog = () => {
    const p = Save.mode("leadhome").progress;
    p.stars ??= [];
    p.best ??= [];
    p.fails ??= [];
    p.ends ??= 0;
    return p;
  };
  const unlocked = () => (Save.data.dev.unlockAll ? LEVELS.length : Math.min(LEVELS.length, prog().stars.filter(Boolean).length + 1));
  const totalStars = () => prog().stars.reduce((a, x) => a + (x || 0), 0);
  const isOurs = (G, i) => S.isPlayer(G.b.owner[i]) && G.players[G.b.owner[i]].team === 0;

  // ---------- reading a level ----------
  function parse(L, cols = 6) {
    const rows = L.map.split(" ").map((r) => r.slice(0, cols));
    const cells = [];
    let start = 0;
    let home = 0;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const i = r * cols + c;
      cells[i] = ch;
      if (ch === "S") start = i;
      if (ch === "H") home = i;
    }));
    return { rows: rows.length, cols, cells, start, home };
  }
  // the cheapest walk home on a fresh board (thorns and mud cost more, rocks are walls)
  function walk(P) {
    const n = P.cells.length;
    const cost = (i) => (P.cells[i] === "T" ? 3 : P.cells[i] === "M" ? 2 : P.cells[i] === "R" || P.cells[i] === "B" ? Infinity : 1);
    const dist = new Array(n).fill(Infinity);
    const prev = new Array(n).fill(-1);
    const done = new Array(n).fill(false);
    dist[P.start] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === P.home) break;
      done[u] = true;
      const r = Math.floor(u / P.cols);
      const c = u % P.cols;
      for (const [dr, dc] of Engine.ORTHO) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= P.rows || nc >= P.cols) continue;
        const v = nr * P.cols + nc;
        const d = dist[u] + (v === P.home ? 1 : cost(v));
        if (d < dist[v]) {
          dist[v] = d;
          prev[v] = u;
        }
      }
    }
    const path = [];
    for (let v = prev[P.home]; v >= 0 && v !== P.start; v = prev[v]) path.unshift(v);
    return { path, steps: dist[P.home] };
  }
  const parFor = (n) => Math.round(LEAD.par.base + walk(parse(LEVELS[n - 1])).steps * LEAD.par.perStep);
  const starsFor = (n, secs) => (secs <= parFor(n) ? 3 : secs <= parFor(n) * 1.6 ? 2 : 1);

  // ---------- the world map ----------
  const MAPG = { gap: 84, top: 80, bottom: 70 };
  const nodeY = (k) => MAPG.top + (LEVELS.length - 1 - k) * MAPG.gap;
  const nodeX = (k, w) => w / 2 + Math.sin(k * 0.8 + 1) * w * 0.3;
  let mapSel = 1;
  let walkFrom = 0;
  let mates = "solo";
  const sec = document.createElement("section");
  sec.className = "screen saga-map lead-map";
  sec.id = "scr-leadmap";
  sec.hidden = true;
  document.body.append(sec);

  Nav.define("leadmap", {
    render(el, params) {
      const p = prog();
      const open = unlocked();
      mapSel = Math.min(open, params.sel ?? open);
      mates = Save.mode("leadhome").setup?.mates || "solo";
      el.innerHTML = "";
      el.append(UI.header("Lead Him Home", { right: UI.h("span", { class: "chip", html: `${Icons.get("star")}<b>${totalStars()}</b>` }) }));
      const scroll = UI.h("div", { class: "map-scroll" });
      const inner = UI.h("div", { class: "map-inner" });
      const cv = UI.h("canvas");
      const lambCv = UI.h("canvas", { class: "map-lamb" });
      inner.append(cv, lambCv);
      scroll.append(inner);
      const panelEl = UI.h("div", { class: "map-panel" });
      el.append(scroll, panelEl);
      const w = Math.min(460, el.clientWidth || 390);
      const h = MAPG.top + MAPG.bottom + (LEVELS.length - 1) * MAPG.gap;
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
          class: `node${L.boss ? " boss" : ""}${locked ? " locked" : stars ? " done" : ""}${n === mapSel ? " sel" : ""}`,
          "aria-label": `Level ${n}${locked ? ", locked" : ""}`,
          html: `${locked ? Icons.get("lock") : L.boss ? Icons.get("crook") : `<b>${n}</b>`}<span class="st">${locked ? "" : [0, 1, 2].map((s) => Icons.get(s < stars ? "star" : "starOutline")).join("")}</span>`,
        });
        btn.style.left = `${nodeX(k, w)}px`;
        btn.style.top = `${nodeY(k)}px`;
        btn.onclick = () => {
          if (locked) return UI.toast("Bring him home on the level before first", { icon: "lock" });
          mapSel = n;
          inner.querySelectorAll(".node.sel").forEach((e) => e.classList.remove("sel"));
          btn.classList.add("sel");
          placeLamb(n, false);
          renderPanel(panelEl);
        };
        inner.append(btn);
      });
      // the Shepherd waits at the very top of the map
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
      Music.play(m.song, "gentle", m.bpm - 16);
      Music.setLayer(0);
    },
  });

  function drawMap(g, w, h) {
    for (let wd = 0; wd < 3; wd++) {
      const yTop = wd === 2 ? 0 : nodeY(wd * PER_WORLD + PER_WORLD - 1) - MAPG.gap / 2;
      const yBot = wd === 0 ? h : nodeY(wd * PER_WORLD) + MAPG.gap / 2;
      const gr = g.createLinearGradient(0, yTop, 0, yBot);
      gr.addColorStop(0, WORLDS[wd].sky[0]);
      gr.addColorStop(1, WORLDS[wd].sky[1]);
      g.fillStyle = gr;
      g.fillRect(0, yTop, w, yBot - yTop);
      const r = RNG(wd + 11);
      for (let k = 0; k < 22; k++) {
        const tx = r() * w;
        const ty = yTop + r() * (yBot - yTop);
        if (wd === 0) Art.circle(g, tx, ty, 2.5, ["#ffffff", "#ffd84a", "#ff9ac1"][k % 3]);
        else if (wd === 1) Art.ellipse(g, tx, ty, 14, 7, 0, "rgba(110,80,45,0.22)");
        else {
          // little pines
          g.fillStyle = "rgba(20,40,32,0.45)";
          g.beginPath();
          g.moveTo(tx, ty - 16);
          g.lineTo(tx - 8, ty + 4);
          g.lineTo(tx + 8, ty + 4);
          g.fill();
        }
      }
    }
    g.strokeStyle = "#c8a46a";
    g.lineWidth = 14;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(w / 2, 22);
    for (let k = LEVELS.length - 1; k >= 0; k--) g.lineTo(nodeX(k, w), nodeY(k));
    g.stroke();
    g.setLineDash([6, 10]);
    g.strokeStyle = "#f3e2b8";
    g.lineWidth = 3;
    g.stroke();
    g.setLineDash([]);
    // home: the Shepherd's light at the top
    Art.drawShepherd(g, w / 2, 58, 52, { t: 0, rays: true });
  }

  function renderPanel(box) {
    const n = mapSel;
    const L = LEVELS[n - 1];
    const p = prog();
    const fails = p.fails[n - 1] || 0;
    const best = p.best[n - 1];
    const icons = [];
    if (L.teach && TEACH[L.teach]) icons.push(`<span class="obj new">${Icons.get(TEACH[L.teach][0])}<small>New</small></span>`);
    for (const lv of L.wolves || []) icons.push(`<span class="obj">${Icons.get("wolf")}<small>${esc(lv[0].toUpperCase() + lv.slice(1))}</small></span>`);
    icons.push(`<span class="obj">${Icons.get("timer")}<b>${fmtTime(L.secs ?? WORLDS[worldOf(n)].secs)}</b></span>`);
    box.innerHTML = `<h3>${L.boss ? `${Icons.get("crook")} ` : ""}Level ${n} <small>${WORLDS[worldOf(n)].name}</small></h3>
      <div class="goals">${icons.join("")}</div>
      <p class="note lh-par">${Icons.get("star")}${Icons.get("star")}${Icons.get("star")} home in ${parFor(n)}s${best ? ` · your best ${best}s` : ""}</p>
      <div class="seg lh-mates" role="radiogroup" aria-label="Shepherds">${[["solo", "Solo"], ["friend", "+ a friend"], ["ai", "+ AI helper"]].map(([k, t]) => `<button role="radio" aria-checked="${mates === k}" class="${mates === k ? "on" : ""}" data-k="${k}">${t}</button>`).join("")}</div>
      ${fails >= LEAD.hintAfter && !p.stars[n - 1] ? `<p class="pill">${Icons.get("crook")} The Shepherd has marked a path for you</p>` : ""}
      <button class="btn primary big" id="lh-play">${Icons.get("play")}<span>Play level ${n}</span></button>`;
    box.querySelectorAll(".lh-mates button").forEach((b) => {
      b.onclick = () => {
        mates = b.dataset.k;
        Sfx.tap?.();
        renderPanel(box);
      };
    });
    box.querySelector("#lh-play").onclick = () => playLevel(n);
  }

  function setupFor(n) {
    const def = Modes.get("leadhome");
    const s = App.loadSetup(def);
    const p = prog();
    Object.assign(s, { lvl: n, mates, hint: (p.fails[n - 1] || 0) >= LEAD.hintAfter && !p.stars[n - 1] });
    s.n = mates === "solo" ? 1 : 2;
    s.seats[1].kind = mates === "ai" ? "ai" : "human";
    return s;
  }
  function playLevel(n) {
    const s = setupFor(n);
    Save.mode("leadhome").setup = { lvl: n, mates };
    Save.save();
    App.play("leadhome", s);
  }

  // ---------- the mode ----------
  Modes.register({
    key: "leadhome",
    title: "Lead Him Home",
    how: ["The lost lamb walks only on your sheep. Build him a road to the Shepherd.", "Wolf bursts on his square scare him back. Bring him home before nightfall!"],
    get music() {
      return WORLDS[worldOf(S.setup?.lvl ?? 1)].music;
    },
    setupDefaults: { lvl: 1, n: 1, mates: "solo" },
    solo: (s) => (s.n ?? 1) === 1,
    open: () => Nav.go("leadmap", {}),
    continueSetup: () => {
      mates = Save.mode("leadhome").setup?.mates || "solo";
      return setupFor(unlocked());
    },
    continueLabel: () => `Level ${unlocked()}`,
    bestLine: () => `Level ${unlocked()} · ${totalStars()} stars`,
    theme: (s) => WORLDS[worldOf(s.lvl)].theme,
    tuneFor: (s) => ({ roundSecs: LEVELS[s.lvl - 1].secs ?? WORLDS[worldOf(s.lvl)].secs }),
    players(s) {
      const L = LEVELS[s.lvl - 1];
      const list = [{ seat: 0, team: 0 }];
      if ((s.n ?? 1) === 2) list.push({ seat: 1, team: 0 });
      (L.wolves || []).forEach((lv) => list.push({ seat: -1, kind: "ai", level: lv, persona: "sneaky", team: 1, speed: L.speed ?? 1, color: LEAD.wolfColor, name: "Wolf", sym: null }));
      // dens with no wolf of their own belong to a quiet one who never moves
      if (!L.wolves && L.map.includes("D")) list.push({ seat: -1, kind: "none", team: 1, observer: true, color: LEAD.wolfColor, name: "Wolf", placed: true, sym: null });
      return list;
    },
    tips: Object.entries(TEACH).map(([id, [icon, text]]) => ({ id, on: "start", icon, text, when: (G) => G.data.L.teach === id })),
    help: [
      { title: "Build his road", text: "He only steps onto your flock's squares, always towards the Shepherd. Lay sheep in front of him.", draw: (g, w, h, t) => helpRoad(g, w, h, t) },
      { title: "Wolves scare him", text: "A wolf burst on his square sends him three steps back. Keep wolf sheep away from him.", draw: (g, w, h, t) => helpScare(g, w, h, t) },
      { title: "Quick feet, more stars", text: "Bring him home fast for 3 stars. Thorns, rocks and mud stand in the way.", draw: (g, w, h, t) => helpStars(g, w, h, t) },
    ],
    badges: [
      { id: "first", icon: "crook", name: "Found!", desc: "Bring the lamb home", test: (c) => c.G.data.won },
      { id: "w1", icon: "leaf", name: "Down the lane", desc: "Finish Meadow Lane", test: (c) => c.G.data.won && c.setup.lvl === 10 },
      { id: "w2", icon: "rock", name: "Over the hills", desc: "Finish Muddy Hills", test: (c) => c.G.data.won && c.setup.lvl === 20 },
      { id: "w3", icon: "sun", name: "Every lamb home", desc: "Finish Wolf Wood", test: (c) => c.G.data.won && c.setup.lvl === 30 },
      { id: "brave", icon: "heart", name: "Not a scare", desc: "Win a wolf level without him being scared", test: (c) => c.G.data.won && c.G.data.L.wolves && c.G.data.scares === 0 },
      { id: "quick", icon: "bolt", name: "Straight home", desc: "3 stars on 10 levels", test: () => prog().stars.filter((x) => x === 3).length >= 10 },
      { id: "coop", icon: "people", name: "Two shepherds", desc: "Win a level together", test: (c) => c.G.data.won && c.setup.n === 2 },
    ],
    results(sum) {
      const G = sum.G;
      const D = G.data;
      const p = prog();
      const n = D.lvl;
      const k = n - 1;
      const won = !!D.won;
      const out = { records: [], recordNames: {}, ctx: {} };
      const secs = won ? Math.max(1, Math.round(D.secs)) : 0;
      const st = won ? starsFor(n, secs) : 0;
      if (won) {
        const first = !p.stars[k];
        p.stars[k] = Math.max(p.stars[k] || 0, st);
        p.best[k] = Math.min(p.best[k] || Infinity, secs);
        p.fails[k] = 0;
        p.ends++;
        p.cleared = p.stars.filter(Boolean).length;
        out.records.push({ key: `lvl${n}`, value: secs, higher: false });
        out.recordNames[`lvl${n}`] = `time on level ${n}`;
        out.wool = st * 4 + (LEVELS[k].boss ? 15 : 0) + (first ? 5 : 0);
      } else p.fails[k] = (p.fails[k] || 0) + 1;
      Save.mode("leadhome").setup = { lvl: won && n < LEVELS.length ? n + 1 : n, mates: sum.setup.mates || "solo" };
      Save.save();
      const fails = p.fails[k] || 0;
      out.html = `${won ? `<div class="stars">${[0, 1, 2].map((q) => Icons.get(q < st ? "star" : "starOutline")).join("")}</div><p class="score">${secs}s</p><p class="note">${st < 3 ? `3 stars: home in ${parFor(n)}s` : `${Icons.get("check")} Straight home!`}${D.scares ? ` · ${D.scares} ${D.scares === 1 ? "scare" : "scares"}` : ""}</p><p class="verse">“And when he hath found it, he layeth it on his shoulders, rejoicing.” <small>Luke 15:5</small></p>` : `${fails >= LEAD.hintAfter ? `<p class="pill">${Icons.get("crook")} Next time the Shepherd will mark a path</p>` : ""}`}`;
      if (won && n < LEVELS.length) {
        out.next = () => {
          walkFrom = n;
          Nav.go("leadmap", { sel: n + 1, walk: true }, { replace: true });
        };
        out.againLabel = "Replay";
      } else if (!won) out.againLabel = STRINGS.grace.retry;
      out.again = () => {
        mates = sum.setup.mates || "solo";
        App.play("leadhome", setupFor(n));
      };
      out.shareLine = won ? `Level ${n} home in ${secs}s ${"⭐".repeat(st)}` : "";
      return out;
    },
    drawResult(g, w, h, t, won, sum) {
      if (!won || !sum?.G?.data?.won) return false;
      drawEnding(g, w, h, t);
      return true;
    },
    hooks: {
      setup(G, s) {
        const n = s.lvl;
        const L = LEVELS[n - 1];
        const b = G.b;
        const P = parse(L, b.cols);
        const wolves = G.players.filter((q) => q.team === 1);
        const dens = [];
        for (let i = 0; i < b.size; i++) {
          const ch = P.cells[i];
          if (ch === "R" || ch === "B") {
            b.kind[i] = "rock";
            b.hp[i] = b.mhp[i] = ch === "B" ? 4 : 2;
          } else if (ch === "T") b.kind[i] = "thorn";
          else if (ch === "M") b.kind[i] = "mud";
          else if (ch === "H") b.kind[i] = "home";
          else if (ch === "D" && wolves.length) {
            b.owner[i] = wolves[dens.length % wolves.length].id;
            b.count[i] = 1;
            dens.push(i);
          }
        }
        b.owner[P.start] = 0;
        b.count[P.start] = 1;
        // AI wolves start with a small den in the middle
        G.players.filter((q) => q.team === 1 && q.kind === "ai").forEach((wf, k) => {
          const i = 4 * b.cols + 2 + k;
          if (!b.kind[i] && b.owner[i] < 0) {
            b.owner[i] = wf.id;
            b.count[i] = 1;
          }
        });
        G.data = {
          lvl: n, L, lamb: P.start, from: P.start, at: 0, trail: [P.start], home: P.home, dens, nextDen: LEAD.denMs,
          nextStep: LEAD.stepMs, stuck: false, scared: 0, scares: 0, braveUntil: 0, won: false, homeAt: 0, secs: 0, skip: false,
          hint: s.hint ? walk(P).path : [], seen: prog().ends > 0,
        };
        G.data.world = worldOf(n);
      },
      hud: (G) => hud(G),
      noElimination: true,
      refillMs: (G, pl) => (pl.team === 1 ? (LEAD.wolfRefill * 1000) / (G.data.L.speed ?? 1) : undefined),
      blocked: (G, i) => !!G.b.kind[i] && G.b.kind[i] !== "mud",
      // wolves keep a respectful distance: they never drop right next to him
      canDrop: (G, pl, i, def) => def(pl, i) && !(pl.team === 1 && Math.abs(Engine.rowOf(G.b, i) - Engine.rowOf(G.b, G.data.lamb)) + Math.abs(Engine.colOf(G.b, i) - Engine.colOf(G.b, G.data.lamb)) <= 1),
      inPath: (G, i) => !G.b.kind[i] || G.b.kind[i] === "mud",
      land(G, b, from, to, who) {
        const D = G.data;
        const kind = b.kind[to];
        if (kind === "home") return true;
        if (kind === "thorn") {
          b.kind[to] = null;
          if (!S.quiet) S.puff(to, "#7bd36b", 5);
          S.rebuildPath();
          return true;
        }
        if (to === D.lamb && G.players[who]?.team === 1) {
          // a wolf burst on his square scares him, but his square stays ours
          if (G.time > D.braveUntil && !D.won) D.scared = 1;
          return true;
        }
        return false;
      },
      specialHit(G, k) {
        const b = G.b;
        if (b.kind[k] === "home") return true;
        if (b.kind[k] === "thorn") {
          b.kind[k] = null;
          S.rebuildPath();
          return true;
        }
        return false;
      },
      afterWave(G, now) {
        const D = G.data;
        if (!D.scared || D.won) return;
        D.scared = 0;
        if (D.trail.length < 2) return; // nowhere to run back to: he just stands his ground
        D.scares++;
        D.braveUntil = now + LEAD.braveMs;
        // he runs back along his trail
        const back = Math.min(LEAD.scaredSteps, D.trail.length - 1);
        for (let k = 0; k < back; k++) D.trail.pop();
        move(G, D.trail[D.trail.length - 1], now);
        D.nextStep = now + LEAD.stepMs;
        for (const pl of G.players) if (pl.team === 0) S.mood(pl, "oops", 900);
        if (!S.quiet) {
          Sfx.bleat(1.5);
          S.shout(null, "Eek!", 1.2, "#ffffff");
          buzz(60);
        }
      },
      onAction(G, code) {
        if (code === 1 && G.data.won) G.data.skip = true;
      },
      aiValue(G, pl, i) {
        const b = G.b;
        const D = G.data;
        const d = (a, z) => Math.abs(Engine.rowOf(b, a) - Engine.rowOf(b, z)) + Math.abs(Engine.colOf(b, a) - Engine.colOf(b, z));
        const nearLamb = d(i, D.lamb);
        const ahead = d(i, D.home) < d(D.lamb, D.home);
        // wolves lurk on the road ahead of him, and now and then pounce on him
        if (pl.team === 1) return nearLamb === 1 ? 1.2 : ahead && nearLamb <= 3 ? 1.5 : 0;
        // shepherds build the road just ahead of him
        const onHint = D.hint.includes(i) ? 1 : 0;
        return nearLamb <= 2 && ahead ? 8 - nearLamb * 2 + onHint : ahead && nearLamb <= 4 ? 1.5 : 0;
      },
      update(G, now) {
        const D = G.data;
        if (D.won) {
          hud(G);
          return;
        }
        if (now < G.holdUntil) return;
        if (now >= D.nextStep) {
          D.nextStep = now + LEAD.stepMs * (G.b.kind[D.lamb] === "mud" ? 2 : 1);
          step(G, now);
        }
        if (D.dens.length && now >= D.nextDen) {
          D.nextDen = now + LEAD.denMs;
          for (const i of D.dens) if (G.b.owner[i] >= 0 && G.players[G.b.owner[i]].team === 1) {
            G.b.count[i]++;
            G.popAt[i] = now;
          }
        }
        hud(G);
      },
      endCheck(G, now, left) {
        const D = G.data;
        if (D.won) {
          if (!D.skip && now - D.homeAt < LEAD.endMs) return null;
          return { team: 0, title: "He's home!", sub: D.L.boss ? `${WORLDS[D.world].name} is behind you.` : "Rejoice with me; I have found my sheep!", color: "#d9a12a" };
        }
        if (left <= 0) return { team: 1, title: "Still lost…", sub: "Night fell before he got home. He's safe and snug; try again!", sad: true };
        return null;
      },
      drawCell(ctx, G, i, x, y, c) {
        const kind = G.b.kind[i];
        if (kind === "thorn") {
          ctx.strokeStyle = "#2c5a2a";
          ctx.lineWidth = c * 0.05;
          ctx.beginPath();
          for (let k = 0; k < 9; k++) {
            const a = (k / 9) * Math.PI * 2;
            ctx.moveTo(x + c / 2, y + c / 2);
            ctx.lineTo(x + c / 2 + Math.cos(a) * c * 0.38, y + c / 2 + Math.sin(a) * c * 0.38);
          }
          ctx.stroke();
          Art.circle(ctx, x + c / 2, y + c / 2, c * 0.2, "#3f7a35");
          return true;
        }
        if (kind === "mud") {
          Art.ellipse(ctx, x + c / 2, y + c / 2, c * 0.46, c * 0.4, 0, "rgba(110,78,45,0.55)");
          Art.circle(ctx, x + c * 0.3, y + c * 0.35, c * 0.06, "rgba(80,55,30,0.6)");
          Art.circle(ctx, x + c * 0.68, y + c * 0.62, c * 0.05, "rgba(80,55,30,0.6)");
          return false;
        }
        if (G.data.dens.includes(i) && G.b.owner[i] >= 0 && G.players[G.b.owner[i]].team === 1) {
          ctx.strokeStyle = "#b39ad1";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, c - 6, c - 6);
        }
        return kind === "home";
      },
      drawOver(ctx, G, c, t, now) {
        const D = G.data;
        const b = G.b;
        // the Shepherd's marked path, after a few tries
        if (D.hint.length && !D.won) {
          D.hint.forEach((k, n) => {
            const a = 0.45 + 0.25 * Math.sin(t * 3 - n * 0.5);
            Art.circle(ctx, (Engine.colOf(b, k) + 0.5) * c, (Engine.rowOf(b, k) + 0.5) * c, c * 0.13, `rgba(255,236,160,${a})`);
            Art.circle(ctx, (Engine.colOf(b, k) + 0.5) * c, (Engine.rowOf(b, k) + 0.5) * c, c * 0.07, `rgba(255,200,80,${a})`);
          });
        }
        // his trail
        for (const k of D.trail) Art.circle(ctx, (Engine.colOf(b, k) + 0.5) * c, (Engine.rowOf(b, k) + 0.85) * c, c * 0.05, "rgba(255,250,240,0.35)");
        // the Shepherd, glowing at home
        const hx = (Engine.colOf(b, D.home) + 0.5) * c;
        const hy = (Engine.rowOf(b, D.home) + 1) * c;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 2);
        Art.circle(ctx, hx, hy - c * 0.5, c * 0.9, "#ffe9a8");
        ctx.restore();
        if (D.won) {
          drawLift(ctx, G, c, t, now, hx, hy);
          return;
        }
        Art.drawShepherd(ctx, hx, hy, c * 1.1, { t, rays: false });
        // the lamb: hopping along, shivering when stuck
        const p = Math.min(1, (now - D.at) / 300);
        let x = (Engine.colOf(b, D.from) + (Engine.colOf(b, D.lamb) - Engine.colOf(b, D.from)) * p + 0.5) * c;
        const y = (Engine.rowOf(b, D.from) + (Engine.rowOf(b, D.lamb) - Engine.rowOf(b, D.from)) * p + 0.5) * c - Math.sin(Math.PI * p) * c * 0.3;
        if (D.stuck && !Save.settings.reduced) x += Math.sin(t * 50) * 1.5;
        const scared = now < D.braveUntil;
        Art.drawLamb(ctx, x, y - c * 0.06, c * 0.82, { t, look: G.players[0].look ?? Progress.look(), mood: scared ? "shock" : D.stuck ? "sad" : "happy", flip: Engine.colOf(b, D.lamb) < Engine.colOf(b, D.from) });
      },
    },
  });

  // ---------- the lamb ----------
  // Each step he moves onto a neighbouring square of ours: the one closest to home along our squares.
  function step(G, now) {
    const D = G.data;
    const b = G.b;
    const near = Engine.neighbours(b, D.lamb);
    if (near.includes(D.home)) {
      move(G, D.home, now);
      D.won = true;
      D.homeAt = now;
      D.secs = (now - G.t0) / 1000;
      for (const p of G.players) p.observer = true;
      for (const p of G.players) if (p.team === 0) S.mood(p, "cheer", 3000);
      if (!S.quiet) {
        S.shout(null, "Rejoice!", 1.8, "#ffcf4a");
        Sfx.shepherd();
        buzz([60, 40, 140]);
      }
      return;
    }
    const dist = distances(G);
    const options = near.filter((k) => isOurs(G, k) && b.kind[k] !== "thorn");
    D.stuck = !options.length;
    if (D.stuck) return;
    const prev = D.trail.length > 1 ? D.trail[D.trail.length - 2] : -1;
    const manhattan = (k) => Math.abs(Engine.rowOf(b, k) - Engine.rowOf(b, D.home)) + Math.abs(Engine.colOf(b, k) - Engine.colOf(b, D.home));
    options.sort((a, z) => dist[a] - dist[z] || manhattan(a) - manhattan(z) || (a === prev) - (z === prev) || a - z);
    const best = options[0];
    // with no road home yet he only steps if it brings him closer
    if (!Number.isFinite(dist[best]) && manhattan(best) >= manhattan(D.lamb)) {
      D.stuck = true;
      return;
    }
    if (best === prev) D.trail.pop();
    else D.trail.push(best);
    move(G, best, now);
  }
  // distance to home through our squares
  function distances(G) {
    const b = G.b;
    const D = G.data;
    const dist = new Array(b.size).fill(Infinity);
    dist[D.home] = 0;
    const queue = [D.home];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const k of Engine.neighbours(b, i)) {
        if (dist[k] !== Infinity || !isOurs(G, k)) continue;
        dist[k] = dist[i] + 1;
        queue.push(k);
      }
    }
    return dist;
  }
  function move(G, to, now) {
    const D = G.data;
    D.from = D.lamb;
    D.lamb = to;
    D.at = now;
    if (!S.quiet) Sfx.blip(520, 0.06, "triangle", 0.04, 700);
  }

  function hud(G) {
    const D = G.data;
    const b = G.b;
    if (D.won) {
      S.setHud(`<div class="lh-hud"><span>${Icons.get("crook")} Home!</span>${D.seen ? `<button class="gf-go" onclick="Core.act(1)" aria-label="Skip the ending">Skip</button>` : ""}</div>`);
      return;
    }
    const away = Math.abs(Engine.rowOf(b, D.lamb) - Engine.rowOf(b, D.home)) + Math.abs(Engine.colOf(b, D.lamb) - Engine.colOf(b, D.home));
    S.setHud(`<div class="lh-hud"><span>Level ${D.lvl}</span><span>${Icons.get("crook")} ${away} away</span>${D.stuck ? `<span class="lh-stuck">${Icons.get("sheep")} Needs a road</span>` : ""}</div>`);
  }

  // ---------- the ending: the Shepherd lifts him onto his shoulders ----------
  function drawLift(ctx, G, c, t, now, hx, hy) {
    const D = G.data;
    const b = G.b;
    const W = b.cols * c;
    const H = b.rows * c;
    const p = Math.min(1, (now - D.homeAt) / LEAD.endMs);
    // warm light spreads over the pasture, and the Shepherd steps forward to the middle
    ctx.save();
    ctx.globalAlpha = Math.min(1, p * 2.5) * 0.85;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#ffe2a8");
    gr.addColorStop(1, "#ffb98a");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const q = Math.min(1, p * 2.2);
    const sx = hx + (W / 2 - hx) * q;
    const sy = hy + (H * 0.82 - hy) * q;
    const sh = c * (1.1 + q * 3.2);
    const lift = Math.max(0, Math.min(1, (p - 0.4) / 0.3));
    const look = G.players[0].look ?? Progress.look();
    if (lift < 1) {
      // he hops into the Shepherd's arms...
      const lx = sx - sh * 0.35 * (1 - lift);
      const ly = sy - sh * (0.1 + 0.64 * lift) - Math.sin(Math.PI * lift) * sh * 0.15;
      Art.drawShepherd(ctx, sx, sy, sh, { t, rays: p > 0.3 });
      Art.drawLamb(ctx, lx, ly, sh * (0.3 + 0.04 * lift), { t, look, mood: "joy" });
    } else {
      // ...and rides home on his shoulders, rejoicing
      Art.drawShepherd(ctx, sx, sy, sh, { t, rays: true, carry: true, look });
      for (let k = 0; k < 6; k++) {
        const hp = ((t * 0.5 + k / 6) % 1);
        ctx.save();
        ctx.globalAlpha = 1 - hp;
        ctx.fillStyle = "#ff6b8a";
        ctx.beginPath();
        Art.heartPath(ctx, sx + Math.sin(k * 2.3) * sh * 0.4, sy - sh * (0.9 + hp * 0.5), c * 0.18);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  function drawEnding(g, w, h, t) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#ffd9a0");
    sky.addColorStop(1, "#fff3dc");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#9fd77f";
    g.beginPath();
    g.moveTo(0, h);
    g.quadraticCurveTo(w * 0.3, h * 0.66, w * 0.6, h * 0.78);
    g.quadraticCurveTo(w * 0.85, h * 0.86, w, h * 0.74);
    g.lineTo(w, h);
    g.fill();
    Art.drawShepherd(g, w * 0.5, h * 0.97, h * 0.68, { t, rays: true, carry: true, look: Progress.look() });
  }

  // ---------- the "?" card animations ----------
  function row(g, w, c, y) {
    const x0 = w / 2 - 2.5 * c;
    for (let k = 0; k < 5; k++) {
      g.fillStyle = k % 2 ? "#3d7a45" : "#46874e";
      g.fillRect(x0 + k * c, y, c, c);
    }
    return x0;
  }
  function helpRoad(g, w, h, t) {
    const c = 34;
    const x0 = row(g, w, c, 40);
    const n = Math.floor(t * 1.2) % 5;
    for (let k = 0; k <= n; k++) Art.drawSheep(g, x0 + k * c + c / 2, 40 + c / 2 + 6, 6, "#ff5a5f");
    Art.drawLamb(g, x0 + Math.max(0, n - 1) * c + c / 2, 40 + c / 2, 30, { t, mood: "happy" });
    Art.drawShepherd(g, x0 + 5 * c + 14, 40 + c, 44, { t, rays: false });
  }
  function helpScare(g, w, h, t) {
    const c = 34;
    const x0 = row(g, w, c, 40);
    const p = t % 2;
    Art.drawWolf(g, x0 + 4.5 * c, 40 + c * 0.55, c * 0.8, { t });
    Art.drawLamb(g, x0 + (p < 1 ? 3 : 3 - Math.min(1, p - 1) * 3) * c + c / 2, 40 + c / 2, 30, { t, mood: p > 1 ? "shock" : "happy" });
  }
  function helpStars(g, w, h, t) {
    const lit = Math.floor(t) % 4;
    for (let k = 0; k < 3; k++) {
      g.fillStyle = k < lit ? "#ffcf4a" : "rgba(43,58,47,0.2)";
      g.beginPath();
      Art.starPath(g, w / 2 - 30 + k * 30, h * 0.4, 13, 6);
      g.fill();
    }
    Art.drawLamb(g, w / 2, h * 0.78, 34, { t, mood: "joy" });
  }
})();
