import { ChirpError } from "./errors.ts";

/** Sample rate of every render. */
export const SR = 44100;

/** Deterministic PRNG (mulberry32): rng(seed)() -> [0, 1). */
export function rng(seed = 1): () => number {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** String hash for seeding (FNV-1a). */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function globRe(glob: string): RegExp {
  return new RegExp("^" + glob.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
}

const NOTE = /^([A-Ga-g])([#b]?)(-?\d)$/;
const STEP: Record<string, number> = { c: -9, d: -7, e: -5, f: -4, g: -2, a: 0, b: 2 };

/** "A4" -> 440, "C#5", "Eb3"; numbers are Hz. */
export function freqOf(v: unknown, what = "pitch"): number {
  if (typeof v === "number") {
    if (!(v > 0 && Number.isFinite(v))) throw new ChirpError(`${what}: ${v} Hz is not a positive frequency`);
    return v;
  }
  if (typeof v !== "string") throw new ChirpError(`${what} must be a note like "A4" / "C#5" / "Eb3" or a frequency in Hz`);
  const m = NOTE.exec(v);
  if (!m) throw new ChirpError(`${what}: '${v}' is not a note (use letter + optional # or b + octave, like "A4", "C#5", "Eb3")`);
  const semis = STEP[m[1].toLowerCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semis / 12);
}

const NAMES = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
/** 440 -> "A4" (nearest note, with cents off when > 5). */
export function noteName(f: number): string {
  const s = 12 * Math.log2(f / 440);
  const r = Math.round(s);
  const oct = 4 + Math.floor((r + 9) / 12);
  const cents = Math.round((s - r) * 100);
  return NAMES[((r % 12) + 12) % 12] + oct + (Math.abs(cents) > 5 ? `${cents > 0 ? "+" : ""}${cents}c` : "");
}

export const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
export const r2 = (x: number) => Math.round(x * 100) / 100;
