// ============================== UI ==============================
// Icons (drawn as SVG, so they look the same on every phone), screen navigation with the
// back button, and the small controls every screen is built from.

const Icons = (() => {
  const P = {
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
    shirt: '<path d="M8.5 4l-4.5 3 2 4 2-1v10h8V10l2 1 2-4-4.5-3c-.5 1.5-2 2.5-3.5 2.5S9 5.5 8.5 4z"/>',
    book: '<path d="M4 5.5c3-1 5.5-1 8 .8 2.5-1.8 5-1.8 8-.8v13c-3-1-5.5-1-8 .8-2.5-1.8-5-1.8-8-.8z"/><path d="M12 6.3v13"/>',
    chart: '<path d="M5 20V11M10 20V5M15 20v-8M20 20v-4"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.5a2.8 2.8 0 1 1 3.8 2.6c-.8.3-1.1.9-1.1 1.7v.4"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
    share: '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M6 11H5v9h14v-9h-1"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    starOutline: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5c0 3 1.5 4.5 3 4.5M16 6h3c0 3-1.5 4.5-3 4.5M12 13v4M8.5 20h7M10 17h4"/>',
    crown: '<path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.2"/><circle cx="17" cy="16" r="2.2"/>',
    volume: '<path d="M5 10h3l4-4v12l-4-4H5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M5 10h3l4-4v12l-4-4H5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    mail: '<rect x="3.5" y="6" width="17" height="12.5" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    refresh: '<path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4.5V8h-3.5"/>',
    sparkle: '<path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" fill="currentColor"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor"/>',
    tap: '<path d="M9 11V5.5a1.6 1.6 0 0 1 3.2 0V11l4.4.8c1.2.3 2 1.4 1.8 2.6l-.8 5.6H10l-3.6-4.4a1.5 1.5 0 0 1 2.2-2l.4.4"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z"/>',
    wool: '<circle cx="12" cy="12" r="8"/><path d="M5.5 8.5c4 0 9 3 11 10M9 4.5c2 3 3 8 1.5 15M18.5 8c-4 1-8 5-10 11"/>',
    bread: '<path d="M5 11a7 4.5 0 0 1 14 0v1.5a1.5 1.5 0 0 1-1.5 1.5H17v5H7v-5h-.5A1.5 1.5 0 0 1 5 12.5z"/><path d="M10 9.5l1 2M13.5 9.5l1 2"/>',
    people: '<circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.2a4.5 4.5 0 0 1 5.5 4.8"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-6-4-6-1.5S10 9 12 9zM12 9c1.5-3.5 6-4 6-1.5S14 9 12 9z"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" fill="currentColor"/>',
    shield: '<path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z"/>',
    bridge: '<path d="M3 16h18M5 16v-3a7 7 0 0 1 14 0v3M9 16v-4.5M15 16v-4.5M12 16v-5"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9.5M9.5 3h5M18 6.5l1.3-1.3"/>',
    flag: '<path d="M5.5 21V4M5.5 4.5h11l-2.5 4 2.5 4h-11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M4.5 19.5l1-4L15.5 5.5l3 3-10 10z"/><path d="M13.5 7.5l3 3"/>',
    camera: '<rect x="3.5" y="7" width="17" height="12" rx="2.5"/><path d="M9 7l1.5-2.5h3L15 7"/><circle cx="12" cy="13" r="3.2"/>',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
    crook: '<path d="M9 21V8a4 4 0 0 1 8 0v1.5"/>',
    party: '<path d="M4 20l4-12 8 8z"/><path d="M14 4.5l.5 2M18.5 6l-1.5 1.5M19.5 10.5l-2 .5M11 3.5c.5 1.5 0 3-1 4"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    keyboard: '<rect x="2.5" y="6.5" width="19" height="11" rx="2.5"/><path d="M6 10h1M9.5 10h1M13 10h1M16.5 10h1M7.5 14h9"/>',
    install: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    rocks: '<path d="M3 19l3.5-7 3 3 2.5-5 3 4 2-2 4 7z"/>',
    wolf: '<path d="M5 4l3 5h8l3-5 1 9c0 4-3.5 7-8 7s-8-3-8-7z"/><circle cx="9.5" cy="12.5" r=".8" fill="currentColor"/><circle cx="14.5" cy="12.5" r=".8" fill="currentColor"/>',
    lamb: '<circle cx="9" cy="13" r="5.5"/><circle cx="16.5" cy="9.5" r="3.5"/><path d="M7 18.5v2M11 18.5v2"/>',
  };
  const get = (name, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.sparkle}</svg>`;
  return { get, has: (n) => !!P[n] };
})();

// ---------- screens and the back button ----------
const Nav = (() => {
  const screens = new Map(); // id -> { render(el, params), onBack?(), onShow?(), onHide?(), sheet? }
  const stack = [];
  let busy = false;

  function define(id, def) {
    screens.set(id, def);
  }
  function el(id) {
    return document.getElementById(`scr-${id}`);
  }
  function top() {
    return stack[stack.length - 1];
  }
  function show(entry, dir) {
    const def = screens.get(entry.id);
    const node = el(entry.id);
    node.hidden = false;
    def.render?.(node, entry.params || {});
    node.classList.remove("out", "in-back", "in-fwd");
    void node.offsetWidth;
    node.classList.add(dir === "back" ? "in-back" : "in-fwd");
    node.scrollTop = entry.scroll || 0;
    def.onShow?.(entry.params || {});
    const focus = node.querySelector("[autofocus]");
    if (focus) focus.focus({ preventScroll: true });
  }
  function hide(entry) {
    const def = screens.get(entry.id);
    const node = el(entry.id);
    entry.scroll = node.scrollTop;
    def.onHide?.();
    if (def.sheet) {
      node.hidden = true;
      return;
    }
    node.classList.add("out");
    setTimeout(() => {
      if (top()?.id !== entry.id && !stack.some((s) => s.id === entry.id && screens.get(s.id).sheet)) node.hidden = true;
    }, 180);
  }
  // go to a screen (a sheet opens on top of the current one)
  function go(id, params, o = {}) {
    if (busy) return;
    const def = screens.get(id);
    const cur = top();
    if (cur && !def.sheet) hide(cur);
    if (o.replace && cur) stack.pop();
    if (o.reset) {
      for (const e of stack) if (e !== cur) el(e.id).hidden = true;
      stack.length = 0;
    }
    const entry = { id, params };
    stack.push(entry);
    show(entry, "fwd");
    Bus.emit("nav", id);
  }
  function back() {
    const cur = top();
    if (!cur) return;
    const def = screens.get(cur.id);
    if (def.onBack && def.onBack() === true) return; // the screen handled it
    if (stack.length <= 1) return; // never leave the game from the first screen
    stack.pop();
    hide(cur);
    if (def.sheet) {
      el(cur.id).hidden = true;
      screens.get(top().id).onCover?.(false);
      return;
    }
    show(top(), "back");
    Bus.emit("nav", top().id);
  }
  // close a sheet without going further back
  function close(id) {
    if (top()?.id === id) {
      stack.pop();
      el(id).hidden = true;
      screens.get(id).onHide?.();
    }
  }
  function refresh() {
    const cur = top();
    if (cur) screens.get(cur.id).render?.(el(cur.id), cur.params || {});
  }
  // The phone's back button or gesture: we keep one history entry in hand so it always lands here.
  function bindHistory() {
    try {
      history.replaceState({ lamb: 0 }, "");
      history.pushState({ lamb: 1 }, "");
    } catch {}
    window.addEventListener("popstate", () => {
      try {
        history.pushState({ lamb: 1 }, "");
      } catch {}
      back();
    });
  }
  return { define, go, back, close, refresh, bindHistory, get top() { return top(); }, get depth() { return stack.length; }, is: (id) => top()?.id === id };
})();

// ---------- controls ----------
const UI = (() => {
  // every button clicks and buzzes a little
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, .tap");
    if (!b || b.disabled) return;
    if (b.dataset.sound === "none") return;
    b.classList.contains("back") ? Sfx.back() : Sfx.tap();
    buzz(6);
  });

  function h(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(kid));
    return n;
  }
  const btn = (label, onclick, cls = "", icon) => h("button", { class: `btn ${cls}`, onclick, html: `${icon ? Icons.get(icon) : ""}<span>${esc(label)}</span>` });
  function header(title, o = {}) {
    return h("header", { class: "bar" },
      o.noBack ? h("span", { class: "spacer" }) : h("button", { class: "ib back", "aria-label": "Back", onclick: () => Nav.back(), html: Icons.get("back") }),
      h("h2", {}, title),
      o.right || h("span", { class: "spacer" }));
  }
  function seg(options, value, onPick, cls = "") {
    const s = h("div", { class: `seg ${cls}`, role: "radiogroup" });
    for (const [v, text, icon] of options) {
      const b = h("button", { class: value === v ? "on" : "", role: "radio", "aria-checked": value === v ? "true" : "false", html: `${icon ? Icons.get(icon) : ""}<span>${esc(text)}</span>` });
      b.addEventListener("click", () => {
        for (const x of s.children) {
          x.classList.remove("on");
          x.setAttribute("aria-checked", "false");
        }
        b.classList.add("on");
        b.setAttribute("aria-checked", "true");
        onPick(v);
      });
      s.append(b);
    }
    return s;
  }
  function toggle(value, onChange, label) {
    const b = h("button", { class: `toggle ${value ? "on" : ""}`, role: "switch", "aria-checked": value ? "true" : "false", "aria-label": label, html: "<i></i>" });
    b.addEventListener("click", () => {
      const v = !b.classList.contains("on");
      b.classList.toggle("on", v);
      b.setAttribute("aria-checked", v ? "true" : "false");
      onChange(v);
    });
    return b;
  }
  function stepper(value, min, max, onChange, fmt = (v) => v) {
    const s = h("div", { class: "stepper" });
    const out = h("output", {}, fmt(value));
    const set = (v) => {
      value = clamp(v, min, max);
      out.textContent = fmt(value);
      onChange(value);
    };
    s.append(h("button", { "aria-label": "Less", onclick: () => set(value - 1), html: Icons.get("minus") }), out, h("button", { "aria-label": "More", onclick: () => set(value + 1), html: Icons.get("plus") }));
    return s;
  }
  function slider(value, min, max, stepV, onInput, onDone) {
    const r = h("input", { type: "range", min, max, step: stepV, value });
    r.addEventListener("input", () => onInput(Number(r.value)));
    if (onDone) r.addEventListener("change", () => onDone(Number(r.value)));
    return r;
  }
  function row(label, control, sub) {
    return h("div", { class: "row" }, h("div", { class: "lbl" }, h("b", {}, label), sub ? h("small", {}, sub) : null), control);
  }
  // a small message at the bottom; tap to act
  let toastTimer = 0;
  function toast(text, o = {}) {
    const t = $("toast");
    t.innerHTML = `${o.icon ? Icons.get(o.icon) : ""}<span>${esc(text)}</span>`;
    t.onclick = o.onTap ? () => o.onTap() : () => (t.hidden = true);
    t.hidden = false;
    t.classList.remove("go");
    void t.offsetWidth;
    t.classList.add("go");
    clearTimeout(toastTimer);
    if (!o.sticky) toastTimer = setTimeout(() => (t.hidden = true), o.ms || 2600);
  }
  function confirm(text, yes, no, o = {}) {
    return new Promise((done) => {
      Nav.go("confirm", { text, yes, no, sub: o.sub, danger: o.danger, done });
    });
  }
  // numbers that count up on the results screen
  function countUp(node, to, ms = 900, onTick) {
    const from = 0;
    const t0 = performance.now();
    const stepFn = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmtNum(from + (to - from) * e);
      onTick?.(p);
      if (p < 1) requestAnimationFrame(stepFn);
    };
    if (Save.settings.reduced) node.textContent = fmtNum(to);
    else requestAnimationFrame(stepFn);
  }
  // a canvas that keeps drawing while its screen is showing
  function liveCanvas(cv, w, h2, draw) {
    const g = Art.sharp(cv, w, h2);
    let id = 0;
    const loop = (t) => {
      if (!cv.isConnected || cv.closest(".screen")?.hidden) return;
      id = requestAnimationFrame(loop);
      g.clearRect(0, 0, w, h2);
      draw(g, t / 1000);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }
  return { h, btn, header, seg, toggle, stepper, slider, row, toast, confirm, countUp, liveCanvas };
})();
