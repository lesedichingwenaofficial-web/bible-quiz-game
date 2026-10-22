// ============================== CONFIG ==============================
// Everything a site owner might want to change lives here. See README.md.
var CONFIG = {
  appName: "Lamb Stampede",
  shortName: "Stampede",
  version: "1.0.0",
  releaseDate: "2026-10-22",

  // Your site's address, used on share cards and in the preview tags. No trailing slash.
  siteUrl: "https://lambstampede.example",
  social: { handle: "@cheekyfoundlamb", url: "https://www.instagram.com/cheekyfoundlamb" },
  contactEmail: "hello@example.com", // shown on the privacy page

  // Join the Flock (email updates). provider: "netlify" | "kit" | "custom" | "none"
  //   netlify: works on Netlify with no set-up (the hidden form is already in index.html)
  //   kit:     put your Kit form id in kitFormId
  //   custom:  posts JSON { email, age, consent } to customUrl
  //   none:    the sign-up is hidden
  flock: { provider: "netlify", kitFormId: "", customUrl: "", netlifyFormName: "join-the-flock" },

  // A cookie-free visit counter. Off by default. When on, the privacy page says so.
  // url is pinged once a day with no personal data, e.g. a GoatCounter count URL.
  counter: { enabled: false, url: "" },

  // Seasons, by month and day (inclusive). The game decorates itself on these dates.
  seasons: {
    christmas: { from: "12-01", to: "12-31" },
    easter: { from: "auto-7", to: "auto+7" }, // auto = Easter Sunday (Western), counted in days
  },

  // Code for ads and purchases is kept for later but switched off. There is no such screen anywhere.
  ads: { enabled: false },
  purchases: { enabled: false },

  // The first day of the Daily Rush and Daily Pasture (day 1).
  firstDaily: "2026-10-22",

  // Gameplay numbers shared by every mode (each mode can override them).
  tune: { pen: 5, refill: 1.1, cursorMs: 380, roundSecs: 90, stampedeSecs: 20, lineAt: 5, plusAt: 6, bombAt: 9, fullAt: 10, overflowAt: 14 },

  // Progress
  wool: { perGame: 12, perWin: 10, perChain: 0.6, dailyBread: 25, streakBonus: 5, maxStreakBonus: 35 },
  levelXp: (lvl) => 80 + lvl * 30, // XP needed to go from lvl to lvl + 1

  // Join the Flock asking rules
  ask: { minGames: 3, waitDays: 7, maxDismissals: 3 },
};
