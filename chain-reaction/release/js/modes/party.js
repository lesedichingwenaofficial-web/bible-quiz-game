// ======================= PARTY NIGHT =======================
// A playlist of party modes for 2 to 4 players, with a running scoreboard between rounds, then
// a podium, awards and a celebration. Each round is one game of a mode, played as usual.
(() => {
  const PARTY = {
    points: [3, 2, 1, 0], // by place in free-for-all rounds
    win: 3, // a duel or team round: winners
    lose: 1, // ...and the others, for playing
    tie: 2,
    arenas: { stampede: ["open", "rocky", "quick"], lostlamb: ["open", "rocky", "ring"] },
    bridgeSize: 7,
    roundWool: 6, // wool for each round played, given at the end
  };
  const GAMES = {
    stampede: { title: "Stampede+", key: "gStampede", line: "Everyone for themselves: biggest flock wins." },
    lostlamb: { title: "Lost Lamb", key: "gLostlamb", line: "Stand with the lamb to fill your bar." },
    bridge: { title: "Bridge", key: "gBridge", line: "Two sides race to link their edges." },
    flockfall: { title: "Flock Fall", key: "gFlockfall", line: "Head to head: chain 4 to send rocks." },
  };
  const ORDER = Object.keys(GAMES);
  let P = null; // the party in progress

  const playlist = (s) => ORDER.filter((k) => s[GAMES[k].key]);
  const pal = () => App.palette();
  // a party player's name and look, fixed for the whole night
  function who(s, k) {
    const st = s.seats[k];
    const ai = st.kind === "ai";
    const name = ai ? Core.PERSONAS[st.persona].name : st.name || (k === 0 ? Save.profile.name : pal().names[st.color]);
    let look = st.look || null;
    if (!ai && !look && k === s.seats.findIndex((x, j) => j < s.n && x.kind !== "ai")) look = Progress.look();
    return { k, name, color: pal().colors[st.color], sym: Art.SYMBOLS[st.color], ai, look };
  }
  // the scoreboard, best first (ties keep seat order)
  const standings = () => P.people.map((p) => p.k).sort((a, b) => P.points[b] - P.points[a] || a - b);
  const seatOf = (k, extra = {}) => ({ ...P.s.seats[k], name: P.people[k].name, aiName: P.people[k].ai ? P.people[k].name : undefined, look: P.people[k].look, ...extra });

  // ---------- one round: which game, who plays where ----------
  function plan() {
    const key = P.list[P.k % P.list.length];
    const n = P.people.length;
    const st = standings();
    const games = [];
    if (key === "stampede" || key === "lostlamb") {
      const arenas = PARTY.arenas[key];
      const setup = key === "stampede"
        ? { n, arena: arenas[Math.floor(P.k / P.list.length) % arenas.length], bestOf: 1, teams: false, boxes: true, tSpeedy: false, tBig: false, tMirror: false, tNight: false }
        : { n, arena: arenas[Math.floor(P.k / P.list.length) % arenas.length], bestOf: 1 };
      games.push({ key, setup, seats: P.people.map((p) => p.k), label: "Everyone plays" });
    } else if (key === "bridge") {
      if (n === 2) games.push({ key, setup: { n: 2, size: PARTY.bridgeSize, bestOf: 1 }, seats: [0, 1], label: `${P.people[0].name} v ${P.people[1].name}` });
      else if (n === 4) {
        // the leader teams up with the player at the back
        const seats = [st[0], st[1], st[2], st[3]];
        games.push({ key, setup: { n: 4, size: PARTY.bridgeSize, bestOf: 1 }, seats, label: `${P.people[st[0]].name} & ${P.people[st[3]].name} v ${P.people[st[1]].name} & ${P.people[st[2]].name}` });
      } else {
        // three players: whoever is at the back gets an AI helper
        const seats = [st[2], st[0], st[1], -1];
        games.push({ key, setup: { n: 4, size: PARTY.bridgeSize, bestOf: 1 }, seats, label: `${P.people[st[2]].name} & a helper v ${P.people[st[0]].name} & ${P.people[st[1]].name}` });
      }
    } else {
      // Flock Fall is a duel: with 4, two duels; with 3, the leader sits this one out
      let pairs;
      if (n === 2) pairs = [[0, 1]];
      else if (n === 4) pairs = [[st[0], st[1]], [st[2], st[3]]];
      else {
        const sitter = P.points[st[0]] > P.points[st[1]] ? st[0] : P.k % 3;
        const rest = st.filter((k) => k !== sitter);
        pairs = [rest];
        P.sitter = sitter;
      }
      pairs.forEach(([a, b], d) => {
        // a person takes the first seat; the AI rival takes the second
        if (P.people[a].ai && !P.people[b].ai) [a, b] = [b, a];
        games.push({ key, duel: true, setup: { vs: P.people[b].ai ? "ai" : "friend" }, seats: [a, b], label: `${pairs.length > 1 ? `Duel ${d + 1}: ` : ""}${P.people[a].name} v ${P.people[b].name}` });
      });
    }
    P.games = games;
    P.g = 0;
  }

  async function launch(game) {
    const def = await App.loadMode(game.key);
    if (!def) return;
    const s = { ...(def.setupDefaults || {}), ...game.setup };
    s.seats = game.seats.map((k, j) => (k >= 0 ? seatOf(k) : { kind: "ai", level: "normal", persona: "patient", color: [0, 1, 2, 3].find((c) => !P.s.seats.slice(0, P.s.n).some((x) => x.color === c)) ?? 3, name: "", look: null }));
    while (s.seats.length < 4) s.seats.push({ ...P.s.seats[s.seats.length], kind: "ai" });
    // Flock Fall's second seat follows its "vs"; the first seat's kind comes from the party
    App.play(game.key, s, { party: true, onEnd: (sum) => scoreGame(game, sum), onQuit: () => Nav.go("partyboard", {}, { reset: false, replace: true }), quitLabel: "Back to the party" });
  }

  // ---------- points ----------
  function scoreGame(game, sum) {
    Pwa.gameEnded();
    const G = sum.G;
    const got = {};
    const add = (k, v) => k >= 0 && (got[k] = (got[k] || 0) + v);
    const partyOf = (pl) => game.seats[pl.seat];
    const people = G.players.filter((pl) => pl.seat >= 0);
    let winners = [];
    if (game.key === "stampede" || game.key === "lostlamb") {
      // places: the winner first, then by bar (Lost Lamb) or by flock (Stampede+)
      const metric = (pl) => (pl.team === sum.res.team ? 1e9 : 0) + (game.key === "lostlamb" ? pl.score || 0 : (pl.alive ? 1e6 : 0) + Core.cellsOf(pl.id) * 1000 + Core.orbsOf(pl.id));
      const ranked = people.slice().sort((a, b) => metric(b) - metric(a));
      let place = 0;
      ranked.forEach((pl, j) => {
        if (j > 0 && metric(pl) < metric(ranked[j - 1])) place = j;
        add(partyOf(pl), PARTY.points[place] ?? 0);
        if (place === 0) winners.push(partyOf(pl));
      });
    } else {
      for (const pl of people) {
        const k = partyOf(pl);
        if (sum.res.team < 0) add(k, PARTY.tie);
        else if (pl.team === sum.res.team) {
          add(k, PARTY.win);
          winners.push(k);
        } else add(k, PARTY.lose);
      }
    }
    winners = [...new Set(winners.filter((k) => k >= 0))];
    for (const [k, v] of Object.entries(got)) P.points[k] += v;
    for (const k of winners) P.wins[k]++;
    for (const pl of people) {
      const k = partyOf(pl);
      if (k >= 0) P.best[k] = Math.max(P.best[k], pl.best, pl.chain || 0);
    }
    P.secs += sum.secs;
    // the comeback: anyone who was ever last can still finish on top
    const st = standings();
    if (P.k > 0) P.everLast.add(st[st.length - 1]);
    P.last = { game: game.key, label: game.label, got, winners };
    P.g++;
    if (P.g >= P.games.length) {
      P.k++;
      P.sitter = -1;
      if (P.k >= P.rounds) return finish();
      plan();
    }
    Nav.go("partyboard", {}, { replace: true });
  }

  function finish() {
    P.done = true;
    Music.play("meadowDash", "bright", 126);
    Nav.go("partypodium", {}, { replace: true });
  }

  // ---------- screens ----------
  const sec = (id) => {
    const el = document.createElement("section");
    el.className = "screen party-screen";
    el.id = `scr-${id}`;
    el.hidden = true;
    document.body.append(el);
  };
  sec("partyboard");
  sec("partypodium");

  function table(order, deltas) {
    return `<div class="pt-table">${order.map((k, j) => {
      const p = P.people[k];
      const d = deltas?.[k];
      return `<div class="pt-row${j === 0 && P.points[k] > 0 ? " lead" : ""}"><span class="pt-place">${j + 1}</span>${App.symSvg(p.sym, p.color)}<b style="color:${p.color}">${esc(p.name)}</b><span class="pt-wins">${P.wins[k] ? `${Icons.get("trophy")}${P.wins[k]}` : ""}</span><span class="pt-pts">${P.points[k]}${d ? `<small>+${d}</small>` : ""}</span></div>`;
    }).join("")}</div>`;
  }

  Nav.define("partyboard", {
    render(el) {
      if (!P) return Nav.go("home", {}, { reset: true });
      const game = P.games[P.g];
      const G = GAMES[game.key];
      el.replaceChildren(UI.header("Party Night", { right: UI.h("span", { class: "chip", html: `${Icons.get("party")}<b>${P.k + 1}/${P.rounds}</b>` }) }));
      const page = UI.h("div", { class: "page party" });
      const last = P.last ? `<p class="pt-last">${Icons.get("check")} ${esc(GAMES[P.last.game].title)}: ${P.last.winners.length ? `<b>${P.last.winners.map((k) => esc(P.people[k].name)).join(" & ")}</b> won` : "a tie"}</p>` : `<p class="pt-last">${Icons.get("sparkle")} ${P.rounds} rounds of ${P.list.map((k) => esc(GAMES[k].title)).join(", ")}</p>`;
      page.innerHTML = `${last}${table(standings(), P.last?.got)}
        <div class="pt-next"><canvas class="pt-art"></canvas><div><small>Round ${P.k + 1} of ${P.rounds}${P.games.length > 1 ? ` · duel ${P.g + 1} of ${P.games.length}` : ""}</small><b>${esc(G.title)}</b><span>${esc(G.line)}</span><span class="pt-who">${Icons.get("people")} ${esc(game.label)}</span>${P.sitter >= 0 && game.key === "flockfall" ? `<span class="pt-who">${Icons.get("crown")} ${esc(P.people[P.sitter].name)} is in the lead and sits this one out</span>` : ""}</div></div>`;
      const go = UI.btn(`Play round ${P.k + 1}`, () => launch(game), "primary huge", "play");
      const end = UI.btn(P.k > 0 ? "End the party now" : "Leave the party", async () => {
        if (!(await UI.confirm(P.k > 0 ? "End the party and go to the podium?" : "Leave the party?", P.k > 0 ? "To the podium" : "Leave", "Keep playing"))) return;
        if (P.k > 0) finish();
        else {
          P = null;
          Nav.go("home", {}, { reset: true });
        }
      }, "ghost");
      page.append(UI.h("div", { class: "setup-go pt-go" }, go, end));
      el.append(page);
      requestAnimationFrame(() => {
        const cv = page.querySelector(".pt-art");
        ModeArt.draw(Art.sharp(cv, 96, 72), game.key, 96, 72, 0);
      });
    },
    onShow() {
      Music.play("meadowDash", "gentle", 100);
      Music.setLayer(0);
    },
    onBack() {
      return true;
    },
  });

  // the podium: top three on their steps, the rest cheering, confetti and the awards
  let podiumStop = null;
  Nav.define("partypodium", {
    render(el) {
      if (!P) return Nav.go("home", {}, { reset: true });
      const st = standings();
      el.replaceChildren(UI.header("Party Night"));
      const page = UI.h("div", { class: "page party" });
      const cv = UI.h("canvas", { class: "pt-podium" });
      const champ = P.people[st[0]];
      const tied = st.length > 1 && P.points[st[0]] === P.points[st[1]];
      page.append(cv);
      page.insertAdjacentHTML("beforeend", `<h1 class="res-title" style="color:${champ.color}">${tied ? "A shared crown!" : `${esc(champ.name)} wins the night!`}</h1>
        ${table(st)}
        <h3 class="sub">${STRINGS.results.awards}</h3><div class="awards">${awards().map((a) => `<div class="award"><b>${esc(a.title)}</b><span style="color:${a.p.color}">${App.symSvg(a.p.sym, a.p.color)} ${esc(a.p.name)}</span><small>${esc(a.value)}</small></div>`).join("")}</div>`);
      page.append(UI.h("div", { class: "setup-go pt-go" }, UI.btn("Collect your wool", () => App.finished(Modes.get("party"), summary()), "primary huge", "wool")));
      el.append(page);
      podiumStop?.();
      requestAnimationFrame(() => {
        const W = Math.min(420, page.clientWidth - 32);
        podiumStop = UI.liveCanvas(cv, W, 210, (g, t) => drawPodium(g, W, 210, t, st));
      });
      Sfx.levelUp?.();
      buzz([40, 60, 40, 60, 120]);
    },
    onHide() {
      podiumStop?.();
      podiumStop = null;
    },
    onBack() {
      return true;
    },
  });

  function awards() {
    const st = standings();
    const top = (arr) => P.people.map((p) => p.k).reduce((a, b) => (arr[b] > arr[a] ? b : a));
    const out = [{ title: "Party Champion", p: P.people[st[0]], value: `${P.points[st[0]]} points` }];
    const w = top(P.wins);
    if (P.wins[w] > 0) out.push({ title: "Most Round Wins", p: P.people[w], value: `${P.wins[w]} wins` });
    const c = top(P.best);
    if (P.best[c] >= 3) out.push({ title: "Biggest Chain", p: P.people[c], value: `×${P.best[c]}` });
    const back = st.slice(0, 2).find((k) => P.everLast.has(k));
    if (back !== undefined) out.push({ title: "Comeback Lamb", p: P.people[back], value: "From last to the top" });
    return out;
  }

  // what the usual results screen needs: wool and badges for everyone who played
  function summary() {
    const st = standings();
    const champ = P.people[st[0]];
    const players = P.people.map((p) => ({ id: p.k, name: p.name, color: p.color, sym: p.sym, team: p.k, human: !p.ai, kind: p.ai ? "ai" : "human", best: P.best[p.k], drops: 0, wastes: 0, bursts: 0, specials: 0, cells: 0, worstRank: 0, look: p.look }));
    const won = !champ.ai;
    return {
      res: { team: champ.k }, won, mode: "party", setup: P.s, firstSteps: false, solo: false,
      title: `${champ.name} wins the night!`, sub: `${P.rounds} rounds · ${P.points[st[0]]} points`, color: champ.color,
      players, humans: players.filter((p) => p.human), awards: [], chainRec: null, match: null, secs: P.secs, G: null,
      party: { rounds: P.k, wins: P.wins.slice(), points: P.points.slice(), standings: st },
    };
  }

  function drawPodium(g, w, h, t, st) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#5b4b8a");
    sky.addColorStop(1, "#ffb38a");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // spotlights
    for (let k = 0; k < 3; k++) {
      g.save();
      g.globalAlpha = 0.12 + 0.05 * Math.sin(t * 2 + k);
      g.fillStyle = "#fff6c8";
      g.beginPath();
      const x = w * (0.25 + k * 0.25);
      g.moveTo(x, 0);
      g.lineTo(x - 50 + Math.sin(t + k) * 20, h);
      g.lineTo(x + 50 + Math.sin(t + k) * 20, h);
      g.fill();
      g.restore();
    }
    // the steps: 2nd, 1st, 3rd
    const steps = [[1, 0.24, 0.62], [0, 0.5, 0.48], [2, 0.76, 0.72]];
    const reduced = Save.settings.reduced;
    for (const [place, fx, top] of steps) {
      const k = st[place];
      if (k === undefined) continue;
      const p = P.people[k];
      const x = w * fx;
      Art.rrect(g, x - 44, h * top, 88, h * (1 - top) + 10, 8, place === 0 ? "#ffcf4a" : place === 1 ? "#dfe3ea" : "#e0a26a");
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.font = "700 22px Fredoka, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(String(place + 1), x, h * top + 30);
      const jump = reduced ? 0 : Math.abs(Math.sin(t * (place === 0 ? 6 : 4) + place)) * (place === 0 ? 10 : 5);
      Art.drawLamb(g, x, h * top - 26 - jump, place === 0 ? 62 : 52, { t: t + place, look: place === 0 ? { ...(p.look || {}), hat: "hat-crown" } : p.look, scarf: p.look?.scarf ? undefined : p.color, mood: place === 0 ? "joy" : "happy" });
    }
    // fourth place cheers from the side
    if (st[3] !== undefined) {
      const p = P.people[st[3]];
      Art.drawLamb(g, w * 0.08, h * 0.86 - (reduced ? 0 : Math.abs(Math.sin(t * 5)) * 4), 40, { t, look: p.look, scarf: p.look?.scarf ? undefined : p.color, mood: "joy" });
    }
    // confetti
    if (!reduced) {
      const cols = ["#ff5a5f", "#3fa7ff", "#ffc93c", "#2fd38a", "#9b7bff", "#ff8fc7"];
      for (let k = 0; k < 40; k++) {
        const x = ((k * 97.3 + Math.sin(t + k) * 30) % w + w) % w;
        const y = ((t * (40 + (k % 7) * 9) + k * 53) % (h + 20)) - 10;
        g.save();
        g.translate(x, y);
        g.rotate(t * 3 + k);
        g.fillStyle = cols[k % cols.length];
        g.fillRect(-3, -2, 6, 4);
        g.restore();
      }
    }
  }

  // ---------- the mode ----------
  Modes.register({
    key: "party",
    title: "Party Night",
    how: ["A playlist of party games with a running scoreboard.", "Points every round, then the podium. Who wins the night?"],
    music: { song: "meadowDash", style: "bright", bpm: 120 },
    setupDefaults: { n: 3, rounds: 6, gStampede: true, gLostlamb: true, gBridge: true, gFlockfall: true },
    players: (s) => Array.from({ length: s.n }, (_, p) => ({ seat: p })),
    options(ui, s) {
      ui.seg("Players", "n", [[2, "2"], [3, "3"], [4, "4"]], "Anyone can be a person or an AI");
      ui.seats(s.n);
      ui.section("The playlist");
      for (const k of ORDER) ui.toggle(GAMES[k].title, GAMES[k].key, GAMES[k].line);
      if (!playlist(s).length) ui.note("Pick at least one game for the playlist.");
      ui.seg("Rounds", "rounds", [[4, "4"], [6, "6"], [8, "8"], [10, "10"]]);
      if (s.gFlockfall && s.n > 2) ui.note(s.n === 4 ? "Flock Fall rounds are two duels side by side." : "In Flock Fall rounds the leader sits out, so everyone can catch up.");
      if (s.gBridge && s.n === 3) ui.note("In Bridge rounds whoever is at the back gets an AI helper.");
    },
    playLabel: (s) => `Start the party · ${s.rounds} rounds`,
    // Party Night runs its own rounds rather than one Core game
    launch(s) {
      if (!playlist(s).length) {
        UI.toast("Pick at least one game for the playlist", { icon: "info" });
        return;
      }
      const n = s.n;
      P = { s: structuredClone(s), list: playlist(s), rounds: s.rounds, k: 0, g: 0, games: [], people: [], points: new Array(n).fill(0), wins: new Array(n).fill(0), best: new Array(n).fill(0), everLast: new Set(), secs: 0, last: null, sitter: -1 };
      P.people = Array.from({ length: n }, (_, k) => who(P.s, k));
      // two AI lambs with the same personality get told apart, as in a game
      const seen = new Map();
      for (const p of P.people) {
        const c = seen.get(p.name) || 0;
        seen.set(p.name, c + 1);
        if (c) p.name += c === 1 ? " Jr" : ` ${c + 1}`;
      }
      plan();
      Nav.go("partyboard", {}, { replace: Nav.is("results") });
    },
    tips: [],
    help: [
      { title: "A playlist of games", text: "Pick the games and how many rounds. They take turns, one game per round.", draw: (g, w, h, t) => ModeArt.draw(g, ORDER[Math.floor(t / 1.5) % 4], w, h, t) },
      { title: "Points every round", text: "Free-for-all rounds give 3, 2, 1 by place. Duels and team rounds give 3 to the winners and 1 to everyone else.", draw: (g, w, h, t) => helpPoints(g, w, h, t) },
      { title: "Catch-up rules", text: "In Flock Fall the leader may sit out, and in Bridge the leader teams up with whoever is at the back.", draw: (g, w, h, t) => ModeArt.draw(g, "party", w, h, t) },
    ],
    badges: [
      { id: "night", icon: "party", name: "Party animal", desc: "Finish a Party Night", test: (c) => c.mode === "party" },
      { id: "champ", icon: "crown", name: "Champion of the night", desc: "Win a Party Night", test: (c) => c.won },
      { id: "full", icon: "people", name: "Full house", desc: "Finish a 4-player Party Night", test: (c) => c.setup.n === 4 },
      { id: "long", icon: "timer", name: "All night long", desc: "Play 10 rounds in one night", test: (c) => c.party.rounds >= 10 },
    ],
    results(sum) {
      const st = sum.party.standings;
      return {
        wool: sum.party.rounds * PARTY.roundWool,
        html: `<div class="ll-bars">${st.map((k) => {
          const p = sum.players[k];
          return `<div>${App.symSvg(p.sym, p.color)}<span class="meter"><i style="width:${(100 * sum.party.points[k]) / Math.max(1, sum.party.points[st[0]])}%;background:${p.color}"></i></span><b>${sum.party.points[k]}</b></div>`;
        }).join("")}</div>`,
        againLabel: "Another party",
        again: () => App.play("party", { ...sum.setup }),
        shareLine: `${sum.title} ${sum.party.rounds} rounds of fun`,
      };
    },
    drawResult(g, w, h, t, won, sum) {
      if (!P || !P.done) return false;
      drawPodium(g, w, h, t, sum.party.standings);
      return true;
    },
  });

  function helpPoints(g, w, h, t) {
    const pts = [3, 2, 1];
    for (let k = 0; k < 3; k++) {
      const x = w / 2 + (k - 1) * 70;
      const hh = 70 - k * 18;
      Art.rrect(g, x - 26, h - 20 - hh, 52, hh, 8, ["#ffcf4a", "#dfe3ea", "#e0a26a"][k]);
      g.fillStyle = "#2b3a2f";
      g.font = "700 20px Fredoka, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(`+${pts[k]}`, x, h - 26 - hh + 22);
      Art.drawLamb(g, x, h - 36 - hh - (k === 0 ? Math.abs(Math.sin(t * 5)) * 6 : 0), 34, { t: t + k, mood: k === 0 ? "joy" : "happy", scarf: ["#ff5a5f", "#3fa7ff", "#ffc93c"][k] });
    }
  }
})();
