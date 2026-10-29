import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { analyze } from "../src/core/analyze.ts";
import { parsePattern } from "../src/core/music.ts";
import { SR, freqOf, noteName } from "../src/core/util.ts";
import { loadSource } from "../src/node/load.ts";
import { writeOutputs } from "../src/node/output.ts";
import { serve } from "../src/node/server.ts";

const throwsMsg = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: Error) => re.test(e.message));
const near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test("note names and frequencies agree", () => {
  assert.equal(Math.round(freqOf("A4")), 440);
  near(freqOf("C4"), 261.63, 0.01);
  near(freqOf("Eb3"), freqOf("D#3"), 1e-9);
  assert.equal(noteName(440), "A4");
  assert.equal(noteName(freqOf("C#6")), "C#6");
});

test("a tone renders at its pitch and length", () => {
  const p = loadSource(`sfx("a", tone({ wave: "sine", freq: "A4", dur: 0.5, env: [0, 0, 1, 0.01] }))`);
  const r = p.render("a");
  near(r.dur, 0.52, 0.02);
  const s = analyze(r.buf);
  for (const pt of s.pitch.slice(1, -2)) near(pt.hz, 440, 4);
});

test("slides move from start to end pitch", () => {
  const s = analyze(loadSource(`sfx("j", tone({ wave: "sine", freq: 200, to: 800, dur: 0.6, env: [0, 0, 1, 0.01] }))`).render("j").buf);
  // Exponential slide: f(t) = 200 * 4^(t / 0.6); each window is centred ~23 ms after its start.
  for (const pt of s.pitch.filter((q) => q.t <= 0.55)) {
    const want = 200 * 4 ** Math.min(1, (pt.t + 0.023) / 0.6);
    near(pt.hz, want, want * 0.06);
  }
});

test("variants shift pitch by semitones; play() places sounds in time", () => {
  const p = loadSource(`sfx("a", tone({ wave: "sine", freq: "A4", dur: 0.3, env: [0, 0, 1, 0.01] }))
sfx("hi", { base: "a", pitch: 12 })
sfx("two", play("a"), at(0.5, play("a", { pitch: 7 })))`);
  near(analyze(p.render("hi").buf).pitch[2].hz, 880, 8);
  const two = analyze(p.render("two").buf);
  near(two.dur, 0.82, 0.03);
  near(two.pitch.find((q) => q.t >= 0.55)!.hz, 440 * 2 ** (7 / 12), 8);
});

test("patterns: notes, holds, rests, chords, hits", () => {
  const { events, steps } = parsePattern("C4 - . E4+G4 | x X! .");
  assert.equal(steps, 7);
  assert.deepEqual(events.map((e) => [e.step, e.freqs.length, e.len, e.accent]), [[0, 1, 2, false], [3, 2, 1, false], [4, 0, 1, false], [5, 0, 1, true]]);
  throwsMsg(() => parsePattern("C4 H4"), /step 2: 'H4' is not a note/);
  throwsMsg(() => parsePattern("- C4"), /'-' at step 1 has no note to hold/);
});

test("songs last bars x steps and loop seamlessly", () => {
  const p = loadSource(`inst("pad", { wave: "saw", env: [0.01, 0.1, 0.8, 0.8] })
song("s", { bpm: 120 }, track("pad", "C4 - - - . . . ."))`);
  const r = p.render("s");
  assert.equal(r.loop, true);
  assert.equal(r.buf.L.length, Math.round(8 * (60 / 120 / 4) * SR));
  // The release tail rings past the end, so it must have wrapped onto the start.
  const tail = Math.max(...Array.from(r.buf.L.subarray(r.buf.L.length - 200)).map(Math.abs));
  const head = Math.max(...Array.from(r.buf.L.subarray(0, 200)).map(Math.abs));
  assert.ok(tail > 0.01 && head > 0.01, "loop seam carries the tail");
});

test("tails are trimmed; looped sfx keep their exact length", () => {
  const p = loadSource(`sfx("r", { fx: [reverb()] }, tone({ freq: "A4", dur: 0.05 }))
sfx("rain", { dur: 2, loop: true }, noise({ color: "pink", dur: 2.2, env: [0.5, 0, 1, 0.5], vol: 0.3 }))`);
  assert.ok(p.render("r").dur < 2.5);
  assert.equal(p.render("rain").buf.L.length, 2 * SR);
});

test("errors name the location and suggest fixes", () => {
  throwsMsg(() => loadSource(`sfx("a",\n  tone({ wave: "squre" }))`), /^sound\.cx\.js:2:3: tone: wave must be sine, square, saw, triangle, fm \(did you mean 'square'\?\)/);
  throwsMsg(() => loadSource(`sfx("a", tone({ freq: "H4" }))`), /'H4' is not a note/);
  throwsMsg(() => loadSource(`sfx("a", { loop: true }, tone({}))`), /a looping sfx needs a fixed \{ dur \}/);
  const p = loadSource(`song("s", track("leed", "C4"))\ninst("lead", { wave: "square" })`);
  throwsMsg(() => p.render("s"), /song 's' > track\("leed"\): unknown instrument 'leed' \(did you mean 'lead'\?\)/);
  throwsMsg(() => loadSource(`sfx("a", play("b"))\nsfx("b", play("a"))`).render("a"), /reference cycle through 'a'/);
});

test("build writes WAVs, previews and an audio-sprite bank", () => {
  const dir = mkdtempSync(join(tmpdir(), "chirp-"));
  try {
    const p = loadSource(`sfx("a", tone({ freq: "A4", dur: 0.1 }))
sfx("b", tone({ freq: "C5", dur: 0.2 }))
sfx("bad", play("nope"))
bank("all", ["a", "b"], { gap: 0.05 })`);
    const r = writeOutputs(p, dir);
    assert.equal(r.errors.length, 1);
    const w = readFileSync(join(dir, "sfx/a.wav"));
    assert.equal(w.toString("ascii", 0, 4), "RIFF");
    assert.equal(w.readUInt32LE(24), SR);
    assert.equal(w.readUInt16LE(22), 2);
    const bank = JSON.parse(readFileSync(join(dir, "all.json"), "utf8"));
    const lenA = Math.round((p.render("a").buf.L.length / SR) * 1000);
    assert.deepEqual(bank.sprite.a, [0, lenA]);
    near(bank.sprite.b[0], lenA + 50, 2);
    assert.ok(readFileSync(join(dir, "_preview/a.png")).length > 1000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("serve: feedback spans come back with song position and the loudest layers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chirp-fb-"));
  const file = join(dir, "a.cx.js");
  // bar 1: only the bass plays; bar 2: only the lead (120 bpm, 4 steps per beat -> 2 s per bar)
  writeFileSync(file, `inst("bass", { wave: "triangle" }); inst("lead", { wave: "square" })
song("tune", { bpm: 120, bars: 2, loop: false },
  track("bass", "C2 - - - - - - - - - - - - - - - | . . . . . . . . . . . . . . . ."),
  track("lead", ". . . . . . . . . . . . . . . . | C5 - - - - - - - - - - - - - - -"))`);
  const s = await serve(file, { port: 0, out: join(dir, "out"), log: () => {} });
  const post = (body: unknown) => fetch(s.url + "api/feedback", { method: "POST", body: JSON.stringify(body) });
  try {
    const r = await post({ name: "tune", comment: "c", spans: [{ t0: 2.2, t1: 2.8, f0: 400, f1: 2000, color: "#ff3df0", text: "too harsh" }],
      notes: [{ t: 0.5, text: "bass ok" }, { t: "x", text: "bad" }] });
    assert.equal(r.status, 200);
    const fb = JSON.parse(readFileSync(join(dir, "out", "_feedback", "tune.json"), "utf8"));
    assert.deepEqual(fb.spans[0].from, { bar: 2, beat: 1, step: 2 });
    assert.deepEqual(fb.spans[0].band, [400, 2000]);
    assert.equal(fb.spans[0].loudest[0].label, 'track("lead")');
    assert.equal(fb.notes.length, 1, "invalid notes are dropped");
    assert.equal(fb.notes[0].loudest[0].label, 'track("bass")');
    assert.ok(existsSync(join(dir, "out", "_feedback", "tune.current.png")));
    assert.equal((await post({ name: "nope" })).status, 400);
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
