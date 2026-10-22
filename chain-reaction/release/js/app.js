// ============================== APP ==============================
// The shell around the modes: Home, Play, setup, the game screen, pause, results, Daily.
// Other screens live in screens.js; sharing, Join the Flock and the PWA in share.js / pwa.js.
const App = (() => {
  const { h } = UI;
  // the nine modes, in their groups. file = js/modes/<file>.js
  const MODES = [
    { key: "stampede", file: "stampede", title: "Stampede+", group: "together", players: "1–4", icon: "bolt" },
    { key: "lostlamb", file: "lostlamb", title: "Lost Lamb", group: "together", players: "1–4", icon: "heart" },
    { key: "bridge", file: "bridge", title: "Bridge", group: "together", players: "2 or 4", icon: "bridge" },
    { key: "flockfall", file: "flockfall", title: "Flock Fall", group: "together", players: "1–2", icon: "rocks" },
    { key: "wolf", file: "wolf", title: "Big Bad Wolf", group: "team", players: "1–4", icon: "wolf" },
    { key: "guard", file: "guard", title: "Guard the Fold", group: "team", players: "1–4", icon: "shield" },
    { key: "saga", file: "saga", title: "Sheep Saga", group: "solo", players: "1", icon: "star" },
    { key: "rush", file: "rush", title: "Sheep Rush", group: "solo", players: "1", icon: "timer" },
    { key: "leadhome", file: "leadhome", title: "Lead Him Home", group: "solo", players: "1–2", icon: "crook" },
  ];
  const BUILT = new Set(["stampede", "saga", "wolf", "rush", "lostlamb", "flockfall", "guard", "leadhome"]); // modes finished in this build
  const meta = (key) => MODES.find((m) => m.key === key);
  let hasKeyboard = false;
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4 && (navigator.deviceMemory || 4) <= 2;

  const palette = () => Art.PALETTES[Save.settings.palette] || Art.PALETTES.default;
  function musicFor(def) {
    const season = Dates.season();
    if (season === "christmas") return { song: "joyToTheWorld", style: "bright", bpm: 112 };
    if (season === "easter" && def?.key !== "saga") return { song: "sunriseGarden", style: "bright", bpm: 104 };
    return def?.music || { song: "jesusLovesMe", style: "bright", bpm: 120 };
  }
  function homeMusic() {
    const season = Dates.season();
    if (season === "christmas") Music.play("joyToTheWorld", "gentle", 96);
    else if (season === "easter") Music.play("sunriseGarden", "gentle", 88);
    else Music.play("jesusLovesMe", "gentle", 92);
    Music.setLayer(0);
  }

  // ---------- applying settings to the page ----------
  function applySettings() {
    const s = Save.settings;
    const root = document.documentElement;
    root.classList.toggle("reduced", !!s.reduced);
    root.classList.toggle("contrast", !!s.contrast);
    root.classList.toggle("bigtext", !!s.bigText);
    root.classList.toggle("fewflash", !!s.fewerFlashes);
    Sound.levels();
    Core.layout();
  }

  // ---------- HOME ----------
  let homeStop = null;
  const lamb = { mood: "happy", until: 0, jumpAt: -9, napAt: 0, lastTouch: 0 };
  Nav.define("home", {
    render(el) {
      const p = Save.profile;
      const v = Progress.verseOfDay();
      const season = Dates.season();
      const part = Dates.partOfDay();
      const last = p.lastMode && BUILT.has(p.lastMode) ? meta(p.lastMode) : null;
      const need = CONFIG.levelXp(p.level);
      const showFlock = CONFIG.flock.provider !== "none" && !p.flock.joined;
      el.innerHTML = `
        <div class="home-scene"><canvas id="home-cv"></canvas>
          <div class="home-top">
            <button class="chip" id="home-wool" aria-label="Wool">${Icons.get("wool")}<b>${fmtNum(p.wool)}</b></button>
            <button class="chip level" id="home-level" aria-label="Flock Level ${p.level}"><i class="ring" style="--p:${Math.round((p.xp / need) * 100)}"></i><b>${p.level}</b><span>${STRINGS.home.level}</span></button>
            <span class="spacer"></span>
            ${Pwa.canInstall() ? `<button class="ib" id="home-install" aria-label="${STRINGS.home.install}">${Icons.get("install")}</button>` : ""}
            ${showFlock ? `<button class="ib" id="home-flock" aria-label="${STRINGS.home.flock}">${Icons.get("mail")}</button>` : ""}
          </div>
          <div class="home-greet">${season === "christmas" ? "Merry Christmas!" : season === "easter" ? "He is risen!" : STRINGS.home.greet[part]}</div>
        </div>
        <div class="home-body">
          <h1 class="logo">${esc(CONFIG.appName)}</h1>
          <p class="tagline">${esc(STRINGS.tagline)}</p>
          ${Save.settings.verse ? `<figure class="verse-card tap" id="home-verse"><figcaption>${Icons.get("book")} ${STRINGS.home.verse}</figcaption><blockquote>${esc(v[1])}</blockquote><cite>${esc(v[0])} (KJV)</cite></figure>` : ""}
          <button class="btn primary huge" id="home-play">${Icons.get("play")}<span>${STRINGS.home.play}</span></button>
          <button class="btn quick" id="home-quick">${Icons.get("bolt")}<span>${last ? `${STRINGS.home.cont}: ${esc(last.title)}${Save.mode(last.key).progress.next ? ` · Level ${Save.mode(last.key).progress.next}` : ""}` : STRINGS.home.quick}</span></button>
          <div class="home-two">
            <button class="btn sky big" id="home-daily">${Icons.get("calendar")}<span>${STRINGS.home.daily}</span>${Progress.breadToday() ? "" : '<i class="dot"></i>'}</button>
            <button class="btn rose big" id="home-wardrobe">${Icons.get("shirt")}<span>${STRINGS.home.wardrobe}</span></button>
          </div>
          <div class="home-three">
            <button class="btn small" id="home-journal">${Icons.get("book")}<span>${STRINGS.home.journal}</span></button>
            <button class="btn small" id="home-stats">${Icons.get("chart")}<span>${STRINGS.home.stats}</span></button>
            <button class="btn small" id="home-settings">${Icons.get("gear")}<span>${STRINGS.home.settings}</span></button>
          </div>
          <p class="now-playing" id="now-playing"></p>
        </div>`;
      // the very first Play goes straight into First Steps
      $("home-play").onclick = () => (Save.profile.firstSteps || Save.profile.games ? Nav.go("play") : play("stampede"));
      $("home-quick").onclick = () => quickPlay();
      $("home-daily").onclick = () => Nav.go("daily");
      $("home-wardrobe").onclick = () => Nav.go("wardrobe");
      $("home-journal").onclick = () => Nav.go("journal");
      $("home-stats").onclick = () => Nav.go("stats");
      $("home-settings").onclick = () => Nav.go("settings");
      $("home-wool").onclick = () => Nav.go("wardrobe");
      $("home-level").onclick = () => Nav.go("stats");
      if ($("home-flock")) $("home-flock").onclick = () => Nav.go("flock");
      if ($("home-install")) $("home-install").onclick = () => Pwa.install();
      if ($("home-verse")) $("home-verse").onclick = () => Nav.go("journal");
      nowPlaying();
      const cv = $("home-cv");
      cv.addEventListener("pointerdown", (e) => tapLamb(e, cv));
      homeStop?.();
      const box = cv.parentElement.getBoundingClientRect();
      homeStop = UI.liveCanvas(cv, Math.round(box.width), Math.round(box.height), (g, t) => drawHome(g, Math.round(box.width), Math.round(box.height), t, part, season));
      lamb.lastTouch = performance.now();
    },
    onShow() {
      homeMusic();
      Pwa.idleChecks();
    },
    onHide() {
      homeStop?.();
      homeStop = null;
    },
  });
  function nowPlaying() {
    const n = $("now-playing");
    const song = Music.current;
    if (!n) return;
    n.innerHTML = song ? `${Icons.get("music")} ${STRINGS.home.nowPlaying}: <b>${esc(song.title)}</b>${song.hymn ? " (traditional hymn)" : ""}` : "";
  }
  Bus.on("music", nowPlaying);
  function tapLamb(e, cv) {
    Sound.unlock();
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    lamb.lastTouch = performance.now();
    if (Math.abs(x - 0.5) < 0.25) {
      lamb.jumpAt = performance.now() / 1000;
      lamb.mood = "joy";
      lamb.until = performance.now() + 1200;
      Sfx.bleat(1 + Math.random() * 0.2);
      buzz(10);
    }
  }
  function drawHome(g, w, hh, t, part, season) {
    Art.drawPasture(g, w, hh, { t, part, season, dpr: Math.min(2, devicePixelRatio || 1), reduced: Save.settings.reduced });
    const now = performance.now();
    const idle = now - lamb.lastTouch;
    let mood = now < lamb.until ? lamb.mood : "happy";
    // naps after a while alone (or at night), wakes up when touched
    if (idle > 25000 || (part === "night" && idle > 6000)) mood = "sleep";
    const s = Math.min(w * 0.42, hh * 0.62);
    const jt = t - lamb.jumpAt;
    const jump = jt < 0.6 && !Save.settings.reduced ? Math.sin((jt / 0.6) * Math.PI) * s * 0.25 : 0;
    const blink = mood === "happy" && t % 3.4 < 0.13;
    const x = w * 0.5;
    const y = hh * 0.8 - s * 0.32 - jump;
    Art.ellipse(g, x + s * 0.02, hh * 0.8 - s * 0.02, s * 0.36 * (1 - jump / s), s * 0.06, 0, "rgba(0,0,0,0.18)");
    Art.drawLamb(g, x, y, s, { t, mood, blink, look: Progress.look(), flip: false });
    if (season === "christmas" && part !== "day") Art.drawBethlehemStar(g, w * 0.74, hh * 0.16, Math.min(w, hh) * 0.035, t);
  }
  function quickPlay() {
    const key = Save.profile.lastMode && BUILT.has(Save.profile.lastMode) ? Save.profile.lastMode : "stampede";
    play(key);
  }

  // ---------- PLAY (mode list) ----------
  Nav.define("play", {
    render(el) {
      el.replaceChildren(UI.header(STRINGS.home.play));
      const body = h("div", { class: "page" });
      for (const [g, label, icon] of [["together", STRINGS.groups.together, "people"], ["team", STRINGS.groups.team, "shield"], ["solo", STRINGS.groups.solo, "user"]]) {
        body.append(h("h3", { class: "group", html: `${Icons.get(icon)} ${esc(label)}` }));
        const grid = h("div", { class: "cards" });
        for (const m of MODES.filter((x) => x.group === g)) grid.append(modeCard(m));
        if (g === "together") grid.append(partyCard());
        body.append(grid);
      }
      el.append(body);
    },
  });
  function bestLine(m) {
    const ms = Save.data.modes[m.key];
    if (!ms || !ms.stats.played) return "Not played yet";
    const r = ms.records;
    if (ms.progress.next) return `Level ${ms.progress.next} · ${(ms.progress.stars || []).reduce((a, b) => a + (b || 0), 0)} stars`;
    if (r.score) return `Best ${fmtNum(r.score)}`;
    return `Best chain ×${r.chain || 0} · ${ms.stats.wins} win${ms.stats.wins === 1 ? "" : "s"}`;
  }
  function modeCard(m) {
    const built = BUILT.has(m.key);
    const cv = h("canvas", { class: "card-art" });
    const card = h("div", { class: `mode-card${built ? "" : " soon"}` },
      cv,
      h("div", { class: "mc-text" }, h("b", {}, m.title), h("small", { html: `${Icons.get("people")} ${m.players}` }), h("small", { class: "best" }, built ? bestLine(m) : "Coming soon")),
      built ? h("button", { class: "mc-play", "aria-label": `Play ${m.title} now`, onclick: (e) => { e.stopPropagation(); play(m.key); }, html: Icons.get("play") }) : null);
    card.addEventListener("click", () => {
      if (!built) return UI.toast(`${m.title} arrives in a coming update`, { icon: "sparkle" });
      Sfx.tap();
      openSetup(m.key);
    });
    requestAnimationFrame(() => {
      const g = Art.sharp(cv, 96, 72);
      ModeArt.draw(g, m.key, 96, 72, 0);
    });
    return card;
  }
  function partyCard() {
    const cv = h("canvas", { class: "card-art" });
    const card = h("div", { class: "mode-card party soon" }, cv, h("div", { class: "mc-text" }, h("b", {}, STRINGS.party.name), h("small", {}, STRINGS.party.desc), h("small", { class: "best" }, "Coming soon")));
    card.addEventListener("click", () => UI.toast(`${STRINGS.party.name} arrives in a coming update`, { icon: "party" }));
    requestAnimationFrame(() => ModeArt.draw(Art.sharp(cv, 96, 72), "party", 96, 72, 0));
    return card;
  }

  // ---------- SETUP ----------
  function defaultSeat(k) {
    return { kind: k === 0 ? "human" : "ai", level: "auto", persona: Core.PERSONA_ORDER[(k + 2) % 3], color: k, name: "", assist: false, speed: 1, pen: 0, look: null };
  }
  function loadSetup(def) {
    const ms = Save.mode(def.key);
    const s = { ...(def.setupDefaults || {}), ...(ms.setup || {}) };
    s.seats = [0, 1, 2, 3].map((k) => ({ ...defaultSeat(k), ...(s.seats?.[k] && typeof s.seats[k] === "object" ? s.seats[k] : {}) }));
    return s;
  }
  function saveSetup(def, s) {
    Save.mode(def.key).setup = s;
    Save.save();
  }
  async function openSetup(key) {
    const def = await loadMode(key);
    if (def) def.open ? def.open() : Nav.go("setup", { key });
  }
  Nav.define("setup", {
    render(el, { key }) {
      const def = Modes.get(key);
      const s = loadSetup(def);
      el.replaceChildren(UI.header(def.title, { right: h("button", { class: "ib", "aria-label": "How to play", onclick: () => Nav.go("help", { key }), html: Icons.get("question") }) }));
      const page = h("div", { class: "page setup" });
      const hero = h("canvas", { class: "setup-art" });
      page.append(hero, h("p", { class: "how" }, def.how.join(" ")));
      const opts = h("div", { class: "opts" });
      page.append(opts);
      const render = () => {
        opts.replaceChildren();
        def.options?.(setupUI(def, s, opts, render), s);
      };
      render();
      page.append(h("div", { class: "setup-go" }, UI.btn(def.playLabel?.(s) ?? STRINGS.home.play, () => {
        saveSetup(def, s);
        play(key, s);
      }, "primary huge", "play")));
      el.append(page);
      requestAnimationFrame(() => {
        const w = Math.min(320, page.clientWidth - 32);
        const g = Art.sharp(hero, w, 110);
        ModeArt.draw(g, key, w, 110, 0, true);
      });
    },
  });
  // the controls a mode's options() uses
  function setupUI(def, s, box, rerender) {
    const changed = () => {
      saveSetup(def, s);
      rerender();
    };
    const add = (n) => (box.append(n), n);
    return {
      seg: (label, k, options, sub) => add(UI.row(label, UI.seg(options, s[k], (v) => { s[k] = v; changed(); }), sub)),
      stepper: (label, k, min, max, fmt) => add(UI.row(label, UI.stepper(s[k], min, max, (v) => { s[k] = v; saveSetup(def, s); if (fmt?.rerender) rerender(); }, fmt))),
      toggle: (label, k, sub) => add(UI.row(label, UI.toggle(!!s[k], (v) => { s[k] = v; changed(); }, label), sub)),
      note: (text) => add(h("p", { class: "note" }, text)),
      section: (title) => add(h("h3", { class: "sub" }, title)),
      custom: (node) => add(node),
      seats: (count, o = {}) => add(seatsEditor(def, s, count, o, changed)),
    };
  }
  const LOOKS = [null, { hat: "hat-bow" }, { hat: "hat-cap" }, { hat: "hat-beanie" }, { glasses: "glasses-round" }, { hat: "hat-straw" }];
  function seatsEditor(def, s, count, o, changed) {
    const pal = palette();
    const box = h("div", { class: "seats" });
    for (let k = 0; k < count; k++) {
      const st = s.seats[k];
      const fixedKind = o.kinds?.[k];
      if (fixedKind) st.kind = fixedKind;
      const ai = st.kind === "ai";
      const sw = h("button", { class: "swatch", style: `--c:${pal.colors[st.color]}`, "aria-label": `Colour: ${pal.names[st.color]}`, html: symSvg(Art.SYMBOLS[st.color], pal.colors[st.color]) });
      sw.onclick = () => {
        // cycle colour, swapping with whoever had it
        const next = (st.color + 1) % 4;
        const other = s.seats.find((x, j) => j !== k && j < count && x.color === next);
        if (other) other.color = st.color;
        st.color = next;
        changed();
      };
      const nameText = ai ? `${Core.PERSONAS[st.persona].name}` : st.name || (k === 0 ? Save.profile.name : pal.names[st.color]);
      const name = h("button", { class: "seat-name", html: `<b>${esc(o.labels?.[k] ?? nameText)}</b>${ai ? `<small>${esc(Core.PERSONAS[st.persona].desc)}</small>` : !o.noKeys ? `<small>${App.hasKeyboard ? `Key ${Core.KEYS[k]}` : "Tap to rename"}</small>` : ""}` });
      if (!ai) name.onclick = () => renameSeat(k, st, changed);
      else name.onclick = () => {
        st.persona = Core.PERSONA_ORDER[(Core.PERSONA_ORDER.indexOf(st.persona) + 1) % 3];
        changed();
      };
      const top = h("div", { class: "seat-top" }, sw, name);
      if (!fixedKind) top.append(UI.seg([["human", "Human", "user"], ["ai", "AI", "sparkle"]], st.kind, (v) => { st.kind = v; changed(); }, "mini"));
      const row = h("div", { class: "seat" }, top);
      if (ai) {
        row.append(UI.seg([["easy", "Easy"], ["normal", "Normal"], ["hard", "Hard"], ["expert", "Expert"], ["auto", "Auto"]], st.level, (v) => { st.level = v; changed(); }, "mini levels"));
      } else {
        const more = h("div", { class: "seat-more", hidden: !st.open });
        more.append(UI.row("Cursor speed", UI.slider(st.speed, 0.6, 1.4, 0.05, (v) => { st.speed = v; def && saveSetup(def, s); }), "Slower is easier"));
        more.append(UI.row("Pen size", UI.stepper(st.pen || CONFIG.tune.pen, 3, 8, (v) => { st.pen = v; saveSetup(def, s); })));
        if (k !== 0) {
          const looks = h("div", { class: "looks" });
          LOOKS.forEach((lk, j) => {
            const c = h("canvas", { class: `look${JSON.stringify(st.look) === JSON.stringify(lk) ? " on" : ""}` });
            c.onclick = () => { st.look = lk; changed(); };
            looks.append(c);
            requestAnimationFrame(() => Art.drawLamb(Art.sharp(c, 44, 40), 22, 24, 34, { scarf: pal.colors[st.color], look: lk ? { ...lk } : null }));
            void j;
          });
          more.append(UI.row("Lamb look", looks));
        }
        row.append(h("div", { class: "seat-line" },
          h("label", { class: "assist" }, UI.toggle(st.assist, (v) => { st.assist = v; changed(); }, "Little Lamb"), h("span", { html: `<b>Little Lamb</b><small>Slower cursor, bigger pen</small>` })),
          h("button", { class: "ib more", "aria-label": "More options", onclick: () => { st.open = !st.open; changed(); }, html: Icons.get(st.open ? "minus" : "plus") })), more);
      }
      box.append(row);
    }
    return box;
  }
  function renameSeat(k, st, changed) {
    Nav.go("rename", { value: st.name || (k === 0 ? Save.profile.name : ""), done: (v) => {
      v = v.trim().slice(0, 12);
      if (k === 0 && v) Save.profile.name = v;
      st.name = v;
      changed();
    } });
  }
  const symSvg = (sym, color) => {
    const shape = { circle: '<circle cx="11" cy="11" r="8"/>', triangle: '<path d="M11 2 20 19H2Z"/>', square: '<rect x="3" y="3" width="16" height="16" rx="2"/>', diamond: '<path d="M11 1 21 11 11 21 1 11Z"/>' }[sym];
    return `<svg class="sym" viewBox="0 0 22 22" fill="${color}" stroke="rgba(0,0,0,.45)" stroke-width="2">${shape}</svg>`;
  };

  // ---------- loading and playing ----------
  async function loadMode(key) {
    const m = meta(key);
    try {
      return await Modes.load(key, m.file);
    } catch (e) {
      ErrorLog.add(e.message, "load " + key);
      UI.toast("Couldn't load that game. Check your connection and try again.", { icon: "info" });
      return null;
    }
  }
  const session = { key: null, wins: {}, games: 0 }; // the scoreboard for rematches
  let current = null; // { def, setup, opts }
  async function play(key, setup, o = {}) {
    const def = await loadMode(key);
    if (!def) return;
    setup ??= def.continueSetup?.() ?? loadSetup(def);
    Sound.unlock();
    if (session.key !== key) Object.assign(session, { key, wins: {}, games: 0 });
    Save.profile.lastMode = key;
    Save.save();
    const firstSteps = !Save.profile.firstSteps && key === "stampede" && !o.replay;
    if (firstSteps) setup = def.firstStepsSetup?.(setup) ?? setup;
    current = { def, setup, opts: o };
    const inGame = Nav.is("game") || Nav.is("results");
    Nav.go("game", { key }, { replace: inGame });
    Pwa.gameStarted();
    Core.start(def, setup, {
      firstSteps,
      seed: o.seed ?? def.seedFor?.(setup),
      onEnd: (sum) => finished(def, sum),
      onBetween: (info) => Nav.go("between", info),
    });
  }

  Nav.define("game", {
    render() {},
    onShow() {
      document.body.classList.add("in-game");
      Core.layout();
    },
    onHide() {
      document.body.classList.remove("in-game");
      // a finished game lets go of everything it used
      if (Core.phase === "over") Core.quit();
    },
    onBack() {
      if (Core.phase === "replay") {
        Core.quit();
        return false;
      }
      if (Core.phase === "play") {
        pauseGame();
        return true;
      }
      // a finished replay steps back to the results; a paused or between game stays put
      return Core.phase === "paused" || Core.phase === "between";
    },
    onCover() {},
  });
  function pauseGame() {
    if (Core.pause()) Nav.go("pause");
  }
  // pause when the app is hidden (not when focus moves elsewhere on the page)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && Core.phase === "play") pauseGame();
    if (!document.hidden) Pwa.wake(Core.phase === "play");
  });
  window.addEventListener("pagehide", () => {
    if (Core.phase === "play") pauseGame();
  });

  Nav.define("pause", {
    sheet: true,
    render(el) {
      const def = current?.def;
      el.innerHTML = `<div class="sheet-card"><h2>${STRINGS.pause.title}</h2>
        <button class="btn primary big" id="p-resume">${Icons.get("play")}<span>${STRINGS.pause.resume}</span></button>
        <button class="btn big" id="p-restart">${Icons.get("refresh")}<span>${STRINGS.pause.restart}</span></button>
        <div class="two"><button class="btn" id="p-help">${Icons.get("question")}<span>${STRINGS.pause.help}</span></button>
        <button class="btn" id="p-settings">${Icons.get("gear")}<span>${STRINGS.pause.settings}</span></button></div>
        <button class="btn ghost" id="p-home">${Icons.get("home")}<span>${STRINGS.pause.home}</span></button></div>`;
      $("p-resume").onclick = () => resumeGame();
      $("p-restart").onclick = () => {
        Nav.close("pause");
        play(def.key, current.setup);
      };
      $("p-help").onclick = () => Nav.go("help", { key: def.key });
      $("p-settings").onclick = () => Nav.go("settings", { fromGame: true });
      $("p-home").onclick = async () => {
        if (Save.settings.confirmQuit && !(await UI.confirm(STRINGS.pause.confirm, STRINGS.pause.yes, STRINGS.pause.no))) return;
        leaveGame();
      };
    },
    onBack() {
      resumeGame();
      return true;
    },
  });
  function resumeGame() {
    Nav.close("pause");
    Core.resume();
    applySettings();
  }
  function leaveGame() {
    Core.quit();
    Pwa.gameEnded();
    Nav.go("home", {}, { reset: true });
  }

  Nav.define("between", {
    sheet: true,
    render(el, info) {
      el.innerHTML = `<div class="sheet-card between"><h2 style="color:${info.color || "inherit"}">${esc(info.title)}</h2>
        <div class="series">${info.teams.map((t) => `<div class="team">${symSvg(t.sym, t.color)}<b style="color:${t.color}">${esc(t.name)}</b>${Array.from({ length: info.need }, (_, k) => `<i class="${k < t.wins ? "won" : ""}" style="--c:${t.color}"></i>`).join("")}</div>`).join("")}</div>
        <div class="bar-timer"><i></i></div><p class="note">Tap to start the next round</p></div>`;
      el.onclick = () => go();
      clearTimeout(betweenTimer);
      betweenTimer = setTimeout(go, 3400);
      function go() {
        clearTimeout(betweenTimer);
        if (!Nav.is("between")) return;
        Nav.close("between");
        Core.nextRound();
      }
    },
    onBack() {
      return true;
    },
  });
  let betweenTimer = 0;

  // ---------- RESULTS ----------
  function finished(def, sum) {
    Pwa.gameEnded();
    const extra = def.results?.(sum) || {};
    const rewards = Progress.gameOver(def, sum, extra);
    if (sum.firstSteps) {
      Save.profile.firstSteps = true;
      Save.save();
    }
    session.games++;
    if (sum.res.team >= 0) session.wins[sum.res.team] = (session.wins[sum.res.team] || 0) + 1;
    Nav.go("results", { def, sum, rewards, extra }, { replace: true });
  }

  Nav.define("results", {
    render(el, { def, sum, rewards, extra }) {
      const p = Save.profile;
      const won = sum.won || !sum.humans.length;
      const need = CONFIG.levelXp(p.level);
      el.innerHTML = `<div class="page results">
        <div class="res-hero"><canvas id="res-cv"></canvas></div>
        <h1 class="res-title" style="color:${sum.color && sum.humans.length !== 1 ? sum.color : "inherit"}">${esc(sum.title)}</h1>
        <p class="res-sub">${esc(sum.sub || "")}</p>
        ${extra.html || ""}
        ${sum.match ? `<div class="series small">${sum.match.teams.map((t) => `<div class="team"><b style="color:${t.color}">${esc(t.name)}</b>${Array.from({ length: sum.match.need }, (_, k) => `<i class="${k < t.wins ? "won" : ""}" style="--c:${t.color}"></i>`).join("")}</div>`).join("")}</div>` : ""}
        <div class="rewards">
          <div class="reward">${Icons.get("wool")}<b id="r-wool">0</b><span>${STRINGS.results.wool}</span></div>
          <div class="reward xp"><span>${STRINGS.home.level} ${p.level}</span><div class="xpbar"><i id="r-xp" style="width:0"></i></div><small>+<b id="r-xpn">0</b> ${STRINGS.results.xp}</small></div>
        </div>
        <div id="r-extras"></div>
        ${sum.awards.length ? `<h3 class="sub">${STRINGS.results.awards}</h3><div class="awards">${sum.awards.map((a) => `<div class="award"><b>${esc(STRINGS.awards[a.id][0])}</b><span style="color:${a.who.color}">${symSvg(a.who.sym, a.who.color)} ${esc(a.who.name)}</span><small>${esc(a.value)}</small></div>`).join("")}</div>` : ""}
        ${session.games > 1 && sum.players.length > 1 ? `<p class="session">Tonight: ${[...new Set(sum.players.map((q) => q.team))].map((t) => `<b style="color:${sum.players.find((q) => q.team === t).color}">${session.wins[t] || 0}</b>`).join(" – ")}</p>` : ""}
        ${sum.chainRec ? `<div class="com"><span>${Icons.get("film")} ${STRINGS.results.chainOfMatch}: <b>×${sum.chainRec.best.len}</b></span><button class="btn small" id="r-watch">${Icons.get("eye")}<span>${STRINGS.results.watch}</span></button><button class="btn small" id="r-clip">${Icons.get("download")}<span>${STRINGS.results.saveClip}</span></button></div>` : ""}
        <div id="r-flock"></div>
        <div class="res-buttons">
          <button class="btn primary huge" id="r-again">${Icons.get("refresh")}<span>${esc(extra.againLabel || def.againLabel?.(sum) || STRINGS.results.again)}</span></button>
          ${extra.next ? `<button class="btn sky big" id="r-next">${Icons.get("next")}<span>${STRINGS.results.next}</span></button>` : ""}
          <div class="two"><button class="btn" id="r-share">${Icons.get("share")}<span>${STRINGS.results.share}</span></button>
          <button class="btn" id="r-home">${Icons.get("home")}<span>${STRINGS.results.home}</span></button></div>
        </div></div>`;
      const cv = $("res-cv");
      const box = cv.parentElement.getBoundingClientRect();
      const W = Math.round(box.width) || 320;
      resultsStop?.();
      resultsStop = UI.liveCanvas(cv, W, 150, (g, t) => drawResultsScene(g, W, 150, t, won, sum, def));
      UI.countUp($("r-wool"), rewards.wool + (rewards.bread?.wool || 0) + rewards.badges.length * 25, 900, (pr) => {
        if (pr < 1 && Math.random() < 0.3) Sfx.coin(Math.floor(pr * 12));
      });
      UI.countUp($("r-xpn"), rewards.xp, 900);
      requestAnimationFrame(() => {
        $("r-xp").style.width = `${Math.round((p.xp / need) * 100)}%`;
      });
      const ex = $("r-extras");
      const extraRows = [];
      if (rewards.bread) extraRows.push(`<div class="pill gold">${Icons.get("bread")} ${STRINGS.daily.bread}: ${STRINGS.daily.streak(rewards.bread.streak)} <b>+${rewards.bread.wool}</b></div>`);
      for (const lv of rewards.levels) extraRows.push(`<div class="pill sky levelup">${Icons.get("star")} ${STRINGS.results.levelUp(lv.level)} ${lv.item ? `New: <b>${esc(Progress.BY_ID.get(lv.item).name)}</b>` : `<b>+${lv.wool}</b> wool`}</div>`);
      for (const k of rewards.newRecords) extraRows.push(`<div class="pill">${Icons.get("trophy")} ${STRINGS.results.newBest} ${esc(extra.recordNames?.[k] || (k === "chain" ? "Biggest chain" : k))}</div>`);
      for (const b of rewards.badges) extraRows.push(`<div class="pill badge-new">${Icons.get(b.icon)} Badge: <b>${esc(b.name)}</b> <small>+25</small></div>`);
      if (rewards.journal) extraRows.push(`<button class="pill jpill tap" id="r-journal">${Icons.get("book")} Journal card: <b>${esc(rewards.journal.ref)}</b></button>`);
      ex.innerHTML = extraRows.join("");
      if (rewards.levels.length) setTimeout(() => Sfx.levelUp(), 700);
      if ($("r-journal")) $("r-journal").onclick = () => Nav.go("card", { key: def.key });
      $("r-again").onclick = () => (extra.again ? extra.again() : play(def.key, current.setup));
      if ($("r-next")) $("r-next").onclick = () => extra.next();
      $("r-home").onclick = () => leaveGame();
      $("r-share").onclick = () => Share.result(def, sum, extra);
      if ($("r-watch")) $("r-watch").onclick = () => watchReplay(def, sum, false);
      if ($("r-clip")) $("r-clip").onclick = () => watchReplay(def, sum, true);
      extra.after?.();
      Flock.offer($("r-flock"), won || rewards.levels.length > 0);
      Pwa.afterGame();
    },
    onHide() {
      resultsStop?.();
      resultsStop = null;
    },
  });
  let resultsStop = null;
  function drawResultsScene(g, w, hh, t, won, sum, def) {
    const grd = g.createLinearGradient(0, 0, 0, hh);
    grd.addColorStop(0, won ? "#fff1c4" : "#e3ecf5");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, hh);
    if (def.drawResult?.(g, w, hh, t, won, sum)) return;
    if (won) {
      g.save();
      g.translate(w / 2, hh * 0.55);
      for (let k = 0; k < 12; k++) {
        g.rotate(Math.PI / 6);
        g.fillStyle = "rgba(255,207,74,0.18)";
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-14, -hh);
        g.lineTo(14, -hh);
        g.fill();
      }
      g.restore();
    }
    const jump = won && !Save.settings.reduced ? Math.abs(Math.sin(t * 5)) * 10 : 0;
    Art.drawLamb(g, w / 2, hh * 0.6 - jump, 110, { t, mood: won ? "joy" : "sad", tear: !won, look: Progress.look(), glow: won ? "rgba(255,220,120,0.5)" : undefined });
    if (won && !Save.settings.reduced) {
      for (let k = 0; k < 10; k++) {
        const x = ((k * 97 + t * 40 * (1 + (k % 3))) % (w + 20)) - 10;
        const y = ((k * 53 + t * 60) % hh);
        g.fillStyle = ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff", "#9b7bff"][k % 5];
        g.fillRect(x, y, 6, 3);
      }
    }
  }
  async function watchReplay(def, sum, record) {
    const rec = sum.chainRec;
    Nav.go("game", { key: def.key, replay: true });
    let recorder = null;
    if (record) recorder = Share.startClip(sum, def);
    await Core.replay(def, rec, rec.best.from, rec.best.to, recorder?.frame);
    if (recorder) await recorder.finish();
    if (Nav.is("game")) Nav.back();
  }

  // ---------- DAILY ----------
  Nav.define("daily", {
    render(el) {
      const b = Save.profile.bread;
      const v = Progress.verseOfDay();
      const done = Progress.breadToday();
      el.replaceChildren(UI.header(STRINGS.daily.title));
      const page = h("div", { class: "page" });
      page.append(h("div", { class: `daily-card bread${done ? " done" : ""}`, html: `
        <div class="dc-head">${Icons.get("bread")}<div><b>${STRINGS.daily.bread}</b><small>${done ? STRINGS.daily.claimed : STRINGS.daily.breadDesc}</small></div><span class="streak">${b.streak || 0}<small>day${b.streak === 1 ? "" : "s"}</small></span></div>
        <div class="week">${weekDots()}</div>
        <blockquote>${esc(v[1])}</blockquote><cite>${esc(v[0])} (KJV)</cite>` }));
      if (!done) page.append(UI.btn(STRINGS.home.quick, () => quickPlay(), "primary big", "play"));
      for (const [key, name, desc, icon] of [["rush", STRINGS.daily.rush, STRINGS.daily.rushDesc, "timer"], ["saga", STRINGS.daily.pasture, STRINGS.daily.pastureDesc, "leaf"]]) {
        const built = BUILT.has(key);
        const card = h("div", { class: `daily-card${built ? " tap" : " soon"}`, html: `<div class="dc-head">${Icons.get(icon)}<div><b>${name}</b><small>${!built ? STRINGS.daily.soon : Save.mode(key).progress.daily?.[Dates.today()] ? `Done today: ${fmtNum(Save.mode(key).progress.daily[Dates.today()])}. Play again any time!` : desc}</small></div>${built ? Icons.get("next") : Icons.get("lock")}</div>` });
        if (built) card.onclick = async () => {
          const def = await loadMode(key);
          if (def) def.daily ? def.daily() : play(key);
        };
        page.append(card);
      }
      el.append(page);
    },
  });
  function weekDots() {
    const b = Save.profile.bread;
    const out = [];
    for (let k = 6; k >= 0; k--) {
      const day = Dates.addDays(Dates.today(), -k);
      const on = b.last && Dates.daysBetween(day, b.last) >= 0 && Dates.daysBetween(day, b.last) < b.streak;
      const label = ["S", "M", "T", "W", "T", "F", "S"][new Date(day + "T12:00:00").getDay()];
      out.push(`<i class="${on ? "on" : ""}${k === 0 ? " today" : ""}"><b>${label}</b></i>`);
    }
    return out.join("");
  }

  // ---------- keyboard ----------
  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea")) return;
    const k = e.key.toUpperCase();
    if (!hasKeyboard && /^[A-Z ]$/.test(k)) hasKeyboard = true;
    if (e.key === "Escape") {
      e.preventDefault();
      if (Nav.is("game")) Nav.back();
      else Nav.back();
      return;
    }
    if (!Nav.is("game") || e.repeat) return;
    if (k === " ") {
      e.preventDefault();
      const s = Core.firstHumanSeat();
      if (s >= 0) Core.press(s);
      return;
    }
    const seat = Core.KEYS.indexOf(k);
    if (seat >= 0) {
      e.preventDefault();
      Core.press(seat);
    }
  });

  // ---------- crash ----------
  function crash(e) {
    const el = $("crash");
    el.hidden = false;
    el.querySelector("h2").textContent = STRINGS.crash.title;
    el.querySelector("p").textContent = STRINGS.crash.body;
    const g = Art.sharp(el.querySelector("canvas"), 160, 110);
    Art.drawLamb(g, 80, 62, 92, { mood: "shock" });
    $("crash-home").onclick = () => {
      el.hidden = true;
      Core.quit();
      Nav.go("home", {}, { reset: true });
    };
    $("crash-copy").onclick = () => navigator.clipboard?.writeText(ErrorLog.text()).then(() => UI.toast(STRINGS.backup.copied));
    void e;
  }

  // ---------- start-up ----------
  function boot() {
    Core.mount();
    applySettings();
    Nav.bindHistory();
    // the first tap anywhere wakes the sound
    document.addEventListener("pointerdown", () => Sound.unlock(), { capture: true });
    // no zoom, no long-press menus, no pull-to-refresh
    for (const ev of ["contextmenu", "gesturestart", "dblclick"]) document.addEventListener(ev, (e) => e.preventDefault());
    document.addEventListener("touchmove", (e) => {
      if (e.touches.length > 1 || (document.body.classList.contains("in-game") && !e.target.closest(".sheet, .screen:not(#scr-game)"))) e.preventDefault();
    }, { passive: false });
    Nav.go("home");
    $("boot").remove();
    Pwa.init();
    if (Save.profile.whatsNewSeen !== CONFIG.version) {
      if (Save.profile.games > 0) setTimeout(() => Nav.is("home") && Nav.go("whatsnew"), 600);
      else Save.profile.whatsNewSeen = CONFIG.version;
    }
    // the very first launch goes straight into First Steps after one tap
    if (!Save.profile.firstSteps && Save.profile.games === 0) $("home-play")?.classList.add("glow");
  }

  return {
    boot, play, openSetup, applySettings, palette, musicFor, homeMusic, crash, leaveGame, loadMode, quickPlay, MODES, BUILT, meta, symSvg, loadSetup, saveSetup,
    get hasKeyboard() { return hasKeyboard; }, get lowEnd() { return lowEnd; }, get current() { return current; },
  };
})();
