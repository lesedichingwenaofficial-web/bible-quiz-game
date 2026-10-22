// ============================== SHARING ==============================
// Share cards (an image with the lamb, the result and the site address), Lamb Photos, verse
// cards and Save Clip (a short video of the Chain of the Match). Then Join the Flock.
const Share = (() => {
  const url = () => CONFIG.siteUrl.replace(/^https?:\/\//, "");

  // shares a canvas as a picture, or downloads it where sharing files isn't possible
  async function canvas(cv, name, text) {
    const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
    return file(blob, name, text);
  }
  async function file(blob, name, text) {
    const f = new File([blob], name, { type: blob.type });
    try {
      if (navigator.canShare?.({ files: [f] })) {
        await navigator.share({ files: [f], text, title: CONFIG.appName });
        return true;
      }
    } catch (e) {
      if (e.name === "AbortError") return false;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    UI.toast("Saved to your downloads", { icon: "download" });
    return true;
  }
  async function text(t) {
    try {
      if (navigator.share) {
        await navigator.share({ text: t });
        return;
      }
    } catch (e) {
      if (e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(t);
      UI.toast("Copied! Paste it anywhere.", { icon: "check" });
    } catch {
      UI.toast(t);
    }
  }

  // the background every card shares: the pasture at golden hour
  function scene(g, W, H, part = "day") {
    Art.drawPasture(g, W, H, { t: 2, part, season: Dates.season(), dpr: 1, reduced: true });
  }
  function footer(g, W, H) {
    g.fillStyle = "rgba(255,248,236,0.92)";
    g.beginPath();
    g.roundRect(W * 0.08, H - H * 0.13, W * 0.84, H * 0.09, H * 0.045);
    g.fill();
    g.fillStyle = "#2b3a2f";
    g.textAlign = "center";
    const label = `${CONFIG.appName} · ${url()}`;
    let size = Math.round(Math.min(H * 0.032, W * 0.05));
    for (;;) {
      g.font = `600 ${size}px Fredoka, system-ui`;
      if (g.measureText(label).width < W * 0.76 || size < 12) break;
      size -= 2;
    }
    g.fillText(label, W / 2, H - H * 0.13 + H * 0.045 + size * 0.35);
  }
  function title(g, W, y, txt, size, color = "#2b3a2f") {
    g.font = `700 ${size}px Fredoka, system-ui`;
    g.textAlign = "center";
    g.lineWidth = size * 0.18;
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.strokeText(txt, W / 2, y);
    g.fillStyle = color;
    g.fillText(txt, W / 2, y);
  }

  // ---- results ----
  function resultCard(def, sum, extra) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1080;
    const g = cv.getContext("2d");
    const W = 1080;
    scene(g, W, W);
    const won = sum.won || !sum.humans.length;
    Art.drawLamb(g, W / 2, W * 0.6, W * 0.42, { t: 1, mood: won ? "joy" : "happy", look: Progress.look(), glow: won ? "rgba(255,220,120,0.6)" : undefined });
    title(g, W, W * 0.14, def.title, 60, "#3f8f4e");
    title(g, W, W * 0.25, sum.title, 96);
    const line = extra.shareLine || (sum.humans.length ? `Biggest chain ×${Math.max(0, ...sum.humans.map((p) => p.best))}` : "");
    if (line) title(g, W, W * 0.33, line, 52, "#5d6d5f");
    footer(g, W, W);
    return cv;
  }
  function result(def, sum, extra) {
    const cv = resultCard(def, sum, extra);
    const t = extra.shareText || `${sum.title} in ${def.title}! Play ${CONFIG.appName}: ${CONFIG.siteUrl}`;
    return canvas(cv, `${def.key}-result.png`, t);
  }

  // ---- Lamb Photo ----
  function drawPhoto(g, W) {
    scene(g, W, W, Dates.partOfDay() === "night" ? "dusk" : "day");
    Art.ellipse(g, W / 2, W * 0.8, W * 0.22, W * 0.04, 0, "rgba(0,0,0,0.18)");
    Art.drawLamb(g, W / 2, W * 0.58, W * 0.6, { t: 0.4, look: Progress.look(), mood: "happy" });
    title(g, W, W * 0.13, `${Save.profile.name === "You" ? "My" : `${Save.profile.name}'s`} lamb`, 80);
    title(g, W, W * 0.2, `Flock Level ${Save.profile.level}`, 46, "#3f8f4e");
    footer(g, W, W);
  }

  // ---- verse cards ----
  function verseCard(v) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1080;
    const g = cv.getContext("2d");
    const W = 1080;
    scene(g, W, W, "dawn");
    g.fillStyle = "rgba(255,248,236,0.9)";
    g.beginPath();
    g.roundRect(W * 0.08, W * 0.12, W * 0.84, W * 0.56, 40);
    g.fill();
    g.fillStyle = "#2b3a2f";
    g.textAlign = "center";
    const words = v[1].split(" ");
    let size = 54;
    let lines;
    for (;;) {
      g.font = `500 ${size}px Fredoka, system-ui`;
      lines = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (g.measureText(t).width > W * 0.72 && cur) {
          lines.push(cur);
          cur = w;
        } else cur = t;
      }
      lines.push(cur);
      if (lines.length * size * 1.3 < W * 0.42 || size < 30) break;
      size -= 4;
    }
    const top = W * 0.4 - (lines.length * size * 1.3) / 2 + size;
    lines.forEach((l, k) => g.fillText(l, W / 2, top + k * size * 1.3));
    g.font = `700 ${Math.round(size * 0.85)}px Fredoka, system-ui`;
    g.fillStyle = "#3f8f4e";
    g.fillText(`${v[0]} (KJV)`, W / 2, W * 0.64);
    Art.drawLamb(g, W * 0.5, W * 0.8, W * 0.2, { t: 0, look: Progress.look(), mood: "happy" });
    footer(g, W, W);
    return canvas(cv, "verse.png", `${v[1]} (${v[0]}, KJV)`);
  }

  // ---- Save Clip: records the Chain of the Match replay into a short video ----
  // Falls back to the share card where the browser can't record video.
  function startClip(sum, def) {
    const W = 720;
    const H = 1280;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const g = cv.getContext("2d");
    const types = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    const type = typeof MediaRecorder !== "undefined" && types.find((t) => MediaRecorder.isTypeSupported?.(t));
    if (!type || !cv.captureStream) {
      UI.toast("This browser can't record video, so here's a picture instead", { icon: "camera" });
      result(def, sum, {});
      return null;
    }
    const bgCv = document.createElement("canvas");
    bgCv.width = W;
    bgCv.height = H;
    scene(bgCv.getContext("2d"), W, H, "day");
    const stream = cv.captureStream(30);
    const chunks = [];
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2500000 });
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(250);
    const len = sum.chainRec.best.len;
    return {
      frame(board, G) {
        g.drawImage(bgCv, 0, 0);
        title(g, W, 120, def.title, 46, "#3f8f4e");
        title(g, W, 200, `Chain of the Match ×${len}`, 58);
        const s = Math.min((W - 60) / board.width, (H - 520) / board.height);
        const bw = board.width * s;
        const bh = board.height * s;
        g.drawImage(board, (W - bw) / 2, 250, bw, bh);
        Art.drawLamb(g, W / 2, Math.min(250 + bh + 100, H * 0.87 - 95), 160, { t: G.time / 1000, mood: "joy", look: Progress.look() });
        footer(g, W, H);
      },
      async finish() {
        await new Promise((ok) => {
          rec.onstop = ok;
          rec.stop();
        });
        const blob = new Blob(chunks, { type: type.split(";")[0] });
        await file(blob, `chain-of-the-match.${type.includes("mp4") ? "mp4" : "webm"}`, `Chain ×${len} in ${def.title}! ${CONFIG.siteUrl}`);
      },
    };
  }

  return { canvas, file, text, result, resultCard, drawPhoto, verseCard, startClip };
})();

// ============================== JOIN THE FLOCK ==============================
// Email sign-up for game news. Never before 3 finished games, never during play, offered only
// at happy moments, at most once a week, and never again after 3 "not now"s. The device keeps
// only the fact that you signed up, never the address.
const Flock = (() => {
  const P = () => Save.profile.flock;
  const on = () => CONFIG.flock.provider !== "none";
  function shouldAsk() {
    const f = P();
    if (!on() || f.joined || f.dismissals >= CONFIG.ask.maxDismissals) return false;
    if (Save.profile.games < CONFIG.ask.minGames) return false;
    return Date.now() - f.lastAsk >= CONFIG.ask.waitDays * 86400000;
  }
  // a gentle card on the results screen, never a pop-up
  function offer(box, happy) {
    if (!box || !happy || !shouldAsk()) return;
    P().lastAsk = Date.now();
    Save.save();
    box.innerHTML = `<div class="flock-offer">${Icons.get("mail")}<div><b>${STRINGS.flock.title}</b><small>${STRINGS.flock.blurb}</small></div>
      <div class="two"><button class="btn primary small" id="fo-yes"><span>${STRINGS.flock.send}</span></button><button class="btn ghost small" id="fo-no"><span>${STRINGS.flock.notNow}</span></button></div></div>`;
    $("fo-yes").onclick = () => Nav.go("flock");
    $("fo-no").onclick = () => {
      P().dismissals++;
      Save.save();
      box.innerHTML = "";
    };
  }
  async function send(email, who) {
    const c = CONFIG.flock;
    if (c.provider === "netlify") {
      const body = new URLSearchParams({ "form-name": c.netlifyFormName, email, signup: who, consent: "yes" });
      const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!r.ok) throw new Error(`status ${r.status}`);
    } else if (c.provider === "kit") {
      const body = new URLSearchParams({ email_address: email, "fields[signup]": who });
      // Kit's form endpoint doesn't allow reading the reply from another site; a sent request is enough
      await fetch(`https://app.kit.com/forms/${encodeURIComponent(c.kitFormId)}/subscriptions`, { method: "POST", mode: "no-cors", body });
    } else if (c.provider === "custom") {
      const r = await fetch(c.customUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, signup: who, consent: true }) });
      if (!r.ok) throw new Error(`status ${r.status}`);
    } else throw new Error("closed");
  }
  Nav.define("flock", {
    sheet: true,
    render(el) {
      const F = STRINGS.flock;
      if (P().joined) {
        el.innerHTML = `<div class="sheet-card"><h2>${F.title}</h2><p>${F.already}</p><button class="btn primary" id="fl-close"><span>Close</span></button></div>`;
        $("fl-close").onclick = () => Nav.back();
        return;
      }
      el.innerHTML = `<div class="sheet-card flock"><canvas id="fl-cv"></canvas><h2>${F.title}</h2><p>${F.blurb}</p>
        <form id="fl-form" novalidate>
          <label class="field"><span>${F.email}</span><input type="email" id="fl-email" autocomplete="email" inputmode="email" required></label>
          <fieldset><label class="radio"><input type="radio" name="who" value="adult"><span>${F.adult}</span></label>
          <label class="radio"><input type="radio" name="who" value="parent"><span>${F.parent}</span></label></fieldset>
          <label class="check"><input type="checkbox" id="fl-consent"><span>${F.consent} <a href="#" id="fl-privacy">${F.privacy}</a></span></label>
          <p class="msg" id="fl-msg" role="status"></p>
          <button class="btn primary big" type="submit" id="fl-send">${Icons.get("mail")}<span>${F.send}</span></button>
          <button class="btn ghost" type="button" id="fl-later"><span>${F.notNow}</span></button>
        </form></div>`;
      requestAnimationFrame(() => Art.drawLamb(Art.sharp($("fl-cv"), 120, 80), 60, 46, 70, { look: Progress.look(), mood: "joy" }));
      $("fl-privacy").onclick = (e) => {
        e.preventDefault();
        Nav.go("privacy");
      };
      $("fl-later").onclick = () => Nav.back();
      $("fl-form").onsubmit = async (e) => {
        e.preventDefault();
        const msg = $("fl-msg");
        const email = $("fl-email").value.trim();
        const who = el.querySelector("input[name=who]:checked")?.value;
        msg.className = "msg";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return (msg.textContent = F.badEmail);
        if (!who) return (msg.textContent = F.needAge);
        if (!$("fl-consent").checked) return (msg.textContent = F.needConsent);
        if (!navigator.onLine) return (msg.textContent = F.offline);
        const btn = $("fl-send");
        btn.disabled = true;
        msg.textContent = F.sending;
        try {
          await send(email, who === "adult" ? "adult" : "parent-for-child");
          P().joined = true;
          Save.save();
          msg.className = "msg ok";
          msg.textContent = F.ok;
          $("fl-email").value = "";
          Sfx.win();
          btn.hidden = true;
          $("fl-later").querySelector("span").textContent = "Close";
        } catch (err) {
          msg.className = "msg bad";
          msg.textContent = err.message === "closed" ? F.closed : navigator.onLine ? F.error : F.offline;
          btn.disabled = false;
        }
      };
    },
  });
  return { offer, shouldAsk };
})();
