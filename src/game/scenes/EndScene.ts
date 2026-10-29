// ---------------------------------------------------------------------------
// EndScene.ts
// Purpose : Ending screen with the vertical share card (title, pixel icon, users,
//           time, loans, 5 checkpoint pips, epitaph, company, logo), a "save card"
//           button (PNG, upscaled crisp) and Play again.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { endingById, termById } from "../../core/data";
import { clock, short } from "../../core/format";
import { Log } from "../../core/log";
import { Sfx } from "../audio";
import { C, H, W } from "../theme";
import { Button } from "../ui/button";
import { centerX, text, wrap } from "../ui/text";
import type { RunSummary } from "./GameScene";

const CARD = { x: 15, y: 14, w: 150, h: 238 };

export class EndScene extends Phaser.Scene {
  private sum!: RunSummary;
  constructor() {
    super("end");
  }

  init(data: RunSummary): void {
    this.sum = data;
  }

  create(): void {
    Sfx.bind(this);
    Sfx.stopMusic();
    const e = endingById(this.sum.ending);
    const mixed = ["burnout", "scandal", "acquired_big"].includes(e.id);
    Sfx.play(e.good && !mixed ? "end_good" : mixed ? "end_mixed" : "end_bad");
    this.cameras.main.fadeIn(500);
    this.add.image(0, 0, "sky_3").setOrigin(0, 0).setScale(1, H / 184);
    this.drawCard(e.id);
    new Button(this, 15, 262, { w: 70, h: 20, label: "SAVE CARD", face: C.blue }, () => this.saveCard());
    new Button(this, 95, 262, { w: 70, h: 20, label: "PLAY AGAIN", face: C.orange, edge: 0xa70813, sound: "launch" }, () => this.scene.start("title"));
    centerX(text(this, 0, 292, `CHOICES MADE: ${this.sum.choices.filter((c) => !c.endsWith("default")).length}  DEFAULTS: ${this.sum.choices.filter((c) => c.endsWith("default")).length}`, C.steel3), W / 2);
    Log.info("game", `END_SCREEN ${e.id}`);
  }

  private drawCard(id: string): void {
    const e = endingById(id);
    const { x, y, w, h } = CARD;
    const g = this.add.graphics();
    g.fillStyle(C.ink).fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(e.good ? C.gold : C.red).fillRect(x, y, w, h);
    g.fillStyle(C.indigo).fillRect(x + 3, y + 3, w - 6, h - 6);
    g.fillStyle(C.night).fillRect(x + 3, y + 3, w - 6, 18);
    centerX(text(this, 0, y + 8, "LAUNCH WEEK", C.orange), W / 2);
    this.add.image(W / 2, y + 48, "ui", e.icon).setScale(2).setOrigin(0.5);
    centerX(text(this, 0, y + 84, e.title, e.good ? C.gold2 : C.red2, e.title.length > 14 ? 1 : 2), W / 2);
    const stats: [string, string][] = [
      ["USERS", short(this.sum.users)],
      ["TIME", clock(this.sum.time)],
      ["LOANS", `${this.sum.loans}`],
    ];
    stats.forEach(([k, v], i) => {
      const cx = x + 25 + i * 50;
      centerX(text(this, 0, y + 102, k, C.steel3), cx);
      centerX(text(this, 0, y + 110, v, C.white, 2), cx);
    });
    centerX(text(this, 0, y + 130, "FUNDING ROUNDS", C.steel3), W / 2);
    const pg = this.add.graphics();
    for (let i = 0; i < 5; i++) {
      const r = this.sum.results[i];
      const px = W / 2 - 34 + i * 15;
      pg.fillStyle(C.ink).fillRect(px - 1, y + 139, 10, 10);
      pg.fillStyle(r === "pass" ? C.green2 : r === "miss" ? C.red : C.steel).fillRect(px, y + 140, 8, 8);
    }
    const ep = text(this, 0, y + 158, wrap(`"${e.epitaph}"`, w - 20), C.cream).setLineSpacing(2).setCenterAlign();
    centerX(ep, W / 2);
    const investors = this.sum.terms.map((t) => termById(t).name).join(", ");
    if (investors) centerX(text(this, 0, y + 186, wrap(`BACKED BY ${investors}`, w - 20), C.steel3).setLineSpacing(2).setCenterAlign(), W / 2);
    centerX(text(this, 0, y + h - 22, this.sum.company, C.white, 1), W / 2);
    this.add.image(W / 2, y + h - 10, "ui", "ic_users").setOrigin(0.5);
  }

  private saveCard(): void {
    const { x, y, w, h } = CARD;
    const scale = this.game.canvas.width / W;
    this.game.renderer.snapshotArea(Math.round((x - 1) * scale), Math.round((y - 1) * scale), Math.round((w + 2) * scale), Math.round((h + 2) * scale), (img) => {
      try {
        const src = img as HTMLImageElement;
        const up = 6 / scale;
        const cv = document.createElement("canvas");
        cv.width = Math.round(src.width * up);
        cv.height = Math.round(src.height * up);
        const ctx = cv.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(src, 0, 0, cv.width, cv.height);
        cv.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "launch-week.png", { type: "image/png" });
          const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
          if (nav.canShare?.({ files: [file] })) {
            await nav.share({ files: [file], title: "Launch Week" }).catch(() => undefined);
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "launch-week.png";
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });
      } catch (err) {
        Log.warn("end", `could not save card: ${String(err)}`);
      }
    });
  }
}
