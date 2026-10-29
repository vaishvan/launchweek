// Live player server: watch sound files, rebuild, push updates over SSE, serve WAV + previews.
import { readFileSync, unwatchFile, watchFile } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, statsText } from "../core/analyze.ts";
import { wav } from "../core/encode.ts";
import { type ChirpError, wrap } from "../core/errors.ts";
import type { Project } from "../core/project.ts";
import { loadProject } from "./load.ts";
import { writeOutputs } from "./output.ts";
import { PREVIEW_LAYOUT, previewPng } from "./preview.ts";
import { FeedbackError, writeFeedback } from "./feedback.ts";

export interface ServeOptions {
  port?: number;
  out?: string | false;
  log?: (line: string) => void;
}

interface ErrInfo { message: string; loc?: string }
interface SoundInfo { name: string; kind: string; part: boolean; dur?: number; loop?: boolean; layers?: string[]; info?: string; changed: boolean; error?: ErrInfo }
interface State { version: number; file: string; time: string; ms: number; error?: ErrInfo; sounds: SoundInfo[]; errors: ErrInfo[]; layout: typeof PREVIEW_LAYOUT }

const viewerDir = join(dirname(fileURLToPath(import.meta.url)), "..", "viewer");
const errInfo = (e: ChirpError): ErrInfo => ({ message: e.message, loc: e.loc });

/** Cheap fingerprint of a render, to tell which sounds changed. */
function fingerprint(L: Float32Array): string {
  let h = 0;
  for (let i = 0; i < L.length; i += 97) h = (h * 31 + Math.round(L[i] * 1e5)) | 0;
  return `${L.length}:${h}`;
}

export function serve(file: string, opts: ServeOptions = {}): Promise<{ url: string; close: () => void }> {
  const abs = resolve(file);
  const out = opts.out === false ? undefined : opts.out ?? join(dirname(abs), "out");
  const log = opts.log ?? ((l: string) => console.log(l));
  const clients = new Set<ServerResponse>();
  let project: Project | undefined;
  let state: State = { version: 0, file: basename(abs), time: "", ms: 0, sounds: [], errors: [], layout: PREVIEW_LAYOUT };
  const last = new Map<string, string>();
  let watched = new Set<string>();
  let timer: NodeJS.Timeout | undefined;

  const rebuild = () => {
    const t0 = performance.now();
    const next: State = { version: state.version + 1, file: basename(abs), time: new Date().toLocaleTimeString(), ms: 0, sounds: [], errors: [], layout: PREVIEW_LAYOUT };
    try { project = loadProject(abs); } catch (e) { project = undefined; next.error = errInfo(wrap(e)); }
    if (project) {
      for (const name of project.order) {
        const info: SoundInfo = { name, kind: project.sounds.get(name)!.kind, part: name.startsWith("_"), changed: false };
        try {
          const r = project.render(name);
          const fp = fingerprint(r.buf.L);
          Object.assign(info, { dur: r.dur, loop: r.loop, layers: r.layers.map((l) => l.label), info: statsText(name, analyze(r.buf)), changed: last.get(name) !== fp });
          last.set(name, fp);
        } catch (e) {
          info.error = errInfo(wrap(e));
          info.changed = true;
          last.delete(name);
        }
        next.sounds.push(info);
      }
      if (out) {
        const r = writeOutputs(project, out);
        next.errors = r.errors.filter((e) => !next.sounds.some((s) => s.error?.message === e.message)).map(errInfo);
      }
      watch(project.files);
    } else watch([abs]);
    next.ms = Math.round(performance.now() - t0);
    state = next;
    const bad = next.error ? 1 : next.sounds.filter((s) => s.error).length + next.errors.length;
    log(`[chirp] v${next.version} ${next.ms}ms: ${next.sounds.length} sounds, ${bad} error(s)` + (next.error ? `\n  ${next.error.message}` : ""));
    const msg = `event: build\ndata: ${JSON.stringify(state)}\n\n`;
    for (const c of clients) c.write(msg);
  };

  const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, 80); };
  function watch(files: string[]) {
    const nextSet = new Set(files);
    for (const f of watched) if (!nextSet.has(f)) unwatchFile(f);
    for (const f of nextSet) if (!watched.has(f)) watchFile(f, { interval: 150 }, (a, b) => { if (a.mtimeMs !== b.mtimeMs) schedule(); });
    watched = nextSet;
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const name = url.searchParams.get("name") ?? "";
    const layer = url.searchParams.has("layer") ? Number(url.searchParams.get("layer")) : undefined;
    try {
      if (url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(join(viewerDir, "index.html")));
      } else if (url.pathname === "/app.js") {
        res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
        res.end(readFileSync(join(viewerDir, "app.js")));
      } else if (url.pathname === "/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
        res.write(`event: build\ndata: ${JSON.stringify(state)}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
      } else if (url.pathname === "/api/feedback" && req.method === "POST") {
        // Spans and notes from the player's annotate mode, written to <out>/_feedback/.
        const chunks: Buffer[] = [];
        let size = 0;
        req.on("data", (d: Buffer) => { size += d.length; if (size > 32 << 20) req.destroy(); else chunks.push(d); });
        req.on("end", () => {
          const reply = (code: number, j: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(j)); };
          if (!project) return reply(409, { error: "the sound file does not build right now" });
          try {
            const r = writeFeedback(project, out ?? join(dirname(abs), "out"), JSON.parse(Buffer.concat(chunks).toString("utf8")));
            log(`[chirp] feedback: ${r.summary} -> ${r.files.find((f) => f.endsWith(".json"))}`);
            reply(200, { ok: true, ...r });
          } catch (e) {
            reply(e instanceof FeedbackError || e instanceof SyntaxError ? 400 : 500, { error: (e as Error).message });
          }
        });
        return;
      } else if ((url.pathname === "/api/wav" || url.pathname === "/api/png") && project) {
        const r = project.render(name, 1, layer);
        if (url.pathname === "/api/wav") {
          res.writeHead(200, { "content-type": "audio/wav", "cache-control": "no-store" });
          res.end(Buffer.from(wav(r.buf)));
        } else {
          res.writeHead(200, { "content-type": "image/png", "cache-control": "no-store" });
          res.end(previewPng(name + (layer !== undefined ? ` · layer ${layer}` : ""), r.buf, analyze(r.buf), r.loop));
        }
      } else {
        res.writeHead(404);
        res.end("not found");
      }
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });
  const ping = setInterval(() => { for (const c of clients) c.write(": ping\n\n"); }, 15000);

  return new Promise((ok, fail) => {
    server.on("error", fail);
    server.listen(opts.port ?? 4330, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : opts.port;
      rebuild();
      ok({
        url: `http://127.0.0.1:${port}/`,
        close: () => {
          clearInterval(ping);
          clearTimeout(timer);
          for (const f of watched) unwatchFile(f);
          for (const c of clients) c.end();
          server.close();
        },
      });
    });
  });
}
