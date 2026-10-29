// What an agent can't hear, it can read: levels, clipping, pitch over time, and a spectrogram.
import type { Stereo } from "./synth.ts";
import { SR, db, noteName, r2 } from "./util.ts";

/** In-place iterative radix-2 FFT. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

export function mono(b: Stereo): Float32Array {
  const m = new Float32Array(b.L.length);
  for (let i = 0; i < m.length; i++) m[i] = (b.L[i] + b.R[i]) / 2;
  return m;
}

/** Magnitude spectrum (Hann window) of n samples starting at `at`. */
export function spectrum(x: Float32Array, at: number, n: number): Float64Array {
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = x[at + i] ?? 0;
    re[i] = s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  fft(re, im);
  const mag = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]) / (n / 4);
  return mag;
}

export interface PitchPoint {
  t: number;
  hz: number;
  note: string;
  db: number;
}

export interface Stats {
  dur: number;
  peakDb: number;
  rmsDb: number;
  clipped: number;
  /** Strongest partial every ~50 ms while the sound is audible. */
  pitch: PitchPoint[];
  /** Spectral centroid: higher = brighter. */
  brightnessHz: number;
}

export function analyze(b: Stereo): Stats {
  let peak = 0, sum = 0, clipped = 0;
  for (const ch of [b.L, b.R])
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a > peak) peak = a;
      if (a > 1) clipped++;
      sum += ch[i] * ch[i];
    }
  const m = mono(b), N = 2048, hop = Math.round(SR * 0.05);
  const pitch: PitchPoint[] = [];
  let cNum = 0, cDen = 0;
  for (let at = 0; at + N / 4 < m.length; at += hop) {
    const mag = spectrum(m, at, N);
    let bi = 1;
    for (let i = 2; i < mag.length; i++) {
      if (mag[i] > mag[bi]) bi = i;
      cNum += i * mag[i]; cDen += mag[i];
    }
    const lv = db(mag[bi]);
    if (lv < -50) continue;
    // Parabolic interpolation for sub-bin accuracy.
    const a = mag[bi - 1] ?? 0, c = mag[bi + 1] ?? 0, den = a - 2 * mag[bi] + c;
    const hz = ((bi + (den ? (0.5 * (a - c)) / den : 0)) * SR) / N;
    pitch.push({ t: r2(at / SR), hz: Math.round(hz), note: noteName(hz), db: Math.round(lv) });
  }
  return {
    dur: r2(b.L.length / SR), peakDb: r2(db(peak)), rmsDb: r2(db(Math.sqrt(sum / Math.max(1, b.L.length * 2)))), clipped,
    pitch, brightnessHz: cDen ? Math.round(((cNum / cDen) * SR) / N) : 0,
  };
}

export function statsText(name: string, s: Stats): string {
  const lines = [
    `${name}: ${s.dur}s  peak ${s.peakDb} dBFS  rms ${s.rmsDb} dBFS  brightness ${s.brightnessHz} Hz${s.clipped ? `  CLIPPED ${s.clipped} samples (lower vol)` : ""}`,
  ];
  // Collapse runs of the same note so slides and arpeggios read at a glance.
  const runs: string[] = [];
  for (const p of s.pitch) {
    const label = `${p.note} (${p.hz}Hz ${p.db}dB)`;
    if (runs.length && runs[runs.length - 1].startsWith(p.note + " ")) continue;
    runs.push(`${label} @${p.t}s`);
  }
  if (runs.length) lines.push("pitch: " + runs.slice(0, 40).join(" → ") + (runs.length > 40 ? " …" : ""));
  return lines.join("\n");
}
