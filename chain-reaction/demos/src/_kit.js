// ========================= SHARED KIT =========================
// Sound, character art, wave animation, AI and screen helpers used by every demo.
const Kit = (() => {
  // ---------- sound (Web Audio, no files) ----------
  let actx = null;
  let muted = false;
  try {
    muted = localStorage.getItem("cfl-muted") === "1";
  } catch {}

  function ac() {
    if (muted) return null;
    try {
      actx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      return actx;
    } catch {
      return null;
    }
  }

  function tone(freq, dur = 0.12, type = "sine", vol = 0.12, slideTo = 0, delay = 0) {
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function bleat(pitch = 1, delay = 0) {
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const lfo = a.createOscillator();
    const lg = a.createGain();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(560 * pitch, t);
    o.frequency.linearRampToValueAtTime(480 * pitch, t + 0.38);
    lfo.frequency.value = 22;
    lg.gain.value = 40 * pitch;
    lfo.connect(lg).connect(o.frequency);
    f.type = "lowpass";
    f.frequency.value = 1700;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(f).connect(g).connect(a.destination);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.42);
    lfo.stop(t + 0.42);
  }

  const sfx = {
    place: () => tone(660, 0.07, "triangle", 0.1),
    // Pitch climbs a semitone per wave so long chains feel like they're building.
    burst: (k) => tone(Math.min(240 * Math.pow(2, k / 12), 2200), 0.13, "sine", 0.13, Math.min(240 * Math.pow(2, k / 12), 2200) * 0.6),
    bad: () => tone(140, 0.15, "square", 0.06, 100),
    win: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.22, "triangle", 0.12, 0, k * 0.11)),
    lose: () => [392, 330, 262, 196].forEach((f, k) => tone(f, 0.26, "sine", 0.12, 0, k * 0.14)),
    howl: () => tone(300, 0.6, "sawtooth", 0.05, 520),
    chime: (k = 0) => tone(880 * Math.pow(2, k / 12), 0.3, "sine", 0.08),
    bleat,
  };

  function setMuted(m) {
    muted = m;
    try {
      localStorage.setItem("cfl-muted", m ? "1" : "0");
    } catch {}
  }

  // ---------- art (all drawn with code) ----------
  function circle(ctx, x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry, rot, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    const ch = (s) => Math.round(((n >> s) & 255) * (1 - p) + t * p);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  // cheekyfoundlamb: white wool, cream face, and two same-size eyes on one level
  // that each look a different way. s is roughly his full height in pixels.
  // o: { t (seconds, for idle bob), mood: "happy" | "shock" | "sad" | "sleep", scarf: colour, glow }
  function drawLamb(ctx, x, y, s, o = {}) {
    const t = o.t ?? 0;
    const bob = Math.sin(t * 3) * s * 0.015;
    ctx.save();
    ctx.translate(x, y + bob);
    if (o.flip) ctx.scale(-1, 1);
    if (o.glow) {
      const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.85);
      g.addColorStop(0, o.glow);
      g.addColorStop(1, "rgba(255,220,120,0)");
      circle(ctx, 0, 0, s * 0.85, g);
    }
    // legs
    ctx.fillStyle = "#3b3340";
    for (const lx of [-0.2, -0.07, 0.08, 0.21]) {
      ctx.beginPath();
      ctx.roundRect(lx * s - s * 0.035, s * 0.12, s * 0.07, s * 0.2, s * 0.03);
      ctx.fill();
    }
    // wool body: a ring of puffs around a core
    const body = [[-0.24, 0], [-0.14, -0.13], [0.02, -0.17], [0.18, -0.12], [0.27, 0.01], [0.18, 0.13], [0, 0.16], [-0.16, 0.13]];
    for (const [bx, by] of body) circle(ctx, bx * s, by * s, s * 0.15, "#d9d5de");
    for (const [bx, by] of body) circle(ctx, bx * s, by * s - s * 0.012, s * 0.14, "#ffffff");
    circle(ctx, 0, 0, s * 0.24, "#ffffff");
    // tail puff
    circle(ctx, -0.36 * s, -0.05 * s, s * 0.07, "#ffffff");
    // head
    const hx = 0.22 * s;
    const hy = -0.2 * s;
    // ears
    ellipse(ctx, hx - s * 0.17, hy - s * 0.02, s * 0.1, s * 0.045, -0.5, "#f1d9cc");
    ellipse(ctx, hx + s * 0.17, hy - s * 0.02, s * 0.1, s * 0.045, 0.5, "#f1d9cc");
    ellipse(ctx, hx - s * 0.17, hy - s * 0.02, s * 0.06, s * 0.022, -0.5, "#f4a7b4");
    ellipse(ctx, hx + s * 0.17, hy - s * 0.02, s * 0.06, s * 0.022, 0.5, "#f4a7b4");
    ellipse(ctx, hx, hy + s * 0.02, s * 0.14, s * 0.16, 0, "#f6e6da");
    // wool tuft on top
    for (const [tx, ty] of [[-0.07, -0.13], [0, -0.16], [0.07, -0.13]]) circle(ctx, hx + tx * s, hy + ty * s, s * 0.06, "#ffffff");
    // scarf in the owner's colour
    if (o.scarf) {
      ctx.fillStyle = o.scarf;
      ctx.beginPath();
      ctx.roundRect(hx - s * 0.13, hy + s * 0.13, s * 0.26, s * 0.06, s * 0.03);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(hx + s * 0.04, hy + s * 0.15, s * 0.06, s * 0.12, s * 0.02);
      ctx.fill();
    }
    // the eyes: equal size, equal height, pupils pointing different ways
    const er = s * 0.045;
    const ey = hy - s * 0.005;
    for (const [side, px, py] of [[-1, -0.55, -0.35], [1, 0.5, 0.4]]) {
      const ex = hx + side * s * 0.058;
      circle(ctx, ex, ey, er, "#ffffff");
      ctx.lineWidth = s * 0.008;
      ctx.strokeStyle = "#3b3340";
      ctx.stroke();
      if (o.mood === "sleep") continue;
      circle(ctx, ex + px * er * 0.9, ey + py * er * 0.9, er * 0.5, "#241d2a");
      circle(ctx, ex + px * er * 0.9 - er * 0.15, ey + py * er * 0.9 - er * 0.18, er * 0.15, "#ffffff");
    }
    if (o.mood === "sleep") {
      ctx.strokeStyle = "#3b3340";
      ctx.lineWidth = s * 0.012;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(hx + side * s * 0.058, ey, er * 0.7, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    }
    // nose and mouth
    ellipse(ctx, hx, hy + s * 0.08, s * 0.025, s * 0.016, 0, "#c9788a");
    ctx.strokeStyle = "#3b3340";
    ctx.lineWidth = s * 0.012;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (o.mood === "shock") {
      ctx.arc(hx, hy + s * 0.125, s * 0.022, 0, Math.PI * 2);
    } else if (o.mood === "sad") {
      ctx.arc(hx, hy + s * 0.15, s * 0.035, Math.PI + 0.4, -0.4);
    } else {
      // lopsided cheeky smirk
      ctx.moveTo(hx - s * 0.04, hy + s * 0.11);
      ctx.quadraticCurveTo(hx + s * 0.005, hy + s * 0.15, hx + s * 0.055, hy + s * 0.1);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Cheeky grey wolf head. s is the head width.
  function drawWolf(ctx, x, y, s, o = {}) {
    const t = o.t ?? 0;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2.4) * s * 0.012);
    const fur = o.color ?? "#8b8f9c";
    const dark = shade(fur.startsWith("#") ? fur : "#8b8f9c", -0.35);
    // ears
    for (const side of [-1, 1]) {
      ctx.fillStyle = fur;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.12, -s * 0.22);
      ctx.lineTo(side * s * 0.38, -s * 0.52);
      ctx.lineTo(side * s * 0.4, -s * 0.12);
      ctx.fill();
      ctx.fillStyle = "#d9a3ab";
      ctx.beginPath();
      ctx.moveTo(side * s * 0.18, -s * 0.22);
      ctx.lineTo(side * s * 0.35, -s * 0.42);
      ctx.lineTo(side * s * 0.36, -s * 0.18);
      ctx.fill();
    }
    // head with cheek tufts
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, -s * 0.05);
    ctx.quadraticCurveTo(-s * 0.4, -s * 0.38, 0, -s * 0.36);
    ctx.quadraticCurveTo(s * 0.4, -s * 0.38, s * 0.42, -s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.08);
    ctx.lineTo(s * 0.34, s * 0.1);
    ctx.quadraticCurveTo(s * 0.2, s * 0.32, 0, s * 0.33);
    ctx.quadraticCurveTo(-s * 0.2, s * 0.32, -s * 0.34, s * 0.1);
    ctx.lineTo(-s * 0.5, s * 0.08);
    ctx.closePath();
    ctx.fill();
    // muzzle
    ellipse(ctx, 0, s * 0.12, s * 0.2, s * 0.15, 0, "#e3e1e6");
    ellipse(ctx, 0, s * 0.03, s * 0.07, s * 0.045, 0, "#2a2530");
    // half-lidded, sly eyes
    for (const side of [-1, 1]) {
      const ex = side * s * 0.16;
      const ey = -s * 0.13;
      ellipse(ctx, ex, ey, s * 0.075, s * 0.06, 0, "#ffe680");
      circle(ctx, ex + s * 0.02, ey + s * 0.01, s * 0.03, "#2a2530");
      ctx.fillStyle = fur;
      ctx.beginPath();
      ctx.ellipse(ex, ey - s * 0.03, s * 0.085, s * 0.05, side * -0.25, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = s * 0.02;
      ctx.beginPath();
      ctx.moveTo(ex - s * 0.08, ey - s * 0.03 - side * s * 0.02);
      ctx.lineTo(ex + s * 0.08, ey - s * 0.03 + side * s * 0.02);
      ctx.stroke();
    }
    // grin with one tooth
    ctx.strokeStyle = "#2a2530";
    ctx.lineWidth = s * 0.022;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.11, s * 0.15);
    ctx.quadraticCurveTo(0, o.mood === "sad" ? s * 0.12 : s * 0.24, s * 0.13, s * 0.13);
    ctx.stroke();
    if (o.mood !== "sad") {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(s * 0.03, s * 0.2);
      ctx.lineTo(s * 0.07, s * 0.19);
      ctx.lineTo(s * 0.05, s * 0.25);
      ctx.fill();
    }
    ctx.restore();
  }

  // The Shepherd: a warm silhouette with a staff and a soft glow. h is the height.
  function drawShepherd(ctx, x, y, h, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = o.alpha ?? 1;
    const g = ctx.createRadialGradient(0, -h * 0.5, h * 0.05, 0, -h * 0.5, h * 0.52);
    g.addColorStop(0, "rgba(255,214,140,0.55)");
    g.addColorStop(1, "rgba(255,214,140,0)");
    circle(ctx, 0, -h * 0.5, h * 0.52, g);
    ctx.fillStyle = o.color ?? "#7a4f33";
    // robe
    ctx.beginPath();
    ctx.moveTo(-h * 0.12, -h * 0.72);
    ctx.quadraticCurveTo(-h * 0.2, -h * 0.3, -h * 0.24, 0);
    ctx.lineTo(h * 0.24, 0);
    ctx.quadraticCurveTo(h * 0.2, -h * 0.3, h * 0.12, -h * 0.72);
    ctx.closePath();
    ctx.fill();
    // hooded head
    circle(ctx, 0, -h * 0.8, h * 0.11, o.color ?? "#7a4f33");
    ctx.fillStyle = "rgba(255,230,190,0.25)";
    ctx.beginPath();
    ctx.ellipse(h * 0.02, -h * 0.79, h * 0.06, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    // staff with crook
    ctx.strokeStyle = "#c9a26b";
    ctx.lineWidth = h * 0.025;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(h * 0.3, 0);
    ctx.lineTo(h * 0.3, -h * 0.95);
    ctx.arc(h * 0.38, -h * 0.95, h * 0.08, Math.PI, 0);
    ctx.lineTo(h * 0.46, -h * 0.9);
    ctx.stroke();
    ctx.restore();
  }

  // A small sheep in a player's colour (used as an "orb"). r is about its radius.
  function drawSheep(ctx, x, y, r, color, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    ctx.fillStyle = "#2b2430";
    ctx.fillRect(-r * 0.45, r * 0.45, r * 0.18, r * 0.45);
    ctx.fillRect(r * 0.25, r * 0.45, r * 0.18, r * 0.45);
    const light = shade(color, 0.45);
    for (const [bx, by] of [[-0.45, 0], [0, -0.35], [0.4, -0.05], [0.05, 0.3], [-0.3, 0.3], [0.35, 0.3]]) circle(ctx, bx * r, by * r, r * 0.48, color);
    for (const [bx, by] of [[-0.35, -0.1], [0.05, -0.38], [0.3, -0.12]]) circle(ctx, bx * r, by * r, r * 0.26, light);
    ellipse(ctx, r * 0.78, -r * 0.15, r * 0.3, r * 0.36, 0.3, "#2b2430");
    circle(ctx, r * 0.84, -r * 0.24, r * 0.07, "#ffffff");
    ctx.restore();
  }

  // ---------- wave animation ----------
  // Plays the waves returned by Engine.resolve, one per `ms`, calling onWave(k)
  // as each starts. Read Kit.anim.cur in the draw loop to animate.
  const anim = {
    cur: null,
    play(waves, ms, onWave, pre) {
      return new Promise((done) => {
        if (!waves.length) return done();
        this.cur = { waves, i: 0, start: null, ms, onWave, done, pre };
      });
    },
    step(now) {
      const c = this.cur;
      if (!c) return;
      if (c.start === null) {
        c.start = now;
        c.onWave?.(0, c.waves[0]);
        return;
      }
      if (now - c.start < c.ms) return;
      c.i++;
      c.start = now;
      if (c.i >= c.waves.length) {
        this.cur = null;
        c.done();
      } else c.onWave?.(c.i, c.waves[c.i]);
    },
    // 0..1 progress of the current wave
    t(now) {
      const c = this.cur;
      if (!c || c.start === null) return 0;
      return Math.min(1, (now - c.start) / c.ms);
    },
    // Board to draw under the flying orbs for the current wave.
    base() {
      const c = this.cur;
      if (!c) return null;
      return c.i === 0 ? c.pre : c.waves[c.i - 1].board;
    },
  };

  // ---------- AI helpers ----------
  // Generic board score for `me`: orbs, safe corners/edges, near-full cells,
  // and danger from enemy cells about to burst next to mine.
  // isMine(owner), isFoe(owner), cap(i) are supplied by the demo.
  function evaluate(b, isMine, isFoe, cap) {
    let score = 0;
    for (let i = 0; i < b.size; i++) {
      const own = b.owner[i];
      if (own < 0 || b.count[i] === 0) continue;
      const mine = isMine(own);
      if (!mine && !isFoe(own)) continue;
      const c = cap(i);
      let v = b.count[i] * 2 + 3;
      let threatened = false;
      let prey = 0;
      for (const n of Engine.neighbours(b, i)) {
        const o2 = b.owner[n];
        if (o2 < 0 || b.count[n] === 0) continue;
        if (isMine(o2) === mine) continue;
        if (b.count[n] >= cap(n) - 1) threatened = true;
        prey += b.count[n];
      }
      if (threatened) v -= 5 - c + b.count[i];
      else {
        if (c === 2) v += 3;
        else if (c === 3) v += 2;
        if (b.count[i] >= c - 1) v += 2 + prey;
      }
      score += mine ? v : -v;
    }
    return score;
  }

  // Picks the highest scoring move. With chance `mistake`, picks one of the top 3 instead.
  function pickBest(scored, mistake = 0) {
    if (!scored.length) return null;
    scored.sort((a, b) => b.score - a.score);
    if (mistake > 0 && Math.random() < mistake && scored.length > 1) return scored[Math.floor(Math.random() * Math.min(3, scored.length))].move;
    const top = scored.filter((s) => s.score === scored[0].score);
    return top[Math.floor(Math.random() * top.length)].move;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- screen helpers ----------
  const $ = (id) => document.getElementById(id);

  // Sizes `canvas` to fit `wrap` for a cols x rows board. Returns { cell, dpr, w, h }.
  function fitBoard(canvas, wrap, cols, rows, extraRows = 0) {
    const cs = getComputedStyle(wrap);
    const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const cell = Math.max(12, Math.floor(Math.min(w / cols, h / (rows + extraRows))));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = cell * cols + "px";
    canvas.style.height = cell * (rows + extraRows) + "px";
    canvas.width = Math.round(cell * cols * dpr);
    canvas.height = Math.round(cell * (rows + extraRows) * dpr);
    return { cell, dpr, w: cell * cols, h: cell * (rows + extraRows) };
  }

  // Sets up a fixed-size picture canvas at full screen sharpness; returns its context.
  function sharp(cv, w, h) {
    const dpr = window.devicePixelRatio || 1;
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return g;
  }

  function shake(el, big = false) {
    el.classList.remove("shake", "shake-big");
    void el.offsetWidth;
    el.classList.add(big ? "shake-big" : "shake");
  }

  function popText(el, text) {
    el.textContent = text;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  function show(id) {
    $(id).hidden = false;
  }
  function hide(id) {
    $(id).hidden = true;
  }

  function cellAt(canvas, e, cell) {
    const r = canvas.getBoundingClientRect();
    return { col: Math.floor((e.clientX - r.left) / cell), row: Math.floor((e.clientY - r.top) / cell) };
  }

  // Wires the shared mute button.
  function muteButton(btn) {
    const render = () => {
      btn.textContent = muted ? "🔇" : "🔊";
      btn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    };
    btn.addEventListener("click", () => {
      setMuted(!muted);
      render();
    });
    render();
  }

  const COLORS = ["#ff5a5f", "#3fa7ff", "#ffc93c", "#8f6bff", "#2fd38a", "#ff8c42", "#ff6fc8", "#3ee0e0"];
  const COLOR_NAMES = ["Red", "Blue", "Yellow", "Purple", "Green", "Orange", "Pink", "Cyan"];

  return {
    sfx, setMuted, isMuted: () => muted, tone,
    circle, ellipse, shade, drawLamb, drawWolf, drawShepherd, drawSheep,
    anim, evaluate, pickBest, sleep,
    $, fitBoard, sharp, shake, popText, show, hide, cellAt, muteButton,
    COLORS, COLOR_NAMES,
  };
})();
// ======================= END SHARED KIT =======================
