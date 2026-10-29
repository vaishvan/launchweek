// Voice synthesis: oscillators, noise, envelopes, pitch movement and filters, mixed into a
// stereo buffer at a sample offset.
import { ChirpError } from "./errors.ts";
import type { Env, FilterOpts, VoiceOpts } from "./model.ts";
import { SR, freqOf, rng } from "./util.ts";

export interface Stereo {
  L: Float32Array;
  R: Float32Array;
}

export function stereo(n: number): Stereo {
  return { L: new Float32Array(n), R: new Float32Array(n) };
}

/** RBJ cookbook biquad, transposed direct form II. */
export class Biquad {
  private b0 = 1; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private z1 = 0; private z2 = 0;

  set(type: "lp" | "hp" | "bp", fc: number, q: number): void {
    const f = Math.min(Math.max(fc, 10), SR * 0.45);
    const w = (2 * Math.PI * f) / SR, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0: number, b1: number, b2: number;
    if (type === "lp") { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
    else if (type === "hp") { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cw) / a0; this.a2 = (1 - al) / a0;
  }

  run(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** PolyBLEP step correction: removes most aliasing from hard edges. */
function blep(t: number, dt: number): number {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

export function envAt(env: Env, gate: number, t: number): number {
  const [a, d, s, r] = env;
  const held = (u: number) => (u < a ? (a > 0 ? u / a : 1) : u < a + d ? 1 - (1 - s) * ((u - a) / Math.max(d, 1e-9)) : s);
  if (t < gate) return held(t);
  const lv = held(gate), u = t - gate;
  return u >= r ? 0 : lv * (1 - u / Math.max(r, 1e-9)) ** 2;     // curved release sounds natural
}

export const DEFAULT_ENV: Env = [0.005, 0.05, 0.7, 0.08];

/** Length in seconds a voice occupies (gate + release). Samples default to their own length at the asked pitch. */
export function voiceLength(o: VoiceOpts, kind: "tone" | "noise" | "sample" = "tone", pitch = 1): number {
  if (kind === "sample") return sampleGate(o, pitch) + (o.env ?? SAMPLE_ENV)[3];
  return (o.dur ?? 0.2) + (o.env ?? DEFAULT_ENV)[3];
}

export const SAMPLE_ENV: Env = [0, 0, 1, 0.005];

/** Playback rate of a sample: its pitch over its root (1 = as recorded), times the modulation. */
export function sampleRate(o: VoiceOpts, pitch: number): number {
  const root = o.root === undefined ? undefined : freqOf(o.root, "root");
  const f = o.freq === undefined ? undefined : freqOf(o.freq, "freq");
  return (root !== undefined && f !== undefined ? f / root : 1) * pitch;
}

/** Gate of a sample voice: `dur`, or the rest of the sample from `start` at its playback rate. */
export function sampleGate(o: VoiceOpts, pitch: number): number {
  if (o.dur !== undefined) return o.dur;
  const n = o.data?.L.length ?? 0, rate = sampleRate(o, pitch);
  return Math.max(0, (n / SR - (o.start ?? 0)) / rate);
}

/** Render a sample voice (decoded data at chirp's rate) into `out`: linear interpolation at the playback rate. */
function renderSample(o: VoiceOpts, out: Stereo, start: number, mod: Mod): void {
  const d = o.data;
  if (!d || !d.L.length) throw new ChirpError("sample has no data (was it loaded?)");
  const rate = sampleRate(o, mod.pitch), gate = sampleGate(o, mod.pitch), env = o.env ?? SAMPLE_ENV;
  const len = Math.ceil((gate + env[3]) * SR), from = (o.start ?? 0) * SR, n = d.L.length;
  const vol = (o.vol ?? 1) * mod.vol, pan = Math.max(-1, Math.min(1, (o.pan ?? 0) + mod.pan));
  const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
  let filt: Biquad | undefined;
  if (o.filter) { filt = new Biquad(); filt.set(o.filter.type ?? "lp", freqOf(o.filter.cutoff ?? o.filter.from ?? 2000, "filter cutoff"), o.filter.q ?? 0.9); }
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= out.L.length) break;
    let p = from + i * rate;
    if (o.loop) p = from + (((p - from) % Math.max(1, n - from)) + (n - from)) % Math.max(1, n - from);
    else if (p >= n - 1) break;
    const j = Math.floor(p), f = p - j, k = Math.min(n - 1, j + 1);
    let l = d.L[j] + (d.L[k] - d.L[j]) * f, r = d.R[j] + (d.R[k] - d.R[j]) * f;
    if (filt) { l = filt.run(l); r = l; }
    const a = envAt(env, gate, i / SR) * vol;
    out.L[idx] += l * a * gl;
    out.R[idx] += r * a * gr;
  }
}

export interface Mod {
  /** Pitch multiplier (variants, play(..., { pitch })). */
  pitch: number;
  vol: number;
  pan: number;
}

/** Render one voice into `out` starting at sample `start`. */
export function renderVoice(kind: "tone" | "noise" | "sample", o: VoiceOpts, seed: number, out: Stereo, start: number, mod: Mod): void {
  if (kind === "sample") return renderSample(o, out, start, mod);
  const gate = o.dur ?? 0.2;
  const env = o.env ?? DEFAULT_ENV;
  const len = Math.ceil(voiceLength(o) * SR);
  const vol = (o.vol ?? 1) * mod.vol;
  const pan = Math.max(-1, Math.min(1, (o.pan ?? 0) + mod.pan));
  const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);

  const hasPitch = kind === "tone" || o.freq !== undefined;
  const f0 = hasPitch ? freqOf(o.freq ?? 440, "freq") * mod.pitch : 0;
  const f1 = o.to !== undefined ? freqOf(o.to, "to") * mod.pitch : f0;
  const slideT = o.slide ?? gate;
  const exp = (o.curve ?? "exp") === "exp";
  const duty = Math.max(0.01, Math.min(0.99, o.duty ?? 0.5));
  const r = rng(seed);

  let filt: Biquad | undefined, fFrom = 0, fTo = 0, fType: FilterOpts["type"] = "lp", fq = 0.9;
  if (o.filter) {
    fType = o.filter.type ?? "lp";
    fq = o.filter.q ?? 0.9;
    fFrom = freqOf(o.filter.from ?? o.filter.cutoff ?? 2000, "filter cutoff");
    fTo = o.filter.to !== undefined ? freqOf(o.filter.to, "filter to") : fFrom;
    filt = new Biquad();
    filt.set(fType, fFrom, fq);
  }

  const fmRatio = o.fm?.ratio ?? 2, fmIndex = o.fm?.index ?? 2, fmDecay = o.fm?.decay ?? 0;
  let ph = 0, phm = 0, hold = 0, holdT = 1, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, brown = 0;
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    if (idx >= out.L.length) break;
    const t = i / SR;
    let f = f0;
    if (f1 !== f0) {
      const k = Math.min(1, t / Math.max(slideT, 1e-6));
      f = exp ? f0 * (f1 / f0) ** k : f0 + (f1 - f0) * k;
    }
    if (o.arp?.notes.length) f *= 2 ** (o.arp.notes[Math.floor(t / o.arp.rate) % o.arp.notes.length] / 12);
    if (o.vibrato && t >= (o.vibrato.delay ?? 0)) f *= 2 ** ((o.vibrato.depth * Math.sin(2 * Math.PI * o.vibrato.rate * t)) / 12);

    let x: number;
    if (kind === "tone") {
      const dt = f / SR;
      ph += dt;
      ph -= Math.floor(ph);
      switch (o.wave ?? "square") {
        case "sine": x = Math.sin(2 * Math.PI * ph); break;
        case "fm": {
          // two-operator FM: a sine carrier whose phase is pushed by a sine modulator at ratio × f;
          // the index (how far it is pushed) can decay, so bells and electric pianos start bright
          phm += (f * fmRatio) / SR;
          phm -= Math.floor(phm);
          const idx = fmDecay > 0 ? fmIndex * Math.exp(-t / fmDecay) : fmIndex;
          x = Math.sin(2 * Math.PI * ph + idx * Math.sin(2 * Math.PI * phm));
          break;
        }
        case "saw": x = 2 * ph - 1 - blep(ph, dt); break;
        case "triangle": x = 1 - 4 * Math.abs(ph - 0.5); break;
        default: {
          x = (ph < duty ? 1 : -1) + blep(ph, dt) - blep((ph - duty + 1) % 1, dt);
        }
      }
    } else {
      // Noise; with a pitch it is sample-and-held at that rate (crunchy chip noise).
      holdT += f > 0 ? f / SR : 1;
      if (holdT >= 1) {
        holdT -= Math.floor(holdT);
        const w = r() * 2 - 1;
        if (o.color === "pink") {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          hold = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else if (o.color === "brown") {
          brown = (brown + 0.02 * w) / 1.02;
          hold = brown * 3.5;
        } else hold = w;
      }
      x = hold;
    }

    if (filt) {
      if (fTo !== fFrom && i % 32 === 0) filt.set(fType, fFrom * (fTo / fFrom) ** Math.min(1, t / Math.max(gate, 1e-6)), fq);
      x = filt.run(x);
    }
    let a = envAt(env, gate, t) * vol;
    if (o.tremolo) a *= 1 - o.tremolo.depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * o.tremolo.rate * t));
    x *= a;
    out.L[idx] += x * gl;
    out.R[idx] += x * gr;
  }
}

export function checkEnv(e: unknown): Env {
  if (!Array.isArray(e) || e.length !== 4 || !e.every((v) => typeof v === "number" && v >= 0))
    throw new ChirpError("env must be [attack, decay, sustain 0..1, release] (seconds)");
  return e as Env;
}
