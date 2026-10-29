// WAV decoding for sample(): PCM 8 / 16 / 24 / 32-bit and 32-bit float, mono or stereo (more
// channels are mixed down), any sample rate (resampled to chirp's). Returns stereo floats.
import { readFileSync } from "node:fs";
import { ChirpError, wrap } from "../core/errors.ts";
import type { SampleData } from "../core/model.ts";
import { SR } from "../core/util.ts";

export function decodeWav(buf: Uint8Array): SampleData {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (buf.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new ChirpError("not a WAV file (chirp reads PCM / float WAV samples)");
  let o = 12, fmt: { format: number; channels: number; rate: number; bits: number } | undefined, data: Uint8Array | undefined;
  while (o + 8 <= buf.length) {
    const id = tag(o), len = v.getUint32(o + 4, true), body = buf.subarray(o + 8, Math.min(buf.length, o + 8 + len));
    if (id === "fmt ") {
      let format = v.getUint16(o + 8, true);
      if (format === 0xfffe && len >= 26) format = v.getUint16(o + 8 + 24, true);     // WAVE_FORMAT_EXTENSIBLE: the real format is in the sub-format GUID
      fmt = { format, channels: v.getUint16(o + 10, true), rate: v.getUint32(o + 12, true), bits: v.getUint16(o + 22, true) };
    } else if (id === "data") data = body;
    o += 8 + len + (len & 1);
  }
  if (!fmt || !data) throw new ChirpError("WAV has no fmt or data chunk");
  const { format, channels, rate, bits } = fmt;
  if (!(channels >= 1) || !(rate > 0)) throw new ChirpError("WAV has no channels or sample rate");
  const bytes = bits / 8, frames = Math.floor(data.length / (bytes * channels));
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const read = (i: number, c: number): number => {
    const p = (i * channels + c) * bytes;
    if (format === 3) return bits === 32 ? dv.getFloat32(p, true) : dv.getFloat64(p, true);
    if (format !== 1) throw new ChirpError(`unsupported WAV format ${format} (use PCM or float)`);
    switch (bits) {
      case 8: return (data[p] - 128) / 128;
      case 16: return dv.getInt16(p, true) / 32768;
      case 24: return ((data[p] | (data[p + 1] << 8) | (data[p + 2] << 16)) << 8 >> 8) / 8388608;
      case 32: return dv.getInt32(p, true) / 2147483648;
      default: throw new ChirpError(`unsupported WAV bit depth ${bits}`);
    }
  };
  const chan = (c: number, i: number) => (channels === 1 ? read(i, 0) : channels === 2 ? read(i, c) : Array.from({ length: channels }, (_, k) => read(i, k)).reduce((a, b) => a + b, 0) / channels);
  const n = Math.max(1, Math.round((frames * SR) / rate)), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = (i * rate) / SR, j = Math.min(frames - 1, Math.floor(p)), k = Math.min(frames - 1, j + 1), f = p - j;
    L[i] = chan(0, j) + (chan(0, k) - chan(0, j)) * f;
    R[i] = chan(1, j) + (chan(1, k) - chan(1, j)) * f;
  }
  return { L, R };
}

/** Read and decode a WAV file; a missing file names the path it tried. */
export function readSample(path: string): SampleData {
  let bytes: Buffer;
  try { bytes = readFileSync(path); } catch { throw new ChirpError(`cannot read sample '${path}'`); }
  try { return decodeWav(bytes); } catch (e) { throw wrap(e).within(`sample '${path.replace(/^.*[\\/]/, "")}'`); }
}
