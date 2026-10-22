// ============================== BASE ==============================
// Small things everything else leans on: polyfills for older phones, a seeded random
// number generator, dates and seasons, the save file, and the error log.

// ---------- polyfills (iOS 14-16, older Android WebViews) ----------
if (typeof structuredClone !== "function") {
  window.structuredClone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
}
(function () {
  const P = typeof CanvasRenderingContext2D !== "undefined" && CanvasRenderingContext2D.prototype;
  if (!P || P.roundRect) return;
  P.roundRect = function (x, y, w, h, r) {
    let rr = Array.isArray(r) ? r[0] : r || 0;
    rr = Math.max(0, Math.min(rr, Math.abs(w) / 2, Math.abs(h) / 2));
    this.moveTo(x + rr, y);
    this.arcTo(x + w, y, x + w, y + h, rr);
    this.arcTo(x + w, y + h, x, y + h, rr);
    this.arcTo(x, y + h, x, y, rr);
    this.arcTo(x, y, x + w, y, rr);
    this.closePath();
  };
})();

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmtTime = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")}`;
const fmtNum = (n) => Math.round(n).toLocaleString("en-ZA").replace(/ /g, " ");

// mulberry32: small, fast and the same on every device. rng() gives 0..1; rng.int(n) gives 0..n-1.
function RNG(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.pick = (list) => list[Math.floor(rng() * list.length)];
  rng.shuffle = (list) => {
    for (let k = list.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      const t = list[k];
      list[k] = list[j];
      list[j] = t;
    }
    return list;
  };
  return rng;
}
const hashStr = (str) => {
  let h = 2166136261;
  for (let k = 0; k < str.length; k++) h = Math.imul(h ^ str.charCodeAt(k), 16777619);
  return h >>> 0;
};

// ---------- dates and seasons ----------
const Dates = (() => {
  const pad = (n) => String(n).padStart(2, "0");
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  // the developer menu can pretend it's another day
  const now = () => {
    const fake = Save.data?.dev?.date;
    if (!fake) return new Date();
    const real = new Date();
    const [y, m, d] = fake.split("-").map(Number);
    return new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds());
  };
  const today = () => key(now());
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  const addDays = (k, n) => {
    const d = new Date(k + "T12:00:00");
    d.setDate(d.getDate() + n);
    return key(d);
  };
  // Western Easter Sunday (anonymous Gregorian algorithm)
  function easter(y) {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return `${y}-${pad(month)}-${pad(day)}`;
  }
  function inRange(spec, y, today) {
    const at = (s) => {
      const m = /^auto([+-]\d+)?$/.exec(s);
      return m ? addDays(easter(y), Number(m[1] || 0)) : `${y}-${s}`;
    };
    return today >= at(spec.from) && today <= at(spec.to);
  }
  function season() {
    const forced = Save.data?.dev?.season;
    if (forced) return forced === "none" ? null : forced;
    const t = today();
    const y = Number(t.slice(0, 4));
    for (const [name, spec] of Object.entries(CONFIG.seasons)) if (inRange(spec, y, t)) return name;
    return null;
  }
  // time of day for the sky: 0 night, 1 dawn, 2 day, 3 dusk
  function partOfDay() {
    const h = now().getHours() + now().getMinutes() / 60;
    if (h < 5.5 || h >= 20.5) return "night";
    if (h < 8) return "dawn";
    if (h < 17.5) return "day";
    return "dusk";
  }
  const dailyNumber = () => daysBetween(CONFIG.firstDaily, today()) + 1;
  return { key, now, today, daysBetween, addDays, easter, season, partOfDay, dailyNumber };
})();

// ---------- the save file ----------
// One versioned object in localStorage. Saves are migrated forward and never wiped: a save
// that can't be read is kept aside under another key, and a fresh one starts.
const Save = (() => {
  const KEY = "lambstampede-save";
  const VERSION = 1;
  const prefersReduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DEFAULT_SETTINGS = {
    master: 0.9, music: 0.6, sfx: 0.85, vibe: true,
    pen: "dots", zone: "button", btnSize: "M", leftHanded: false,
    hints: true, verse: true, shake: "full", confirmQuit: true,
    palette: "default", contrast: false, reduced: prefersReduced, bigText: false, fewerFlashes: false,
    quality: "auto", battery: false,
  };
  const fresh = () => ({
    v: VERSION,
    created: Date.now(),
    settings: { ...DEFAULT_SETTINGS },
    profile: {
      name: "You", wool: 0, xp: 0, level: 1, games: 0, wins: 0, minutes: 0,
      owned: { "hat-none": 1, "scarf-red": 1, "wool-white": 1, "pattern-plain": 1, "trail-none": 1, "burst-puff": 1, "arena-meadow": 1, "bell-none": 1, "glasses-none": 1 },
      equipped: { hat: "hat-none", scarf: "scarf-red", bell: "bell-none", glasses: "glasses-none", wool: "wool-white", pattern: "pattern-plain", trail: "trail-none", burst: "burst-puff", arena: "arena-meadow" },
      badges: {}, journal: {}, seen: {}, tips: {}, hints: { validShown: 0, validLearned: false, pulseLearned: false },
      bread: { last: "", streak: 0, best: 0, total: 0 },
      firstSteps: false, whatsNewSeen: "", lastMode: null,
      flock: { joined: false, dismissals: 0, lastAsk: 0 }, persistAsked: false, installTipShown: 0,
      ai: { rating: 0.5 }, // the Auto difficulty's sense of how strong you are (0 easy .. 1 expert)
    },
    modes: {}, // per mode: { setup, stats, records, progress }
    errors: [],
    dev: { on: false, date: "", season: "", fps: false, unlockAll: false, wool: false },
  });

  let data = null;
  let timer = 0;

  function merge(base, over) {
    if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k of Object.keys(over)) {
      out[k] = base && typeof base[k] === "object" && base[k] !== null && !Array.isArray(base[k]) ? merge(base[k], over[k]) : over[k];
    }
    return out;
  }

  // Each step turns version n into n + 1. Add a step whenever the save's shape changes.
  const MIGRATIONS = {};

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch {}
    if (!raw) {
      data = fresh();
      return data;
    }
    try {
      let d = JSON.parse(raw);
      while ((d.v || 0) < VERSION) {
        const step = MIGRATIONS[d.v || 0];
        d = step ? step(d) : { ...d, v: (d.v || 0) + 1 };
      }
      data = merge(fresh(), d);
    } catch {
      try {
        localStorage.setItem(`${KEY}-unreadable-${Date.now()}`, raw);
      } catch {}
      data = fresh();
    }
    return data;
  }

  function writeNow() {
    clearTimeout(timer);
    timer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {}
  }
  // saves are batched a moment so a burst of changes is one write
  function save() {
    if (!timer) timer = setTimeout(writeNow, 250);
  }

  function mode(key) {
    data.modes[key] ??= { setup: null, stats: { played: 0, wins: 0, minutes: 0 }, records: {}, progress: {} };
    return data.modes[key];
  }

  // ---- backup codes: "LAMB1." + base64 of the save (deflated where the browser can) ----
  const b64 = (bytes) => {
    let s = "";
    for (let k = 0; k < bytes.length; k++) s += String.fromCharCode(bytes[k]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const unb64 = (str) => {
    const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(s.length);
    for (let k = 0; k < s.length; k++) out[k] = s.charCodeAt(k);
    return out;
  };
  async function pipe(bytes, stream) {
    const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await out.arrayBuffer());
  }
  async function backupCode() {
    const copy = { ...data, errors: [] };
    const bytes = new TextEncoder().encode(JSON.stringify(copy));
    if (typeof CompressionStream === "function") {
      try {
        return "LAMB1z." + b64(await pipe(bytes, new CompressionStream("deflate-raw")));
      } catch {}
    }
    return "LAMB1." + b64(bytes);
  }
  async function restore(code) {
    code = String(code || "").trim().replace(/\s+/g, "");
    const m = /^LAMB1(z?)\.([A-Za-z0-9_-]+)$/.exec(code);
    if (!m) return false;
    try {
      let bytes = unb64(m[2]);
      if (m[1]) bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
      const d = JSON.parse(new TextDecoder().decode(bytes));
      if (!d || typeof d !== "object" || !d.profile) return false;
      try {
        localStorage.setItem(`${KEY}-before-restore`, JSON.stringify(data));
      } catch {}
      data = merge(fresh(), d);
      writeNow();
      return true;
    } catch {
      return false;
    }
  }

  function resetProgress() {
    try {
      localStorage.setItem(`${KEY}-before-reset`, JSON.stringify(data));
    } catch {}
    const keep = data.settings;
    data = fresh();
    data.settings = keep;
    writeNow();
  }
  function resetSettings() {
    data.settings = { ...DEFAULT_SETTINGS };
    save();
  }

  return {
    load, save, writeNow, mode, backupCode, restore, resetProgress, resetSettings, DEFAULT_SETTINGS,
    get data() { return data; },
    get settings() { return data.settings; },
    get profile() { return data.profile; },
  };
})();
Save.load();
window.addEventListener("pagehide", () => Save.writeNow());

// ---------- error log ----------
// Errors are kept on this device only (the last 30), for the developer menu and the crash screen.
const ErrorLog = (() => {
  function add(msg, where) {
    const list = Save.data.errors;
    list.push({ at: new Date().toISOString(), msg: String(msg).slice(0, 400), where: String(where || "").slice(0, 400), v: CONFIG.version });
    if (list.length > 30) list.splice(0, list.length - 30);
    Save.save();
  }
  window.addEventListener("error", (e) => add(e.message, `${e.filename || ""}:${e.lineno || ""}`));
  window.addEventListener("unhandledrejection", (e) => add(e.reason?.message || e.reason, "promise"));
  const text = () => Save.data.errors.map((e) => `${e.at} v${e.v} ${e.msg} @ ${e.where}`).join("\n") || "No errors logged.";
  return { add, text };
})();

// ---------- tiny event bus ----------
const Bus = (() => {
  const map = new Map();
  return {
    on(ev, fn) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(fn);
      return () => map.get(ev).delete(fn);
    },
    emit(ev, ...args) {
      for (const fn of map.get(ev) || []) fn(...args);
    },
  };
})();

// ---------- haptics ----------
const buzz = (pattern) => {
  if (!Save.settings.vibe || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {}
};

// ---------- loading mode scripts on demand ----------
// The single-file build has every mode inside already, so nothing is fetched there.
const Modes = (() => {
  const defs = new Map();
  const loading = new Map();
  function register(def) {
    defs.set(def.key, def);
  }
  function load(key, file) {
    if (defs.has(key)) return Promise.resolve(defs.get(key));
    if (!loading.has(key)) {
      loading.set(key, new Promise((ok, fail) => {
        const s = document.createElement("script");
        s.src = `js/modes/${file}.js?v=${CONFIG.version}`;
        s.onload = () => (defs.has(key) ? ok(defs.get(key)) : fail(new Error(`mode ${key} did not register`)));
        s.onerror = () => {
          loading.delete(key);
          fail(new Error(`could not load ${file}`));
        };
        document.head.append(s);
      }));
    }
    return loading.get(key);
  }
  return { register, load, get: (k) => defs.get(k), has: (k) => defs.has(k) };
})();

// ---------- Ads and Purchases: kept for later, switched off ----------
// The game has no adverts and nothing to buy. These do nothing unless CONFIG turns them on,
// and no screen anywhere calls them. They exist so a future version has one obvious place to start.
const Ads = {
  get enabled() {
    return !!CONFIG.ads?.enabled;
  },
  // would show an advert between games; always resolves without showing anything while off
  between: () => Promise.resolve(false),
};
const Purchases = {
  get enabled() {
    return !!CONFIG.purchases?.enabled;
  },
  products: () => [],
  // would start a purchase; refuses while off
  buy: () => Promise.reject(new Error("Purchases are switched off")),
  owned: () => false,
};
