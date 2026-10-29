// ---------------------------------------------------------------------------
// format.ts
// Purpose : Short number and time strings for a 180px-wide HUD.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
export function short(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a < 1000) return sign + Math.floor(a).toString();
  const units = [["B", 1e9], ["M", 1e6], ["K", 1e3]] as const;
  for (const [u, v] of units) {
    if (a >= v) {
      const x = a / v;
      const txt = x >= 100 ? Math.floor(x).toString() : (x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/\.?0+$/, "");
      return sign + txt + u;
    }
  }
  return sign + a.toFixed(0);
}
export const money = (n: number): string => (n < 0 ? "-$" + short(-n) : "$" + short(n));
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export const pct = (x: number): string => `${Math.round(x)}%`;
