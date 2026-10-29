// Project: the registry a sound file fills in (the DSL), plus the lazy, cached, cycle-checked
// renderer that turns definitions into stereo buffers.
import { ChirpError, didYouMean, wrap } from "./errors.ts";
import { applyFx, checkFx, fxTail } from "./fx.ts";
import {
  type BankDef, type Fx, type InstDef, type InstMake, type Item, type Play, type SampleData, type SoundDef, type SoundOpts, type Step,
  type Track, type Voice, type VoiceOpts, isAt, isFx, isPlay, isTrack, isVoice,
} from "./model.ts";
import { type MidiTrack, midiKey } from "./midi.ts";
import { DRUMS, chord, parsePattern, scale } from "./music.ts";
import { type Mod, type Stereo, checkEnv, renderVoice, stereo, voiceLength } from "./synth.ts";
import { SR, freqOf, globRe, hash, rng } from "./util.ts";

const VOICE_KEYS = ["wave", "freq", "to", "curve", "slide", "dur", "env", "vol", "pan", "duty", "arp", "vibrato", "tremolo", "filter", "color", "seed", "fm"];
const SAMPLE_KEYS = ["root", "freq", "dur", "env", "vol", "pan", "start", "loop", "filter", "seed"];
const WAVES = ["sine", "square", "saw", "triangle", "fm"];
/** General MIDI drum notes for the built-in kit, and programs for the waves. */
const GM_DRUMS: Record<string, number> = { kick: 36, snare: 38, hat: 42, openhat: 46, clap: 39, tom: 45 };
const GM_PROGRAM: Record<string, number> = { square: 80, saw: 81, triangle: 78, sine: 79, fm: 4 };
const MELODIC_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15];
const COLORS = ["white", "pink", "brown"];
const KIND_OPTS: Record<SoundDef["kind"], string[]> = {
  sfx: ["vol", "dur", "loop", "fx", "base", "pitch"],
  song: ["vol", "bpm", "steps", "bars", "swing", "loop", "fx", "pitch"],
};
const PLAY_OPTS = ["pitch", "vol", "pan"];
const TRACK_OPTS = ["vol", "pan", "transpose", "gate"];

export interface Layer {
  label: string;
  loc?: string;
}

export interface Rendered {
  name: string;
  kind: SoundDef["kind"];
  buf: Stereo;
  /** Seconds. */
  dur: number;
  loop: boolean;
  layers: Layer[];
}

type Sched =
  | { t: number; voice: Voice; seed: number; mod: Mod }
  | { t: number; buf: Stereo; mod: Mod };

function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !isVoice(v) && !isPlay(v) && !isAt(v) && !isTrack(v) && !isFx(v);
}

function checkKeys(what: string, obj: object, allowed: string[]): void {
  for (const k of Object.keys(obj))
    if (!allowed.includes(k)) throw new ChirpError(`${what}: unknown option '${k}'${didYouMean(k, allowed)} (allowed: ${allowed.join(", ")})`);
}

function checkVoice(kind: Voice["__voice"], o: Record<string, unknown>, needPitch: boolean): VoiceOpts {
  checkKeys(kind, o, kind === "sample" ? SAMPLE_KEYS : VOICE_KEYS);
  if (o.wave !== undefined && !WAVES.includes(o.wave as string)) throw new ChirpError(`wave must be ${WAVES.join(", ")}${didYouMean(String(o.wave), WAVES)}`);
  if (o.color !== undefined && !COLORS.includes(o.color as string)) throw new ChirpError(`color must be ${COLORS.join(", ")}${didYouMean(String(o.color), COLORS)}`);
  if (kind === "noise" && o.wave !== undefined) throw new ChirpError("noise has no wave; use color: white | pink | brown");
  if (o.fm !== undefined) {
    if (!isPlain(o.fm)) throw new ChirpError("fm: { ratio, index, decay } (modulator ratio, modulation index, index decay in seconds)");
    checkKeys("fm", o.fm, ["ratio", "index", "decay"]);
    for (const k of ["ratio", "index", "decay"]) if (o.fm[k] !== undefined && !(typeof o.fm[k] === "number" && o.fm[k] >= 0)) throw new ChirpError(`fm ${k} must be a number >= 0`);
  }
  if (kind === "sample") {
    if (o.root !== undefined) freqOf(o.root, "root");
    if (o.freq !== undefined) { if (o.root === undefined) throw new ChirpError("a sample with a freq needs its root (the note it was recorded at)"); freqOf(o.freq, "freq"); }
    if (o.start !== undefined && !(typeof o.start === "number" && o.start >= 0)) throw new ChirpError("sample start must be >= 0 seconds");
  }
  if (needPitch) freqOf(o.freq ?? 440, "freq");
  if (o.to !== undefined) freqOf(o.to, "to");
  if (o.dur !== undefined && !(typeof o.dur === "number" && o.dur > 0)) throw new ChirpError(`dur must be > 0 seconds`);
  if (o.env !== undefined) checkEnv(o.env);
  if (o.filter !== undefined) {
    if (!isPlain(o.filter)) throw new ChirpError("filter: { type: lp | hp | bp, cutoff | from + to, q }");
    checkKeys("filter", o.filter, ["type", "cutoff", "from", "to", "q"]);
    for (const k of ["cutoff", "from", "to"]) if (o.filter[k] !== undefined) freqOf(o.filter[k], `filter ${k}`);
  }
  if (o.arp !== undefined && !(isPlain(o.arp) && Array.isArray(o.arp.notes) && typeof o.arp.rate === "number" && o.arp.rate > 0))
    throw new ChirpError("arp: { notes: [0, 4, 7], rate: 0.05 } (semitones, seconds per note)");
  return o as VoiceOpts;
}

const fmt = (v: unknown) => (typeof v === "number" ? String(Math.round(v * 100) / 100) : String(v));

export class Project {
  readonly sounds = new Map<string, SoundDef>();
  readonly order: string[] = [];
  readonly insts = new Map<string, InstDef>();
  readonly banks: BankDef[] = [];
  readonly files: string[] = [];
  includeHook?: (path: string) => void;
  /** Set by a loader: resolves a path written in a sound file against that file. */
  pathHook: (path: string) => string = (p) => p;
  /** Set by a loader: reads and decodes a WAV by its resolved path. */
  sampleHook?: (path: string) => SampleData;
  private samples = new Map<string, SampleData>();

  private cache = new Map<string, Rendered>();
  private building = new Set<string>();

  addFile(file: string): void {
    if (!this.files.includes(file)) this.files.push(file);
  }

  locFromStack(stack: string): string | undefined {
    for (const line of stack.split("\n")) {
      for (const f of this.files) {
        const i = line.indexOf(f + ":");
        if (i < 0) continue;
        const m = /^:(\d+):(\d+)/.exec(line.slice(i + f.length));
        if (m) return `${f.replace(/^.*[\\/]/, "")}:${m[1]}:${m[2]}`;
      }
    }
    return undefined;
  }

  callerLoc(): string | undefined {
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 60;
    const stack = new Error().stack ?? "";
    Error.stackTraceLimit = limit;
    return this.locFromStack(stack);
  }

  // ---------------------------------------------------------------- DSL

  env(): Record<string, unknown> {
    const env: Record<string, unknown> = {};
    const at = <T>(what: string, fn: (loc?: string) => T): T => {
      const loc = this.callerLoc();
      try { return fn(loc); } catch (e) { throw wrap(e).within(what, loc); }
    };

    for (const kind of ["tone", "noise"] as const) {
      env[kind] = (o: unknown = {}): Voice => at(kind, (loc) => {
        if (!isPlain(o)) throw new ChirpError(`${kind}({ ${kind === "tone" ? "wave, freq, to, " : "color, "}dur, env, vol, ... })`);
        const opts = checkVoice(kind, o, kind === "tone");
        const pitch = opts.freq !== undefined ? fmt(opts.freq) + (opts.to !== undefined ? "→" + fmt(opts.to) : "") : "";
        return { __voice: kind, opts, step: { label: `${kind}(${[kind === "tone" ? opts.wave ?? "square" : opts.color ?? "white", pitch, fmt(opts.dur ?? 0.2) + "s"].filter(Boolean).join(" ")})`, loc } };
      });
    }
    /** A decoded WAV by path written in the sound file, cached. */
    const loadSample = (src: unknown): SampleData => {
      if (typeof src !== "string" || !src) throw new ChirpError('sample("file.wav", { root, freq, dur, env, vol, pan, start, loop })');
      const abs = this.pathHook(src);
      let d = this.samples.get(abs);
      if (!d) {
        if (!this.sampleHook) throw new ChirpError("sample() is not available here (no sample loader)");
        d = this.sampleHook(abs);
        this.samples.set(abs, d);
      }
      return d;
    };
    env.sample = (src: unknown, o: unknown = {}): Voice => at("sample", (loc) => {
      if (!isPlain(o)) throw new ChirpError("sample options must be an object");
      const opts = checkVoice("sample", o, false);
      const data = loadSample(src);
      return { __voice: "sample", opts: { ...opts, src: src as string, data }, step: { label: `sample(${JSON.stringify((src as string).replace(/^.*[\\/]/, ""))}${opts.freq !== undefined ? " " + fmt(opts.freq) : ""})`, loc } };
    });
    env.chord = (name: unknown, octave?: unknown, inv?: unknown) => at("chord", () => chord(name, octave, inv));
    env.scale = (root: unknown, mode?: unknown, octave?: unknown, octaves?: unknown) => at("scale", () => scale(root, mode, octave, octaves));
    env.play = (name: unknown, o: unknown = {}): Play => at("play", (loc) => {
      if (typeof name !== "string") throw new ChirpError('play("name", { pitch, vol, pan })');
      if (!isPlain(o)) throw new ChirpError("play options must be an object");
      checkKeys("play", o, PLAY_OPTS);
      return { __play: true, name, opts: o as Play["opts"], step: { label: `play("${name}")`, loc } };
    });
    env.at = (t: unknown, ...items: unknown[]) => at("at", (loc) => {
      if (!(typeof t === "number" && t >= 0)) throw new ChirpError("at(seconds, ...items)");
      return { __at: t, items: items as Item[], step: { label: `at(${fmt(t)}s)`, loc } };
    });

    const define = (kind: SoundDef["kind"], name: unknown, rest: unknown[]) => at(kind, (loc) => {
      if (typeof name !== "string" || !name) throw new ChirpError(`${kind} needs a name string first`);
      const prev = this.sounds.get(name);
      if (prev) throw new ChirpError(`'${name}' is already defined at ${prev.loc}`);
      const opts = (isPlain(rest[0]) ? rest.shift() : {}) as SoundOpts;
      checkKeys(`${kind} '${name}'`, opts, KIND_OPTS[kind]);
      if (opts.fx !== undefined && !(Array.isArray(opts.fx) && opts.fx.every(isFx))) throw new ChirpError("fx: a list like [reverb({ mix: 0.2 }), delay()]");
      if (opts.loop && kind === "sfx" && !opts.dur) throw new ChirpError("a looping sfx needs a fixed { dur } in seconds");
      this.sounds.set(name, { kind, name, opts, items: rest as Item[], loc });
      this.order.push(name);
    });
    env.sfx = (name: unknown, ...rest: unknown[]) => define("sfx", name, rest);
    env.song = (name: unknown, ...rest: unknown[]) => define("song", name, rest);

    env.inst = (name: unknown, make: unknown) => at("inst", (loc) => {
      if (typeof name !== "string") throw new ChirpError('inst("name", { wave, env, ... }), inst("name", { sample: "file.wav", root: "C4" }) or inst("name", (freq, dur, accent) => items)');
      if (typeof make !== "function") {
        if (!isPlain(make)) throw new ChirpError("an instrument is voice options, a sample, or a function (freq, dur, accent) => items");
        if (make.sample !== undefined) {
          // a sampled instrument: the file is pitched by the pattern's notes relative to its root
          const { sample: src, ...rest } = make;
          const opts = checkVoice("sample", rest, false);
          if (opts.root === undefined) throw new ChirpError("a sampled instrument needs its root: the note the recording is at");
          if (opts.freq !== undefined || opts.dur !== undefined) throw new ChirpError("an instrument's pitch and length come from the pattern; drop freq / dur");
          make = { ...opts, src, data: loadSample(src) };
        } else {
          checkVoice("tone", make, false);
          if (make.freq !== undefined || make.dur !== undefined) throw new ChirpError("an instrument's pitch and length come from the pattern; drop freq / dur");
        }
      }
      this.insts.set(name, { name, make: make as InstMake, loc });
    });
    env.track = (inst: unknown, pattern: unknown, o: unknown = {}): Track => at("track", (loc) => {
      if (typeof inst !== "string" || typeof pattern !== "string") throw new ChirpError('track("inst", "C4 . E4 - | G4 . . .", { vol, pan, transpose, gate })');
      if (!isPlain(o)) throw new ChirpError("track options must be an object");
      checkKeys("track", o, TRACK_OPTS);
      parsePattern(pattern);
      return { __track: true, inst, pattern, opts: o as Track["opts"], step: { label: `track("${inst}")`, loc } };
    });

    for (const kind of ["delay", "reverb", "crush", "drive", "filter", "chorus", "limiter"] as const) {
      env[kind] = (o: unknown = {}): Fx => at(kind, () => {
        if (!isPlain(o)) throw new ChirpError(`${kind}({ ... })`);
        checkFx(kind, o);
        return { __fx: kind, opts: o };
      });
    }
    env.bank = (name: unknown, entries: unknown, o: unknown = {}) => at("bank", (loc) => {
      if (typeof name !== "string" || !Array.isArray(entries) || !isPlain(o)) throw new ChirpError('bank("name", ["coin", "jump*"], { gap })');
      checkKeys(`bank '${name}'`, o, ["gap"]);
      this.banks.push({ name, entries, opts: o as BankDef["opts"], loc });
    });
    env.include = (path: unknown) => {
      if (typeof path !== "string") throw new ChirpError('include("other.cx.js")', this.callerLoc());
      if (!this.includeHook) throw new ChirpError("include() is not available here", this.callerLoc());
      this.includeHook(path);
    };
    env.rng = (seed?: number) => rng(seed);
    env.hz = (n: unknown) => at("hz", () => freqOf(n));
    return env;
  }

  // ---------------------------------------------------------------- rendering

  exported(): string[] {
    return this.order.filter((n) => !n.startsWith("_"));
  }

  bankNames(b: BankDef): string[] {
    const out: string[] = [];
    for (const e of b.entries) {
      const list = e.includes("*") ? this.exported().filter((n) => globRe(e).test(n)) : [e];
      for (const n of list) if (!out.includes(n)) out.push(n);
    }
    return out;
  }

  /** Render a sound; `pitch` multiplies every frequency; `only` solos one top-level layer. */
  render(name: string, pitch = 1, only?: number): Rendered {
    const def = this.sounds.get(name);
    if (!def) throw new ChirpError(`unknown sound '${name}'${didYouMean(name, this.order)}`);
    const key = `${name}@${pitch}`;
    if (only === undefined) {
      const hit = this.cache.get(key);
      if (hit) return hit;
    }
    if (this.building.has(name)) throw new ChirpError(`reference cycle through '${name}'`);
    this.building.add(name);
    try {
      const out = this.renderDef(def, pitch, only);
      if (only === undefined) this.cache.set(key, out);
      return out;
    } catch (e) {
      throw wrap(e, (s) => this.locFromStack(s)).within(`${def.kind} '${name}'`, def.loc);
    } finally {
      this.building.delete(name);
    }
  }

  private renderDef(def: SoundDef, pitch: number, only?: number): Rendered {
    const o = def.opts;
    const mod: Mod = { pitch: pitch * 2 ** ((o.pitch ?? 0) / 12), vol: 1, pan: 0 };
    const sched: Sched[] = [];
    const layers: Layer[] = [];

    // Song timing: step length and song length come from bpm / steps / bars or the longest pattern.
    let stepDur = 0, songSteps = 0;
    if (def.kind === "song") {
      const bpm = o.bpm ?? 120, steps = o.steps ?? 4;
      if (!(bpm > 0 && steps >= 1)) throw new ChirpError("bpm and steps must be positive");
      stepDur = 60 / bpm / steps;
      const tracks: Track[] = [];
      const scan = (it: unknown) => { if (Array.isArray(it)) it.forEach(scan); else if (isTrack(it)) tracks.push(it); else if (isAt(it)) it.items.forEach(scan); };
      def.items.forEach(scan);
      songSteps = o.bars ? o.bars * 4 * steps : Math.max(0, ...tracks.map((t) => parsePattern(t.pattern).steps));
      if (!songSteps) throw new ChirpError("a song needs at least one track (or { bars })");
    }

    if (o.base) {
      layers.push({ label: `base '${o.base}'`, loc: def.loc });
      if (only === undefined || only === 0) sched.push({ t: 0, buf: this.render(o.base, mod.pitch).buf, mod: { pitch: 1, vol: 1, pan: 0 } });
    }
    const offset = layers.length;
    def.items.forEach((item, i) => {
      layers.push(stepOf(item, def));
      if (only === undefined || only === offset + i) this.collect(item, 0, mod, def, String(i), sched, stepDur, songSteps);
    });

    // Length: fixed for loops / songs, otherwise until the last voice ends.
    let end = 0;
    for (const s of sched) end = Math.max(end, s.t + ("voice" in s ? voiceLength(s.voice.opts, s.voice.__voice, s.mod.pitch) : s.buf.L.length / SR));
    const tail = (o.fx ?? []).reduce((a, f) => a + fxTail(f), 0);
    const loop = !!o.loop || (def.kind === "song" && o.loop !== false);
    const fixed = def.kind === "song" ? songSteps * stepDur : o.dur;
    const body = fixed ?? end;
    const total = Math.max(fixed ? Math.max(fixed, end) + tail : end + tail, 0.001);
    const buf = stereo(Math.ceil(total * SR));

    for (const s of sched) {
      const start = Math.round(s.t * SR);
      if ("voice" in s) renderVoice(s.voice.__voice, s.voice.opts, s.seed, buf, start, s.mod);
      else {
        const p = Math.max(-1, Math.min(1, s.mod.pan));
        const gl = s.mod.vol * (p > 0 ? 1 - p : 1), gr = s.mod.vol * (p < 0 ? 1 + p : 1);
        for (let i = 0; i < s.buf.L.length && start + i < buf.L.length; i++) {
          buf.L[start + i] += s.buf.L[i] * gl;
          buf.R[start + i] += s.buf.R[i] * gr;
        }
      }
    }
    // Effects in order; limiters wait until the loop has wrapped its tails, so they see the final peaks.
    for (const f of o.fx ?? []) if (f.__fx !== "limiter") applyFx(f, buf, o.vol ?? 1);

    let outBuf = buf;
    if (loop) {
      // Seamless loop: everything ringing past the end lands back at the start.
      const n = Math.round(body * SR);
      outBuf = stereo(n);
      for (let i = 0; i < buf.L.length; i++) {
        outBuf.L[i % n] += buf.L[i];
        outBuf.R[i % n] += buf.R[i];
      }
    } else if (fixed) {
      const n = Math.round((fixed + (def.kind === "song" ? tail : 0)) * SR);
      outBuf = { L: buf.L.slice(0, n), R: buf.R.slice(0, n) };
    }
    if (!loop) {
      // Drop the inaudible end of tails (below -66 dBFS), keeping 10 ms after the last sound.
      let last = outBuf.L.length - 1;
      while (last > 0 && Math.abs(outBuf.L[last]) < 5e-4 && Math.abs(outBuf.R[last]) < 5e-4) last--;
      const n = Math.min(outBuf.L.length, last + 1 + Math.round(0.01 * SR));
      if (n < outBuf.L.length) outBuf = { L: outBuf.L.slice(0, n), R: outBuf.R.slice(0, n) };
    }
    for (const f of o.fx ?? []) if (f.__fx === "limiter") applyFx(f, outBuf, o.vol ?? 1);
    const vol = o.vol ?? 1;
    if (vol !== 1) for (const ch of [outBuf.L, outBuf.R]) for (let i = 0; i < ch.length; i++) ch[i] *= vol;
    return { name: def.name, kind: def.kind, buf: outBuf, dur: outBuf.L.length / SR, loop, layers };
  }

  private collect(item: unknown, t: number, mod: Mod, def: SoundDef, path: string, out: Sched[], stepDur: number, songSteps: number): void {
    if (item === null || item === undefined || item === false) return;
    if (Array.isArray(item)) { item.forEach((v, i) => this.collect(v, t, mod, def, `${path}.${i}`, out, stepDur, songSteps)); return; }
    if (isVoice(item)) { out.push({ t, voice: item, seed: item.opts.seed ?? hash(`${def.name}|${path}`), mod }); return; }
    if (isAt(item)) { item.items.forEach((v, i) => this.collect(v, t + item.__at, mod, def, `${path}@${i}`, out, stepDur, songSteps)); return; }
    if (isPlay(item)) {
      try {
        const p = item.opts;
        const r = this.render(item.name, mod.pitch * 2 ** ((p.pitch ?? 0) / 12));
        out.push({ t, buf: r.buf, mod: { pitch: 1, vol: mod.vol * (p.vol ?? 1), pan: mod.pan + (p.pan ?? 0) } });
      } catch (e) { throw wrap(e, (s) => this.locFromStack(s)).within(item.step.label, item.step.loc); }
      return;
    }
    if (isTrack(item)) {
      if (def.kind !== "song") throw new ChirpError(`track() only works inside a song`, item.step.loc);
      try { this.collectTrack(item, t, mod, def, path, out, stepDur, songSteps); }
      catch (e) { throw wrap(e, (s) => this.locFromStack(s)).within(item.step.label, item.step.loc); }
      return;
    }
    const what = typeof item === "function" ? "a function" : typeof item === "string" ? `the string ${JSON.stringify(item)}` : `a ${typeof item}`;
    throw new ChirpError(`item is ${what}; items are tone(), noise(), play(), at(), track() or lists of those`);
  }

  private collectTrack(tr: Track, t: number, mod: Mod, def: SoundDef, path: string, out: Sched[], stepDur: number, songSteps: number): void {
    const inst = this.insts.get(tr.inst)?.make ?? DRUMS[tr.inst];
    if (!inst) throw new ChirpError(`unknown instrument '${tr.inst}'${didYouMean(tr.inst, [...this.insts.keys(), ...Object.keys(DRUMS)])} (define it with inst(), or use a drum: ${Object.keys(DRUMS).join(", ")})`);
    const { events, steps } = parsePattern(tr.pattern);
    const tp = 2 ** ((tr.opts.transpose ?? 0) / 12), gate = tr.opts.gate ?? 0.85, swing = def.opts.swing ?? 0;
    const tmod: Mod = { pitch: 1, vol: mod.vol * (tr.opts.vol ?? 1), pan: mod.pan + (tr.opts.pan ?? 0) };
    for (let rep = 0; rep * steps < songSteps; rep++) {
      for (const e of events) {
        const s = rep * steps + e.step;
        if (s >= songSteps) break;
        const at = t + s * stepDur + (s % 2 ? swing * stepDur : 0);
        const dur = e.len * stepDur * gate;
        const freqs = e.freqs.length ? e.freqs.map((f) => f * tp * mod.pitch) : [440 * tp * mod.pitch];
        freqs.forEach((f, ci) => {
          const id = `${path}:${s}:${ci}`;
          if (typeof inst === "function") this.collect(inst(f, dur, e.accent), at, tmod, def, id, out, stepDur, songSteps);
          else out.push({ t: at, voice: { __voice: inst.src ? "sample" : "tone", opts: { ...inst, freq: f, dur, vol: (inst.vol ?? 1) * (e.accent ? 1.3 : 1) }, step: tr.step }, seed: hash(`${def.name}|${id}`), mod: tmod });
        });
      }
    }
  }
}

/** A song's tracks as MIDI notes: every track() in the song (inside at() and lists too), repeated over the song's length. */
export function midiTracks(p: Project, name: string): { tracks: MidiTrack[]; bpm: number; steps: number } {
  const def = p.sounds.get(name);
  if (!def || def.kind !== "song") throw new ChirpError(`'${name}' is not a song`);
  const bpm = def.opts.bpm ?? 120, steps = def.opts.steps ?? 4, stepDur = 60 / bpm / steps;
  const found: { tr: Track; offset: number }[] = [];
  const scan = (it: unknown, t: number) => {
    if (Array.isArray(it)) it.forEach((v) => scan(v, t));
    else if (isTrack(it)) found.push({ tr: it, offset: t });
    else if (isAt(it)) it.items.forEach((v) => scan(v, t + it.__at));
  };
  def.items.forEach((it) => scan(it, 0));
  const songSteps = def.opts.bars ? def.opts.bars * 4 * steps : Math.max(0, ...found.map((f) => parsePattern(f.tr.pattern).steps));
  const tracks: MidiTrack[] = [];
  let melodic = 0;
  for (const { tr, offset } of found) {
    const inst = p.insts.get(tr.inst)?.make, drum = GM_DRUMS[tr.inst];
    const isDrum = !inst && drum !== undefined;
    const channel = isDrum ? 9 : MELODIC_CHANNELS[melodic++ % MELODIC_CHANNELS.length];
    const program = isDrum ? 0 : typeof inst === "object" && inst ? (inst.src ? 0 : GM_PROGRAM[inst.wave ?? "square"] ?? 80) : 80;
    const { events, steps: patSteps } = parsePattern(tr.pattern);
    const tp = tr.opts.transpose ?? 0, gate = tr.opts.gate ?? 0.85, base = offset / stepDur;
    const notes: MidiTrack["notes"] = [];
    for (let rep = 0; rep * patSteps < songSteps; rep++)
      for (const e of events) {
        const s = rep * patSteps + e.step;
        if (s >= songSteps) break;
        const keys = e.freqs.length ? e.freqs.map((f) => midiKey(f) + tp) : [drum ?? 60];
        for (const key of keys) notes.push({ step: base + s, len: e.len * gate, key, vel: e.accent ? 120 : 100 });
      }
    tracks.push({ name: tr.inst, channel, program, notes });
  }
  return { tracks, bpm, steps };
}

function stepOf(item: unknown, def: SoundDef): Step {
  if (isVoice(item) || isPlay(item) || isAt(item) || isTrack(item)) return item.step;
  if (Array.isArray(item)) return { label: `[${item.length} items]`, loc: def.loc };
  return { label: "item", loc: def.loc };
}
