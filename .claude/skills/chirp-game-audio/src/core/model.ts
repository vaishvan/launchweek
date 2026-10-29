// The data an audio file produces. Definitions are plain data; nothing is rendered until build
// time, so sounds may reference each other in any order.

export interface Step {
  label: string;
  loc?: string;
}

/** [attack, decay, sustain level, release], seconds except sustain (0..1). */
export type Env = [number, number, number, number];

export interface FilterOpts {
  type?: "lp" | "hp" | "bp";
  /** Fixed cutoff, or a sweep from -> to over the voice. Hz or notes. */
  cutoff?: number | string;
  from?: number | string;
  to?: number | string;
  q?: number;
}

/** A decoded sample (the loader fills it in): stereo floats at chirp's sample rate. */
export interface SampleData {
  L: Float32Array;
  R: Float32Array;
}

export interface VoiceOpts {
  /** sine, square, saw, triangle, fm; noise voices use `color`. */
  wave?: "sine" | "square" | "saw" | "triangle" | "fm";
  /** FM (wave "fm"): modulator frequency as a multiple of the carrier, modulation index, and how fast the index decays (seconds; 0 = constant). */
  fm?: { ratio?: number; index?: number; decay?: number };
  /** Samples: the file as written, the note it is pitched at (freq then plays it at freq / root), where to start (s), and whether to loop for `dur`. */
  src?: string;
  root?: number | string;
  start?: number;
  loop?: boolean;
  data?: SampleData;
  /** Start pitch (Hz or note). Noise: sample-and-hold rate for crunchy, pitched noise. */
  freq?: number | string;
  /** End pitch for a slide. */
  to?: number | string;
  /** Slide shape (default "exp", which sounds even across octaves). */
  curve?: "lin" | "exp";
  /** Slide time (default: the whole gate). */
  slide?: number;
  /** Gate time in seconds; the release rings on after it. */
  dur?: number;
  env?: Env;
  vol?: number;
  pan?: number;
  /** Square pulse width 0..1 (default 0.5). */
  duty?: number;
  /** Semitone offsets cycled every `rate` seconds (classic chip arpeggio). */
  arp?: { notes: number[]; rate: number };
  vibrato?: { rate: number; depth: number; delay?: number };
  tremolo?: { rate: number; depth: number };
  filter?: FilterOpts;
  /** Noise only: white, pink, brown. */
  color?: "white" | "pink" | "brown";
  seed?: number;
}

export interface Voice {
  __voice: "tone" | "noise" | "sample";
  opts: VoiceOpts;
  step: Step;
}

/** Another sound placed inside this one. */
export interface Play {
  __play: true;
  name: string;
  opts: { pitch?: number; vol?: number; pan?: number };
  step: Step;
}

/** Items shifted in time. */
export interface At {
  __at: number;
  items: Item[];
  step: Step;
}

export interface Fx {
  __fx: "delay" | "reverb" | "crush" | "drive" | "filter" | "chorus" | "limiter";
  opts: Record<string, unknown>;
}

export interface Track {
  __track: true;
  inst: string;
  pattern: string;
  opts: { vol?: number; pan?: number; transpose?: number; gate?: number };
  step: Step;
}

export type Item = Voice | Play | At | Track | Item[] | null | undefined | false;

export interface SoundOpts {
  vol?: number;
  /** Fixed length in seconds (required for loops of sfx). */
  dur?: number;
  /** Seamless loop: the tail past the end wraps around onto the start. */
  loop?: boolean;
  fx?: Fx[];
  /** Variant: start from another sound. */
  base?: string;
  /** Semitones (variants, or the whole sound). */
  pitch?: number;
  // songs
  bpm?: number;
  /** Steps per beat (default 4 = 16th notes). */
  steps?: number;
  /** Length in bars of 4 beats (default: the longest pattern). */
  bars?: number;
  /** 0..0.5: delay every other step by this fraction of a step. */
  swing?: number;
}

export interface SoundDef {
  kind: "sfx" | "song";
  name: string;
  opts: SoundOpts;
  items: Item[];
  loc?: string;
}

/** An instrument: voice options (pitched by the note), a sample (`src` + `root`, played at the note), or a function of note -> items. */
export type InstMake = VoiceOpts | ((freq: number, dur: number, accent: boolean) => Item);

export interface InstDef {
  name: string;
  make: InstMake;
  loc?: string;
}

export interface BankDef {
  name: string;
  entries: string[];
  opts: { gap?: number };
  loc?: string;
}

export const isVoice = (v: unknown): v is Voice => typeof v === "object" && v !== null && "__voice" in v;
export const isPlay = (v: unknown): v is Play => typeof v === "object" && v !== null && "__play" in v;
export const isAt = (v: unknown): v is At => typeof v === "object" && v !== null && "__at" in v;
export const isTrack = (v: unknown): v is Track => typeof v === "object" && v !== null && "__track" in v;
export const isFx = (v: unknown): v is Fx => typeof v === "object" && v !== null && "__fx" in v;
