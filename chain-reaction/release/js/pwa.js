// ============================== PWA ==============================
// Offline play, "Update ready", installing, keeping the screen awake during play,
// full screen on Android, asking to keep saves safe, and the optional visit counter.
const Pwa = (() => {
  let installEvent = null;
  let waiting = null; // a new version, ready
  let wakeLock = null;
  let updating = false;
  const standalone = () => matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  const canInstall = () => !standalone() && (!!installEvent || isIos());
  const playing = () => Core.phase === "play" || Core.phase === "paused" || Core.phase === "between";

  function init() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      installEvent = e;
      if (Nav.is("home")) Nav.refresh();
    });
    window.addEventListener("appinstalled", () => {
      installEvent = null;
      UI.toast("Installed! Find the lamb on your home screen.", { icon: "check" });
    });
    registerWorker();
    pingCounter();
    fpsMeter();
    Bus.on("nav", () => idleChecks());
  }

  // ---- the service worker ----
  function registerWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol) || window.SINGLE_FILE) return;
    navigator.serviceWorker.register("sw.js").then((reg) => {
      if (!reg) return;
      const watch = (w) => {
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) {
            waiting = w;
            idleChecks();
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        waiting = reg.waiting;
        idleChecks();
      }
      reg.addEventListener("updatefound", () => watch(reg.installing));
      // look for a new version now and then while the game stays open
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch((e) => ErrorLog.add(e.message, "sw"));
    // only reload when the player tapped "Update ready" (not when the first install takes over)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!updating) return;
      updating = false;
      Save.writeNow();
      location.reload();
    });
  }
  // Things to offer when nothing is happening: never in the middle of a game.
  function idleChecks() {
    if (playing() || Nav.is("game")) return;
    if (waiting) {
      UI.toast(STRINGS.update, { icon: "refresh", sticky: true, onTap: () => {
        updating = true;
        waiting.postMessage("skipWaiting");
      } });
    }
  }

  // ---- installing ----
  async function install() {
    if (installEvent) {
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice.catch(() => ({}));
      if (outcome === "accepted") installEvent = null;
      return;
    }
    if (isIos()) Nav.go("installios");
  }

  // After a few games: suggest installing (once in a while) and keeping a backup, and ask the
  // browser to keep our save safe from clean-ups.
  function afterGame() {
    const p = Save.profile;
    if (!p.persistAsked && p.games >= 3 && navigator.storage?.persist) {
      p.persistAsked = true;
      navigator.storage.persist().catch(() => {});
    }
    if (!standalone() && canInstall() && (p.games === 5 || p.games === 25) && p.installTipShown < p.games) {
      p.installTipShown = p.games;
      setTimeout(() => UI.toast("Tip: install the game to play offline", { icon: "install", onTap: install, ms: 4500 }), 1500);
    } else if (p.games === 30 && !p.backupTip) {
      p.backupTip = true;
      setTimeout(() => UI.toast("Tip: keep a backup code in Settings, just in case", { icon: "download", ms: 4500, onTap: () => Nav.go("backup") }), 1500);
    }
    Save.save();
  }

  // ---- during play ----
  async function wake(on) {
    try {
      if (on && "wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => (wakeLock = null));
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch {}
  }
  function gameStarted() {
    wake(true);
    // full screen on Android phones (iPhones don't allow it outside an installed app)
    if (isAndroid() && !standalone() && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
    }
  }
  function gameEnded() {
    wake(false);
  }

  // ---- the optional, cookie-free visit counter (off unless switched on in CONFIG) ----
  function pingCounter() {
    const c = CONFIG.counter;
    if (!c.enabled || !c.url) return;
    const day = Dates.today();
    if (Save.data.lastCount === day) return;
    Save.data.lastCount = day;
    Save.save();
    fetch(c.url, { mode: "no-cors", credentials: "omit", cache: "no-store", keepalive: true, referrerPolicy: "no-referrer" }).catch(() => {});
  }

  // ---- developer FPS meter ----
  let fpsTimer = 0;
  function fpsMeter() {
    const el = $("fps");
    clearInterval(fpsTimer);
    el.hidden = !Save.data.dev.fps;
    if (el.hidden) return;
    fpsTimer = setInterval(() => (el.textContent = `${Math.round(Core.fps)} fps`), 500);
  }

  return { init, install, canInstall, isIos, idleChecks, afterGame, gameStarted, gameEnded, wake, fpsMeter, standalone };
})();
