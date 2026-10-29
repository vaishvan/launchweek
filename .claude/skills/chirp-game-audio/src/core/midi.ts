// Standard MIDI file (format 1) writer: one track per song track, drums on channel 10 with
// General MIDI notes, so a chirp song opens in any DAW with real instruments.
export interface MidiNote {
  /** Start and length in steps. */
  step: number;
  len: number;
  key: number;
  vel: number;
}

export interface MidiTrack {
  name: string;
  channel: number;
  program: number;
  notes: MidiNote[];
}

const PPQ = 480;

function vlq(v: number): number[] {
  const out = [v & 0x7f];
  v >>= 7;
  while (v > 0) { out.unshift((v & 0x7f) | 0x80); v >>= 7; }
  return out;
}

function chunk(type: string, data: number[]): number[] {
  return [...type].map((c) => c.charCodeAt(0)).concat([(data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255], data);
}

/** MIDI note number for a frequency (A4 = 69). */
export const midiKey = (hz: number) => Math.max(0, Math.min(127, Math.round(69 + 12 * Math.log2(hz / 440))));

export function midi(tracks: MidiTrack[], bpm: number, stepsPerBeat: number, name: string): Uint8Array {
  const ticksPerStep = PPQ / stepsPerBeat;
  const tempo = Math.round(60_000_000 / bpm);
  const meta: number[] = [0, 0xff, 0x03, ...vlq(name.length), ...[...name].map((c) => c.charCodeAt(0)),
    0, 0xff, 0x51, 3, (tempo >>> 16) & 255, (tempo >>> 8) & 255, tempo & 255, 0, 0xff, 0x2f, 0];
  const chunks = [chunk("MTrk", meta)];
  for (const t of tracks) {
    const ev: { tick: number; order: number; bytes: number[] }[] = [];
    const ch = t.channel & 15;
    if (ch !== 9) ev.push({ tick: 0, order: 0, bytes: [0xc0 | ch, t.program & 127] });
    for (const n of t.notes) {
      const on = Math.round(n.step * ticksPerStep), off = Math.max(on + 1, Math.round((n.step + n.len) * ticksPerStep));
      ev.push({ tick: on, order: 2, bytes: [0x90 | ch, n.key & 127, n.vel & 127] });
      ev.push({ tick: off, order: 1, bytes: [0x80 | ch, n.key & 127, 0] });
    }
    ev.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const data: number[] = [0, 0xff, 0x03, ...vlq(t.name.length), ...[...t.name].map((c) => c.charCodeAt(0))];
    let last = 0;
    for (const e of ev) { data.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
    data.push(0, 0xff, 0x2f, 0);
    chunks.push(chunk("MTrk", data));
  }
  const header = chunk("MThd", [0, 1, (chunks.length >>> 8) & 255, chunks.length & 255, (PPQ >>> 8) & 255, PPQ & 255]);
  const parts = [header, ...chunks], out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
