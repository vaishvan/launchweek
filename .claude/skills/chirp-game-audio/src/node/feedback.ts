// Feedback from the live player: spans of time (optionally a frequency band) marked on the preview
// and notes pinned to moments, written next to the outputs with the musical and layer context an
// agent needs to find the cause: song position and the loudest layers in each span.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { analyze, mono } from "../core/analyze.ts";
import type { Project } from "../core/project.ts";
import { SR } from "../core/util.ts";
import { PREVIEW_LAYOUT, previewPng } from "./preview.ts";

export class FeedbackError extends Error {}

const MAX_ITEMS = 300, MAX_TEXT = 4000;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** Validate and write `<out>/_feedback/<name>.{json,annotated.png,current.png}`. */
export function writeFeedback(p: Project, out: string, body: unknown): { files: string[]; summary: string } {
  if (typeof body !== "object" || body === null) throw new FeedbackError("feedback must be a JSON object");
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" && p.sounds.has(b.name) ? b.name : undefined;
  if (!name) throw new FeedbackError(`unknown sound ${JSON.stringify(b.name)}`);
  const r = p.render(name), dur = r.dur, { fmin, fmax } = PREVIEW_LAYOUT;
  const clampT = (t: number) => Math.max(0, Math.min(dur, t)), clampF = (f: number) => Math.max(fmin, Math.min(fmax, f));
  const text = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_TEXT) : "");
  const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : "#ff3df0");

  const spans = (Array.isArray(b.spans) ? b.spans : []).slice(0, MAX_ITEMS).flatMap((s) => {
    if (!s || !num(s.t0) || !num(s.t1)) return [];
    const t0 = clampT(Math.min(s.t0, s.t1)), t1 = clampT(Math.max(s.t0, s.t1));
    const band = num(s.f0) && num(s.f1) ? [clampF(Math.min(s.f0, s.f1)), clampF(Math.max(s.f0, s.f1))] : null;
    return t1 > t0 ? [{ t0, t1, band, color: color(s.color), text: text(s.text) }] : [];
  });
  const notes = (Array.isArray(b.notes) ? b.notes : []).slice(0, MAX_ITEMS).flatMap((n) =>
    n && num(n.t) && typeof n.text === "string" ? [{ t: clampT(n.t), f: num(n.f) ? clampF(n.f) : null, text: text(n.text) }] : []);
  const comment = text(b.comment);

  // Song position at a time, for songs.
  const def = p.sounds.get(name)!, o = def.opts as { bpm?: number; steps?: number };
  const stepDur = def.kind === "song" ? 60 / (o.bpm ?? 120) / (o.steps ?? 4) : 0, spb = o.steps ?? 4;
  const pos = (t: number) => {
    if (!stepDur) return undefined;
    const st = Math.floor(t / stepDur + 1e-6);
    return { bar: Math.floor(st / (4 * spb)) + 1, beat: (Math.floor(st / spb) % 4) + 1, step: (st % spb) + 1 };
  };
  // The loudest layers in a window: each layer rendered alone, RMS over the window.
  const layerMono = r.layers.map((_, i) => mono(p.render(name, 1, i).buf));
  const loudest = (t0: number, t1: number) => {
    const a = Math.floor(t0 * SR), z = Math.max(a + 1, Math.ceil(t1 * SR));
    return r.layers.map((l, i) => {
      const m = layerMono[i]; let e = 0;
      for (let k = a; k < z && k < m.length; k++) e += m[k] * m[k];
      return { layer: i, label: l.label, loc: l.loc ?? null, rmsDb: Math.round(10 * Math.log10(e / (z - a) + 1e-12) * 10) / 10 };
    }).filter((x) => x.rmsDb > -70).sort((x, y) => y.rmsDb - x.rmsDb).slice(0, 4);
  };

  const dir = join(out, "_feedback");
  mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  const put = (file: string, data: string | Buffer) => { const path = join(dir, file); writeFileSync(path, data); files.push(path); };
  put(`${name}.current.png`, previewPng(name, r.buf, analyze(r.buf), r.loop));
  const hasPng = typeof b.annotated === "string" && b.annotated.startsWith("data:image/png;base64,");
  if (hasPng) put(`${name}.annotated.png`, Buffer.from((b.annotated as string).slice(22), "base64"));
  put(`${name}.json`, JSON.stringify({
    sound: name, kind: def.kind, dur: r3(dur), time: new Date().toISOString(), comment,
    spans: spans.map((s, i) => ({ n: i + 1, t0: r3(s.t0), t1: r3(s.t1), band: s.band && s.band.map(Math.round), color: s.color, text: s.text,
      from: pos(s.t0) ?? null, to: pos(s.t1) ?? null, loudest: loudest(s.t0, s.t1) })),
    notes: notes.map((n, i) => ({ n: i + 1, t: r3(n.t), f: n.f && Math.round(n.f), text: n.text, at: pos(n.t) ?? null,
      loudest: loudest(Math.max(0, n.t - 0.05), Math.min(dur, n.t + 0.05)) })),
    images: { annotated: hasPng ? `${name}.annotated.png` : null, current: `${name}.current.png` },
  }, null, 1) + "\n");
  return { files, summary: `${spans.length} span${spans.length === 1 ? "" : "s"}, ${notes.length} note${notes.length === 1 ? "" : "s"}${comment ? ", a comment" : ""}` };
}
