// Tracker-style patterns and the built-in drum kit.
import { ChirpError, didYouMean } from "./errors.ts";
import type { InstMake, Item, Voice, VoiceOpts } from "./model.ts";
import { freqOf } from "./util.ts";

export interface NoteEvent {
  step: number;
  /** Frequencies (several = chord); empty for drum hits. */
  freqs: number[];
  /** Steps it lasts (1 + following "-"). */
  len: number;
  accent: boolean;
}

/**
 * One token per step, separated by spaces; "|" marks bars and is ignored.
 *   C4  E#5  Bb3     a note        C4+E4+G4   a chord      x / X   a hit (drums)
 *   .               rest           -          hold the previous note one more step
 * A trailing "!" accents a note (C4!).
 */
export function parsePattern(src: string): { events: NoteEvent[]; steps: number } {
  const toks = src.split(/\s+/).filter((t) => t && t !== "|");
  const events: NoteEvent[] = [];
  let last: NoteEvent | undefined;
  toks.forEach((tok, step) => {
    if (tok === ".") { last = undefined; return; }
    if (tok === "-") {
      if (!last) throw new ChirpError(`pattern: '-' at step ${step + 1} has no note to hold`);
      last.len++;
      return;
    }
    const accent = tok.endsWith("!") || tok === "X";
    const body = tok.replace(/!$/, "");
    let freqs: number[] = [];
    if (body.toLowerCase() !== "x") {
      try { freqs = body.split("+").map((n) => freqOf(n, "note")); }
      catch (e) { throw new ChirpError(`pattern step ${step + 1}: '${tok}' is not a note, chord (C4+E4), x, . or -`); }
    }
    last = { step, freqs, len: 1, accent };
    events.push(last);
  });
  return { events, steps: toks.length };
}

const v = (kind: Voice["__voice"], opts: VoiceOpts, label: string): Voice => ({ __voice: kind, opts, step: { label } });

/** Synth drums: functions of (freq, dur, accent) like any instrument. Pitch is ignored. */
export const DRUMS: Record<string, InstMake> = {
  kick: (_f, _d, acc) => [
    v("tone", { wave: "sine", freq: 165, to: 42, slide: 0.11, dur: 0.06, env: [0.001, 0.14, 0, 0.1], vol: acc ? 1 : 0.85 }, "kick body"),
    v("noise", { dur: 0.006, env: [0, 0.006, 0, 0.01], filter: { type: "lp", cutoff: 4000 }, vol: 0.35 }, "kick click"),
  ],
  snare: (_f, _d, acc) => [
    v("noise", { dur: 0.07, env: [0.001, 0.12, 0, 0.09], filter: { type: "hp", cutoff: 1400 }, vol: acc ? 0.65 : 0.5 }, "snare noise"),
    v("tone", { wave: "triangle", freq: 200, to: 150, dur: 0.05, env: [0.001, 0.07, 0, 0.04], vol: 0.45 }, "snare body"),
  ],
  hat: (_f, _d, acc) => v("noise", { dur: 0.015, env: [0.001, 0.03, 0, 0.025], filter: { type: "hp", cutoff: 7500 }, vol: acc ? 0.35 : 0.25 }, "hat"),
  openhat: () => v("noise", { dur: 0.12, env: [0.001, 0.2, 0.2, 0.15], filter: { type: "hp", cutoff: 7000 }, vol: 0.22 }, "open hat"),
  clap: () => [0, 0.011, 0.022].map((t, i) => ({
    __at: t, step: { label: "clap" },
    items: [v("noise", { dur: i === 2 ? 0.06 : 0.008, env: [0.001, i === 2 ? 0.12 : 0.01, 0, 0.06], filter: { type: "bp", cutoff: 1200, q: 0.7 }, vol: 0.5 }, "clap")],
  })) as Item,
  tom: (_f, _d, acc) => v("tone", { wave: "sine", freq: 130, to: 75, slide: 0.18, dur: 0.1, env: [0.001, 0.2, 0, 0.12], vol: acc ? 0.95 : 0.8 }, "tom"),
};

// ---------------------------------------------------------------- chords and scales

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ROOT: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI note number -> name with octave ("C4" = 60). */
export function nameOf(midi: number): string {
  const m = Math.round(midi);
  return NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

/** "C#" / "Db" / "a" -> semitones from C (0..11). */
function rootOf(s: string, what: string): number {
  const m = /^([A-Ga-g])([#b]?)$/.exec(s);
  if (!m) throw new ChirpError(`${what}: '${s}' is not a note name (C, F#, Bb, ...)`);
  return (ROOT[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
}

export const CHORDS: Record<string, number[]> = {
  "": [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8], "5": [0, 7], sus2: [0, 2, 7], sus4: [0, 5, 7],
  "6": [0, 4, 7, 9], m6: [0, 3, 7, 9], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], mmaj7: [0, 3, 7, 11],
  dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], "9": [0, 4, 7, 10, 14], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14],
  add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], "11": [0, 4, 7, 10, 14, 17], "13": [0, 4, 7, 10, 14, 21],
};

export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11], melodicMinor: [0, 2, 3, 5, 7, 9, 11], pentatonic: [0, 2, 4, 7, 9], minorPentatonic: [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10], wholeTone: [0, 2, 4, 6, 8, 10], chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  japanese: [0, 1, 5, 7, 8], egyptian: [0, 2, 5, 7, 10],
};

/**
 * A chord symbol as a pattern token: chord("Am7", 4) -> "A4+C5+E5+G5". Qualities: (major), m, dim,
 * aug, 5, sus2, sus4, 6, m6, 7, m7, maj7, mmaj7, dim7, m7b5, 9, m9, maj9, add9, madd9, 11, 13.
 * `inv` rotates the lowest notes up an octave (first / second inversion).
 */
export function chord(name: unknown, octave: unknown = 4, inv: unknown = 0): string {
  if (typeof name !== "string") throw new ChirpError('chord("Am7", octave = 4, inversion = 0)');
  const m = /^([A-Ga-g][#b]?)(.*)$/.exec(name.trim());
  if (!m) throw new ChirpError(`chord: '${name}' should start with a note name (C, F#, Bb, ...)`);
  const ints = CHORDS[m[2]];
  if (!ints) throw new ChirpError(`chord: unknown quality '${m[2]}'${didYouMean(m[2], Object.keys(CHORDS).filter(Boolean))} (have: ${Object.keys(CHORDS).filter(Boolean).join(", ")})`);
  if (!Number.isInteger(octave) || !Number.isInteger(inv) || (inv as number) < 0) throw new ChirpError("chord: octave and inversion must be whole numbers");
  const base = 12 * ((octave as number) + 1) + rootOf(m[1], "chord");
  const notes = ints.map((i) => base + i);
  for (let k = 0; k < (inv as number) % notes.length; k++) notes.push(notes.shift()! + 12);
  return notes.map(nameOf).join("+");
}

/**
 * The notes of a scale, one octave plus the octave note: scale("C", "minor", 4) ->
 * ["C4", "D4", "Eb4", ...]. `octaves` extends it. Modes: major, minor, dorian, phrygian, lydian,
 * mixolydian, locrian, harmonicMinor, melodicMinor, pentatonic, minorPentatonic, blues, wholeTone,
 * chromatic, japanese, egyptian.
 */
export function scale(root: unknown, mode: unknown = "major", octave: unknown = 4, octaves: unknown = 1): string[] {
  if (typeof root !== "string") throw new ChirpError('scale("C", "minor", octave = 4, octaves = 1)');
  const ints = SCALES[String(mode)];
  if (!ints) throw new ChirpError(`scale: unknown mode '${mode}'${didYouMean(String(mode), Object.keys(SCALES))} (have: ${Object.keys(SCALES).join(", ")})`);
  if (!Number.isInteger(octave) || !Number.isInteger(octaves) || (octaves as number) < 1) throw new ChirpError("scale: octave and octaves must be whole numbers");
  const base = 12 * ((octave as number) + 1) + rootOf(root, "scale");
  const out: string[] = [];
  for (let o = 0; o < (octaves as number); o++) for (const i of ints) out.push(nameOf(base + o * 12 + i));
  out.push(nameOf(base + (octaves as number) * 12));
  return out;
}
