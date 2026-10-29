// ---------------------------------------------------------------------------
// BootScene.ts
// Purpose : Load every asset (pxl atlases, skies, bitmap font, chirp audio),
//           build the shared animations, then hand over to the title (or straight
//           to the game for ?autoplay runs).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Log } from "../../core/log";
import { MUSIC_KEYS, SFX_KEYS, Sfx } from "../audio";
import { C, H, W } from "../theme";
import { options } from "../options";

export const ROLE_IDS = ["lead", "marketer", "community", "seo", "designer", "analyst", "engineer"];

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    const g = this.add.graphics();
    this.load.on("progress", (p: number) => {
      g.clear();
      g.fillStyle(C.indigo).fillRect(40, H / 2 - 3, W - 80, 6);
      g.fillStyle(C.orange).fillRect(41, H / 2 - 2, (W - 82) * p, 4);
    });
    this.load.on("loaderror", (f: Phaser.Loader.File) => Log.error("boot", `failed to load ${f.key} (${f.src})`));

    this.load.atlas("people", "assets/art/people.png", "assets/art/people.json");
    this.load.atlas("office", "assets/art/office.png", "assets/art/office.json");
    this.load.atlas("ui", "assets/art/ui.png", "assets/art/ui.json");
    for (const n of [1, 2, 3]) this.load.image(`sky_${n}`, `assets/art/scenes/sky_${n}.png`);
    this.load.bitmapFont("px", "assets/art/sprites/font.png", "assets/art/font.xml");
    if (!options.silent) {
      for (const k of [...SFX_KEYS, ...MUSIC_KEYS]) this.load.audio(k, [`assets/audio/${k}.ogg`, `assets/audio/${k}.mp3`]);
    }
  }

  create(): void {
    for (const id of ROLE_IDS) {
      this.anims.create({ key: `type_${id}`, frames: [0, 1].map((i) => ({ key: "people", frame: `p_${id}_${i}` })), frameRate: 5, repeat: -1 });
    }
    this.anims.create({ key: "steam", frames: [0, 1].map((i) => ({ key: "office", frame: `steam_${i}` })), frameRate: 3, repeat: -1 });
    this.anims.create({ key: "server_fire", frames: [0, 1, 2, 3].map((i) => ({ key: "people", frame: `por_server_${i}` })), frameRate: 8, repeat: -1 });
    Sfx.silent = options.silent;
    Log.info("core", "BOOT_OK Launch Week");
    this.scene.start(options.autoplay ? "game" : "title");
  }
}
