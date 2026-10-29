// ---------------------------------------------------------------------------
// capture.mjs
// Purpose : Phone-sized screenshots of the BUILT game for reviews: waits for a
//           console marker, then an extra delay, then saves a PNG.
// Usage   : node tools/capture.mjs --query "autoplay=pace&speed=6" --until "CARD_SHOWN x"
//                                  --wait 400 --out captures/progress/x.png [--viewport 390x844]
//                                  [--click X,Y ...] (game pixels, clicked after the marker)
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (n, f) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : f; };
const all = (n) => args.flatMap((a, i) => (a === n ? [args[i + 1]] : []));
const ROOT = resolve(import.meta.dirname, "..");
const [VW, VH] = opt("--viewport", "390x844").split("x").map(Number);
const { preview } = await import("vite");
const { chromium } = await import("playwright");
const server = await preview({ root: ROOT, preview: { port: 0, open: false }, logLevel: "silent" });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => logs.push(m.text()));
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
await page.goto(url + "?" + opt("--query", ""));
const until = opt("--until", "BOOT_OK");
const t0 = Date.now();
while (!logs.some((l) => l.includes(until))) {
  if (Date.now() - t0 > Number(opt("--timeout", "240000"))) { console.error("timeout; last logs:\n" + logs.slice(-15).join("\n")); process.exit(1); }
  await page.waitForTimeout(100);
}
await page.waitForTimeout(Number(opt("--wait", "300")));
const box = await page.locator("canvas").boundingBox();
for (const c of all("--click")) {
  const [gx, gy] = c.split(",").map(Number);
  await page.mouse.click(box.x + (gx / 180) * box.width, box.y + (gy / 320) * box.height);
  await page.waitForTimeout(Number(opt("--click-wait", "400")));
}
const rec = opt("--record", "");
if (rec) {
  // --record DIR --frames N --every MS: canvas-only frames for a GIF
  mkdirSync(resolve(ROOT, rec), { recursive: true });
  const n = Number(opt("--frames", "60"));
  for (let i = 0; i < n; i++) {
    await page.locator("canvas").screenshot({ path: resolve(ROOT, rec, `f${String(i).padStart(4, "0")}.png`) });
    await page.waitForTimeout(Number(opt("--every", "80")));
  }
}
const out = resolve(ROOT, opt("--out", "captures/progress/capture.png"));
mkdirSync(dirname(out), { recursive: true });
await page.screenshot({ path: out });
const errs = logs.filter((l) => /ERROR|PAGEERROR/.test(l));
if (errs.length) console.error(errs.join("\n"));
console.log("saved", out);
await browser.close();
server.httpServer.close();
