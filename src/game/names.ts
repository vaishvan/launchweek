// ---------------------------------------------------------------------------
// names.ts
// Purpose : Random satirical AI-startup names for the player's company.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
const FIRST = ["Prompt", "Halluci", "Vibe", "Token", "Agent", "Synth", "Infer", "Embed", "Neur", "Gradi", "Chunk", "Latent", "Copilo", "Auto"];
const LAST = ["ly", "nate", "ify", "io", "base", "flow", "stack", "hub", "mind", "ware", "loop", "verse", "pilot", "works"];
const TLD = [".AI", ".AI", ".AI", " LABS", " INC", ".IO"];

export function companyName(rnd: () => number = Math.random): string {
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];
  return (pick(FIRST) + pick(LAST)).toUpperCase() + pick(TLD);
}
