// Screen, input, animation and menus. The rules live in engine.js.
import { capacity, createGame, isLegal, playMove } from "./engine.js";
import { chooseMove } from "./ai.js";

const COLORS = [
  { name: "Red", hex: "#ff3b5c" },
  { name: "Green", hex: "#2ee66b" },
  { name: "Blue", hex: "#3a86ff" },
  { name: "Yellow", hex: "#ffd60a" },
  { name: "Purple", hex: "#c157ff" },
  { name: "Cyan", hex: "#22e0e0" },
  { name: "Orange", hex: "#ff8c1a" },
  { name: "White", hex: "#f2f2f7" },
];
const SIZES = { classic: { rows: 9, cols: 6 }, big: { rows: 12, cols: 8 } };
const KINDS = [
  ["human", "Human"],
  ["easy", "Bot · Easy"],
  ["medium", "Bot · Medium"],
  ["hard", "Bot · Hard"],
];
const MIN_PLAYERS = 2;
const MAX_PLAYERS = COLORS.length;
const BOT_DELAY_MS = 450;
const STORAGE_KEY = "chain-burst:v1";

const $ = (id) => document.getElementById(id);
const canvas = $("board");
const ctx = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const prefs = loadPrefs();
const setup = {
  count: prefs.count ?? 2,
  kinds: prefs.kinds ?? ["human", "medium", "medium", "medium", "medium", "medium", "medium", "medium"],
  size: prefs.size ?? "classic",
};
let soundOn = prefs.sound ?? true;

let state = null; // engine state; the source of truth
let history = []; // earlier states, for undo
let display = null; // { owner, count } currently drawn on screen
let anim = null; // { player, waves, index, start, final }
let botTimer = null;
let paused = true;
let cellSize = 0;
let dpr = 1;

// ---------- storage ----------

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...setup, sound: soundOn }));
  } catch {
    // Storage can be blocked (private mode); preferences just won't persist.
  }
}

// ---------- sound ----------

let audio = null;

function pop(wave) {
  if (!soundOn) return;
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(Math.min(260 + wave * 45, 1400), t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  } catch {
    soundOn = false;
  }
}

// ---------- menu ----------

function renderMenu() {
  $("player-count").textContent = setup.count;
  $("fewer").disabled = setup.count <= MIN_PLAYERS;
  $("more").disabled = setup.count >= MAX_PLAYERS;

  const list = $("players");
  list.replaceChildren();
  for (let i = 0; i < setup.count; i++) {
    const li = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "dot";
    swatch.style.color = COLORS[i].hex;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = COLORS[i].name;
    const select = document.createElement("select");
    select.setAttribute("aria-label", `${COLORS[i].name} player type`);
    for (const [value, label] of KINDS) select.add(new Option(label, value, false, setup.kinds[i] === value));
    select.addEventListener("change", () => {
      setup.kinds[i] = select.value;
      savePrefs();
    });
    li.append(swatch, name, select);
    list.append(li);
  }

  for (const b of $("sizes").querySelectorAll("button")) b.classList.toggle("on", b.dataset.size === setup.size);
  $("resume").hidden = !state || state.winner !== -1;
}

function openMenu() {
  paused = true;
  clearTimeout(botTimer);
  renderMenu();
  $("result").hidden = true;
  $("menu").hidden = false;
}

function closeMenu() {
  $("menu").hidden = true;
  paused = false;
  resize();
  updateHud();
  maybeBot();
}

// ---------- game flow ----------

const kindOf = (s, p = s.current) => s.players[p].kind;
const colorOf = (p) => COLORS[p].hex;

function startGame() {
  const { rows, cols } = SIZES[setup.size];
  const players = setup.kinds.slice(0, setup.count).map((kind, i) => ({ kind, name: COLORS[i].name }));
  state = createGame({ rows, cols, players });
  history = [];
  anim = null;
  display = { owner: state.owner, count: state.count };
  savePrefs();
  closeMenu();
}

function canHumanMove() {
  return state && !paused && !anim && state.winner === -1 && kindOf(state) === "human";
}

function makeMove(i) {
  history.push(state);
  const player = state.current;
  const { state: next, placed, waves } = playMove(state, i);
  display = placed;
  pop(0);
  if (waves.length) {
    anim = { player, waves, index: 0, start: null, final: next };
  } else {
    state = next;
    afterMove();
  }
  updateHud();
}

function afterMove() {
  display = { owner: state.owner, count: state.count };
  updateHud();
  if (state.winner !== -1) setTimeout(showResult, reducedMotion ? 0 : 500);
  else maybeBot();
}

function maybeBot() {
  clearTimeout(botTimer);
  if (!state || paused || anim || state.winner !== -1) return;
  const kind = kindOf(state);
  if (kind === "human") return;
  botTimer = setTimeout(() => {
    if (paused || anim) return;
    makeMove(chooseMove(state, kind));
  }, BOT_DELAY_MS);
}

function undo() {
  if (paused || anim) return;
  clearTimeout(botTimer);
  while (history.length) {
    const prev = history.pop();
    if (kindOf(prev) === "human") {
      state = prev;
      afterMove();
      return;
    }
  }
}

function showResult() {
  const w = state.winner;
  $("winner-orb").style.background = orbGradientCss(colorOf(w));
  $("result-text").textContent = `${COLORS[w].name} wins!`;
  $("result-sub").textContent = `${state.turn} moves`;
  $("result").hidden = false;
}

function updateHud() {
  if (!state) return;
  const p = anim ? anim.player : state.winner !== -1 ? state.winner : state.current;
  $("turn-dot").style.color = colorOf(p);
  const name = COLORS[p].name;
  let text;
  if (state.winner !== -1 && !anim) text = `${name} wins!`;
  else if (anim) text = `${name} — boom!`;
  else if (kindOf(state) !== "human") text = `${name} is thinking…`;
  else text = `${name}'s turn`;
  $("turn-text").textContent = text;
  $("undo").disabled = !!anim || !history.some((s) => kindOf(s) === "human");
}

// ---------- drawing ----------

function resize() {
  if (!state) return;
  const wrap = $("board-wrap");
  const style = getComputedStyle(wrap);
  const w = wrap.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const h = wrap.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  cellSize = Math.max(16, Math.floor(Math.min(w / state.cols, h / state.rows)));
  dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cellSize * state.cols}px`;
  canvas.style.height = `${cellSize * state.rows}px`;
  canvas.width = Math.round(cellSize * state.cols * dpr);
  canvas.height = Math.round(cellSize * state.rows * dpr);
}

function mix(hex, target, amount) {
  const n = parseInt(hex.slice(1), 16);
  const t = parseInt(target.slice(1), 16);
  const ch = (v, shift) => Math.round(((v >> shift) & 255) * (1 - amount) + ((t >> shift) & 255) * amount);
  return `rgb(${ch(n, 16)}, ${ch(n, 8)}, ${ch(n, 0)})`;
}

function orbGradientCss(hex) {
  return `radial-gradient(circle at 35% 30%, ${mix(hex, "#ffffff", 0.7)}, ${hex} 45%, ${mix(hex, "#000000", 0.55)})`;
}

function drawOrb(x, y, r, hex) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, mix(hex, "#ffffff", 0.7));
  g.addColorStop(0.45, hex);
  g.addColorStop(1, mix(hex, "#000000", 0.55));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

const center = (i) => [((i % state.cols) + 0.5) * cellSize, (Math.floor(i / state.cols) + 0.5) * cellSize];

// Orbs in a cell sit in a little cluster that spins; nearly-full cells spin
// faster and shake, like the original game.
function drawCell(i, n, hex, critical, now) {
  const [cx, cy] = center(i);
  const r = cellSize * 0.17;
  const d = r * 0.8;
  const spin = reducedMotion ? 0 : (now / 1000) * (critical ? 3 : 0.9);
  const jitter = critical && !reducedMotion ? cellSize * 0.025 : 0;
  const ox = jitter * Math.sin(now / 23 + i);
  const oy = jitter * Math.cos(now / 29 + i);
  const shown = Math.min(n, 4);
  const spots =
    shown === 1
      ? [[0, 0]]
      : Array.from({ length: shown }, (_, k) => {
          const a = spin + (k / shown) * Math.PI * 2;
          return [Math.cos(a) * d, Math.sin(a) * d];
        });
  for (const [x, y] of spots) drawOrb(cx + x + ox, cy + y + oy, r, hex);
}

const ease = (t) => 1 - (1 - t) ** 3;
const waveDuration = (index) => (reducedMotion ? 60 : Math.max(110, 260 - index * 12));

function stepAnimation(now) {
  anim.start ??= now;
  if (now - anim.start < waveDuration(anim.index)) return;
  const wave = anim.waves[anim.index];
  display = { owner: wave.owner, count: wave.count };
  anim.index++;
  anim.start = now;
  if (anim.index < anim.waves.length) {
    pop(anim.index);
  } else {
    state = anim.final;
    anim = null;
    afterMove();
  }
}

function draw(now) {
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (!state || !display) return;

  // Grid lines take the colour of whoever is playing.
  const active = anim ? anim.player : state.winner !== -1 ? state.winner : state.current;
  ctx.strokeStyle = colorOf(active);
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let c = 0; c <= state.cols; c++) {
    const x = Math.min(Math.max(c * cellSize, 0.75), width - 0.75);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let r = 0; r <= state.rows; r++) {
    const y = Math.min(Math.max(r * cellSize, 0.75), height - 0.75);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // While a wave is exploding, its cells have already thrown their orbs.
  const count = display.count.slice();
  const wave = anim && anim.start !== null ? anim.waves[anim.index] : null;
  if (wave) for (const { from, to } of wave.explosions) count[from] = Math.max(0, count[from] - to.length);

  for (let i = 0; i < count.length; i++) {
    if (count[i] <= 0 || display.owner[i] === -1) continue;
    drawCell(i, count[i], colorOf(display.owner[i]), count[i] >= capacity(state, i) - 1, now);
  }

  if (wave) {
    const t = ease(Math.min(1, (now - anim.start) / waveDuration(anim.index)));
    const hex = colorOf(anim.player);
    for (const { from, to } of wave.explosions) {
      const [fx, fy] = center(from);
      for (const target of to) {
        const [tx, ty] = center(target);
        drawOrb(fx + (tx - fx) * t, fy + (ty - fy) * t, cellSize * 0.17, hex);
      }
    }
  }
}

function frame(now) {
  if (anim) stepAnimation(now);
  draw(now);
  requestAnimationFrame(frame);
}

// ---------- input ----------

canvas.addEventListener("pointerdown", (e) => {
  if (!canHumanMove()) return;
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / cellSize);
  const row = Math.floor((e.clientY - rect.top) / cellSize);
  if (row < 0 || col < 0 || row >= state.rows || col >= state.cols) return;
  const i = row * state.cols + col;
  if (isLegal(state, i)) makeMove(i);
});

$("fewer").addEventListener("click", () => {
  setup.count = Math.max(MIN_PLAYERS, setup.count - 1);
  savePrefs();
  renderMenu();
});
$("more").addEventListener("click", () => {
  setup.count = Math.min(MAX_PLAYERS, setup.count + 1);
  savePrefs();
  renderMenu();
});
$("sizes").addEventListener("click", (e) => {
  const size = e.target.closest("button")?.dataset.size;
  if (!size) return;
  setup.size = size;
  savePrefs();
  renderMenu();
});
$("start").addEventListener("click", startGame);
$("resume").addEventListener("click", closeMenu);
$("open-menu").addEventListener("click", openMenu);
$("again").addEventListener("click", startGame);
$("to-menu").addEventListener("click", openMenu);
$("undo").addEventListener("click", undo);

function renderSound() {
  $("sound").textContent = soundOn ? "🔊" : "🔇";
}
$("sound").addEventListener("click", () => {
  soundOn = !soundOn;
  savePrefs();
  renderSound();
});

new ResizeObserver(resize).observe($("board-wrap"));

renderSound();
renderMenu();
requestAnimationFrame(frame);
