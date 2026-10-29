// chirp live player. Plain browser JS, no build step.
const $ = (id) => document.getElementById(id);
let state, sel = localStorage.getItem("chirp.sel") || undefined, ctx, src;

$("unlock").onclick = () => { ctx = new AudioContext(); $("unlock").remove(); };

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]); }

function stop() { try { src?.stop(); } catch {} src = undefined; }

async function play(name, layer) {
  if (!ctx) return;
  stop();
  const q = `name=${encodeURIComponent(name)}${layer !== undefined ? `&layer=${layer}` : ""}&v=${state?.version}`;
  const buf = await ctx.decodeAudioData(await (await fetch(`/api/wav?${q}`)).arrayBuffer());
  src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = $("loop").checked;
  src.connect(ctx.destination);
  src.start();
}

function show() {
  const info = state?.sounds.find((s) => s.name === sel);
  $("err").style.display = info?.error || state?.error ? "block" : "none";
  $("err").textContent = (state?.error ?? info?.error)?.message ?? "";
  if (!info || info.error) { $("prev").removeAttribute("src"); $("info").textContent = ""; $("layers").innerHTML = ""; return; }
  $("title").textContent = `${info.kind} ${info.name} · ${info.dur.toFixed(2)}s${info.loop ? " · loops" : ""}`;
  $("prev").src = `/api/png?name=${encodeURIComponent(info.name)}&v=${state.version}`;
  if (annotating) renderAnnot();
  $("info").textContent = info.info;
  $("layers").innerHTML = "";
  info.layers.forEach((l, i) => {
    const b = document.createElement("button");
    b.textContent = `${i} ${l}`;
    b.onclick = () => { play(info.name, i); $("prev").src = `/api/png?name=${encodeURIComponent(info.name)}&layer=${i}&v=${state.version}`; };
    $("layers").appendChild(b);
  });
}

function renderList() {
  const box = $("list");
  box.innerHTML = "";
  if (!state) return;
  for (const [title, pred] of [["music", (s) => s.kind === "song" && !s.part], ["sfx", (s) => s.kind === "sfx" && !s.part], ["parts", (s) => s.part]]) {
    const items = state.sounds.filter(pred);
    if (!items.length) continue;
    const h = document.createElement("div");
    h.className = "sect";
    h.textContent = title;
    box.appendChild(h);
    for (const s of items) {
      const row = document.createElement("div");
      row.className = "row" + (s.name === sel ? " sel" : "");
      row.innerHTML = `<button class="pl">▶</button><span class="nm">${esc(s.name)}</span><span class="d">${s.dur ? s.dur.toFixed(2) + "s" : ""}</span>` +
        (s.error ? `<span class="dot err"></span>` : s.changed && state.version > 1 ? `<span class="dot new"></span>` : "");
      row.onclick = () => { select(s.name); play(s.name); };
      box.appendChild(row);
    }
  }
}

function select(name) {
  sel = name;
  localStorage.setItem("chirp.sel", name);
  renderList();
  show();
}

$("play").onclick = () => sel && play(sel);
$("stop").onclick = stop;
addEventListener("keydown", (e) => {
  if (e.target.tagName === "TEXTAREA") return;
  if (e.key === " ") { e.preventDefault(); sel && play(sel); }
  if (e.key === "a") setAnnotate(!annotating);
  if (annotating && "sne".includes(e.key)) { tool = e.key === "s" ? "span" : e.key === "n" ? "note" : "erase"; renderAnnot(); }
});

const es = new EventSource("/events");
es.addEventListener("build", (e) => {
  const prev = state;
  state = JSON.parse(e.data);
  $("file").textContent = `${state.file}  v${state.version}  ${state.ms}ms`;
  const bad = state.error ? 1 : state.sounds.filter((s) => s.error).length + state.errors.length;
  $("status").textContent = bad ? `${bad} error${bad > 1 ? "s" : ""}` : "ok";
  $("status").className = "pill " + (bad ? "bad" : "ok");
  if (!sel || !state.sounds.some((s) => s.name === sel)) sel = state.sounds.find((s) => !s.part)?.name;
  // Follow the edit: select and play the first sound that changed.
  const changed = prev && state.sounds.find((s) => s.changed && !s.part && !s.error);
  if (changed) sel = changed.name;
  renderList();
  show();
  if (changed && $("auto").checked) play(changed.name);
});
es.onerror = () => { $("status").textContent = "disconnected"; $("status").className = "pill bad"; };

// ---------------------------------------------------------------- annotate: feedback for Claude
// Spans (a time range, plus a frequency band when drawn on the spectrogram) and notes pinned to a
// moment, mapped through the preview's own plot layout; kept per sound in localStorage until sent.
const COLORS = [["#ff3df0", "fix"], ["#2ee6ff", "keep"], ["#ffe14a", "check"]];
const ann = $("ann"), g = ann.getContext("2d"), prev = $("prev");
let annotating = false, tool = "span", color = COLORS[0][0], drag;

const info = () => state?.sounds.find((s) => s.name === sel);
const key = () => "chirp.marks." + sel;
function marks(create) {
  const i = info(); if (!i?.dur) return undefined;
  let m; try { m = JSON.parse(localStorage.getItem(key()) || "null"); } catch {}
  if (m && Math.abs(m.dur - i.dur) > 1e-3) m = null;                      // the sound changed length
  if (!m && create) m = { dur: i.dur, spans: [], notes: [], comment: "" };
  return m;
}
const save = (m) => { try { localStorage.setItem(key(), JSON.stringify(m)); } catch {} };

// preview pixels <-> seconds / Hz
const L = () => state.layout;
const scale = () => prev.clientWidth / L().width;
const tOf = (px) => Math.max(0, Math.min(1, (px - L().plotX) / L().plotW)) * info().dur;
const xOf = (t) => L().plotX + (t / info().dur) * L().plotW;
const fOf = (py) => L().fmin * (L().fmax / L().fmin) ** (1 - Math.max(0, Math.min(1, (py - L().specY) / (L().specH - 1))));
const yOf = (f) => L().specY + (1 - Math.log(f / L().fmin) / Math.log(L().fmax / L().fmin)) * (L().specH - 1);
const inSpec = (py) => py >= L().specY && py <= L().specY + L().specH;
const at = (e) => { const r = ann.getBoundingClientRect(); return [(e.clientX - r.left) / scale(), (e.clientY - r.top) / scale()]; };

function paint(c, m, k) {
  const top = L().waveY, bot = L().specY + L().specH;
  m.spans.forEach((s, i) => {
    const x0 = xOf(s.t0) * k, x1 = xOf(s.t1) * k, y0 = (s.f1 ? yOf(s.f1) : top) * k, y1 = (s.f0 ? yOf(s.f0) : bot) * k;
    c.fillStyle = s.color + "33"; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    c.strokeStyle = s.color; c.lineWidth = 2; c.strokeRect(x0, y0, x1 - x0, y1 - y0);
    c.fillStyle = s.color; c.font = "700 12px ui-monospace, monospace"; c.fillText(String(i + 1), x0 + 4, y0 + 13);
  });
  m.notes.forEach((n, i) => {
    const x = xOf(n.t) * k, y = (n.f ? yOf(n.f) : (top + L().waveH / 2)) * k;
    c.strokeStyle = "#ffb454"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, top * k); c.lineTo(x, bot * k); c.stroke();
    c.fillStyle = "#ffb454"; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
    c.fillStyle = "#15131c"; c.font = "700 11px ui-monospace, monospace"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("n" + (i + 1), x, y + 1); c.textAlign = "start"; c.textBaseline = "alphabetic";
  });
}

function drawMarks() {
  const dpr = devicePixelRatio || 1, w = prev.clientWidth, h = prev.clientHeight;
  if (ann.width !== Math.round(w * dpr) || ann.height !== Math.round(h * dpr)) { ann.width = Math.round(w * dpr); ann.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const m = state?.layout && marks(false);
  if (m) paint(g, m, scale());
  if (drag?.end) {
    const [x0, y0] = drag.start, [x1, y1] = drag.end, k = scale(), band = inSpec(y0);
    g.strokeStyle = color; g.setLineDash([4, 3]); g.lineWidth = 1.5;
    g.strokeRect(Math.min(x0, x1) * k, (band ? Math.min(y0, y1) : L().waveY) * k, Math.abs(x1 - x0) * k, (band ? Math.abs(y1 - y0) : L().specY + L().specH - L().waveY) * k);
    g.setLineDash([]);
  }
}

function setAnnotate(on) {
  annotating = on;
  document.body.classList.toggle("annotating", on);
  $("annotbtn").classList.toggle("on", on);
  renderAnnot(); drawMarks();
}

function renderAnnot() {
  for (const t of ["span", "note", "erase"]) $("t-" + t).classList.toggle("on", tool === t);
  $("colors").innerHTML = "";
  for (const [c, label] of COLORS) {
    const b = document.createElement("button");
    b.className = "chip" + (c === color ? " on" : ""); b.style.background = c; b.title = label;
    b.onclick = () => { color = c; renderAnnot(); };
    $("colors").appendChild(b);
  }
  const m = marks(false);
  $("items").innerHTML = "";
  const row = (label, text, del) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${label}</b><span>${esc(text)}</span><a title="remove">×</a>`;
    li.lastChild.onclick = () => { del(); save(m); renderAnnot(); drawMarks(); };
    $("items").appendChild(li);
  };
  m?.spans.forEach((s, i) => row(String(i + 1), `${s.t0.toFixed(2)}–${s.t1.toFixed(2)}s${s.f0 ? ` ${Math.round(s.f0)}–${Math.round(s.f1)} Hz` : ""} ${COLORS.find((c) => c[0] === s.color)?.[1] ?? ""} ${s.text || ""}`, () => m.spans.splice(i, 1)));
  m?.notes.forEach((n, i) => row("n" + (i + 1), `${n.t.toFixed(2)}s${n.f ? ` ${Math.round(n.f)} Hz` : ""} ${n.text}`, () => m.notes.splice(i, 1)));
  $("comment").value = m?.comment ?? "";
}

ann.addEventListener("pointerdown", (e) => {
  if (!annotating || !info()?.dur) return;
  const p = at(e), m = marks(true);
  if (tool === "erase") {
    const t = tOf(p[0]), tol = 6 / scale() / L().plotW * info().dur;
    let i = m.notes.findIndex((n) => Math.abs(n.t - t) < tol * 2);
    if (i >= 0) m.notes.splice(i, 1);
    else if ((i = m.spans.findIndex((s) => t >= s.t0 - tol && t <= s.t1 + tol)) >= 0) m.spans.splice(i, 1);
    save(m); renderAnnot(); drawMarks(); return;
  }
  if (tool === "note") {
    const t = tOf(p[0]), f = inSpec(p[1]) ? fOf(p[1]) : null;
    const text = prompt(`Note for Claude at ${t.toFixed(2)}s${f ? `, ${Math.round(f)} Hz` : ""}:`);
    if (text && text.trim()) { m.notes.push({ t, f, text: text.trim() }); save(m); renderAnnot(); drawMarks(); }
    return;
  }
  drag = { start: p };
  ann.setPointerCapture(e.pointerId);
});
ann.addEventListener("pointermove", (e) => { if (drag) { drag.end = at(e); drawMarks(); } });
ann.addEventListener("pointerup", () => {
  if (!drag) return;
  const { start, end } = drag; drag = undefined;
  if (!end || Math.abs(end[0] - start[0]) < 3) return drawMarks();
  const m = marks(true), band = inSpec(start[1]);
  const span = { t0: tOf(Math.min(start[0], end[0])), t1: tOf(Math.max(start[0], end[0])), color, text: "" };
  if (band) { span.f0 = fOf(Math.max(start[1], end[1])); span.f1 = fOf(Math.min(start[1], end[1])); }
  span.text = (prompt("Label for this span (optional):") || "").trim();
  m.spans.push(span); save(m); renderAnnot(); drawMarks();
});
prev.addEventListener("load", drawMarks);
addEventListener("resize", drawMarks);

async function sendFeedback() {
  const m = marks(false), st = $("fbstatus");
  if (!m) { st.textContent = "nothing to send yet"; return; }
  const cv = document.createElement("canvas"); cv.width = L().width; cv.height = L().height;
  const c = cv.getContext("2d"); c.drawImage(prev, 0, 0, cv.width, cv.height); paint(c, m, 1);
  st.textContent = "sending…";
  const r = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: sel, spans: m.spans, notes: m.notes, comment: m.comment, annotated: cv.toDataURL("image/png") }) });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  st.textContent = r.ok ? `sent ✓ ${j.summary} — tell Claude to check the feedback` : `not sent: ${j.error}`;
}

$("annotbtn").onclick = () => setAnnotate(!annotating);
$("t-span").onclick = () => { tool = "span"; renderAnnot(); };
$("t-note").onclick = () => { tool = "note"; renderAnnot(); };
$("t-erase").onclick = () => { tool = "erase"; renderAnnot(); };
$("t-clear").onclick = () => { if (sel && confirm(`Clear all marks on ${sel}?`)) { localStorage.removeItem(key()); renderAnnot(); drawMarks(); } };
$("comment").oninput = () => { const m = marks(true); if (m) { m.comment = $("comment").value; save(m); } };
$("send").onclick = () => sendFeedback();
