// ---------------------------------------------------------------------------
// text.ts
// Purpose : Pixel text helpers on the "px" bitmap font (pxl's 3x5 glyphs, built
//           by tools/art/build_assets.mjs). Size 5 = 1x, 10 = 2x.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";

export const FONT = "px";

export function text(scene: Phaser.Scene, x: number, y: number, str: string, color = 0xf6f1e7, scale = 1): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(Math.round(x), Math.round(y), FONT, str.toUpperCase(), 5 * scale);
  t.setTint(color);
  return t;
}

/** Wrap words to a max pixel width (font is 3px + 1 gap per glyph, narrower punctuation). */
export function wrap(str: string, maxWidth: number, scale = 1): string {
  const words = str.toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  const width = (s: string) => s.length * 4 * scale;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (width(next) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export function centerX(t: Phaser.GameObjects.BitmapText, cx: number): Phaser.GameObjects.BitmapText {
  t.x = Math.round(cx - t.width / 2);
  return t;
}
