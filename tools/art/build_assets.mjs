// ---------------------------------------------------------------------------
// build_assets.mjs
// Purpose : Rebuild every game asset from source: pxl art (assets_src/art/*.px.js),
//           the bitmap font (BMFont XML from pxl's 3x5 glyph table) and chirp
//           audio (assets_src/audio/*.cx.js), then copy the results into public/assets.
// Usage   : node tools/art/build_assets.mjs [--art] [--audio]   (no flag = both)
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PXL = join(root, ".claude/skills/pxl-pixel-art/bin/pxl.js");
const CHIRP = join(root, ".claude/skills/chirp-game-audio/bin/chirp.js");
const args = process.argv.slice(2);
const doArt = !args.length || args.includes("--art");
const doAudio = !args.length || args.includes("--audio");

function run(bin, a, cwd) {
  execFileSync(process.execPath, [bin, ...a], { cwd, stdio: ["ignore", "ignore", "inherit"] });
}

if (doArt) {
  const src = join(root, "assets_src/art");
  const out = join(src, "out");
  rmSync(out, { recursive: true, force: true });
  for (const f of ["people.px.js", "office.px.js", "ui.px.js"]) run(PXL, ["build", f, "--no-preview"], src);
  const dst = join(root, "public/assets/art");
  rmSync(dst, { recursive: true, force: true });
  mkdirSync(dst, { recursive: true });
  for (const f of readdirSync(out)) if (/\.(png|json)$/.test(f)) cpSync(join(out, f), join(dst, f));
  // big single images used directly (skies) and anims
  for (const sub of ["scenes", "sprites", "anims"]) {
    if (!existsSync(join(out, sub))) continue;
    mkdirSync(join(dst, sub), { recursive: true });
    for (const f of readdirSync(join(out, sub))) if (/\.(png|json)$/.test(f)) cpSync(join(out, sub, f), join(dst, sub, f));
  }
  // bitmap font: BMFont XML with proportional widths from pxl's glyph table
  const { glyph } = await import(join(root, ".claude/skills/pxl-pixel-art/src/core/font.ts"));
  const chars = [];
  for (let code = 32; code < 96; code++) {
    const ch = String.fromCharCode(code);
    const w = ch === " " ? 2 : glyph(ch)[0].length;
    const i = code - 32;
    chars.push({ code, x: i * 4, w });
    if (code >= 65 && code <= 90) chars.push({ code: code + 32, x: i * 4, w }); // lowercase -> uppercase glyph
  }
  const xml = [
    `<?xml version="1.0"?>`,
    `<font>`,
    `  <info face="pxl3x5" size="5"/>`,
    `  <common lineHeight="7" base="5" scaleW="256" scaleH="5" pages="1"/>`,
    `  <pages><page id="0" file="sprites/font.png"/></pages>`,
    `  <chars count="${chars.length}">`,
    ...chars.map((c) => `    <char id="${c.code}" x="${c.x}" y="0" width="${c.w}" height="5" xoffset="0" yoffset="0" xadvance="${c.w + 1}" page="0"/>`),
    `  </chars>`,
    `</font>`,
  ].join("\n");
  writeFileSync(join(dst, "font.xml"), xml);
  console.log("[ OK ] art built into public/assets/art");
}

if (doAudio) {
  const src = join(root, "assets_src/audio");
  if (existsSync(src)) {
    for (const f of readdirSync(src).filter((x) => x.endsWith(".cx.js"))) run(CHIRP, ["build", f, "--ogg"], src);
    const out = join(src, "out");
    const dst = join(root, "public/assets/audio");
    rmSync(dst, { recursive: true, force: true });
    mkdirSync(dst, { recursive: true });
    // OGG for most browsers plus an MP3 fallback (older Safari), named by sound
    let hasFfmpeg = true;
    try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch { hasFfmpeg = false; }
    const walk = (d) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory()) { if (!f.name.startsWith("_")) walk(join(d, f.name)); continue; }
        if (f.name.startsWith("sfx_bank")) continue;
        if (f.name.endsWith(".ogg")) cpSync(join(d, f.name), join(dst, f.name));
        if (f.name.endsWith(".wav") && hasFfmpeg) {
          execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(d, f.name), "-codec:a", "libmp3lame", "-q:a", "5", join(dst, f.name.replace(/\.wav$/, ".mp3"))]);
        }
      }
    };
    walk(out);
    console.log("[ OK ] audio built into public/assets/audio");
  }
}
