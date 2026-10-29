// ---------------------------------------------------------------------------
// main.ts
// Purpose : Entry point. Creates the Phaser game: 180x320 portrait pixel canvas,
//           scaled to fit the screen, with the Boot -> Title -> Game -> End scenes.
// Notes   : Uncaught errors are logged through Log.error so `dev.py smoke` sees them.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Log } from "./core/log";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { GameScene } from "./game/scenes/GameScene";
import { EndScene } from "./game/scenes/EndScene";
import { H, W } from "./game/theme";

window.addEventListener("error", (e) => Log.error("core", `uncaught: ${e.message}`));
window.addEventListener("unhandledrejection", (e) => Log.error("core", `unhandled promise: ${String(e.reason)}`));

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#08060e",
  pixelArt: true,
  roundPixels: true,
  input: { activePointers: 3 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, GameScene, EndScene],
});
