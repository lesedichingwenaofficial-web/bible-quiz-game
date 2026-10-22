// ============================== ART ==============================
// Everything is drawn with code in one style: soft round shapes, a dark outline-free look,
// warm light. cheekyfoundlamb himself: white wool, cream face, two same-size eyes on one
// level that each look a different way.
const Art = (() => {
  const TAU = Math.PI * 2;

  // ---------- primitives ----------
  function circle(g, x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, Math.max(0, r), 0, TAU);
    g.fillStyle = fill;
    g.fill();
  }
  function ellipse(g, x, y, rx, ry, rot, fill) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU);
    g.fillStyle = fill;
    g.fill();
  }
  function rrect(g, x, y, w, h, r, fill) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fillStyle = fill;
    g.fill();
  }
  const shadeCache = new Map();
  // mixes a #rrggbb colour towards white (amt > 0) or black (amt < 0)
  function shade(hex, amt) {
    const k = hex + amt;
    let out = shadeCache.get(k);
    if (out) return out;
    const n = parseInt(hex.slice(1, 7), 16);
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    const ch = (s) => Math.round(((n >> s) & 255) * (1 - p) + t * p);
    out = `rgb(${ch(16)},${ch(8)},${ch(0)})`;
    if (shadeCache.size > 400) shadeCache.clear();
    shadeCache.set(k, out);
    return out;
  }
  const alpha = (hex, a) => {
    const n = parseInt(hex.slice(1, 7), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // ---------- palettes (colour-blind friendly options; symbols always shown too) ----------
  const PALETTES = {
    default: { colors: ["#ff5a5f", "#3fa7ff", "#ffc93c", "#2fd38a"], names: ["Red", "Blue", "Yellow", "Green"] },
    deuter: { colors: ["#e69f00", "#0072b2", "#f0e442", "#cc79a7"], names: ["Orange", "Blue", "Yellow", "Pink"] },
    protan: { colors: ["#f0e442", "#0072b2", "#e69f00", "#56b4e9"], names: ["Yellow", "Blue", "Orange", "Sky"] },
    tritan: { colors: ["#e8384f", "#21a179", "#f4a6c4", "#8c6d3f"], names: ["Red", "Green", "Pink", "Brown"] },
  };
  const SYMBOLS = ["circle", "triangle", "square", "diamond"];
  const WOOL = { "wool-white": ["#ffffff", "#d9d5de"], "wool-cream": ["#fff3d6", "#e2d2ae"], "wool-choc": ["#8a5a3c", "#6b4430"], "wool-night": ["#4a4458", "#353041"], "wool-pink": ["#ffd9e6", "#e9b6c8"], "wool-gold": ["#ffe28a", "#e0b84a"], "wool-cloud": ["#eaf6ff", "#bcd6ea"] };

  // ---------- the lamb ----------
  // o: { t, mood: happy|shock|sad|sleep|joy, look: {hat, scarf, bell, glasses, wool}, scarf (colour), glow, flip, blink }
  function drawLamb(g, x, y, s, o = {}) {
    if (!(s > 2)) return;
    const t = o.t ?? 0;
    const look = o.look || {};
    const [wool, woolShade] = WOOL[look.wool] || WOOL["wool-white"];
    const bob = o.still ? 0 : Math.sin(t * 3) * s * 0.015;
    g.save();
    g.translate(x, y + bob);
    if (o.flip) g.scale(-1, 1);
    if (o.glow) {
      const gr = g.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.85);
      gr.addColorStop(0, o.glow);
      gr.addColorStop(1, "rgba(255,220,120,0)");
      circle(g, 0, 0, s * 0.85, gr);
    }
    // legs (tucked in when asleep)
    g.fillStyle = "#3b3340";
    if (o.mood !== "sleep" || o.legs) {
      for (const lx of [-0.2, -0.07, 0.08, 0.21]) {
        g.beginPath();
        g.roundRect(lx * s - s * 0.035, s * 0.12, s * 0.07, s * 0.2, s * 0.03);
        g.fill();
      }
    }
    // wool body: a ring of puffs around a core
    const body = BODY;
    for (let k = 0; k < body.length; k += 2) circle(g, body[k] * s, body[k + 1] * s, s * 0.15, woolShade);
    for (let k = 0; k < body.length; k += 2) circle(g, body[k] * s, body[k + 1] * s - s * 0.012, s * 0.14, wool);
    circle(g, 0, 0, s * 0.24, wool);
    circle(g, -0.36 * s, -0.05 * s, s * 0.07, wool);
    const hx = 0.22 * s;
    const hy = -0.2 * s;
    // ears
    ellipse(g, hx - s * 0.17, hy - s * 0.02, s * 0.1, s * 0.045, -0.5, "#f1d9cc");
    ellipse(g, hx + s * 0.17, hy - s * 0.02, s * 0.1, s * 0.045, 0.5, "#f1d9cc");
    ellipse(g, hx - s * 0.17, hy - s * 0.02, s * 0.06, s * 0.022, -0.5, "#f4a7b4");
    ellipse(g, hx + s * 0.17, hy - s * 0.02, s * 0.06, s * 0.022, 0.5, "#f4a7b4");
    ellipse(g, hx, hy + s * 0.02, s * 0.14, s * 0.16, 0, "#f6e6da");
    // wool tuft on top
    for (const tx of [-0.07, 0, 0.07]) circle(g, hx + tx * s, hy + (tx === 0 ? -0.16 : -0.13) * s, s * 0.06, wool);
    // scarf
    const scarf = o.scarf ?? SCARVES[look.scarf];
    if (scarf) {
      g.fillStyle = scarf === "rainbow" ? rainbow(g, hx - s * 0.13, hx + s * 0.13) : scarf;
      g.beginPath();
      g.roundRect(hx - s * 0.13, hy + s * 0.13, s * 0.26, s * 0.06, s * 0.03);
      g.fill();
      g.beginPath();
      g.roundRect(hx + s * 0.04, hy + s * 0.15, s * 0.06, s * 0.12, s * 0.02);
      g.fill();
    }
    if (look.bell && look.bell !== "bell-none") drawBell(g, hx - s * 0.04, hy + s * 0.21, s * 0.05, look.bell, t);
    // eyes: equal size, equal height, pupils pointing different ways
    const er = s * 0.045;
    const ey = hy - s * 0.005;
    const shut = o.mood === "sleep" || o.blink;
    for (let side = -1; side <= 1; side += 2) {
      const px = side < 0 ? -0.55 : 0.5;
      const py = side < 0 ? -0.35 : 0.4;
      const ex = hx + side * s * 0.058;
      circle(g, ex, ey, er, "#ffffff");
      g.lineWidth = s * 0.008;
      g.strokeStyle = "#3b3340";
      g.stroke();
      if (shut) continue;
      circle(g, ex + px * er * 0.9, ey + py * er * 0.9, er * 0.5, "#241d2a");
      circle(g, ex + px * er * 0.9 - er * 0.15, ey + py * er * 0.9 - er * 0.18, er * 0.15, "#ffffff");
    }
    if (shut) {
      g.strokeStyle = "#3b3340";
      g.lineWidth = s * 0.012;
      for (let side = -1; side <= 1; side += 2) {
        g.beginPath();
        g.arc(hx + side * s * 0.058, ey, er * 0.7, 0.2, Math.PI - 0.2);
        g.stroke();
      }
    }
    if (look.glasses && look.glasses !== "glasses-none") drawGlasses(g, hx, ey, er, s, look.glasses);
    // nose and mouth
    ellipse(g, hx, hy + s * 0.08, s * 0.025, s * 0.016, 0, "#c9788a");
    g.strokeStyle = "#3b3340";
    g.lineWidth = s * 0.012;
    g.lineCap = "round";
    g.beginPath();
    if (o.mood === "shock") g.arc(hx, hy + s * 0.125, s * 0.022, 0, TAU);
    else if (o.mood === "sad") g.arc(hx, hy + s * 0.15, s * 0.035, Math.PI + 0.4, -0.4);
    else if (o.mood === "joy") {
      g.moveTo(hx - s * 0.045, hy + s * 0.105);
      g.quadraticCurveTo(hx, hy + s * 0.17, hx + s * 0.05, hy + s * 0.1);
      g.closePath();
      g.fillStyle = "#7a3b4c";
      g.fill();
    } else {
      // lopsided cheeky smirk
      g.moveTo(hx - s * 0.04, hy + s * 0.11);
      g.quadraticCurveTo(hx + s * 0.005, hy + s * 0.15, hx + s * 0.055, hy + s * 0.1);
    }
    g.stroke();
    if (o.mood === "sad" && o.tear) ellipse(g, hx + s * 0.09, ey + s * 0.07, s * 0.012, s * 0.02, 0, "#8fd3ff");
    if (look.hat && look.hat !== "hat-none") drawHat(g, hx, hy - s * 0.12, s, look.hat, t);
    g.restore();
    if (o.mood === "sleep" && o.zzz !== false) drawZzz(g, x + (o.flip ? -1 : 1) * s * 0.36, y - s * 0.42, s, t);
  }
  const BODY = [-0.24, 0, -0.14, -0.13, 0.02, -0.17, 0.18, -0.12, 0.27, 0.01, 0.18, 0.13, 0, 0.16, -0.16, 0.13];
  const SCARVES = { "scarf-red": "#ff5a5f", "scarf-blue": "#3fa7ff", "scarf-yellow": "#ffc93c", "scarf-green": "#2fd38a", "scarf-purple": "#9b7bff", "scarf-pink": "#ff8fc7", "scarf-rainbow": "rainbow", "scarf-gold": "#ffcf4a", "scarf-none": null };
  function rainbow(g, x0, x1) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    ["#ff5a5f", "#ffc93c", "#2fd38a", "#3fa7ff", "#9b7bff"].forEach((c, k) => gr.addColorStop(k / 4, c));
    return gr;
  }
  function drawZzz(g, x, y, s, t) {
    g.save();
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.font = `700 ${Math.round(s * 0.14)}px Fredoka, system-ui`;
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.5 + k / 3) % 1;
      g.globalAlpha = Math.sin(p * Math.PI) * 0.9;
      g.fillText("z", x + p * s * 0.18 + k * s * 0.05, y - p * s * 0.3);
    }
    g.restore();
  }
  function drawBell(g, x, y, r, id, t) {
    const col = id === "bell-gold" ? "#ffcf4a" : id === "bell-silver" ? "#dfe6ee" : "#d9a441";
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 5) * 0.2);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(-r, r * 0.9);
    g.quadraticCurveTo(-r, -r, 0, -r);
    g.quadraticCurveTo(r, -r, r, r * 0.9);
    g.closePath();
    g.fill();
    circle(g, 0, r * 1.05, r * 0.3, shade(col.length === 7 ? col : "#d9a441", -0.4));
    circle(g, -r * 0.35, -r * 0.3, r * 0.22, "rgba(255,255,255,0.6)");
    g.restore();
  }
  function drawGlasses(g, hx, ey, er, s, id) {
    g.save();
    const lw = s * 0.012;
    g.lineWidth = lw;
    if (id === "glasses-sun") {
      for (let side = -1; side <= 1; side += 2) ellipse(g, hx + side * s * 0.058, ey, er * 1.3, er * 1.05, 0, "#1d1a24");
      g.strokeStyle = "#1d1a24";
      g.beginPath();
      g.moveTo(hx - s * 0.02, ey - er * 0.3);
      g.lineTo(hx + s * 0.02, ey - er * 0.3);
      g.stroke();
      circle(g, hx - s * 0.075, ey - er * 0.35, er * 0.25, "rgba(255,255,255,0.5)");
    } else if (id === "glasses-heart" || id === "glasses-star") {
      const col = id === "glasses-heart" ? "#ff5a8a" : "#ffcf4a";
      for (let side = -1; side <= 1; side += 2) {
        const cx = hx + side * s * 0.058;
        g.fillStyle = alpha(col, 0.55);
        g.strokeStyle = col;
        g.beginPath();
        if (id === "glasses-heart") heartPath(g, cx, ey + er * 0.1, er * 1.35);
        else starPath(g, cx, ey, er * 1.5, er * 0.7, 5);
        g.fill();
        g.stroke();
      }
    } else {
      g.strokeStyle = "#5b4630";
      for (let side = -1; side <= 1; side += 2) {
        g.beginPath();
        g.arc(hx + side * s * 0.058, ey, er * 1.25, 0, TAU);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(hx - s * 0.058 + er * 1.25, ey);
      g.lineTo(hx + s * 0.058 - er * 1.25, ey);
      g.stroke();
    }
    g.restore();
  }
  function Art_leaf(g, x, y, r, rot, col) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    ellipse(g, 0, 0, r, r * 0.45, 0, col);
    g.restore();
  }
  function heartPath(g, x, y, r) {
    g.moveTo(x, y + r * 0.8);
    g.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.4);
    g.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.3, y - r * 0.1, x, y + r * 0.8);
    g.closePath();
  }
  function starPath(g, x, y, R, r, n = 5, rot = -Math.PI / 2) {
    for (let k = 0; k < n * 2; k++) {
      const a = rot + (k * Math.PI) / n;
      const rad = k % 2 ? r : R;
      k ? g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : g.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    g.closePath();
  }
  // hats sit at (x, y) = top of the head
  function drawHat(g, x, y, s, id, t) {
    g.save();
    g.translate(x, y);
    switch (id) {
      case "hat-straw":
        ellipse(g, 0, s * 0.02, s * 0.2, s * 0.05, 0, "#e9c46a");
        rrect(g, -s * 0.1, -s * 0.09, s * 0.2, s * 0.1, s * 0.04, "#f4d58d");
        g.fillStyle = "#e76f51";
        g.fillRect(-s * 0.1, -s * 0.02, s * 0.2, s * 0.025);
        break;
      case "hat-beanie":
        g.fillStyle = "#3fa7ff";
        g.beginPath();
        g.arc(0, s * 0.03, s * 0.13, Math.PI, 0);
        g.fill();
        rrect(g, -s * 0.14, 0, s * 0.28, s * 0.05, s * 0.02, "#2a7fd0");
        circle(g, 0, -s * 0.11, s * 0.045, "#fff");
        break;
      case "hat-flowers":
        for (let k = -3; k <= 3; k++) {
          const fx = k * s * 0.04;
          const fy = Math.abs(k) * s * 0.008;
          const col = ["#ff8fc7", "#ffcf4a", "#ffffff", "#9b7bff"][(k + 3) % 4];
          for (let p = 0; p < 5; p++) circle(g, fx + Math.cos((p * TAU) / 5) * s * 0.018, fy + Math.sin((p * TAU) / 5) * s * 0.018, s * 0.014, col);
          circle(g, fx, fy, s * 0.01, "#e9a23b");
        }
        break;
      case "hat-party": {
        g.fillStyle = "#9b7bff";
        g.beginPath();
        g.moveTo(-s * 0.09, s * 0.02);
        g.lineTo(0, -s * 0.2);
        g.lineTo(s * 0.09, s * 0.02);
        g.fill();
        g.fillStyle = "#ffcf4a";
        for (let k = 0; k < 3; k++) circle(g, -s * 0.03 + k * s * 0.03, -s * 0.04 - k * s * 0.03, s * 0.012, "#ffcf4a");
        circle(g, 0, -s * 0.21, s * 0.03, "#ff5a8a");
        break;
      }
      case "hat-top":
        ellipse(g, 0, s * 0.02, s * 0.17, s * 0.035, 0, "#2b2430");
        rrect(g, -s * 0.09, -s * 0.16, s * 0.18, s * 0.18, s * 0.02, "#2b2430");
        g.fillStyle = "#ff5a5f";
        g.fillRect(-s * 0.09, -s * 0.03, s * 0.18, s * 0.03);
        break;
      case "hat-beret":
        ellipse(g, s * 0.02, -s * 0.01, s * 0.15, s * 0.06, -0.15, "#e63946");
        circle(g, s * 0.03, -s * 0.07, s * 0.015, "#e63946");
        break;
      case "hat-bow":
        g.fillStyle = "#ff8fc7";
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-s * 0.09, -s * 0.05);
        g.lineTo(-s * 0.09, s * 0.04);
        g.closePath();
        g.moveTo(0, 0);
        g.lineTo(s * 0.09, -s * 0.05);
        g.lineTo(s * 0.09, s * 0.04);
        g.closePath();
        g.fill();
        circle(g, 0, 0, s * 0.025, "#e0569b");
        break;
      case "hat-cap":
        g.fillStyle = "#2fd38a";
        g.beginPath();
        g.arc(0, s * 0.02, s * 0.12, Math.PI, 0);
        g.fill();
        ellipse(g, s * 0.12, s * 0.02, s * 0.1, s * 0.025, 0, "#22a86c");
        break;
      case "hat-santa":
        g.fillStyle = "#e63946";
        g.beginPath();
        g.moveTo(-s * 0.12, s * 0.02);
        g.quadraticCurveTo(-s * 0.02, -s * 0.24, s * 0.16, -s * 0.12);
        g.lineTo(s * 0.12, s * 0.02);
        g.fill();
        rrect(g, -s * 0.14, -s * 0.005, s * 0.28, s * 0.05, s * 0.025, "#ffffff");
        circle(g, s * 0.17, -s * 0.12, s * 0.035, "#ffffff");
        break;
      case "hat-bonnet":
        g.fillStyle = "#ffe8a3";
        g.beginPath();
        g.arc(0, s * 0.03, s * 0.15, Math.PI, 0);
        g.fill();
        for (let k = 0; k < 3; k++) circle(g, -s * 0.08 + k * s * 0.05, -s * 0.06 - (k === 1 ? s * 0.03 : 0), s * 0.022, ["#ff8fc7", "#9b7bff", "#ffffff"][k]);
        break;
      case "hat-crown": {
        g.fillStyle = "#ffcf4a";
        g.beginPath();
        g.moveTo(-s * 0.1, s * 0.02);
        g.lineTo(-s * 0.11, -s * 0.09);
        g.lineTo(-s * 0.05, -s * 0.03);
        g.lineTo(0, -s * 0.12);
        g.lineTo(s * 0.05, -s * 0.03);
        g.lineTo(s * 0.11, -s * 0.09);
        g.lineTo(s * 0.1, s * 0.02);
        g.closePath();
        g.fill();
        circle(g, 0, -s * 0.02, s * 0.018, "#ff5a5f");
        circle(g, -s * 0.06, -s * 0.0, s * 0.012, "#3fa7ff");
        circle(g, s * 0.06, -s * 0.0, s * 0.012, "#2fd38a");
        if (Math.sin(t * 3) > 0.7) {
          g.fillStyle = "#fff";
          g.beginPath();
          starPath(g, s * 0.07, -s * 0.1, s * 0.03, s * 0.01, 4);
          g.fill();
        }
        break;
      }
      case "hat-laurel":
        for (let side = -1; side <= 1; side += 2)
          for (let k = 0; k < 5; k++) {
            const a = Math.PI + side * (0.3 + k * 0.28);
            Art_leaf(g, Math.cos(a) * s * 0.13 * -side, s * 0.02 + Math.sin(a) * s * 0.06 - k * s * 0.012, s * 0.045, a, "#6fae4a");
          }
        Art_leaf(g, 0, -s * 0.05, s * 0.04, -Math.PI / 2, "#ffcf4a");
        break;
      case "hat-sunflower":
        for (let p = 0; p < 10; p++) ellipse(g, s * 0.07 + Math.cos((p * TAU) / 10) * s * 0.04, -s * 0.03 + Math.sin((p * TAU) / 10) * s * 0.04, s * 0.025, s * 0.012, (p * TAU) / 10, "#ffcf4a");
        circle(g, s * 0.07, -s * 0.03, s * 0.025, "#8a5a3c");
        break;
    }
    g.restore();
  }

  // ---------- a small sheep in a player's colour ----------
  function drawSheep(g, x, y, r, color, o = {}) {
    g.save();
    g.translate(x, y);
    if (o.flip) g.scale(-1, 1);
    g.fillStyle = "#2b2430";
    g.fillRect(-r * 0.45, r * 0.45, r * 0.18, r * 0.45);
    g.fillRect(r * 0.25, r * 0.45, r * 0.18, r * 0.45);
    const light = shade(color, 0.45);
    for (let k = 0; k < SHEEP.length; k += 2) circle(g, SHEEP[k] * r, SHEEP[k + 1] * r, r * 0.48, color);
    for (let k = 0; k < SHEEP_HI.length; k += 2) circle(g, SHEEP_HI[k] * r, SHEEP_HI[k + 1] * r, r * 0.26, light);
    if (o.pattern && o.pattern !== "pattern-plain") drawPattern(g, r, o.pattern, color);
    ellipse(g, r * 0.78, -r * 0.15, r * 0.3, r * 0.36, 0.3, "#2b2430");
    circle(g, r * 0.84, -r * 0.24, r * 0.07, "#ffffff");
    g.restore();
  }
  const SHEEP = [-0.45, 0, 0, -0.35, 0.4, -0.05, 0.05, 0.3, -0.3, 0.3, 0.35, 0.3];
  const SHEEP_HI = [-0.35, -0.1, 0.05, -0.38, 0.3, -0.12];
  function drawPattern(g, r, id, color) {
    const c = shade(color, -0.25);
    g.fillStyle = c;
    if (id === "pattern-spots") {
      for (const [px, py] of [[-0.35, 0.15], [0.15, 0.1], [-0.05, -0.2]]) circle(g, px * r, py * r, r * 0.13, c);
    } else if (id === "pattern-hearts") {
      g.beginPath();
      heartPath(g, -0.1 * r, 0.05 * r, r * 0.22);
      g.fill();
    } else if (id === "pattern-stars") {
      g.beginPath();
      starPath(g, -0.1 * r, 0.02 * r, r * 0.3, r * 0.13);
      g.fill();
    } else if (id === "pattern-stripes") {
      g.fillRect(-0.55 * r, -0.05 * r, 1.1 * r, 0.12 * r);
      g.fillRect(-0.5 * r, 0.22 * r, 1.0 * r, 0.12 * r);
    }
  }

  // ---------- the cheeky wolf (never scary: big eyes, one tooth, a grin) ----------
  function drawWolf(g, x, y, s, o = {}) {
    const t = o.t ?? 0;
    g.save();
    g.translate(x, y + Math.sin(t * 2.4) * s * 0.012);
    if (o.flip) g.scale(-1, 1);
    const fur = o.color ?? "#8b8f9c";
    const dark = shade(fur, -0.35);
    for (let side = -1; side <= 1; side += 2) {
      g.fillStyle = fur;
      g.beginPath();
      g.moveTo(side * s * 0.12, -s * 0.22);
      g.lineTo(side * s * 0.38, -s * 0.52);
      g.lineTo(side * s * 0.4, -s * 0.12);
      g.fill();
      g.fillStyle = "#d9a3ab";
      g.beginPath();
      g.moveTo(side * s * 0.18, -s * 0.22);
      g.lineTo(side * s * 0.35, -s * 0.42);
      g.lineTo(side * s * 0.36, -s * 0.18);
      g.fill();
    }
    g.fillStyle = fur;
    g.beginPath();
    g.moveTo(-s * 0.42, -s * 0.05);
    g.quadraticCurveTo(-s * 0.4, -s * 0.38, 0, -s * 0.36);
    g.quadraticCurveTo(s * 0.4, -s * 0.38, s * 0.42, -s * 0.05);
    g.lineTo(s * 0.5, s * 0.08);
    g.lineTo(s * 0.34, s * 0.1);
    g.quadraticCurveTo(s * 0.2, s * 0.32, 0, s * 0.33);
    g.quadraticCurveTo(-s * 0.2, s * 0.32, -s * 0.34, s * 0.1);
    g.lineTo(-s * 0.5, s * 0.08);
    g.closePath();
    g.fill();
    ellipse(g, 0, s * 0.12, s * 0.2, s * 0.15, 0, "#e3e1e6");
    ellipse(g, 0, s * 0.03, s * 0.07, s * 0.045, 0, "#2a2530");
    const scared = o.mood === "scared" || o.mood === "sad";
    for (let side = -1; side <= 1; side += 2) {
      const ex = side * s * 0.16;
      const ey = -s * 0.13;
      ellipse(g, ex, ey, s * 0.075, s * (scared ? 0.075 : 0.06), 0, "#ffe680");
      circle(g, ex + s * 0.02 * (scared ? 0 : 1), ey + s * 0.01, s * (scared ? 0.022 : 0.03), "#2a2530");
      if (!scared) {
        g.fillStyle = fur;
        g.beginPath();
        g.ellipse(ex, ey - s * 0.03, s * 0.085, s * 0.05, side * -0.25, Math.PI, 0);
        g.fill();
      }
      g.strokeStyle = dark;
      g.lineWidth = s * 0.02;
      g.beginPath();
      const tilt = scared ? -side : side;
      g.moveTo(ex - s * 0.08, ey - s * (scared ? 0.08 : 0.03) - tilt * s * 0.02);
      g.lineTo(ex + s * 0.08, ey - s * (scared ? 0.08 : 0.03) + tilt * s * 0.02);
      g.stroke();
    }
    g.strokeStyle = "#2a2530";
    g.lineWidth = s * 0.022;
    g.lineCap = "round";
    g.beginPath();
    if (scared) {
      g.ellipse(0, s * 0.18, s * 0.05, s * 0.04, 0, 0, TAU);
    } else {
      g.moveTo(-s * 0.11, s * 0.15);
      g.quadraticCurveTo(0, s * 0.24, s * 0.13, s * 0.13);
    }
    g.stroke();
    if (!scared) {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(s * 0.03, s * 0.2);
      g.lineTo(s * 0.07, s * 0.19);
      g.lineTo(s * 0.05, s * 0.25);
      g.fill();
    }
    if (o.mood === "dizzy") {
      for (let k = 0; k < 3; k++) {
        const a = t * 4 + (k * TAU) / 3;
        g.fillStyle = "#ffcf4a";
        g.beginPath();
        starPath(g, Math.cos(a) * s * 0.3, -s * 0.45 + Math.sin(a) * s * 0.08, s * 0.06, s * 0.025);
        g.fill();
      }
    }
    g.restore();
  }

  // A whole wolf running away (for the Shepherd's moment): a body, legs and a waggy tail.
  function drawWolfRunning(g, x, y, s, t) {
    g.save();
    g.translate(x, y);
    const fur = "#8b8f9c";
    const leg = Math.sin(t * 20) * s * 0.08;
    g.fillStyle = shade(fur, -0.2);
    for (const [lx, d] of [[-0.25, 1], [-0.1, -1], [0.18, 1], [0.32, -1]]) {
      g.beginPath();
      g.roundRect(lx * s + d * leg * 0.5, s * 0.08, s * 0.06, s * 0.22, s * 0.03);
      g.fill();
    }
    ellipse(g, 0, 0, s * 0.42, s * 0.2, 0, fur);
    g.save();
    g.translate(-s * 0.4, -s * 0.05);
    g.rotate(-0.6 + Math.sin(t * 16) * 0.3);
    ellipse(g, -s * 0.12, 0, s * 0.16, s * 0.06, 0, fur);
    g.restore();
    drawWolf(g, s * 0.42, -s * 0.15, s * 0.5, { t, mood: "scared" });
    g.restore();
  }

  // ---------- the Shepherd: a warm silhouette with a staff in golden light, no face ----------
  // o: { t, alpha, carry (the lamb on his shoulders), rays, look (the lamb's outfit) }
  function drawShepherd(g, x, y, h, o = {}) {
    const t = o.t ?? 0;
    g.save();
    g.translate(x, y);
    g.globalAlpha = o.alpha ?? 1;
    if (o.rays !== false) {
      g.save();
      g.translate(0, -h * 0.6);
      g.rotate(t * 0.15);
      for (let k = 0; k < 12; k++) {
        g.rotate(TAU / 12);
        const gr = g.createLinearGradient(0, 0, 0, -h * 1.1);
        gr.addColorStop(0, "rgba(255,226,150,0.35)");
        gr.addColorStop(1, "rgba(255,226,150,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(-h * 0.04, 0);
        g.lineTo(-h * 0.1, -h * 1.1);
        g.lineTo(h * 0.1, -h * 1.1);
        g.lineTo(h * 0.04, 0);
        g.fill();
      }
      g.restore();
    }
    const glow = g.createRadialGradient(0, -h * 0.55, h * 0.05, 0, -h * 0.55, h * 0.65);
    glow.addColorStop(0, "rgba(255,230,160,0.75)");
    glow.addColorStop(0.5, "rgba(255,210,120,0.3)");
    glow.addColorStop(1, "rgba(255,210,120,0)");
    circle(g, 0, -h * 0.55, h * 0.65, glow);
    const robe = g.createLinearGradient(-h * 0.25, 0, h * 0.25, 0);
    robe.addColorStop(0, "#5c3a26");
    robe.addColorStop(0.55, "#8a5a3a");
    robe.addColorStop(1, "#c98f5a");
    g.fillStyle = robe;
    g.beginPath();
    g.moveTo(-h * 0.12, -h * 0.72);
    g.quadraticCurveTo(-h * 0.21, -h * 0.3, -h * 0.25, 0);
    g.lineTo(h * 0.25, 0);
    g.quadraticCurveTo(h * 0.21, -h * 0.3, h * 0.12, -h * 0.72);
    g.closePath();
    g.fill();
    // sash
    g.strokeStyle = "rgba(255,226,170,0.55)";
    g.lineWidth = h * 0.02;
    g.beginPath();
    g.moveTo(-h * 0.13, -h * 0.62);
    g.lineTo(h * 0.15, -h * 0.4);
    g.stroke();
    // hooded head (no face, a soft light where the face would be)
    circle(g, 0, -h * 0.8, h * 0.115, "#6b4530");
    const face = g.createRadialGradient(h * 0.015, -h * 0.79, 0, h * 0.015, -h * 0.79, h * 0.08);
    face.addColorStop(0, "rgba(255,236,200,0.7)");
    face.addColorStop(1, "rgba(255,236,200,0)");
    circle(g, h * 0.015, -h * 0.79, h * 0.08, face);
    // a rim of light
    g.strokeStyle = "rgba(255,230,160,0.8)";
    g.lineWidth = h * 0.012;
    g.beginPath();
    g.arc(0, -h * 0.8, h * 0.118, -1.9, -0.2);
    g.stroke();
    if (o.carry) {
      // the lamb laid on his shoulders, rejoicing (Luke 15:5)
      drawLamb(g, 0, -h * 0.74, h * 0.34, { t, look: o.look, mood: "joy", still: true });
      g.strokeStyle = "#6b4530";
      g.lineWidth = h * 0.045;
      g.lineCap = "round";
      for (let side = -1; side <= 1; side += 2) {
        g.beginPath();
        g.moveTo(side * h * 0.11, -h * 0.66);
        g.quadraticCurveTo(side * h * 0.2, -h * 0.72, side * h * 0.15, -h * 0.82);
        g.stroke();
      }
    } else {
      // staff with crook
      g.strokeStyle = "#c9a26b";
      g.lineWidth = h * 0.025;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(h * 0.3, 0);
      g.lineTo(h * 0.3, -h * 0.95);
      g.arc(h * 0.38, -h * 0.95, h * 0.08, Math.PI, 0);
      g.lineTo(h * 0.46, -h * 0.9);
      g.stroke();
      // the hand on the staff
      g.strokeStyle = "#6b4530";
      g.lineWidth = h * 0.045;
      g.beginPath();
      g.moveTo(h * 0.13, -h * 0.6);
      g.quadraticCurveTo(h * 0.24, -h * 0.55, h * 0.29, -h * 0.62);
      g.stroke();
    }
    g.restore();
  }

  // ---------- the pasture (Home, results, scenes) ----------
  // Static layers are cached per size, time of day and season; only clouds, stars and creatures move.
  const SKIES = {
    dawn: ["#ffb38a", "#ffd9a8", "#cfe3ff"],
    day: ["#7cc6ff", "#b8e3ff", "#e9f7ff"],
    dusk: ["#5b4b8a", "#e0809a", "#ffc58a"],
    night: ["#0e1830", "#1d2b52", "#33416b"],
  };
  const HILLS = {
    dawn: ["#7fae6a", "#5f9a55", "#4b8547"],
    day: ["#8cc96b", "#6cb35a", "#56a04d"],
    dusk: ["#6d8d5e", "#557a4f", "#456a43"],
    night: ["#2e4a3c", "#243d31", "#1b3227"],
  };
  let sceneCache = null;
  function pastureStatic(w, h, part, season, dpr) {
    const k = `${w}|${h}|${part}|${season}|${dpr}`;
    if (sceneCache && sceneCache.k === k) return sceneCache.cv;
    const cv = document.createElement("canvas");
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d");
    g.scale(dpr, dpr);
    const sky = season === "easter" && part !== "night" ? ["#ffb08a", "#ffe3b0", "#fff6dc"] : SKIES[part];
    const gr = g.createLinearGradient(0, 0, 0, h * 0.7);
    gr.addColorStop(0, sky[0]);
    gr.addColorStop(0.6, sky[1]);
    gr.addColorStop(1, sky[2]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // the sun or moon
    if (part === "night") {
      circle(g, w * 0.8, h * 0.14, Math.min(w, h) * 0.05, "#fdf3c8");
      circle(g, w * 0.8 + Math.min(w, h) * 0.02, h * 0.14 - Math.min(w, h) * 0.012, Math.min(w, h) * 0.045, sky[0]);
    } else {
      const sy = part === "day" ? h * 0.13 : h * 0.36;
      const sx = season === "easter" ? w * 0.5 : part === "dusk" ? w * 0.2 : w * 0.8;
      const sr = Math.min(w, h) * (season === "easter" ? 0.09 : 0.06);
      const sg = g.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 3.2);
      sg.addColorStop(0, "rgba(255,240,180,0.9)");
      sg.addColorStop(1, "rgba(255,240,180,0)");
      circle(g, sx, sy, sr * 3.2, sg);
      circle(g, sx, sy, sr, "#fff3b8");
    }
    const [h1, h2, h3] = HILLS[part];
    hill(g, w, h, 0.62, 0.08, 1.3, h1);
    if (season === "christmas") drawStable(g, w * 0.74, h * 0.6, Math.min(w, h) * 0.16, part);
    if (season === "easter") drawTomb(g, w * 0.78, h * 0.66, Math.min(w, h) * 0.18);
    hill(g, w, h, 0.7, 0.06, 2.1, h2);
    hill(g, w, h, 0.8, 0.04, 0.9, h3);
    // grass tufts and flowers
    const rng = RNG(7);
    for (let k = 0; k < 60; k++) {
      const fx = rng() * w;
      const fy = h * (0.78 + rng() * 0.22);
      g.strokeStyle = "rgba(255,255,255,0.12)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(fx, fy);
      g.lineTo(fx - 2, fy - 6);
      g.moveTo(fx + 3, fy);
      g.lineTo(fx + 4, fy - 7);
      g.stroke();
      if (k % 4 === 0 && part !== "night") {
        const col = ["#ffffff", "#ffd84a", "#ff9ac1", "#c9a7ff"][k % 4 === 0 ? (k / 4) % 4 : 0];
        for (let p = 0; p < 5; p++) circle(g, fx + Math.cos((p * TAU) / 5) * 3, fy - 8 + Math.sin((p * TAU) / 5) * 3, 2.2, col);
        circle(g, fx, fy - 8, 1.6, "#e9a23b");
      }
    }
    if (season === "easter") {
      for (let k = 0; k < 14; k++) {
        const fx = rng() * w;
        const fy = h * (0.82 + rng() * 0.15);
        for (let p = 0; p < 6; p++) ellipse(g, fx + Math.cos((p * TAU) / 6) * 4, fy + Math.sin((p * TAU) / 6) * 4, 3.4, 2, (p * TAU) / 6, k % 2 ? "#ffffff" : "#fff1a8");
        circle(g, fx, fy, 2.4, "#ffc23a");
      }
    }
    // a wooden fence
    g.fillStyle = part === "night" ? "#4b3a2c" : "#a8794e";
    const fy = h * 0.74;
    for (let fx = -10; fx < w * 0.45; fx += 26) g.fillRect(fx, fy - 18, 6, 26);
    g.fillRect(-10, fy - 14, w * 0.45, 4);
    g.fillRect(-10, fy - 4, w * 0.45, 4);
    sceneCache = { k, cv };
    return cv;
  }
  function hill(g, w, h, top, amp, freq, col) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) g.lineTo(x, h * top + Math.sin((x / w) * Math.PI * freq + top * 9) * h * amp);
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  }
  function drawStable(g, x, y, s, part) {
    const wood = part === "night" ? "#3d2c22" : "#7a5233";
    g.fillStyle = wood;
    g.fillRect(x - s * 0.5, y - s * 0.45, s, s * 0.45);
    g.fillStyle = shade("#7a5233", -0.3);
    g.beginPath();
    g.moveTo(x - s * 0.62, y - s * 0.42);
    g.lineTo(x, y - s * 0.8);
    g.lineTo(x + s * 0.62, y - s * 0.42);
    g.closePath();
    g.fill();
    // warm light from inside
    const gr = g.createRadialGradient(x, y - s * 0.2, 2, x, y - s * 0.2, s * 0.4);
    gr.addColorStop(0, "rgba(255,214,120,0.95)");
    gr.addColorStop(1, "rgba(255,214,120,0)");
    g.fillStyle = "#2a1c14";
    g.fillRect(x - s * 0.22, y - s * 0.38, s * 0.44, s * 0.38);
    circle(g, x, y - s * 0.2, s * 0.4, gr);
    // a little manger
    g.fillStyle = "#c9a26b";
    g.fillRect(x - s * 0.12, y - s * 0.1, s * 0.24, s * 0.06);
    g.fillStyle = "#ffe08a";
    g.fillRect(x - s * 0.1, y - s * 0.13, s * 0.2, s * 0.04);
  }
  function drawTomb(g, x, y, s) {
    // a garden tomb with the stone rolled away (He is risen!)
    g.fillStyle = "#b9b1a5";
    g.beginPath();
    g.moveTo(x - s * 0.7, y);
    g.quadraticCurveTo(x - s * 0.6, y - s * 0.9, x, y - s * 0.95);
    g.quadraticCurveTo(x + s * 0.65, y - s * 0.9, x + s * 0.75, y);
    g.closePath();
    g.fill();
    g.fillStyle = "#3a3330";
    g.beginPath();
    g.ellipse(x - s * 0.05, y, s * 0.24, s * 0.4, 0, Math.PI, 0);
    g.fill();
    const gr = g.createRadialGradient(x - s * 0.05, y - s * 0.15, 1, x - s * 0.05, y - s * 0.15, s * 0.5);
    gr.addColorStop(0, "rgba(255,244,200,0.85)");
    gr.addColorStop(1, "rgba(255,244,200,0)");
    circle(g, x - s * 0.05, y - s * 0.15, s * 0.5, gr);
    circle(g, x + s * 0.55, y - s * 0.22, s * 0.25, "#9e968a");
    circle(g, x + s * 0.5, y - s * 0.27, s * 0.12, "#aaa296");
  }
  // the Bethlehem star with slow-turning rays
  function drawBethlehemStar(g, x, y, s, t) {
    g.save();
    g.translate(x, y);
    const gr = g.createRadialGradient(0, 0, 1, 0, 0, s * 2.2);
    gr.addColorStop(0, "rgba(255,248,210,0.95)");
    gr.addColorStop(1, "rgba(255,248,210,0)");
    circle(g, 0, 0, s * 2.2, gr);
    g.rotate(t * 0.1);
    g.fillStyle = "#fff8d8";
    g.beginPath();
    starPath(g, 0, 0, s, s * 0.22, 4, 0);
    g.fill();
    g.rotate(Math.PI / 4);
    g.globalAlpha = 0.7;
    g.beginPath();
    starPath(g, 0, 0, s * 0.6, s * 0.15, 4, 0);
    g.fill();
    g.restore();
    // a long ray down towards the stable
    const ray = g.createLinearGradient(x, y, x, y + s * 6);
    ray.addColorStop(0, "rgba(255,248,210,0.45)");
    ray.addColorStop(1, "rgba(255,248,210,0)");
    g.fillStyle = ray;
    g.beginPath();
    g.moveTo(x - s * 0.15, y);
    g.lineTo(x - s * 0.8, y + s * 6);
    g.lineTo(x + s * 0.8, y + s * 6);
    g.lineTo(x + s * 0.15, y);
    g.fill();
  }

  // stars for the night sky: fixed places, gentle twinkle
  const STARS = (() => {
    const r = RNG(11);
    return Array.from({ length: 60 }, () => [r(), r() * 0.55, r() * TAU, 0.6 + r() * 1.2]);
  })();
  const CLOUDS = [[0.1, 0.12, 1], [0.5, 0.2, 0.7], [0.82, 0.08, 0.85], [0.3, 0.3, 0.6]];

  // o: { t, part, season, dpr, reduced }
  function drawPasture(g, w, h, o) {
    const part = o.part;
    g.drawImage(pastureStatic(w, h, part, o.season, o.dpr), 0, 0, w, h);
    const t = o.reduced ? 0 : o.t;
    if (part === "night" || part === "dusk") {
      for (const [sx, sy, ph, sz] of STARS) {
        const a = part === "night" ? 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + ph)) : 0.25;
        g.globalAlpha = a;
        circle(g, sx * w, sy * h, sz, "#ffffff");
      }
      g.globalAlpha = 1;
    }
    if (o.season === "christmas") drawBethlehemStar(g, w * 0.74, h * (part === "day" ? 0.2 : 0.16), Math.min(w, h) * 0.035, o.t);
    if (part !== "night") {
      for (const [cx, cy, cs] of CLOUDS) {
        const x = (((cx * w + t * 8 * cs) % (w + 160)) + w + 160) % (w + 160) - 80;
        cloud(g, x, cy * h, 34 * cs, part === "dusk" ? "rgba(255,220,230,0.7)" : "rgba(255,255,255,0.85)");
      }
    }
  }
  function cloud(g, x, y, s, col) {
    for (const [dx, dy, r] of [[0, 0, 1], [0.9, 0.1, 0.8], [-0.9, 0.15, 0.75], [0.35, -0.45, 0.7]]) circle(g, x + dx * s, y + dy * s, r * s, col);
  }

  // ---------- board bits ----------
  function drawGift(g, x, y, r, t) {
    y += Math.sin(t * 4) * r * 0.08;
    g.fillStyle = "#c0398f";
    g.fillRect(x - r, y - r * 0.7, r * 2, r * 1.6);
    g.fillStyle = "#e050ad";
    g.fillRect(x - r * 1.1, y - r * 0.95, r * 2.2, r * 0.45);
    g.fillStyle = "#ffcf4a";
    g.fillRect(x - r * 0.16, y - r * 0.95, r * 0.32, r * 1.85);
    ellipse(g, x - r * 0.4, y - r * 1.12, r * 0.35, r * 0.2, -0.4, "#ffcf4a");
    ellipse(g, x + r * 0.4, y - r * 1.12, r * 0.35, r * 0.2, 0.4, "#ffcf4a");
  }

  // the player symbols, drawn the same everywhere (board, buttons, menus)
  function mark(g, x, y, s, sym, fill = "rgba(255,255,255,0.92)") {
    g.fillStyle = fill;
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.lineWidth = Math.max(1, s * 0.22);
    g.beginPath();
    if (sym === "circle") g.arc(x, y, s * 0.55, 0, TAU);
    else if (sym === "triangle") {
      g.moveTo(x, y - s * 0.65);
      g.lineTo(x + s * 0.62, y + s * 0.45);
      g.lineTo(x - s * 0.62, y + s * 0.45);
    } else if (sym === "square") g.rect(x - s * 0.48, y - s * 0.48, s * 0.96, s * 0.96);
    else {
      g.moveTo(x, y - s * 0.7);
      g.lineTo(x + s * 0.6, y);
      g.lineTo(x, y + s * 0.7);
      g.lineTo(x - s * 0.6, y);
    }
    g.closePath();
    g.stroke();
    g.fill();
  }

  // ---------- canvases ----------
  // Sets up a fixed-size canvas at screen sharpness (capped at 2x); returns its context.
  function sharp(cv, w, h, cap = 2) {
    const dpr = Math.min(cap, window.devicePixelRatio || 1);
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return g;
  }

  return {
    TAU, circle, ellipse, rrect, shade, alpha, starPath, heartPath, drawLamb, drawSheep, drawPattern, drawWolf, drawWolfRunning,
    drawShepherd, drawPasture, drawBethlehemStar, drawStable, drawTomb, drawGift, drawHat, mark, sharp, cloud,
    PALETTES, SYMBOLS, WOOL, SCARVES,
  };
})();
