// Agent-facing preview: waveform + log-frequency spectrogram with labeled axes, as a PNG.
import { deflateSync } from "node:zlib";
import { Resvg } from "@resvg/resvg-js";
import { type Stats, mono, spectrum } from "../core/analyze.ts";
import { png } from "../core/encode.ts";
import type { Stereo } from "../core/synth.ts";
import { SR } from "../core/util.ts";

const W = 820, WAVE_H = 120, SPEC_H = 220, M = { l: 46, t: 30, r: 12, b: 26 };
const FMIN = 40, FMAX = 16000;
/** Where the plots sit in the preview PNG, so the viewer can turn a click into seconds and Hz. */
export const PREVIEW_LAYOUT = { width: M.l + W + M.r, height: M.t + WAVE_H + 10 + SPEC_H + M.b,
  plotX: M.l, plotW: W, waveY: M.t, waveH: WAVE_H, specY: M.t + WAVE_H + 10, specH: SPEC_H, fmin: FMIN, fmax: FMAX };
const STOPS = [[0, 0, 4], [40, 11, 84], [101, 21, 110], [159, 42, 99], [212, 72, 66], [245, 125, 21], [250, 193, 39], [252, 255, 164]];

function color(v: number): number[] {
  const x = Math.max(0, Math.min(1, v)) * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(x)), k = x - i;
  return STOPS[i].map((c, j) => Math.round(c + (STOPS[i + 1][j] - c) * k));
}

const yOfFreq = (f: number) => (1 - Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * (SPEC_H - 1);

function spectrogramPng(m: Float32Array): string {
  const N = 2048, rgba = new Uint8Array(W * SPEC_H * 4);
  for (let x = 0; x < W; x++) {
    const at = Math.floor((x / W) * Math.max(1, m.length - N / 2)) - N / 4;
    const mag = spectrum(m, Math.max(0, at), N);
    for (let y = 0; y < SPEC_H; y++) {
      const f = FMIN * (FMAX / FMIN) ** (1 - y / (SPEC_H - 1)), bin = (f * N) / SR;
      const b0 = Math.floor(bin), k = bin - b0;
      const v = (mag[b0] ?? 0) * (1 - k) + (mag[b0 + 1] ?? 0) * k;
      const c = color((20 * Math.log10(v + 1e-9) + 90) / 90);
      const o = (y * W + x) * 4;
      rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
    }
  }
  return "data:image/png;base64," + Buffer.from(png(W, SPEC_H, rgba, (b) => deflateSync(b))).toString("base64");
}

export function previewPng(name: string, b: Stereo, s: Stats, loop: boolean): Buffer {
  const m = mono(b), dur = m.length / SR;
  const H = M.t + WAVE_H + 10 + SPEC_H + M.b, x0 = M.l, wy = M.t, sy = M.t + WAVE_H + 10;
  // waveform envelope: min/max per column
  let top = "", bot = "";
  for (let x = 0; x < W; x++) {
    const a = Math.floor((x / W) * m.length), z = Math.max(a + 1, Math.floor(((x + 1) / W) * m.length));
    let lo = 0, hi = 0;
    for (let i = a; i < z && i < m.length; i++) { if (m[i] < lo) lo = m[i]; if (m[i] > hi) hi = m[i]; }
    const cy = wy + WAVE_H / 2;
    top += `${x0 + x},${(cy - Math.min(1, hi) * (WAVE_H / 2 - 2)).toFixed(1)} `;
    bot = `${x0 + x},${(cy - Math.max(-1, lo) * (WAVE_H / 2 - 2)).toFixed(1)} ` + bot;
  }
  const tStep = [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30].find((st) => dur / st <= 10) ?? 60;
  let ticks = "";
  for (let t = 0; t <= dur + 1e-9; t += tStep) {
    const x = x0 + (t / dur) * W;
    ticks += `<line x1="${x}" y1="${wy}" x2="${x}" y2="${sy + SPEC_H}" stroke="#ffffff" stroke-opacity="0.12"/>` +
      `<text x="${x}" y="${H - 9}" fill="#b9b3c9" font-size="11" font-family="monospace" text-anchor="middle">${Math.round(t * 1000) / 1000}s</text>`;
  }
  for (const [f, l] of [[100, "100"], [1000, "1k"], [5000, "5k"], [10000, "10k"]] as const) {
    const y = sy + yOfFreq(f);
    ticks += `<line x1="${x0}" y1="${y}" x2="${x0 + W}" y2="${y}" stroke="#ffffff" stroke-opacity="0.15"/>` +
      `<text x="${x0 - 5}" y="${y + 4}" fill="#b9b3c9" font-size="11" font-family="monospace" text-anchor="end">${l}</text>`;
  }
  const clip = s.clipped ? `  CLIPPED ${s.clipped}` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${x0 + W + M.r}" height="${H}">` +
    `<rect width="100%" height="100%" fill="#16141d"/>` +
    `<text x="${x0}" y="19" fill="#e9e5f2" font-size="13" font-family="monospace" font-weight="bold">${name}</text>` +
    `<text x="${x0 + W}" y="19" fill="${s.clipped ? "#ff6b7a" : "#b9b3c9"}" font-size="12" font-family="monospace" text-anchor="end">${s.dur}s${loop ? " loop" : ""}  peak ${s.peakDb} dB  rms ${s.rmsDb} dB${clip}</text>` +
    `<rect x="${x0}" y="${wy}" width="${W}" height="${WAVE_H}" fill="#0e0d13"/>` +
    `<line x1="${x0}" y1="${wy + WAVE_H / 2}" x2="${x0 + W}" y2="${wy + WAVE_H / 2}" stroke="#3a3550"/>` +
    `<polygon points="${top}${bot}" fill="#7cc7ff" fill-opacity="0.85"/>` +
    `<image x="${x0}" y="${sy}" width="${W}" height="${SPEC_H}" href="${spectrogramPng(m)}"/>` +
    ticks +
    `<text x="8" y="${wy + 12}" fill="#77718a" font-size="10" font-family="monospace">wave</text>` +
    `<text x="8" y="${sy + 12}" fill="#77718a" font-size="10" font-family="monospace">Hz</text></svg>`;
  return new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
}
