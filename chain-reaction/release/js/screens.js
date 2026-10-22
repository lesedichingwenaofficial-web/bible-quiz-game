// ============================== SCREENS ==============================
// Wardrobe, Journal, Stats, Settings, About and the smaller sheets.

// ---------- art for the mode cards, drawn with code ----------
const ModeArt = (() => {
  function grass(g, w, h, a = "#4f9a52", b = "#5aa75c") {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(0, 0, w, h, 12);
    g.fill();
  }
  const COL = ["#ff5a5f", "#3fa7ff", "#ffc93c", "#2fd38a"];
  function draw(g, key, w, h, t, hero) {
    g.save();
    const s = Math.min(w, h * 1.33);
    switch (key) {
      case "stampede": {
        grass(g, w, h);
        const c = Math.min(w / 6, h / 4);
        for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
          g.fillStyle = (r + k) % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
          g.fillRect(w / 2 - 3 * c + k * c, h / 2 - 2 * c + r * c, c, c);
        }
        [[0, 0, 0], [1, 0, 0], [2, 1, 1], [3, 1, 2], [4, 3, 3], [5, 3, 1], [1, 2, 0], [3, 2, 2]].forEach(([k, r, o]) => Art.drawSheep(g, w / 2 - 3 * c + (k + 0.5) * c, h / 2 - 2 * c + (r + 0.5) * c, c * 0.3, COL[o], { flip: k % 2 }));
        g.fillStyle = "#ffcf4a";
        g.beginPath();
        g.moveTo(w * 0.62, h * 0.12);
        g.lineTo(w * 0.5, h * 0.52);
        g.lineTo(w * 0.6, h * 0.5);
        g.lineTo(w * 0.52, h * 0.9);
        g.lineTo(w * 0.72, h * 0.42);
        g.lineTo(w * 0.62, h * 0.44);
        g.closePath();
        g.globalAlpha = 0.85;
        g.fill();
        break;
      }
      case "lostlamb": {
        grass(g, w, h, "#7cc3e8", "#9fd77f");
        const gr = g.createRadialGradient(w / 2, h * 0.55, 2, w / 2, h * 0.55, s * 0.4);
        gr.addColorStop(0, "rgba(255,230,140,0.9)");
        gr.addColorStop(1, "rgba(255,230,140,0)");
        Art.circle(g, w / 2, h * 0.55, s * 0.4, gr);
        Art.drawLamb(g, w / 2, h * 0.58, s * 0.42, { t, mood: "joy" });
        Art.drawSheep(g, w * 0.15, h * 0.8, s * 0.07, COL[0]);
        Art.drawSheep(g, w * 0.85, h * 0.8, s * 0.07, COL[1], { flip: true });
        break;
      }
      case "bridge": {
        grass(g, w, h, "#4a8fbf", "#5aa75c");
        g.fillStyle = "#ffcf4a";
        g.fillRect(w * 0.06, h * 0.52, w * 0.88, h * 0.12);
        g.fillStyle = "#7b6cf0";
        g.fillRect(w * 0.46, h * 0.06, w * 0.1, h * 0.88);
        Art.drawLamb(g, w * 0.26, h * 0.46, s * 0.3, { t, scarf: "#ffcf4a" });
        break;
      }
      case "flockfall": {
        grass(g, w, h, "#6b6f7a", "#4f9a52");
        g.fillStyle = "#8a8f99";
        g.fillRect(w * 0.48, 0, w * 0.04, h);
        for (const [x, y] of [[0.2, 0.2], [0.75, 0.35], [0.3, 0.55]]) Art.ellipse(g, w * x, h * y, s * 0.07, s * 0.06, 0, "#9599a3");
        for (let k = 0; k < 3; k++) Art.drawSheep(g, w * (0.15 + k * 0.12), h * 0.85, s * 0.06, COL[0]);
        for (let k = 0; k < 3; k++) Art.drawSheep(g, w * (0.6 + k * 0.12), h * 0.85, s * 0.06, COL[1], { flip: true });
        break;
      }
      case "wolf": {
        grass(g, w, h, "#5b4b8a", "#4f9a52");
        Art.drawWolf(g, w / 2, h * 0.52, s * 0.55, { t });
        for (let k = 0; k < 4; k++) Art.drawSheep(g, w * (0.12 + k * 0.25), h * 0.9, s * 0.05, COL[k], { flip: k > 1 });
        break;
      }
      case "guard": {
        grass(g, w, h, "#ffb38a", "#4f9a52");
        g.fillStyle = "#a8794e";
        for (let k = 0; k < 7; k++) g.fillRect(w * 0.1 + k * w * 0.13, h * 0.5, 4, h * 0.3);
        g.fillRect(w * 0.1, h * 0.56, w * 0.8, 3);
        g.fillRect(w * 0.1, h * 0.7, w * 0.8, 3);
        Art.drawLamb(g, w * 0.35, h * 0.62, s * 0.22, { t, mood: "sleep", zzz: false });
        Art.drawLamb(g, w * 0.6, h * 0.64, s * 0.2, { t, mood: "sleep", zzz: false, flip: true });
        Art.drawWolf(g, w * 0.88, h * 0.3, s * 0.2, { t });
        break;
      }
      case "saga": {
        grass(g, w, h, "#8cc96b", "#56a04d");
        g.strokeStyle = "#f6e6c4";
        g.lineWidth = 5;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(w * 0.08, h * 0.85);
        g.bezierCurveTo(w * 0.4, h * 0.9, w * 0.2, h * 0.3, w * 0.6, h * 0.4);
        g.quadraticCurveTo(w * 0.9, h * 0.45, w * 0.9, h * 0.12);
        g.stroke();
        for (const [x, y] of [[0.08, 0.85], [0.33, 0.6], [0.6, 0.4], [0.9, 0.12]]) {
          g.fillStyle = "#ffcf4a";
          g.beginPath();
          Art.starPath(g, w * x, h * y, s * 0.07, s * 0.03);
          g.fill();
        }
        Art.drawLamb(g, w * 0.6, h * 0.32, s * 0.2, { t });
        break;
      }
      case "rush": {
        grass(g, w, h, "#7cc6ff", "#6cb35a");
        g.strokeStyle = "rgba(255,255,255,0.7)";
        g.lineWidth = 3;
        for (let k = 0; k < 4; k++) {
          g.beginPath();
          g.moveTo(w * 0.08, h * (0.35 + k * 0.1));
          g.lineTo(w * 0.36, h * (0.35 + k * 0.1));
          g.stroke();
        }
        Art.drawLamb(g, w * 0.6, h * 0.58, s * 0.38, { t, mood: "joy" });
        break;
      }
      case "leadhome": {
        grass(g, w, h, "#ffd9a8", "#6cb35a");
        Art.drawShepherd(g, w * 0.78, h * 0.95, h * 0.85, { t, rays: false });
        Art.drawLamb(g, w * 0.3, h * 0.72, s * 0.28, { t, mood: "happy", flip: false });
        break;
      }
      case "party": {
        grass(g, w, h, "#9b7bff", "#ff8fc7");
        for (let k = 0; k < 4; k++) Art.drawLamb(g, w * (0.16 + k * 0.23), h * 0.66 - (k % 2) * 6, s * 0.2, { t, scarf: COL[k], mood: "joy" });
        for (let k = 0; k < 14; k++) {
          g.fillStyle = COL[k % 4];
          g.fillRect((k * 37) % w, (k * 23) % (h * 0.4), 5, 3);
        }
        break;
      }
    }
    g.restore();
    void hero;
  }
  return { draw };
})();

// ---------- the "?" cards: three swipeable, animated cards per mode ----------
Nav.define("help", {
  sheet: true,
  render(el, { key }) {
    const def = Modes.get(key);
    const cards = def.help || [];
    el.innerHTML = `<div class="sheet-card help"><h2>${esc(def.title)}</h2><div class="help-track" id="help-track"></div><div class="help-dots" id="help-dots"></div><button class="btn primary" id="help-done">${Icons.get("check")}<span>Got it</span></button></div>`;
    const track = $("help-track");
    const dots = $("help-dots");
    cards.forEach((c, k) => {
      const card = UI.h("div", { class: "help-card" }, UI.h("canvas"), UI.h("b", {}, c.title), UI.h("p", {}, c.text));
      track.append(card);
      dots.append(UI.h("i", { class: k === 0 ? "on" : "" }));
      requestAnimationFrame(() => UI.liveCanvas(card.querySelector("canvas"), 240, 150, (g, t) => c.draw(g, 240, 150, t)));
    });
    track.addEventListener("scroll", () => {
      const k = Math.round(track.scrollLeft / track.clientWidth);
      [...dots.children].forEach((d, j) => d.classList.toggle("on", j === k));
    }, { passive: true });
    $("help-done").onclick = () => Nav.back();
  },
});

// ---------- WARDROBE ----------
let wardrobeTab = "lamb";
let wardrobeSel = null;
Nav.define("wardrobe", {
  render(el) {
    const p = Save.profile;
    el.replaceChildren(UI.header(STRINGS.home.wardrobe, { right: UI.h("span", { class: "chip", html: `${Icons.get("wool")}<b id="wd-wool">${fmtNum(p.wool)}</b>` }) }));
    const page = UI.h("div", { class: "page wardrobe" });
    const prev = UI.h("canvas", { class: "wd-preview" });
    const action = UI.h("div", { class: "wd-action" });
    const tabs = UI.seg(Progress.TABS.map(([id, label, icon]) => [id, label, icon]), wardrobeTab, (v) => {
      wardrobeTab = v;
      wardrobeSel = null;
      Nav.refresh();
    }, "tabs");
    const grid = UI.h("div", { class: "items" });
    page.append(UI.h("div", { class: "wd-stage" }, prev, UI.h("button", { class: "ib photo", "aria-label": "Lamb Photo", onclick: () => Nav.go("photo"), html: Icons.get("camera") })), action, tabs, grid);
    el.append(page);
    const items = Progress.ITEMS.filter((it) => it.tab === wardrobeTab && Progress.forSale(it));
    const equippedId = (it) => p.equipped[it.slot];
    const sel = () => Progress.BY_ID.get(wardrobeSel) || items.find((it) => equippedId(it) === it.id) || items[0];
    for (const it of items) {
      const cv = UI.h("canvas");
      const own = Progress.owned(it.id);
      const tag = own ? (equippedId(it) === it.id ? Icons.get("check") : "") : it.level ? `${Icons.get("lock")}<small>Lv ${it.level}</small>` : it.gift ? Icons.get("lock") : `${Icons.get("wool")}<small>${it.price}</small>`;
      const b = UI.h("button", { class: `item${own ? " own" : ""}${equippedId(it) === it.id ? " on" : ""}${it.tier ? ` ${it.tier}` : ""}${sel() === it ? " sel" : ""}`, "aria-label": it.name, html: `<span class="tag">${tag}</span>` });
      b.prepend(cv);
      b.append(UI.h("span", { class: "nm" }, it.name));
      b.onclick = () => {
        wardrobeSel = it.id;
        if (own && equippedId(it) !== it.id) {
          Progress.equip(it.id);
          Sfx.unlock();
        }
        Nav.refresh();
      };
      grid.append(b);
      requestAnimationFrame(() => swatch(Art.sharp(cv, 64, 56), it, 64, 56));
    }
    // the big preview and the buy / equip button
    const it = sel();
    const own = Progress.owned(it.id);
    const can = p.wool >= it.price || Save.data.dev.wool;
    if (own) action.append(UI.h("p", { class: "wd-name", html: `<b>${esc(it.name)}</b> ${equippedId(it) === it.id ? `<span class="pill sky">${Icons.get("check")} Wearing</span>` : ""}` }));
    else if (it.level) action.append(UI.h("p", { class: "wd-name", html: `<b>${esc(it.name)}</b> <span class="pill">${Icons.get("lock")} A gift at Flock Level ${it.level}</span>` }));
    else if (it.gift) action.append(UI.h("p", { class: "wd-name", html: `<b>${esc(it.name)}</b> <span class="pill">${Icons.get("lock")} A gift for ${esc(it.gift)}</span>` }));
    else {
      action.append(UI.h("p", { class: "wd-name", html: `<b>${esc(it.name)}</b>${it.season ? ` <span class="pill gold">Seasonal</span>` : ""}` }));
      const b = UI.btn(can ? `Get it for ${it.price} wool` : `${it.price - p.wool} more wool to go`, () => {
        if (Progress.buy(it.id)) {
          Progress.equip(it.id);
          Sfx.unlock();
          buzz([10, 40, 20]);
          UI.toast(`${it.name} is yours! Rejoice!`, { icon: "sparkle" });
          Nav.refresh();
        }
      }, `primary${can ? "" : " disabled"}`, "wool");
      b.disabled = !can;
      action.append(b);
    }
    const W = Math.min(340, page.clientWidth || 340);
    UI.liveCanvas(prev, W, 170, (g, t) => preview(g, W, 170, t, it));
  },
});
// a small picture of each item
function swatch(g, it, w, h) {
  const look = Progress.look();
  const pal = App.palette();
  if (it.slot === "hat" || it.slot === "scarf" || it.slot === "bell" || it.slot === "glasses") {
    // close up on the head, where these are worn
    const lk = { ...look, hat: "hat-none", glasses: "glasses-none", bell: "bell-none", [it.slot]: it.id };
    if (it.slot !== "scarf") lk.scarf = "scarf-none";
    const s = h * 1.7;
    const hy = it.slot === "hat" ? h * 0.66 : it.slot === "glasses" ? h * 0.52 : h * 0.36;
    Art.drawLamb(g, w / 2 - 0.22 * s, hy + 0.2 * s, s, { look: lk, still: true });
  } else if (it.slot === "wool") {
    Art.drawLamb(g, w / 2, h * 0.6, h * 1.05, { look: { ...look, wool: it.id }, still: true });
  } else if (it.slot === "pattern") Art.drawSheep(g, w / 2, h / 2, h * 0.3, pal.colors[1], { pattern: it.id });
  else if (it.slot === "trail" || it.slot === "burst") {
    const cols = { "trail-sparkle": ["#fff6c8"], "trail-hearts": ["#ff8fb1"], "trail-stars": ["#ffe680"], "trail-petals": ["#ffc2d9"], "trail-rainbow": ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff"], "trail-fireflies": ["#fff27a", "#d7ff7a"], "burst-confetti": ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff"], "burst-flowers": ["#ff9ac1", "#fff"], "burst-stars": ["#ffe680"], "burst-hearts": ["#ff6f91"], "burst-gold": ["#ffcf4a", "#e0a82e"], "burst-puff": ["#ffffff", "#dfe6ee"] }[it.id] || ["#c9cfc6"];
    g.fillStyle = "#3d7a45";
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, 10);
    g.fill();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Art.TAU;
      const x = w / 2 + Math.cos(a) * h * 0.28;
      const y = h / 2 + Math.sin(a) * h * 0.28;
      g.fillStyle = cols[k % cols.length];
      g.beginPath();
      if (/heart/.test(it.id)) Art.heartPath(g, x, y, 4.5);
      else if (/star|gold|sparkle/.test(it.id)) Art.starPath(g, x, y, 6, 2.5);
      else g.arc(x, y, 3.5, 0, Art.TAU);
      g.fill();
    }
    if (it.id === "trail-none") {
      g.strokeStyle = "rgba(255,255,255,0.5)";
      g.lineWidth = 2;
      g.strokeRect(w / 2 - 10, h / 2 - 10, 20, 20);
    }
  } else if (it.slot === "arena") {
    const th = Core.ARENAS[it.id];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      g.fillStyle = (r + c) % 2 ? th.grass[0] : th.grass[1];
      g.fillRect(6 + c * ((w - 12) / 4), 6 + r * ((h - 12) / 3), (w - 12) / 4, (h - 12) / 3);
    }
    if (it.id === "arena-bethlehem") Art.drawBethlehemStar(g, w * 0.75, h * 0.3, 5, 0);
  }
}
function preview(g, w, h, t, it) {
  const look = Progress.look();
  const pal = App.palette();
  const lk = it.tab === "lamb" || it.slot === "wool" ? { ...look, [it.slot]: it.id } : look;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#d8efff");
  sky.addColorStop(1, "#fff8ec");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  Art.ellipse(g, w / 2, h * 0.92, w * 0.45, h * 0.1, 0, "#9fd77f");
  if (it.slot === "pattern") {
    for (let k = 0; k < 3; k++) Art.drawSheep(g, w / 2 + (k - 1) * 70, h * 0.6, 22, pal.colors[k], { pattern: it.id, flip: k === 2 });
    return;
  }
  if (it.slot === "arena") {
    const th = Core.ARENAS[it.id];
    const c = 26;
    for (let r = 0; r < 5; r++) for (let k = 0; k < 9; k++) {
      g.fillStyle = (r + k) % 2 ? th.grass[0] : th.grass[1];
      g.fillRect(w / 2 - 4.5 * c + k * c, 18 + r * c, c, c);
    }
    Art.drawSheep(g, w / 2 - c, 18 + 2.5 * c, 8, pal.colors[0]);
    Art.drawSheep(g, w / 2 + 2 * c, 18 + 1.5 * c, 8, pal.colors[1]);
    return;
  }
  Art.drawLamb(g, w / 2, h * 0.58, h * 0.78, { t, look: lk, mood: Math.sin(t * 0.7) > 0.85 ? "joy" : "happy", blink: t % 3 < 0.12 });
  if (it.slot === "trail" || it.slot === "burst") {
    const cols = { "trail-sparkle": "#fff6c8", "trail-hearts": "#ff8fb1", "trail-stars": "#ffe680", "trail-petals": "#ffc2d9", "trail-rainbow": "#9b7bff", "trail-fireflies": "#fff27a", "burst-confetti": "#3fa7ff", "burst-flowers": "#ff9ac1", "burst-stars": "#ffe680", "burst-hearts": "#ff6f91", "burst-gold": "#ffcf4a" }[it.id];
    if (!cols) return;
    for (let k = 0; k < 10; k++) {
      const a = t * 1.5 + (k / 10) * Art.TAU;
      const r = 70 + 10 * Math.sin(t * 3 + k);
      g.fillStyle = it.id === "trail-rainbow" ? ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff", "#9b7bff"][k % 5] : cols;
      g.beginPath();
      if (/heart/.test(it.id)) Art.heartPath(g, w / 2 + Math.cos(a) * r, h * 0.5 + Math.sin(a) * r * 0.45, 6);
      else Art.starPath(g, w / 2 + Math.cos(a) * r, h * 0.5 + Math.sin(a) * r * 0.45, 7, 3);
      g.fill();
    }
  }
}

// ---------- LAMB PHOTO ----------
Nav.define("photo", {
  sheet: true,
  render(el) {
    el.innerHTML = `<div class="sheet-card"><h2>Lamb Photo</h2><canvas id="photo-cv" class="photo-cv"></canvas>
      <div class="two"><button class="btn primary" id="photo-share">${Icons.get("share")}<span>Share</span></button>
      <button class="btn" id="photo-close">${Icons.get("close")}<span>Close</span></button></div></div>`;
    const cv = $("photo-cv");
    cv.width = cv.height = 1080;
    Share.drawPhoto(cv.getContext("2d"), 1080);
    $("photo-share").onclick = () => Share.canvas(cv, "my-lamb.png", `Meet my lamb in ${CONFIG.appName}! ${CONFIG.siteUrl}`);
    $("photo-close").onclick = () => Nav.back();
  },
});

// ---------- JOURNAL ----------
Nav.define("journal", {
  render(el) {
    const p = Save.profile;
    el.replaceChildren(UI.header(STRINGS.home.journal));
    const page = UI.h("div", { class: "page" });
    const got = Object.keys(p.journal).length;
    page.append(UI.h("p", { class: "note", html: `${Icons.get("book")} The Shepherd's Journal: <b>${got}</b> of ${Object.keys(Progress.JOURNAL).length} verse cards.${got ? "" : " " + STRINGS.empty.journal}` }));
    const grid = UI.h("div", { class: "journal" });
    for (const m of App.MODES) {
      const j = Progress.JOURNAL[m.key];
      const open = !!p.journal[m.key];
      const v = Progress.verse(j.ref);
      const card = UI.h("button", { class: `jcard${open ? " open" : ""}`, html: open ? `<small>${esc(m.title)}</small><b>${esc(j.ref)}</b><span>${esc(v[1].split(/[:;]/)[0])}…</span>` : `${Icons.get("lock")}<small>${esc(m.title)}</small><span>${esc(j.goal)}</span>` });
      card.onclick = () => (open ? Nav.go("card", { key: m.key }) : UI.toast(j.goal, { icon: "lock" }));
      grid.append(card);
    }
    page.append(grid);
    const v = Progress.verseOfDay();
    page.append(UI.h("figure", { class: "verse-card", html: `<figcaption>${Icons.get("sun")} ${STRINGS.home.verse}</figcaption><blockquote>${esc(v[1])}</blockquote><cite>${esc(v[0])} (KJV)</cite>` }));
    el.append(page);
  },
});
Nav.define("card", {
  sheet: true,
  render(el, { key }) {
    const j = Progress.JOURNAL[key];
    const v = Progress.verse(j.ref);
    el.innerHTML = `<div class="sheet-card vcard"><canvas id="card-cv"></canvas><blockquote>${esc(v[1])}</blockquote><cite>${esc(v[0])} (KJV)</cite>
      <div class="two"><button class="btn primary" id="card-share">${Icons.get("share")}<span>Share</span></button><button class="btn" id="card-close">${Icons.get("close")}<span>Close</span></button></div></div>`;
    UI.liveCanvas($("card-cv"), 260, 120, (g, t) => {
      Art.drawPasture(g, 260, 120, { t, part: "day", season: null, dpr: 2, reduced: Save.settings.reduced });
      if (key === "leadhome" || key === "wolf") Art.drawShepherd(g, 130, 118, 100, { t, carry: key === "leadhome", look: Progress.look() });
      else Art.drawLamb(g, 130, 84, 70, { t, look: Progress.look(), mood: "joy" });
    });
    $("card-share").onclick = () => Share.verseCard(v);
    $("card-close").onclick = () => Nav.back();
  },
});

// ---------- STATS ----------
Nav.define("stats", {
  render(el) {
    const p = Save.profile;
    el.replaceChildren(UI.header(STRINGS.home.stats));
    const page = UI.h("div", { class: "page" });
    if (!p.games) page.append(emptyState(STRINGS.empty.stats));
    const bestChain = Math.max(0, ...Object.values(Save.data.modes).map((m) => m.records.chain || 0));
    const tiles = [["Games", p.games, "flag"], ["Wins", p.wins, "trophy"], ["Flock Level", p.level, "star"], ["Best chain", `×${bestChain}`, "bolt"], ["Daily Bread best", p.bread.best, "bread"], ["Time in the pasture", `${Math.round(p.minutes)} min`, "timer"]];
    page.append(UI.h("div", { class: "tiles", html: tiles.map(([l, v, i]) => `<div class="tile">${Icons.get(i)}<b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("") }));
    const rows = App.MODES.filter((m) => Save.data.modes[m.key]?.stats.played);
    if (rows.length) {
      page.append(UI.h("h3", { class: "sub" }, "By game"));
      page.append(UI.h("div", { class: "table", html: rows.map((m) => {
        const ms = Save.data.modes[m.key];
        return `<div class="trow"><b>${esc(m.title)}</b><span>${ms.stats.played} played</span><span>${ms.stats.wins} won</span><span>${ms.records.score ? fmtNum(ms.records.score) : `×${ms.records.chain || 0}`}</span></div>`;
      }).join("") }));
    }
    page.append(UI.h("h3", { class: "sub" }, "Badges"));
    const all = new Map();
    for (const bd of Progress.GLOBAL_BADGES) all.set(bd.id, bd);
    for (const m of App.MODES) for (const bd of Modes.get(m.key)?.badges || []) all.set(`${m.key}.${bd.id}`, bd);
    for (const [id, b] of Object.entries(p.badges)) if (!all.has(id) && typeof b === "object") all.set(id, b);
    page.append(UI.h("div", { class: "badges", html: [...all].map(([id, bd]) => `<div class="badge${p.badges[id] ? " got" : ""}">${Icons.get(bd.icon)}<b>${esc(bd.name)}</b><small>${esc(bd.desc || "")}</small></div>`).join("") }));
    el.append(page);
  },
});
function emptyState(text) {
  const box = UI.h("div", { class: "empty" });
  const cv = UI.h("canvas");
  box.append(cv, UI.h("p", {}, text));
  requestAnimationFrame(() => Art.drawLamb(Art.sharp(cv, 140, 100), 70, 58, 80, { mood: "happy", look: Progress.look() }));
  return box;
}

// ---------- SETTINGS ----------
Nav.define("settings", {
  render(el) {
    const s = Save.settings;
    const set = (k, v, redraw = false) => {
      s[k] = v;
      Save.save();
      App.applySettings();
      if (redraw) Nav.refresh();
    };
    const { row, seg, toggle, slider, h } = UI;
    el.replaceChildren(UI.header(STRINGS.home.settings));
    const page = h("div", { class: "page settings" });
    const sec = (title, icon, ...rows) => page.append(h("section", { class: "set" }, h("h3", { class: "sub", html: `${Icons.get(icon)} ${esc(title)}` }), ...rows));
    sec("Sound", "volume",
      row("Master", slider(s.master, 0, 1, 0.05, (v) => set("master", v), () => Sfx.drop())),
      row("Music", slider(s.music, 0, 1, 0.05, (v) => set("music", v))),
      row("Effects", slider(s.sfx, 0, 1, 0.05, (v) => set("sfx", v), () => Sfx.drop())),
      row("Vibration", toggle(s.vibe, (v) => set("vibe", v), "Vibration")));
    sec("Controls", "tap",
      row("Pen display", seg([["dots", "Dots"], ["bar", "Bar"], ["row", "Row"], ["ring", "Ring"]], s.pen, (v) => set("pen", v)), "How many sheep you have left"),
      row("Tap zone", seg([["button", "Button"], ["corner", "Whole side"]], s.zone, (v) => set("zone", v))),
      row("Button size", seg([["S", "S"], ["M", "M"], ["L", "L"]], s.btnSize, (v) => set("btnSize", v))),
      row("Left-handed", toggle(s.leftHanded, (v) => set("leftHanded", v), "Left-handed"), "Solo button on the left"));
    sec("Gameplay", "sparkle",
      row("Hints", toggle(s.hints, (v) => set("hints", v), "Hints")),
      row("Verse of the Day", toggle(s.verse, (v) => set("verse", v), "Verse of the Day")),
      row("Screen shake", seg([["off", "Off"], ["low", "Low"], ["full", "Full"]], s.shake, (v) => set("shake", v))),
      row("Confirm before quitting", toggle(s.confirmQuit, (v) => set("confirmQuit", v), "Confirm before quitting")));
    const pal = h("div", { class: "palette-preview" });
    const drawPal = () => {
      const P = Art.PALETTES[s.palette];
      pal.innerHTML = P.colors.map((c, k) => `<span>${App.symSvg(Art.SYMBOLS[k], c)}<small>${P.names[k]}</small></span>`).join("");
    };
    drawPal();
    sec("Accessibility", "eye",
      row("Colours", seg([["default", "Standard"], ["deuter", "Red-green"], ["protan", "Red-weak"], ["tritan", "Blue-yellow"]], s.palette, (v) => { set("palette", v); drawPal(); }), "Every flock also has its own shape"),
      pal,
      row("High contrast", toggle(s.contrast, (v) => set("contrast", v), "High contrast")),
      row("Reduced motion", toggle(s.reduced, (v) => set("reduced", v), "Reduced motion")),
      row("Larger text", toggle(s.bigText, (v) => set("bigText", v), "Larger text")),
      row("Fewer flashes", toggle(s.fewerFlashes, (v) => set("fewerFlashes", v), "Fewer flashes")));
    sec("Performance", "bolt",
      row("Graphics", seg([["auto", "Auto"], ["high", "High"], ["low", "Low"]], s.quality, (v) => set("quality", v))),
      row("Battery saver", toggle(s.battery, (v) => set("battery", v), "Battery saver"), "Draws at 30 frames a second"));
    sec("Your data", "download",
      row("Backup code", UI.btn("Open", () => Nav.go("backup"), "small"), "Move your progress to another device"),
      row("Reset progress", UI.btn("Reset", resetProgress, "small danger")));
    sec("About", "info",
      row(`${CONFIG.appName} ${CONFIG.version}`, UI.btn("About", () => Nav.go("about"), "small")),
      row("Reset settings", UI.btn("Reset", async () => {
        if (await UI.confirm("Reset all settings?", "Reset", "Cancel")) {
          Save.resetSettings();
          App.applySettings();
          Nav.refresh();
        }
      }, "small")));
    el.append(page);
  },
});
async function resetProgress() {
  if (!(await UI.confirm(STRINGS.reset.sure, "Reset", "Cancel", { danger: true }))) return;
  if (!(await UI.confirm(STRINGS.reset.really, "Yes, reset", "Keep my progress", { danger: true }))) return;
  Save.resetProgress();
  UI.toast(STRINGS.reset.done);
  setTimeout(() => location.reload(), 600);
}

// ---------- BACKUP ----------
Nav.define("backup", {
  sheet: true,
  render(el) {
    el.innerHTML = `<div class="sheet-card"><h2>${STRINGS.backup.title}</h2>
      <p class="note">Keep this code somewhere safe. Paste it into the game on any device to bring your lamb along.</p>
      <textarea id="bk-code" readonly rows="4">…</textarea>
      <button class="btn primary" id="bk-copy">${Icons.get("check")}<span>${STRINGS.backup.copy}</span></button>
      <h3 class="sub">${STRINGS.backup.restore}</h3>
      <textarea id="bk-in" rows="3" placeholder="${STRINGS.backup.paste}"></textarea>
      <div class="two"><button class="btn" id="bk-restore">${Icons.get("refresh")}<span>${STRINGS.backup.restore}</span></button><button class="btn ghost" id="bk-close"><span>Close</span></button></div></div>`;
    Save.backupCode().then((c) => ($("bk-code").value = c));
    $("bk-copy").onclick = async () => {
      const t = $("bk-code");
      try {
        await navigator.clipboard.writeText(t.value);
      } catch {
        t.select();
        document.execCommand?.("copy");
      }
      UI.toast(STRINGS.backup.copied, { icon: "check" });
    };
    $("bk-restore").onclick = async () => {
      const code = $("bk-in").value;
      if (!(await UI.confirm("Replace your progress with this backup?", "Restore", "Cancel"))) return;
      if (await Save.restore(code)) {
        UI.toast(STRINGS.backup.ok, { icon: "check" });
        setTimeout(() => location.reload(), 700);
      } else UI.toast(STRINGS.backup.bad, { icon: "info" });
    };
    $("bk-close").onclick = () => Nav.back();
  },
});

// ---------- ABOUT ----------
let versionTaps = 0;
Nav.define("about", {
  render(el) {
    el.replaceChildren(UI.header("About"));
    const page = UI.h("div", { class: "page about" });
    const cv = UI.h("canvas");
    page.append(cv);
    page.innerHTML += `
      <h1 class="logo">${esc(CONFIG.appName)}</h1>
      <button class="version" id="ab-version">Version ${CONFIG.version}</button>
      <p class="dedication">${STRINGS.credits.map(esc).join("<br>")}</p>
      <div class="list">
        <button class="btn" id="ab-new">${Icons.get("sparkle")}<span>What's New</span></button>
        ${CONFIG.flock.provider !== "none" ? `<button class="btn" id="ab-flock">${Icons.get("mail")}<span>${STRINGS.flock.title}</span></button>` : ""}
        <a class="btn" href="${esc(CONFIG.social.url)}" target="_blank" rel="noopener">${Icons.get("heart")}<span>Follow ${esc(CONFIG.social.handle)}</span></a>
        <button class="btn" id="ab-privacy">${Icons.get("shield")}<span>Privacy</span></button>
        ${Pwa.canInstall() || Pwa.isIos() ? `<button class="btn" id="ab-install">${Icons.get("install")}<span>Install the game</span></button>` : ""}
      </div>
      <h3 class="sub">Credits</h3>
      <p class="credits">Game, art and music made with love by cheekyfoundlamb. Everything is drawn and played with code.<br>
      Hymn melodies (public domain): ${Object.values(Music.SONGS).filter((s) => s.hymn).map((s) => `${esc(s.title)} (${esc(s.by)})`).join("; ")}.<br>
      Original tunes: ${Object.values(Music.SONGS).filter((s) => !s.hymn).map((s) => esc(s.title)).join(", ")}.<br>
      Scripture quotations: King James Version (public domain).<br>
      Font: Fredoka by the Fredoka Project Authors (SIL Open Font License).</p>
      <h3 class="sub">Licences</h3>
      <details><summary>Chain Reaction engine (MIT)</summary><pre>${esc(LICENCES.engine)}</pre></details>
      <details><summary>Fredoka font (SIL OFL 1.1)</summary><pre>${esc(LICENCES.font)}</pre></details>`;
    el.append(page);
    requestAnimationFrame(() => Art.drawShepherd(Art.sharp(page.querySelector("canvas"), 160, 120), 80, 118, 104, { t: 1, carry: true, look: Progress.look() }));
    $("ab-version").onclick = () => {
      versionTaps++;
      if (versionTaps >= 7) {
        versionTaps = 0;
        Save.data.dev.on = true;
        Save.save();
        UI.toast("Developer mode on", { icon: "gear" });
        Nav.go("dev");
      }
    };
    $("ab-new").onclick = () => Nav.go("whatsnew");
    if ($("ab-flock")) $("ab-flock").onclick = () => Nav.go("flock");
    $("ab-privacy").onclick = () => Nav.go("privacy");
    if ($("ab-install")) $("ab-install").onclick = () => Pwa.install();
  },
});
Nav.define("privacy", {
  sheet: true,
  render(el) {
    const items = [...STRINGS.privacy];
    if (CONFIG.counter.enabled) items.splice(1, 0, STRINGS.privacyCounter);
    el.innerHTML = `<div class="sheet-card privacy"><h2>Privacy</h2>${items.map(([t, b]) => `<h3>${esc(t)}</h3><p>${esc(b).replace("{contact}", `<a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>`)}</p>`).join("")}
      <button class="btn primary" id="pv-close"><span>Close</span></button></div>`;
    $("pv-close").onclick = () => Nav.back();
  },
});
Nav.define("whatsnew", {
  sheet: true,
  render(el) {
    el.innerHTML = `<div class="sheet-card"><h2>What's New</h2>${STRINGS.whatsNew.map(([v, title, list]) => `<h3>${esc(title)} <small>${esc(v)}</small></h3><ul>${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`).join("")}
      <button class="btn primary" id="wn-close"><span>Hallelujah!</span></button></div>`;
    $("wn-close").onclick = () => Nav.back();
    Save.profile.whatsNewSeen = CONFIG.version;
    Save.save();
  },
});

// ---------- DEVELOPER MODE (tap the version 7 times) ----------
Nav.define("dev", {
  render(el) {
    const d = Save.data.dev;
    const set = (k, v) => {
      d[k] = v;
      Save.save();
      Nav.refresh();
    };
    el.replaceChildren(UI.header("Developer"));
    const page = UI.h("div", { class: "page settings" });
    const date = UI.h("input", { type: "date", value: d.date || Dates.key(new Date()) });
    date.onchange = () => set("date", date.value);
    page.append(
      UI.row("Unlock everything", UI.toggle(d.unlockAll, (v) => set("unlockAll", v), "Unlock everything")),
      UI.row("Unlimited wool", UI.toggle(d.wool, (v) => set("wool", v), "Unlimited wool")),
      UI.row("Pretend date", date, d.date ? "Set" : "Today"),
      UI.row("Clear date", UI.btn("Today", () => set("date", ""), "small")),
      UI.row("Season", UI.seg([["", "Auto"], ["none", "None"], ["christmas", "Christmas"], ["easter", "Easter"]], d.season, (v) => set("season", v))),
      UI.row("FPS meter", UI.toggle(d.fps, (v) => { set("fps", v); Pwa.fpsMeter(); }, "FPS meter")),
      UI.row("First Steps again", UI.btn("Reset", () => { Save.profile.firstSteps = false; Save.profile.tips = {}; Save.profile.hints = { validShown: 0, validLearned: false, pulseLearned: false }; Save.save(); UI.toast("Tutorials reset"); }, "small")),
      UI.row("Add 500 wool", UI.btn("+500", () => { Progress.addWool(500); UI.toast("+500 wool"); }, "small")),
      UI.row("Add a level", UI.btn("+1", () => { Progress.addXp(CONFIG.levelXp(Save.profile.level) - Save.profile.xp); UI.toast(`Level ${Save.profile.level}`); }, "small")),
      UI.h("h3", { class: "sub" }, "Error log (this device only)"),
      UI.h("pre", { class: "log" }, ErrorLog.text()),
      UI.h("div", { class: "two" }, UI.btn("Copy log", () => navigator.clipboard?.writeText(ErrorLog.text()).then(() => UI.toast(STRINGS.backup.copied)), ""), UI.btn("Clear log", () => { Save.data.errors.length = 0; Save.save(); Nav.refresh(); }, "")),
      UI.row("Developer mode", UI.btn("Turn off", () => { set("on", false); Nav.back(); }, "small danger")),
    );
    el.append(page);
  },
});

// ---------- small sheets ----------
Nav.define("confirm", {
  sheet: true,
  render(el, p) {
    el.innerHTML = `<div class="sheet-card"><h2>${esc(p.text)}</h2>${p.sub ? `<p>${esc(p.sub)}</p>` : ""}
      <button class="btn ${p.danger ? "danger" : "primary"} big" id="cf-yes"><span>${esc(p.yes)}</span></button>
      <button class="btn big" id="cf-no"><span>${esc(p.no)}</span></button></div>`;
    $("cf-yes").onclick = () => {
      Nav.close("confirm");
      p.done(true);
    };
    $("cf-no").onclick = () => {
      Nav.close("confirm");
      p.done(false);
    };
    p.answered = false;
  },
  onBack() {
    const p = Nav.top.params;
    Nav.close("confirm");
    p.done(false);
    return true;
  },
});
Nav.define("rename", {
  sheet: true,
  render(el, p) {
    el.innerHTML = `<div class="sheet-card"><h2>Name</h2><input id="rn-in" maxlength="12" autocomplete="off" value="${esc(p.value)}" autofocus>
      <button class="btn primary big" id="rn-ok">${Icons.get("check")}<span>Done</span></button></div>`;
    const ok = () => {
      p.done($("rn-in").value);
      Nav.back();
    };
    $("rn-ok").onclick = ok;
    $("rn-in").onkeydown = (e) => e.key === "Enter" && ok();
  },
});
Nav.define("installios", {
  sheet: true,
  render(el) {
    const steps = STRINGS.installIos;
    const pics = [Icons.get("share"), `<span class="plus-box">${Icons.get("plus")}</span>`, `<canvas id="ios-lamb"></canvas>`];
    el.innerHTML = `<div class="sheet-card"><h2>Put the lamb on your phone</h2><ol class="ios">${steps.map((s, k) => `<li><i>${pics[k]}</i><span>${esc(s)}</span></li>`).join("")}</ol>
      <button class="btn primary" id="ios-ok"><span>Got it</span></button></div>`;
    requestAnimationFrame(() => Art.drawLamb(Art.sharp($("ios-lamb"), 40, 40), 20, 24, 32, { look: Progress.look() }));
    $("ios-ok").onclick = () => Nav.back();
  },
});
