// ---------------------------------------------------------------------------
// options.ts
// Purpose : Page options from the URL, used by smoke tests and debugging:
//           ?autoplay=pace|idler|tapper|chaos|acquire  a bot plays the game
//           &speed=N   simulation speed multiplier (autoplay only)
//           &seed=N    run seed   &silent   no audio   &botDelay=S  bot think time on cards
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import type { BotKind } from "../core/bot";

const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();

export const options = {
  autoplay: (q.get("autoplay") as BotKind | null) ?? null,
  speed: Math.max(1, Math.min(200, Number(q.get("speed") ?? 1) || 1)),
  seed: Number(q.get("seed") ?? 0) || Math.floor(Math.random() * 1e9),
  silent: q.has("silent") || q.has("autoplay"),
  /** Sim seconds the bot waits before answering a card or a review (screenshots). */
  botDelay: Number(q.get("botDelay") ?? 2) || 2,
};
