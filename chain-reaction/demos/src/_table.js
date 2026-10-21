// ========================= SHARED TABLE UI =========================
// Board drawing, player chips, the hand, tap-to-target and card animations for
// the card demos. Expects elements: #board #stage #chain #chips #hand #hint #status #dot.
const Table = (() => {
  const { $ } = Kit;
  let opt = {}; // { colors, names, state(), viewer(), cellArt(ctx,b,i,x,y,c,t,viewer), waveMs }
  let geo = { cell: 40, dpr: 1, w: 0, h: 0 };
  const view = { override: null, highlight: [], preview: [], pick: null };
  let canvas;
  let ctx;

  function init(o) {
    opt = { waveMs: 130, ...o };
    canvas = $("board");
    ctx = canvas.getContext("2d");
    canvas.addEventListener("pointerdown", onTap);
    new ResizeObserver(resize).observe($("stage"));
    requestAnimationFrame(frame);
  }

  function resize() {
    const st = opt.state?.();
    if (!st) return;
    geo = Kit.fitBoard(canvas, $("stage"), st.b.cols, st.b.rows);
  }

  // ---------- chips ----------
  function chips(st, kinds, extra = () => "") {
    const box = $("chips");
    box.replaceChildren();
    for (let p = 0; p < st.n; p++) {
      const ps = st.ps[p];
      const el = document.createElement("div");
      el.className = "chip" + (p === st.current && st.winner < 0 ? " now" : "") + (st.alive[p] ? "" : " out");
      el.id = `chip-${p}`;
      const cv = document.createElement("canvas");
      Cards.lambIcon(cv, opt.colors[p], st.alive[p] ? "happy" : "sleep");
      const g = ps.gifts;
      const marks = [g.tongues > 0 ? "🗣️" : "", g.mercy > 0 ? "💗" : "", g.leadership > 0 ? "👑" : "", ps.skip ? "💤" : "", ps.den ? "🦁" : "", ps.discern ? "👁️" : ""].join("");
      el.append(cv);
      const label = document.createElement("span");
      label.innerHTML = `${opt.names[p]}${kinds[p] === "ai" ? " (AI)" : ""} · ${Cards.cells(st.b, p)}▢ ${extra(p)}${marks}`;
      el.append(label);
      box.append(el);
    }
  }

  function jump(p) {
    const el = $(`chip-${p}`);
    if (!el) return;
    el.classList.remove("jump");
    void el.offsetWidth;
    el.classList.add("jump");
  }

  // ---------- hand and targeting ----------
  let pending = null; // resolver for the current human turn prompt
  let ctxTurn = null; // { st, p, canPlace, cardsOk, placeOk, endOk, cardFilter }
  let sel = null; // { idx, key, picks, axis }

  // Renders cards for player p. faceDown shows the backs (e.g. during someone else's turn).
  function hand(st, p, { enabled = false, faceDown = false, costs = null, extra = null } = {}) {
    const box = $("hand");
    box.replaceChildren();
    if (p < 0) return;
    st.ps[p].hand.forEach((key, idx) => {
      const btn = document.createElement("button");
      btn.innerHTML = Cards.cardHTML(key, { small: true, faceDown, on: sel?.idx === idx, cost: costs?.[key] });
      const ok = enabled && !Cards.DEF[key].auto && (ctxTurn?.cardFilter?.(key) ?? true);
      btn.disabled = !ok && !faceDown;
      if (ok) btn.addEventListener("click", () => pickCard(idx, key));
      else if (!faceDown) btn.addEventListener("click", () => hint(`${Cards.DEF[key].icon} ${Cards.DEF[key].text}`));
      box.append(btn);
    });
    if (extra) box.append(typeof extra === "function" ? extra() : extra);
  }

  function hint(html, buttons = []) {
    const el = $("hint");
    el.innerHTML = `<span>${html}</span>`;
    for (const [label, fn, cls] of buttons) {
      const b = document.createElement("button");
      b.className = "ib" + (cls ? " " + cls : "");
      b.textContent = label;
      b.addEventListener("click", fn);
      el.append(b);
    }
  }

  function pickCard(idx, key) {
    if (!ctxTurn) return;
    if (sel?.idx === idx) return ctxTurn.noCancel ? null : cancelSel();
    sel = { idx, key, picks: [], axis: "row" };
    refreshTargets();
  }

  function cancelSel() {
    sel = null;
    view.highlight = [];
    view.preview = [];
    idleHint();
    hand(ctxTurn.st, ctxTurn.p, { enabled: ctxTurn.cardsOk, costs: ctxTurn.costs, extra: ctxTurn.extra });
  }

  function refreshTargets() {
    const { st, p } = ctxTurn;
    const d = Cards.DEF[sel.key];
    hand(st, p, { enabled: true, costs: ctxTurn.costs, extra: ctxTurn.extra });
    view.highlight = Cards.selectable(st, p, sel.key, sel.picks);
    view.preview = sel.picks.slice();
    const need = Cards.picksNeeded(sel.key, st);
    if (need === 0) {
      view.highlight = [];
      hint(`${d.icon} <b>${d.name}</b>: ${d.text}`, [["Play", () => finishCard(null), "on"], ...cancelBtn()]);
    } else if (d.target === "line") {
      hint(`Tap a square to part its ${sel.axis}.`, [[sel.axis === "row" ? "Row ⇄ Column" : "Column ⇄ Row", () => { sel.axis = sel.axis === "row" ? "col" : "row"; refreshTargets(); }], ...cancelBtn()]);
    } else {
      const left = need - sel.picks.length;
      const what = { area: "the middle of a 3×3 area", mine: "one of your squares", any: "any square", empty: "an empty square", enemy: "an enemy square", cells: `${left} square${left > 1 ? "s" : ""} for the next player`, faith: sel.picks.length ? "an empty square to move to" : "a square of yours to move" }[d.target];
      hint(`${d.icon} Tap ${what}.`, cancelBtn());
    }
    // nothing to aim at: the card fizzles
    if (need > 0 && !view.highlight.length) hint(`${d.icon} Nothing to aim ${d.name} at.`, [[ctxTurn.noCancel ? "OK" : "Cancel", ctxTurn.noCancel ? () => finishCard(null) : cancelSel]]);
  }

  const cancelBtn = () => (ctxTurn?.noCancel ? [] : [["Cancel", cancelSel]]);

  function finishCard(target) {
    const done = { type: "card", idx: sel.idx, key: sel.key, target };
    sel = null;
    view.highlight = [];
    view.preview = [];
    resolveTurn(done);
  }

  function onTap(e) {
    if (!ctxTurn) return;
    const { st, p } = ctxTurn;
    const { row, col } = Kit.cellAt(canvas, e, geo.cell);
    if (!Engine.inside(st.b, row, col)) return;
    const i = row * st.b.cols + col;
    if (sel) {
      const d = Cards.DEF[sel.key];
      if (!view.highlight.includes(i)) return Kit.sfx.bad();
      if (d.target === "line") return finishCard({ axis: sel.axis, index: sel.axis === "row" ? row : col });
      sel.picks.push(i);
      if (sel.picks.length >= Cards.picksNeeded(sel.key, st)) return finishCard(["cells", "faith"].includes(d.target) ? sel.picks : sel.picks[0]);
      Kit.sfx.place();
      return refreshTargets();
    }
    if (ctxTurn.placeOk && ctxTurn.canPlace(i)) resolveTurn({ type: "place", cell: i });
    else Kit.sfx.bad();
  }

  function idleHint() {
    const c = ctxTurn;
    const cards = c.cardsOk && c.st.ps[c.p].hand.some((k) => !Cards.DEF[k].auto && (c.cardFilter?.(k) ?? true));
    const text = c.text ?? (c.placeOk ? `${c.placeText ?? "Tap a square to place a sheep"}${cards ? ", or play a card" : ""}.` : cards ? "Play a card, or end your turn." : "");
    hint(text, c.endOk ? [[c.endLabel ?? "End turn", () => resolveTurn({ type: "end" }), "on"]] : []);
  }

  // Waits for a human action: { type: "place", cell } | { type: "card", idx, key, target } | { type: "end" }.
  function ask(c) {
    ctxTurn = c;
    sel = null;
    idleHint();
    hand(c.st, c.p, { enabled: c.cardsOk, costs: c.costs, extra: c.extra });
    const promise = new Promise((r) => (pending = r));
    if (c.autoPick !== undefined) pickCard(c.autoPick, c.st.ps[c.p].hand[c.autoPick]);
    return promise;
  }

  function resolveTurn(action) {
    const r = pending;
    pending = null;
    ctxTurn = null;
    view.highlight = [];
    $("hint").innerHTML = "";
    r?.(action);
  }

  function cancelAsk() {
    pending = null;
    ctxTurn = null;
    sel = null;
    view.highlight = [];
    view.preview = [];
  }

  // ---------- animations ----------
  async function waves(ws, pre, onBig) {
    if (!ws.length) return;
    await Kit.anim.play(ws, opt.waveMs, (k) => {
      Kit.sfx.burst(k);
      if (k >= 1) Kit.popText($("chain"), `Chain x${k + 1}!`);
      if (k === 5) Kit.shake($("stage"));
      if (k === 10) Kit.shake($("stage"), true);
      if (k === 6) onBig?.();
    }, pre);
  }

  // Plays a card with its reveal, board effect and bursts. applyFn() must mutate the state and return Cards.apply's result.
  async function card(p, key, applyFn, { label, fxMs = 1000, golden = false, box = false } = {}) {
    const st = opt.state();
    await Cards.reveal(key, opt.colors[p], { played: !box, golden, label: label ?? `${opt.names[p]} plays ${Cards.DEF[key].name}` });
    const before = Engine.clone(st.b);
    view.override = before;
    const r = applyFn();
    if (r.fx && (r.fx.cells?.length || ["sea", "jericho"].includes(r.fx.kind))) await Cards.fx.play({ ...r.fx, color: opt.colors[p] }, fxMs);
    view.override = null;
    await waves(r.waves, r.fx.mid ?? before, () => jump(p));
    return r;
  }

  async function place(p, i, placeFn) {
    const st = opt.state();
    Kit.sfx.place();
    const pre = Engine.clone(st.b);
    Engine.place(pre, i, p);
    const ws = placeFn();
    await waves(ws, pre, () => jump(p));
  }

  // Shows what happened (Grace, knockouts, the wolf) as short pop-ups.
  async function events(st) {
    for (const e of st.events) {
      let msg = "";
      if (e.type === "grace") msg = `🛡️ Grace protects ${opt.names[e.p]}!`;
      else if (e.type === "out") msg = `${opt.names[e.p]}'s flock is out`;
      else if (e.type === "wolfchased") msg = "The wolf is chased off!";
      else if (e.type === "wolfmove") msg = e.raided >= 0 ? "The wolf raids a square!" : "";
      if (!msg) continue;
      if (e.type === "grace") Cards.sound("grace");
      if (e.type.startsWith("wolf")) Kit.sfx.howl();
      Kit.popText($("chain"), msg);
      await Kit.sleep(900 * Cards.speed);
    }
    st.events = [];
  }

  // ---------- drawing ----------
  const SPOTS = {
    1: [[0, 0]],
    2: [[-0.2, 0], [0.2, 0.02]],
    3: [[-0.2, 0.12], [0.2, 0.12], [0, -0.16]],
    4: [[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.17], [0.2, 0.17]],
  };

  function frame(now) {
    Kit.anim.step(now);
    const st = opt.state?.();
    const t = now / 1000;
    ctx.setTransform(geo.dpr, 0, 0, geo.dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (st) drawBoard(st, now, t);
    requestAnimationFrame(frame);
  }

  function drawBoard(st, now, t) {
    const a = Kit.anim.cur;
    const b = a ? Kit.anim.base() : view.override ?? st.b;
    const wave = a && a.start !== null ? a.waves[a.i] : null;
    const counts = b.count.slice();
    if (wave) for (const { from } of wave.bursts) counts[from] = Math.max(0, counts[from] - Engine.capacity(b, from));
    const c = geo.cell;
    const viewer = opt.viewer?.() ?? -1;
    for (let i = 0; i < b.size; i++) {
      const x = Engine.colOf(b, i) * c;
      const y = Engine.rowOf(b, i) * c;
      const o = b.owner[i];
      ctx.fillStyle = (Engine.rowOf(b, i) + Engine.colOf(b, i)) % 2 ? "#3d7a45" : "#46874e";
      ctx.fillRect(x, y, c, c);
      if (o >= 0 && o < st.n) {
        ctx.fillStyle = opt.colors[o] + "38";
        ctx.fillRect(x, y, c, c);
        if (st.ps[o].gifts.tongues + st.ps[o].gifts.mercy + st.ps[o].gifts.leadership > 0) {
          ctx.strokeStyle = opt.colors[o];
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, c - 4, c - 4);
          ctx.globalAlpha = 1;
        }
      }
      if (b.still?.[i] >= 0) {
        ctx.fillStyle = "rgba(170,210,255,0.28)";
        ctx.fillRect(x, y, c, c);
      }
      opt.cellArt?.(ctx, b, i, x, y, c, t, viewer, st);
      if (b.mustard?.[i] >= 0) {
        ctx.strokeStyle = "#5fbf4a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + c * 0.82, y + c * 0.92);
        ctx.quadraticCurveTo(x + c * 0.78, y + c * 0.75, x + c * 0.86, y + c * 0.66);
        ctx.stroke();
        Kit.ellipse(ctx, x + c * 0.88, y + c * 0.68, c * 0.06, c * 0.03, -0.6, "#7cd65e");
      }
    }
    for (let i = 0; i < b.size; i++) {
      const n = counts[i];
      const o = b.owner[i];
      if (n <= 0 || o < 0 || o >= st.n) continue;
      const nervous = n >= Engine.capacity(b, i) - 1;
      const k = Math.min(n, 4);
      for (let s = 0; s < k; s++) {
        const [dx, dy] = SPOTS[k][s];
        const jx = nervous ? Math.sin(t * 40 + i * 3 + s) * c * 0.02 : 0;
        Kit.drawSheep(ctx, (Engine.colOf(b, i) + 0.5 + dx) * c + jx, (Engine.rowOf(b, i) + 0.5 + dy) * c, c * 0.14, opt.colors[o], { flip: s % 2 === 1 });
      }
      if (n > 4) {
        ctx.fillStyle = "#ffcf4a";
        ctx.font = `900 ${Math.round(c * 0.24)}px system-ui`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(n, (Engine.colOf(b, i) + 0.72) * c, (Engine.rowOf(b, i) + 0.95) * c);
      }
    }
    if (st.wolf >= 0 && !a) Kit.drawWolf(ctx, (Engine.colOf(b, st.wolf) + 0.5) * c, (Engine.rowOf(b, st.wolf) + 0.5) * c, c * 0.7, { t, mood: "happy" });
    if (wave) {
      const p = Kit.anim.t(now);
      const e = 1 - (1 - p) * (1 - p);
      for (const { from, to, who } of wave.bursts) {
        const fx = (Engine.colOf(b, from) + 0.5) * c;
        const fy = (Engine.rowOf(b, from) + 0.5) * c;
        for (const d of to) {
          const tx = (Engine.colOf(b, d) + 0.5) * c;
          const ty = (Engine.rowOf(b, d) + 0.5) * c;
          Kit.drawSheep(ctx, fx + (tx - fx) * e, fy + (ty - fy) * e - Math.sin(Math.PI * p) * c * 0.3, c * 0.14, opt.colors[who] ?? "#fff", { flip: tx < fx });
        }
      }
    }
    // targeting highlights
    if (view.highlight.length) {
      ctx.strokeStyle = "#ffcf4a";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6);
      for (const i of view.highlight) ctx.strokeRect(Engine.colOf(b, i) * c + 3, Engine.rowOf(b, i) * c + 3, c - 6, c - 6);
      ctx.globalAlpha = 1;
    }
    for (const i of view.preview) {
      ctx.fillStyle = "rgba(255,207,74,0.35)";
      ctx.fillRect(Engine.colOf(b, i) * c, Engine.rowOf(b, i) * c, c, c);
    }
    if (st.forced) for (const i of st.forced.cells) Kit.drawSheep(ctx, (Engine.colOf(b, i) + 0.5) * c, (Engine.rowOf(b, i) + 0.5) * c, c * 0.12, "rgba(255,255,255,0.55)");
    Cards.fx.draw(ctx, b, c, now);
    ctx.strokeStyle = st.winner < 0 ? opt.colors[st.current] : "#ffffff";
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let col = 0; col <= b.cols; col++) {
      const x = Math.min(Math.max(col * c, 0.75), geo.w - 0.75);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, geo.h);
    }
    for (let row = 0; row <= b.rows; row++) {
      const y = Math.min(Math.max(row * c, 0.75), geo.h - 0.75);
      ctx.moveTo(0, y);
      ctx.lineTo(geo.w, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  return { init, resize, chips, jump, hand, hint, ask, cancelAsk, act: (a) => resolveTurn(a), waves, card, place, events, view, get geo() { return geo; } };
})();
// ======================= END SHARED TABLE UI =======================
