// Draws the icons and the preview picture with the game's own art.
// Usage: node tools/make-art.cjs   (needs Playwright: npm i -D playwright)
const path = require("path");
const fs = require("fs");
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/node-tools/node_modules/playwright"); }
(async () => {
  const root = path.resolve(__dirname, "..");
  const b = await pw.chromium.launch();
  const p = await b.newPage();
  await p.goto("file://" + path.join(root, "tools/make-art.html"));
  const save = (file, data) => fs.writeFileSync(path.join(root, file), Buffer.from(data.split(",")[1], "base64"));
  save("icons/icon-192.png", await p.evaluate(() => icon(192, false)));
  save("icons/icon-512.png", await p.evaluate(() => icon(512, false)));
  save("icons/maskable-512.png", await p.evaluate(() => icon(512, true)));
  save("icons/apple-touch-icon.png", await p.evaluate(() => icon(180, true)));
  save("icons/favicon.png", await p.evaluate(() => icon(64, false)));
  save("img/og.jpg", await p.evaluate(() => og()));
  await b.close();
  console.log("icons and preview picture drawn");
})();
