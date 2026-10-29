// Whole-sound effects. Each returns how many seconds of tail it adds, so buffers can grow first.
import { ChirpError, didYouMean } from "./errors.ts";
import type { Fx } from "./model.ts";
import { Biquad, type Stereo } from "./synth.ts";
import { SR, freqOf } from "./util.ts";

export const FX_OPTS: Record<Fx["__fx"], string[]> = {
  delay: ["time", "feedback", "mix", "pingpong"],
  reverb: ["size", "damp", "mix"],
  crush: ["bits", "rate"],
  drive: ["amount"],
  filter: ["type", "cutoff", "from", "to", "q"],
  chorus: ["rate", "depth", "mix", "voices"],
  limiter: ["ceiling", "release"],
};

export function checkFx(kind: Fx["__fx"], o: Record<string, unknown>): void {
  for (const k of Object.keys(o))
    if (!FX_OPTS[kind].includes(k)) throw new ChirpError(`${kind}: unknown option '${k}'${didYouMean(k, FX_OPTS[kind])} (allowed: ${FX_OPTS[kind].join(", ")})`);
}

const num = (o: Record<string, unknown>, k: string, d: number) => (o[k] === undefined ? d : Number(o[k]));

export function fxTail(fx: Fx): number {
  if (fx.__fx === "delay") {
    const fb = Math.min(0.95, num(fx.opts, "feedback", 0.35));
    return Math.min(4, num(fx.opts, "time", 0.25) * Math.ceil(Math.log(0.001) / Math.log(Math.max(fb, 0.01))));
  }
  if (fx.__fx === "reverb") return 0.5 + 2.5 * num(fx.opts, "size", 0.6);
  if (fx.__fx === "chorus") return 0.05;
  return 0;
}

/** Apply an effect in place. `vol` is the sound's master volume applied after the chain, so a limiter's ceiling can mean the final peak. */
export function applyFx(fx: Fx, b: Stereo, vol = 1): void {
  const o = fx.opts, n = b.L.length;
  switch (fx.__fx) {
    case "delay": {
      const d = Math.max(1, Math.round(num(o, "time", 0.25) * SR)), fb = Math.min(0.95, num(o, "feedback", 0.35)), mix = num(o, "mix", 0.3);
      const pp = !!o.pingpong;
      const bl = new Float32Array(d), br = new Float32Array(d);
      for (let i = 0; i < n; i++) {
        const j = i % d, dl = bl[j], dr = br[j];
        bl[j] = b.L[i] + (pp ? dr : dl) * fb;
        br[j] = b.R[i] + (pp ? dl : dr) * fb;
        b.L[i] += dl * mix;
        b.R[i] += dr * mix;
      }
      return;
    }
    case "reverb": {
      // Freeverb-style: 8 damped combs + 4 allpasses per channel, decorrelated right side.
      const size = Math.min(0.98, 0.7 + 0.28 * num(o, "size", 0.6)), damp = num(o, "damp", 0.4), mix = num(o, "mix", 0.25);
      const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225];
      for (const [ch, spread] of [[b.L, 0], [b.R, 23]] as const) {
        const cb = combs.map((c) => new Float32Array(Math.round(((c + spread) * SR) / 44100)));
        const ci = combs.map(() => 0), cf = combs.map(() => 0);
        const ab = alls.map((a) => new Float32Array(Math.round(((a + spread) * SR) / 44100)));
        const ai = alls.map(() => 0);
        for (let i = 0; i < n; i++) {
          const x = ch[i] * 0.015;
          let y = 0;
          for (let k = 0; k < cb.length; k++) {
            const buf = cb[k], v = buf[ci[k]];
            cf[k] = v * (1 - damp) + cf[k] * damp;
            buf[ci[k]] = x + cf[k] * size;
            ci[k] = (ci[k] + 1) % buf.length;
            y += v;
          }
          for (let k = 0; k < ab.length; k++) {
            const buf = ab[k], v = buf[ai[k]];
            buf[ai[k]] = y + v * 0.5;
            ai[k] = (ai[k] + 1) % buf.length;
            y = v - y;
          }
          ch[i] = ch[i] * (1 - mix * 0.5) + y * mix * 3;
        }
      }
      return;
    }
    case "crush": {
      const steps = 2 ** Math.max(1, Math.min(16, num(o, "bits", 8)) - 1), hold = Math.max(1, Math.round(SR / num(o, "rate", 11025)));
      for (const ch of [b.L, b.R]) {
        let v = 0;
        for (let i = 0; i < n; i++) {
          if (i % hold === 0) v = Math.round(ch[i] * steps) / steps;
          ch[i] = v;
        }
      }
      return;
    }
    case "drive": {
      const a = Math.max(0.1, num(o, "amount", 2)), norm = Math.tanh(a);
      for (const ch of [b.L, b.R]) for (let i = 0; i < n; i++) ch[i] = Math.tanh(ch[i] * a) / norm;
      return;
    }
    case "filter": {
      const type = (o.type as "lp" | "hp" | "bp") ?? "lp", q = num(o, "q", 0.8);
      const from = freqOf(o.from ?? o.cutoff ?? 2000, "filter"), to = o.to !== undefined ? freqOf(o.to, "filter to") : from;
      for (const ch of [b.L, b.R]) {
        const f = new Biquad();
        f.set(type, from, q);
        for (let i = 0; i < n; i++) {
          if (to !== from && i % 32 === 0) f.set(type, from * (to / from) ** (i / n), q);
          ch[i] = f.run(ch[i]);
        }
      }
      return;
    }
    case "chorus": {
      // Modulated short delays mixed in, each voice at its own LFO phase, the right side offset,
      // so a plain tone turns into a wide, slightly detuned ensemble.
      const rate = num(o, "rate", 0.8), depth = num(o, "depth", 0.004), mix = num(o, "mix", 0.5), voices = Math.max(1, Math.min(4, Math.round(num(o, "voices", 2))));
      const base = Math.round(0.02 * SR), maxD = base + Math.ceil(depth * SR) + 2;
      const dry = { L: b.L.slice(), R: b.R.slice() };
      for (const [ch, src, side] of [[b.L, dry.L, 0], [b.R, dry.R, 1]] as const) {
        for (let i = 0; i < n; i++) {
          let wet = 0;
          for (let v = 0; v < voices; v++) {
            const phase = (v / voices + side * 0.25) * 2 * Math.PI;
            const d = base + (0.5 + 0.5 * Math.sin(2 * Math.PI * rate * (i / SR) + phase)) * depth * SR;
            const p = i - d;
            if (p < 0 || p >= n - 1 || d > maxD) continue;
            const j = Math.floor(p), f = p - j;
            wet += src[j] + (src[j + 1] - src[j]) * f;
          }
          ch[i] = src[i] * (1 - mix * 0.5) + (wet / voices) * mix;
        }
      }
      return;
    }
    case "limiter": {
      // A peak limiter: instant gain reduction when the signal would pass the ceiling, released
      // smoothly, so loud mixes keep their shape and never clip.
      const ceil = Math.max(0.05, Math.min(1, num(o, "ceiling", 0.95))) / Math.max(1e-6, vol), rel = Math.max(0.001, num(o, "release", 0.05));
      const k = Math.exp(-1 / (rel * SR));
      let g = 1;
      for (let i = 0; i < n; i++) {
        const peak = Math.max(Math.abs(b.L[i]), Math.abs(b.R[i]));
        const want = peak > ceil ? ceil / peak : 1;
        g = want < g ? want : want + (g - want) * k;
        b.L[i] *= g; b.R[i] *= g;
      }
      return;
    }
  }
}
