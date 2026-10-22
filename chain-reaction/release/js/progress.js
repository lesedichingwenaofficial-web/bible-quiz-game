// ============================== PROGRESS ==============================
// Wool (to spend), XP and the Flock Level, the Wardrobe catalogue, badges, the Shepherd's
// Journal and the Daily Bread streak. No timers, no lives, no pressure: just gifts for playing.
const Progress = (() => {
  // ---------- the Wardrobe ----------
  // price in wool; tier: common | rare | prestige; season: only on sale in that season (kept forever once bought)
  const ITEMS = [
    // Lamb: hats
    { id: "hat-none", tab: "lamb", slot: "hat", name: "No hat", price: 0 },
    { id: "hat-bow", tab: "lamb", slot: "hat", name: "Pink bow", price: 60 },
    { id: "hat-straw", tab: "lamb", slot: "hat", name: "Straw hat", price: 80 },
    { id: "hat-beanie", tab: "lamb", slot: "hat", name: "Woolly beanie", price: 80 },
    { id: "hat-cap", tab: "lamb", slot: "hat", name: "Sun cap", price: 100 },
    { id: "hat-beret", tab: "lamb", slot: "hat", name: "Beret", price: 120 },
    { id: "hat-flowers", tab: "lamb", slot: "hat", name: "Flower crown", price: 150 },
    { id: "hat-party", tab: "lamb", slot: "hat", name: "Party hat", price: 150 },
    { id: "hat-sunflower", tab: "lamb", slot: "hat", name: "Sunflower", price: 200 },
    { id: "hat-top", tab: "lamb", slot: "hat", name: "Top hat", price: 400, tier: "rare" },
    { id: "hat-crown", tab: "lamb", slot: "hat", name: "Golden crown", price: 2500, tier: "prestige" },
    { id: "hat-santa", tab: "lamb", slot: "hat", name: "Christmas hat", price: 120, season: "christmas" },
    { id: "hat-bonnet", tab: "lamb", slot: "hat", name: "Spring bonnet", price: 120, season: "easter" },
    // Lamb: scarves
    { id: "scarf-red", tab: "lamb", slot: "scarf", name: "Red scarf", price: 0 },
    { id: "scarf-blue", tab: "lamb", slot: "scarf", name: "Blue scarf", price: 40 },
    { id: "scarf-yellow", tab: "lamb", slot: "scarf", name: "Yellow scarf", price: 40 },
    { id: "scarf-green", tab: "lamb", slot: "scarf", name: "Green scarf", price: 40 },
    { id: "scarf-purple", tab: "lamb", slot: "scarf", name: "Purple scarf", price: 60 },
    { id: "scarf-pink", tab: "lamb", slot: "scarf", name: "Pink scarf", price: 60 },
    { id: "scarf-rainbow", tab: "lamb", slot: "scarf", name: "Rainbow scarf", price: 500, tier: "rare" },
    { id: "scarf-gold", tab: "lamb", slot: "scarf", name: "Golden scarf", price: 0, level: 15, tier: "rare" },
    // Lamb: bells
    { id: "bell-none", tab: "lamb", slot: "bell", name: "No bell", price: 0 },
    { id: "bell-brass", tab: "lamb", slot: "bell", name: "Brass bell", price: 150 },
    { id: "bell-silver", tab: "lamb", slot: "bell", name: "Silver bell", price: 350, tier: "rare" },
    { id: "bell-gold", tab: "lamb", slot: "bell", name: "Golden bell", price: 1800, tier: "prestige" },
    // Lamb: glasses
    { id: "glasses-none", tab: "lamb", slot: "glasses", name: "No glasses", price: 0 },
    { id: "glasses-round", tab: "lamb", slot: "glasses", name: "Reading specs", price: 100 },
    { id: "glasses-sun", tab: "lamb", slot: "glasses", name: "Sunglasses", price: 180 },
    { id: "glasses-heart", tab: "lamb", slot: "glasses", name: "Heart glasses", price: 250 },
    { id: "glasses-star", tab: "lamb", slot: "glasses", name: "Star glasses", price: 300, tier: "rare" },
    // Flock: wool colours and patterns
    { id: "wool-white", tab: "flock", slot: "wool", name: "Snow white", price: 0 },
    { id: "wool-cream", tab: "flock", slot: "wool", name: "Cream", price: 80 },
    { id: "wool-pink", tab: "flock", slot: "wool", name: "Candyfloss", price: 150 },
    { id: "wool-choc", tab: "flock", slot: "wool", name: "Chocolate", price: 150 },
    { id: "wool-cloud", tab: "flock", slot: "wool", name: "Cloud blue", price: 200 },
    { id: "wool-night", tab: "flock", slot: "wool", name: "Midnight", price: 300, tier: "rare" },
    { id: "wool-gold", tab: "flock", slot: "wool", name: "Golden fleece", price: 3000, tier: "prestige" },
    { id: "pattern-plain", tab: "flock", slot: "pattern", name: "Plain flock", price: 0 },
    { id: "pattern-spots", tab: "flock", slot: "pattern", name: "Spotty flock", price: 120 },
    { id: "pattern-stripes", tab: "flock", slot: "pattern", name: "Stripy flock", price: 150 },
    { id: "pattern-hearts", tab: "flock", slot: "pattern", name: "Heart flock", price: 250 },
    { id: "pattern-stars", tab: "flock", slot: "pattern", name: "Starry flock", price: 300, tier: "rare" },
    // Cursor trails
    { id: "trail-none", tab: "trail", slot: "trail", name: "No trail", price: 0 },
    { id: "trail-sparkle", tab: "trail", slot: "trail", name: "Sparkles", price: 150 },
    { id: "trail-petals", tab: "trail", slot: "trail", name: "Petals", price: 200 },
    { id: "trail-hearts", tab: "trail", slot: "trail", name: "Hearts", price: 250 },
    { id: "trail-stars", tab: "trail", slot: "trail", name: "Stars", price: 300, tier: "rare" },
    { id: "trail-rainbow", tab: "trail", slot: "trail", name: "Rainbow", price: 1200, tier: "prestige" },
    // Bursts
    { id: "burst-puff", tab: "burst", slot: "burst", name: "Wool puffs", price: 0 },
    { id: "burst-confetti", tab: "burst", slot: "burst", name: "Confetti", price: 150 },
    { id: "burst-flowers", tab: "burst", slot: "burst", name: "Flowers", price: 200 },
    { id: "burst-hearts", tab: "burst", slot: "burst", name: "Hearts", price: 250 },
    { id: "burst-stars", tab: "burst", slot: "burst", name: "Stars", price: 300, tier: "rare" },
    { id: "burst-gold", tab: "burst", slot: "burst", name: "Golden glory", price: 1500, tier: "prestige" },
    // Arenas (board looks)
    { id: "arena-meadow", tab: "arena", slot: "arena", name: "Meadow", price: 0 },
    { id: "arena-autumn", tab: "arena", slot: "arena", name: "Autumn field", price: 200 },
    { id: "arena-oasis", tab: "arena", slot: "arena", name: "Desert oasis", price: 250 },
    { id: "arena-snow", tab: "arena", slot: "arena", name: "Frosty field", price: 300 },
    { id: "arena-night", tab: "arena", slot: "arena", name: "Starry night", price: 400, tier: "rare" },
    { id: "arena-gold", tab: "arena", slot: "arena", name: "Golden hour", price: 2000, tier: "prestige" },
    { id: "arena-bethlehem", tab: "arena", slot: "arena", name: "Bethlehem night", price: 150, season: "christmas" },
    { id: "arena-garden", tab: "arena", slot: "arena", name: "Easter garden", price: 150, season: "easter" },
  ];
  const BY_ID = new Map(ITEMS.map((it) => [it.id, it]));
  const TABS = [["lamb", "Lamb", "lamb"], ["flock", "Flock", "wool"], ["trail", "Trails", "sparkle"], ["burst", "Bursts", "party"], ["arena", "Arenas", "grid"]];

  // ---------- Flock Level rewards: every level gives something ----------
  const LEVEL_ITEMS = { 2: "scarf-blue", 3: "hat-straw", 4: "trail-sparkle", 5: "burst-confetti", 6: "wool-cream", 7: "glasses-round", 8: "arena-autumn", 9: "pattern-spots", 10: "hat-flowers", 12: "bell-brass", 15: "scarf-gold", 18: "trail-petals", 20: "hat-top", 25: "arena-night" };
  const levelReward = (lvl) => (LEVEL_ITEMS[lvl] ? { item: LEVEL_ITEMS[lvl] } : { wool: 40 + lvl * 10 });

  const P = () => Save.profile;
  const owned = (id) => !!P().owned[id] || Save.data.dev.unlockAll;
  const forSale = (it) => !it.season || it.season === Dates.season() || owned(it.id);

  function addWool(n) {
    P().wool = Math.max(0, P().wool + Math.round(n));
    Save.save();
  }
  function buy(id) {
    const it = BY_ID.get(id);
    if (!it || owned(id) || !forSale(it) || it.level) return false;
    if (P().wool < it.price && !Save.data.dev.wool) return false;
    if (!Save.data.dev.wool) P().wool -= it.price;
    P().owned[id] = 1;
    Save.save();
    return true;
  }
  function equip(id) {
    const it = BY_ID.get(id);
    if (!it || !owned(id)) return false;
    P().equipped[it.slot] = id;
    Save.save();
    return true;
  }
  const look = () => {
    const e = P().equipped;
    return { hat: e.hat, scarf: e.scarf, bell: e.bell, glasses: e.glasses, wool: e.wool };
  };

  // ---------- XP ----------
  // returns the levels gained, each with its reward (already given)
  function addXp(n) {
    const p = P();
    p.xp += Math.round(n);
    const ups = [];
    while (p.xp >= CONFIG.levelXp(p.level)) {
      p.xp -= CONFIG.levelXp(p.level);
      p.level++;
      const r = levelReward(p.level);
      if (r.item) p.owned[r.item] = 1;
      if (r.wool) p.wool += r.wool;
      ups.push({ level: p.level, ...r });
    }
    Save.save();
    return ups;
  }

  // ---------- Daily Bread ----------
  // Your first game each day is your Daily Bread. Missing one day is forgiven (grace);
  // a longer gap simply starts a new streak. Nothing is ever taken away.
  function dailyBread() {
    const b = P().bread;
    const today = Dates.today();
    if (b.last === today) return null;
    const gap = b.last ? Dates.daysBetween(b.last, today) : 99;
    b.streak = gap <= 2 ? b.streak + 1 : 1;
    b.best = Math.max(b.best, b.streak);
    b.total++;
    b.last = today;
    const wool = CONFIG.wool.dailyBread + Math.min(CONFIG.wool.maxStreakBonus, (b.streak - 1) * CONFIG.wool.streakBonus);
    addWool(wool);
    Save.save();
    return { streak: b.streak, wool, grace: gap === 2 };
  }
  const breadToday = () => P().bread.last === Dates.today();

  // ---------- Verse of the Day ----------
  function verseOfDay() {
    const season = Dates.season();
    const pool = (season && STRINGS.seasonVerses[season]) || STRINGS.verses;
    const day = Dates.daysBetween("2026-01-01", Dates.today());
    return pool[((day % pool.length) + pool.length) % pool.length];
  }
  const verse = (ref) => STRINGS.verses.find((v) => v[0] === ref) || Object.values(STRINGS.seasonVerses).flat().find((v) => v[0] === ref);

  // ---------- badges (across the whole game) ----------
  const GLOBAL_BADGES = [
    { id: "g.first", icon: "sparkle", name: "First Steps", desc: "Finish your first game", test: () => P().games >= 1 },
    { id: "g.ten", icon: "flag", name: "Faithful flock", desc: "Finish 10 games", test: () => P().games >= 10 },
    { id: "g.hundred", icon: "trophy", name: "Good and faithful", desc: "Finish 100 games", test: () => P().games >= 100 },
    { id: "g.bread7", icon: "bread", name: "Daily Bread", desc: "Play 7 days in a row", test: () => P().bread.streak >= 7 },
    { id: "g.level10", icon: "star", name: "Growing flock", desc: "Reach Flock Level 10", test: () => P().level >= 10 },
    { id: "g.dressed", icon: "shirt", name: "Sunday best", desc: "Own 10 Wardrobe items", test: () => Object.keys(P().owned).length >= 19 },
    { id: "g.journal", icon: "book", name: "Treasured words", desc: "Unlock 5 Journal cards", test: () => Object.keys(P().journal).length >= 5 },
  ];
  // checks every badge that can be checked now; returns the new ones
  function checkBadges(modeDef, ctx) {
    const got = [];
    const all = [...GLOBAL_BADGES, ...(modeDef?.badges || []).map((b) => ({ ...b, id: `${modeDef.key}.${b.id}` }))];
    for (const bd of all) {
      if (P().badges[bd.id]) continue;
      let ok = false;
      try {
        ok = !!bd.test(ctx || {});
      } catch {}
      if (ok) {
        P().badges[bd.id] = { at: Dates.today(), name: bd.name, icon: bd.icon, desc: bd.desc };
        got.push(bd);
      }
    }
    if (got.length) Save.save();
    return got;
  }

  // ---------- the Shepherd's Journal ----------
  // one verse card per mode, unlocked by a milestone in that mode
  const JOURNAL = {
    stampede: { ref: "Psalm 100:3", goal: "Win 3 Stampede+ games", test: (ms) => ms.stats.wins >= 3 },
    saga: { ref: "Psalm 23:2", goal: "Clear level 10 of Sheep Saga", test: (ms) => (ms.progress.cleared || 0) >= 10 },
    wolf: { ref: "John 10:11", goal: "Chase off the first wolf", test: (ms) => (ms.progress.beaten || 0) >= 1 },
    rush: { ref: "Isaiah 40:31", goal: "Win a silver medal in Sheep Rush", test: (ms) => (ms.records.score || 0) >= 250000 },
    lostlamb: { ref: "Luke 15:6", goal: "Find the lost lamb 5 times", test: (ms) => (ms.progress.found || 0) >= 5 },
    flockfall: { ref: "Psalm 18:2", goal: "Win a game of Flock Fall", test: (ms) => ms.stats.wins >= 1 },
    guard: { ref: "Psalm 121:3-4", goal: "Guard a fold through all 10 waves", test: (ms) => (ms.progress.cleared || 0) >= 1 },
    leadhome: { ref: "Luke 15:5", goal: "Lead him home through world 1", test: (ms) => (ms.progress.cleared || 0) >= 10 },
    bridge: { ref: "John 14:6", goal: "Build 5 bridges", test: (ms) => (ms.progress.bridges || 0) >= 5 },
  };
  function checkJournal(modeDef, modeSave, ctx) {
    const j = JOURNAL[modeDef?.key];
    if (!j || P().journal[modeDef.key]) return null;
    let ok = false;
    try {
      ok = !!j.test(modeSave, ctx);
    } catch {}
    if (!ok) return null;
    P().journal[modeDef.key] = Dates.today();
    Save.save();
    return { ...j, mode: modeDef };
  }

  // ---------- one finished game ----------
  // Works out wool and XP, records, badges and the Journal. Returns everything the results
  // screen shows, so it can count it all up.
  function gameOver(modeDef, sum, extra = {}) {
    const p = P();
    const ms = Save.mode(modeDef.key);
    p.games++;
    ms.stats.played++;
    p.minutes += sum.secs / 60;
    ms.stats.minutes += sum.secs / 60;
    if (sum.won) {
      p.wins++;
      ms.stats.wins++;
    }
    // the Auto AI learns from games against the computer
    const vsAi = sum.players.some((q) => q.kind === "ai") && sum.humans.length;
    if (vsAi && !sum.firstSteps) p.ai.rating = clamp(p.ai.rating + (sum.won ? 0.07 : -0.07), 0, 1);
    const best = Math.max(0, ...sum.humans.map((q) => q.best));
    let wool = sum.humans.length ? CONFIG.wool.perGame + (sum.won ? CONFIG.wool.perWin : 0) + Math.min(20, best * CONFIG.wool.perChain) : 0;
    wool += extra.wool || 0;
    const xp = Math.round(wool * 1.4 + (extra.xp || 0));
    // records
    const newRecords = [];
    const rec = (key, value, higher = true) => {
      const prev = ms.records[key];
      if (prev === undefined || (higher ? value > prev : value < prev)) {
        ms.records[key] = value;
        if (prev !== undefined) newRecords.push(key);
      }
    };
    if (sum.humans.length) rec("chain", best);
    for (const r of extra.records || []) rec(r.key, r.value, r.higher ?? true);
    const bread = dailyBread();
    addWool(wool);
    const levels = addXp(xp);
    const ctx = { ...sum, ...extra.ctx, stats: ms.stats, records: ms.records, progress: ms.progress };
    const badges = checkBadges(modeDef, ctx);
    const journal = checkJournal(modeDef, ms, ctx);
    for (const b of badges) addWool(25);
    Save.save();
    return { wool, xp, levels, bread, badges, journal, newRecords, best };
  }

  return {
    ITEMS, BY_ID, TABS, owned, forSale, buy, equip, look, addWool, addXp, levelReward, dailyBread, breadToday,
    verseOfDay, verse, JOURNAL, GLOBAL_BADGES, checkBadges, checkJournal, gameOver,
  };
})();
