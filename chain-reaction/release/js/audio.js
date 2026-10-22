// ============================== AUDIO ==============================
// Web Audio only, no sound files. One graph: music and effects buses -> master -> limiter.
// Music is cheerful arrangements of public-domain hymn melodies (written below in ABC
// notation, note for note) and a few original tunes, with layers that build in play.
const Sound = (() => {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let duckGain = null;
  let sfxBus = null;
  let noiseBuf = null;
  let unlocked = false;

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 4;
    limiter.ratio.value = 16;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
    master = ctx.createGain();
    master.connect(limiter).connect(ctx.destination);
    musicBus = ctx.createGain();
    duckGain = ctx.createGain();
    musicBus.connect(duckGain).connect(master);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    const r = RNG(99);
    for (let k = 0; k < d.length; k++) d[k] = r() * 2 - 1;
    levels();
  }

  // Browsers only allow sound after a tap; the first one anywhere wakes the audio.
  function unlock() {
    try {
      if (!ctx) build();
      if (!ctx) return;
      if (ctx.state === "suspended" && !document.hidden) ctx.resume();
      if (!unlocked) {
        unlocked = true;
        // a silent blip, which iOS needs to really start
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        g.gain.value = 0.0001;
        o.connect(g).connect(master);
        o.start();
        o.stop(ctx.currentTime + 0.01);
        Music.resumeWanted();
      }
    } catch {
      ctx = null;
    }
  }

  function levels() {
    if (!ctx) return;
    const s = Save.settings;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(s.master, t, 0.02);
    musicBus.gain.setTargetAtTime(s.music * 0.6, t, 0.02);
    sfxBus.gain.setTargetAtTime(s.sfx, t, 0.02);
  }

  // music dips under big moments
  function duck(depth = 0.45, ms = 500) {
    if (!ctx) return;
    const t = ctx.currentTime;
    duckGain.gain.cancelScheduledValues(t);
    duckGain.gain.setTargetAtTime(depth, t, 0.03);
    duckGain.gain.setTargetAtTime(1, t + ms / 1000, 0.15);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (unlocked) ctx.resume();
  });

  const vary = (f, amt = 0.03) => f * (1 + (Math.random() * 2 - 1) * amt);

  function tone(freq, dur = 0.12, type = "sine", vol = 0.12, slideTo = 0, delay = 0, bus = sfxBus, attack = 0.008) {
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + Math.max(0, delay);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  function noise(dur, freq, vol, delay = 0, type = "bandpass", bus = sfxBus) {
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + Math.max(0, delay);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t);
    s.stop(t + dur + 0.03);
  }
  function bleat(pitch = 1, delay = 0) {
    if (!ctx || ctx.state !== "running") return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    pitch = vary(pitch, 0.05);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(430 * pitch, t);
    o.frequency.linearRampToValueAtTime(370 * pitch, t + 0.35);
    lfo.frequency.value = 22;
    lg.gain.value = 18 * pitch;
    lfo.connect(lg).connect(o.frequency);
    f.type = "lowpass";
    f.frequency.value = 1700;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(f).connect(g).connect(sfxBus);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.45);
    lfo.stop(t + 0.45);
  }

  // ---------- effects ----------
  // A replay or the Shepherd's helper can silence them for a while.
  let quiet = false;
  const q = (fn) => (...a) => {
    if (!quiet) fn(...a);
  };
  const Sfx = {
    tap: q(() => tone(vary(880), 0.05, "sine", 0.05, vary(1100))),
    back: q(() => tone(vary(660), 0.06, "sine", 0.045, vary(500))),
    whoosh: q(() => noise(0.18, 1200, 0.03, 0, "bandpass")),
    drop: q(() => tone(vary(560), 0.07, "triangle", 0.07, vary(760))),
    // the pitch climbs through a chain, so long chains sing upwards
    burst: q((k) => {
      const f = 330 * Math.pow(2, Math.min(k, 30) / 12);
      tone(vary(f, 0.015), 0.09, "triangle", 0.055, f * 1.4);
      noise(0.05, 1400, 0.03);
    }),
    waste: q(() => tone(vary(150), 0.2, "triangle", 0.08, 80)),
    empty: q(() => tone(vary(90), 0.14, "sine", 0.16, 60)),
    tick: q(() => tone(vary(1700, 0.02), 0.03, "sine", 0.022)),
    full: q(() => {
      tone(1047, 0.12, "sine", 0.05);
      tone(1568, 0.18, "sine", 0.045, 0, 0.07);
    }),
    load: q((type) => tone(type === "overflow" ? 1200 : 800, 0.18, "triangle", 0.08, type === "overflow" ? 1800 : 1200)),
    special: q((type) => {
      if (type === "line" || type === "cross") tone(vary(900), 0.3, "triangle", 0.07, 300);
      else if (type === "overflow") [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.2, "triangle", 0.07, 0, k * 0.06));
      else {
        tone(vary(160), 0.35, "triangle", 0.1, 50);
        noise(0.4, 400, 0.12, 0, "lowpass");
      }
      duck(0.6, 300);
    }),
    shout: q((lvl) => [0, 4, 7, 12].slice(0, 2 + lvl).forEach((s, k) => tone(523 * Math.pow(2, s / 12), 0.14, "triangle", 0.06, 0, k * 0.05))),
    hit: q((hp) => tone(vary(140 + hp * 30), 0.08, "triangle", 0.06)),
    crack: q(() => {
      tone(90, 0.25, "triangle", 0.09, 50);
      noise(0.25, 900, 0.08);
    }),
    chime: q((k = 0) => tone(880 * Math.pow(2, k / 12), 0.3, "sine", 0.07)),
    coin: q((k = 0) => {
      tone(1319 * Math.pow(2, k / 24), 0.08, "sine", 0.05);
      tone(1760 * Math.pow(2, k / 24), 0.12, "sine", 0.04, 0, 0.05);
    }),
    win: q(() => {
      [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, 0.28, "triangle", 0.08, 0, k * 0.09));
      duck(0.35, 900);
    }),
    lose: q(() => [392, 349, 330, 262].forEach((f, k) => tone(f, 0.3, "sine", 0.07, 0, k * 0.14))),
    levelUp: q(() => {
      [523, 784, 1047, 1568].forEach((f, k) => tone(f, 0.35, "sine", 0.07, 0, k * 0.08));
      duck(0.35, 900);
    }),
    unlock: q(() => [784, 988, 1175, 1568].forEach((f, k) => tone(f, 0.22, "triangle", 0.06, 0, k * 0.06))),
    howl: q(() => {
      // a cheeky "a-woo!", never a scary one
      tone(vary(420), 0.35, "triangle", 0.05, vary(620));
      tone(vary(620), 0.4, "sine", 0.04, vary(470), 0.3);
    }),
    grumble: q(() => {
      tone(vary(110), 0.4, "triangle", 0.09, 70);
      noise(0.4, 300, 0.08, 0, "lowpass");
    }),
    tickTock: q((hi) => tone(hi ? 1200 : 900, 0.03, "sine", 0.04)),
    tension: q((lvl) => tone(220 * Math.pow(2, lvl / 12), 0.25, "triangle", 0.04, 220 * Math.pow(2, (lvl + 1) / 12))),
    star: q((k = 0) => tone(1047 * Math.pow(2, (k * 4) / 12), 0.3, "sine", 0.07)),
    shepherd: q(() => {
      // a warm major chord swelling in
      for (const [f, d] of [[262, 0], [330, 0.08], [392, 0.16], [523, 0.24], [659, 0.4]]) tone(f, 1.6, "sine", 0.05, 0, d, sfxBus, 0.3);
      duck(0.3, 1800);
    }),
    bleat: q((p, d) => bleat(p, d)),
    // a one-off tone for a mode's own sounds (still silent during a replay's fast-forward)
    blip: q((f, dur, type, vol, slide) => tone(vary(f, 0.02), dur, type, vol, slide)),
  };

  return {
    unlock, levels, duck, tone, noise, Sfx,
    get ctx() { return ctx; }, get musicBus() { return musicBus; }, get unlocked() { return unlocked; },
    set quiet(v) { quiet = v; }, get quiet() { return quiet; },
  };
})();
const Sfx = Sound.Sfx;

// ============================== MUSIC ==============================
const Music = (() => {
  // ---- a small ABC reader: notes, octaves (' and ,), lengths (2, /, 3/2), > dotted pairs, ties, rests ----
  const KEYS = { C: 0, G: 1, D: 2, A: 3, E: 4, F: -1, Bb: -2, Am: 0, Em: 1, Dm: -1 };
  const SHARPS = "FCGDAEB";
  const FLATS = "BEADGCF";
  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function keyAcc(key) {
    const n = KEYS[key];
    const acc = {};
    if (n > 0) for (let k = 0; k < n; k++) acc[SHARPS[k]] = 1;
    if (n < 0) for (let k = 0; k < -n; k++) acc[FLATS[k]] = -1;
    return acc;
  }
  // returns [{ m: midi or null, b: beats }] where a beat is the L: unit times `unit`
  function parse(abc, key, unit) {
    const acc = keyAcc(key);
    const out = [];
    const re = /([_^=]?)([A-Ga-gz])([',]*)(\d*)(\/?)(\d*)(-?)|([>])/g;
    let m;
    let dotNext = 0;
    let tie = false;
    while ((m = re.exec(abc))) {
      if (m[8]) {
        // a > b: the last note gets 1.5, the next 0.5
        const last = out[out.length - 1];
        last.b *= 1.5;
        dotNext = 0.5;
        continue;
      }
      const [, accidental, letter, octs, num, slash, den, tieMark] = m;
      let len = num ? Number(num) : 1;
      if (slash) len /= den ? Number(den) : 2;
      len *= unit;
      if (dotNext) {
        len *= dotNext;
        dotNext = 0;
      }
      let midi = null;
      if (letter !== "z") {
        const upper = letter.toUpperCase();
        midi = 60 + STEP[upper] + (letter === upper ? 0 : 12);
        for (const o of octs) midi += o === "'" ? 12 : -12;
        if (accidental === "^") midi += 1;
        else if (accidental === "_") midi -= 1;
        else if (accidental !== "=") midi += acc[upper] || 0;
      }
      if (tie && out.length && out[out.length - 1].m === midi) out[out.length - 1].b += len;
      else out.push({ m: midi, b: len });
      tie = !!tieMark;
    }
    return out;
  }

  // ---- automatic harmony: for each bar pick the triad that holds the most melody ----
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  function harmonise(notes, tonic, minor, beatsPerBar, pickup) {
    const scale = minor ? MINOR : MAJOR;
    const triad = (deg) => [0, 2, 4].map((k) => (tonic + scale[(deg + k) % 7] + (deg + k >= 7 ? 12 : 0)) % 12);
    const degrees = minor ? [0, 3, 4, 5, 2] : [0, 3, 4, 5, 1];
    const bars = [];
    let t = -pickup;
    for (const n of notes) {
      const bar = Math.floor((t + 1e-6) / beatsPerBar);
      if (bar >= 0 && n.m !== null) {
        bars[bar] ??= new Map();
        const pc = ((n.m % 12) + 12) % 12;
        bars[bar].set(pc, (bars[bar].get(pc) || 0) + n.b * (Math.abs(t % beatsPerBar) < 1e-6 ? 1.6 : 1));
      }
      t += n.b;
    }
    const total = Math.ceil((t - 1e-6) / beatsPerBar);
    const chords = [];
    let prev = 0;
    for (let b = 0; b < total; b++) {
      const w = bars[b] || new Map();
      let best = 0;
      let bestScore = -1;
      for (const deg of degrees) {
        const tones = triad(deg);
        let sc = 0;
        for (const [pc, wt] of w) if (tones.includes(pc)) sc += wt;
        if (deg === 0) sc += 0.3;
        if (deg === prev) sc += 0.15;
        if (sc > bestScore) [best, bestScore] = [deg, sc];
      }
      if (b === total - 1) best = 0;
      chords.push(triad(best).map((pc) => pc + 48));
      prev = best;
    }
    return chords;
  }

  // ---- the songs ----
  // hymn: true for public-domain hymn tunes (melody reproduced exactly), false for originals.
  const SONGS = {
    jesusLovesMe: {
      title: "Jesus Loves Me", by: "William B. Bradbury, 1862", hymn: true,
      key: "C", tonic: 0, meter: 4, unit: 1, pickup: 0,
      abc: "G E E D | E G G2 | A A c A | A G G2 | G E E D | E G G2 | A A G C | E D C2 |",
    },
    amazingGrace: {
      title: "Amazing Grace", by: "New Britain, traditional American melody, 1829", hymn: true,
      key: "G", tonic: 7, meter: 3, unit: 1, pickup: 1,
      abc: "D | G2 B/G/ | B2 A | G2 E | D2 D | G2 B/G/ | B2 A | d3- | d2 B | d2 B/d/ | B2 A | G2 E | D2 D | G2 B/G/ | B2 A | G3- | G2",
    },
    joyToTheWorld: {
      title: "Joy to the World", by: "Antioch, arranged by Lowell Mason, 1839", hymn: true,
      key: "D", tonic: 2, meter: 2, unit: 0.5, pickup: 0,
      abc: "d2 c>B | A3 G | F2 E2 | D3 A | B3 B | c3 c | d3 d | d c B A | A>G F d | d c B A | A>G F F | F F F F/G/ | A3 G/F/ | E E E E/F/ | G3 F/E/ | D d2 B | A>G F G | F2 E2 | D4 |",
    },
    greenPastures: {
      title: "Green Pastures", by: "Original tune", hymn: false,
      key: "F", tonic: 5, meter: 4, unit: 0.5, pickup: 0,
      abc: "c2 A2 F2 A2 | B2 d2 c4 | A2 G2 F2 D2 | C4 F4 | c2 A2 F2 A2 | B2 d2 f4 | e2 d2 c2 B2 | A4 F4 |",
    },
    shepherdsMarch: {
      title: "The Shepherd's March", by: "Original tune", hymn: false,
      key: "G", tonic: 7, meter: 4, unit: 0.5, pickup: 0,
      abc: "G2 GA B2 G2 | c2 B2 A4 | B2 Bc d2 B2 | A2 G2 F4 | G2 GA B2 d2 | e2 d2 c2 B2 | A2 B2 c2 A2 | G4 G4 |",
    },
    stillWaters: {
      title: "Still Waters", by: "Original tune", hymn: false,
      key: "D", tonic: 2, meter: 3, unit: 1, pickup: 0,
      abc: "F A d | c3/2 B/ A | B G E | F3 | A F A | d2 e | f e c | d3 |",
    },
    meadowDash: {
      title: "Meadow Dash", by: "Original tune", hymn: false,
      key: "A", tonic: 9, meter: 4, unit: 0.5, pickup: 0,
      abc: "A2 c2 e2 c2 | d2 f2 e4 | c2 e2 a2 e2 | f2 d2 B4 | A2 c2 e2 a2 | g2 e2 f2 d2 | c2 B2 A2 G2 | A8 |",
    },
    rockyRidge: {
      title: "Rocky Ridge", by: "Original tune", hymn: false,
      key: "Em", tonic: 4, minor: true, meter: 4, unit: 0.5, pickup: 0,
      abc: "E2 G2 B2 G2 | A2 c2 B4 | G2 B2 e2 d2 | B2 A2 G4 | E2 G2 B2 e2 | d2 B2 c2 A2 | B2 G2 A2 F2 | E8 |",
    },
    sunriseGarden: {
      title: "Sunrise Garden", by: "Original tune", hymn: false,
      key: "C", tonic: 0, meter: 4, unit: 0.5, pickup: 0,
      abc: "E2 G2 c4 | B2 A2 G4 | A2 c2 e2 d2 | c4 G4 | E2 G2 c2 e2 | d2 c2 B2 A2 | G2 c2 B2 d2 | c8 |",
    },
  };
  // arrangements: tempo, lead voice and feel per use
  const STYLES = {
    gentle: { lead: "bell", feel: "pad", drums: false },
    bright: { lead: "flute", feel: "pop", drums: true },
    waltz: { lead: "bell", feel: "waltz", drums: true },
    march: { lead: "flute", feel: "march", drums: true },
  };
  for (const s of Object.values(SONGS)) {
    s.notes = parse(s.abc, s.key, s.unit);
    s.beats = s.notes.reduce((a, n) => a + n.b, 0);
    s.chords = harmonise(s.notes, s.tonic, s.minor, s.meter, s.pickup);
  }

  let cur = null; // { song, style, bpm }
  let wanted = null;
  let timer = 0;
  let noteIdx = 0;
  let noteBeat = 0; // song beat where noteIdx starts
  let songStart = 0; // audio time of beat 0 of this pass
  let lastBeatScheduled = 0;
  let layer = 0;
  let rate = 1;

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const spb = () => 60 / (cur.bpm * rate);

  function voice(type, midi, at, dur, vol) {
    const a = Sound.ctx;
    const bus = Sound.musicBus;
    const o = a.createOscillator();
    const g = a.createGain();
    if (type === "bell") {
      o.type = "sine";
      const o2 = a.createOscillator();
      const g2 = a.createGain();
      o2.type = "sine";
      o2.frequency.value = hz(midi) * 2;
      g2.gain.setValueAtTime(vol * 0.25, at);
      g2.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(dur, 0.5));
      o2.connect(g2).connect(bus);
      o2.start(at);
      o2.stop(at + dur + 0.05);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.25, dur * 1.1));
    } else if (type === "flute") {
      o.type = "triangle";
      const lfo = a.createOscillator();
      const lg = a.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = hz(midi) * 0.006;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(at);
      lfo.stop(at + dur + 0.05);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + 0.04);
      g.gain.setValueAtTime(vol, at + Math.max(0.05, dur * 0.7));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    } else {
      o.type = type === "bass" ? "triangle" : "sine";
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + (type === "pad" ? 0.12 : 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    }
    o.frequency.setValueAtTime(hz(midi), at);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + dur + 0.08);
  }
  function drum(kind, at) {
    const a = Sound.ctx;
    const bus = Sound.musicBus;
    if (kind === "kick") {
      const o = a.createOscillator();
      const g = a.createGain();
      o.frequency.setValueAtTime(120, at);
      o.frequency.exponentialRampToValueAtTime(45, at + 0.14);
      g.gain.setValueAtTime(0.32, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(g).connect(bus);
      o.start(at);
      o.stop(at + 0.2);
    } else Sound.noise(kind === "hat" ? 0.03 : 0.1, kind === "hat" ? 8000 : 1700, kind === "hat" ? 0.03 : 0.08, at - a.currentTime, kind === "hat" ? "highpass" : "bandpass", bus);
  }

  // schedules everything between two song beats
  function scheduleBeats(from, to) {
    const s = cur.song;
    const st = STYLES[cur.style];
    const per = spb();
    const at = (beat) => songStart + beat * per;
    // melody notes starting in [from, to)
    while (noteIdx < s.notes.length && noteBeat < to) {
      const n = s.notes[noteIdx];
      if (n.m !== null && noteBeat >= from - 1e-6) {
        const dur = n.b * per;
        voice(st.lead, n.m + (st.lead === "bell" ? 12 : 0), at(noteBeat), Math.max(0.12, dur * 0.95), st.lead === "bell" ? 0.06 : 0.05);
        if (layer >= 2) voice("bell", n.m + 24, at(noteBeat), Math.max(0.1, dur * 0.6), 0.018);
      }
      noteBeat += n.b;
      noteIdx++;
    }
    // accompaniment on whole beats
    for (let beat = Math.ceil(from - 1e-6); beat < to; beat++) {
      const pos = beat + s.pickup;
      if (pos < 0) continue;
      const bar = Math.floor(pos / s.meter);
      const inBar = pos % s.meter;
      const chord = s.chords[Math.min(bar, s.chords.length - 1)];
      if (!chord) continue;
      const t = at(beat);
      if (inBar === 0) for (const m of chord) voice("pad", m, t, s.meter * per * 0.95, 0.022);
      if (layer >= 1) {
        if (st.feel === "waltz") {
          if (inBar === 0) voice("bass", chord[0] - 12, t, per * 0.9, 0.16);
          else for (const m of chord) voice("pad", m + 12, t, per * 0.4, 0.015);
        } else if (inBar === 0 || (s.meter === 4 && inBar === 2) || st.feel === "march") {
          voice("bass", chord[inBar === 2 && st.feel !== "pop" ? 2 : 0] - 12, t, per * 0.8, 0.16);
        }
        if (st.drums) {
          if (inBar === 0 || (st.feel === "pop" && inBar === 2) || st.feel === "march") drum("kick", t);
          if (layer >= 2 && ((s.meter === 4 && inBar % 2 === 1) || (s.meter === 3 && inBar === 2))) drum("snare", t);
        }
      }
      if (layer >= 2) {
        drum("hat", t);
        drum("hat", t + per / 2);
      }
    }
  }

  function tick() {
    const a = Sound.ctx;
    if (!a || !cur || a.state !== "running") return;
    const s = cur.song;
    const per = spb();
    if (!songStart || songStart + lastBeatScheduled * per < a.currentTime - 0.2) {
      // starting, or the tab slept: pick up a moment from now
      songStart = a.currentTime + 0.08 - lastBeatScheduled * per;
    }
    let horizon = (a.currentTime + 0.25 - songStart) / per;
    while (lastBeatScheduled < horizon) {
      const upto = Math.min(Math.floor(lastBeatScheduled + 1e-6) + 1, s.beats - s.pickup);
      scheduleBeats(lastBeatScheduled, upto);
      lastBeatScheduled = upto;
      if (lastBeatScheduled >= s.beats - s.pickup - 1e-6) {
        // loop: a beat of breath, then from the top
        songStart += s.beats * per;
        horizon -= s.beats;
        lastBeatScheduled = -s.pickup;
        noteIdx = 0;
        noteBeat = -s.pickup;
      }
    }
  }

  function play(songId, style = "gentle", bpm) {
    const song = SONGS[songId];
    if (!song) return stop();
    wanted = { songId, style, bpm };
    if (cur && cur.song === song && cur.style === style) return;
    cur = { song, style, bpm: bpm || (style === "gentle" ? 92 : style === "waltz" ? 112 : 124) };
    noteIdx = 0;
    noteBeat = -song.pickup;
    lastBeatScheduled = -song.pickup;
    songStart = 0;
    rate = 1;
    clearInterval(timer);
    timer = setInterval(tick, 40);
    Bus.emit("music", song);
  }
  function stop() {
    clearInterval(timer);
    timer = 0;
    cur = null;
    wanted = null;
    layer = 0;
    Bus.emit("music", null);
  }
  // when the audio wakes up after the first tap, start whatever should be playing
  function resumeWanted() {
    if (wanted && !cur) play(wanted.songId, wanted.style, wanted.bpm);
  }
  function setLayer(n) {
    layer = n;
  }
  function setRate(r) {
    if (!cur || r === rate) return;
    const a = Sound.ctx;
    // keep the current beat where it is when the tempo changes
    if (a) {
      const beatNow = (a.currentTime - songStart) / spb();
      rate = r;
      songStart = a.currentTime - beatNow * spb();
    } else rate = r;
  }
  return {
    play, stop, setLayer, setRate, resumeWanted, SONGS, parse,
    get current() { return cur?.song ?? null; },
  };
})();
