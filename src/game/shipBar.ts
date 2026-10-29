// ---------------------------------------------------------------------------
// shipBar.ts
// Purpose : The SHIP button, combo meter, floating "+N" numbers and the news
//           ticker (toasts and hints) between the office and the tabs.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { short } from "../core/format";
import type { Sim } from "../core/sim";
import { Sfx } from "./audio";
import { C, L, W } from "./theme";
import { centerX, text, wrap } from "./ui/text";

const BTN_X = (W - 76) / 2;

export class ShipBar {
  private btn: Phaser.GameObjects.Image;
  private combo: Phaser.GameObjects.Graphics;
  private tapInfo: Phaser.GameObjects.BitmapText;
  private hypeInfo: Phaser.GameObjects.BitmapText;
  private ticker: Phaser.GameObjects.BitmapText;
  private queue: { msg: string; color: number }[] = [];
  private tickerTime = 0;
  private tapIdx = 0;
  onTap: (() => void) | null = null;

  constructor(private scene: Phaser.Scene, private sim: Sim) {
    const d = 10;
    const bg = scene.add.graphics().setDepth(d);
    bg.fillStyle(C.ink).fillRect(0, L.officeBottom, W, L.tabsY - L.officeBottom);
    bg.fillStyle(C.indigo).fillRect(0, L.officeBottom + 1, W, L.tabsY - L.officeBottom - 1);
    bg.fillStyle(C.night).fillRect(4, L.tickerY, W - 8, L.tabsY - L.tickerY - 3);
    this.combo = scene.add.graphics().setDepth(d);
    this.btn = scene.add.image(BTN_X, L.shipY, "ui", "btn_ship").setOrigin(0, 0).setDepth(d).setInteractive();
    this.btn.on("pointerdown", (p: Phaser.Input.Pointer) => this.tap(p));
    this.btn.on("pointerup", () => this.btn.setFrame("btn_ship"));
    this.btn.on("pointerout", () => this.btn.setFrame("btn_ship"));
    this.tapInfo = text(scene, 4, L.shipY + 6, "", C.cream).setDepth(d);
    this.hypeInfo = text(scene, BTN_X + 80, L.shipY + 6, "", C.pink).setDepth(d);
    this.ticker = text(scene, 8, L.tickerY + 4, "", C.white).setDepth(d).setLineSpacing(2);
  }

  private tap(p: Phaser.Input.Pointer): void {
    const v = this.sim.tap();
    if (v <= 0) return;
    this.btn.setFrame("btn_ship_down");
    Sfx.play(["tap", "tap_2", "tap_3"][this.tapIdx++ % 3], { volume: 0.5 });
    this.floatText(`+${short(v)}`, p.x, L.shipY - 2, C.green2);
    this.onTap?.();
  }

  floatText(msg: string, x: number, y: number, color: number): void {
    const t = text(this.scene, x, y, msg, color).setDepth(40);
    t.x = Math.round(Phaser.Math.Clamp(x - t.width / 2 + Phaser.Math.Between(-6, 6), 2, W - t.width - 2));
    this.scene.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 800, ease: "Cubic.Out", onComplete: () => t.destroy() });
  }

  /** Queue a ticker message (shown for ~3 s each). */
  say(msg: string, color: number = C.white): void {
    if (this.queue.some((q) => q.msg === msg)) return;
    this.queue.push({ msg, color });
  }

  update(dt: number): void {
    const s = this.sim.s;
    // combo meter
    const g = this.combo;
    g.clear();
    g.fillStyle(C.ink).fillRect(8, L.comboY, W - 16, 6);
    g.fillStyle(C.indigo2).fillRect(9, L.comboY + 1, W - 18, 4);
    g.fillStyle(s.combo > 0.85 ? C.gold2 : C.orange).fillRect(9, L.comboY + 1, Math.round((W - 18) * s.combo), 4);
    const hype = Math.round((this.sim.reachBuff() - 1) * 100);
    this.btn.setFrame(this.btn.frame.name === "btn_ship_down" ? "btn_ship_down" : hype > 20 ? "btn_ship_hot" : "btn_ship");
    this.tapInfo.setText(`+${short(this.sim.tapValue())}\nPER TAP`);
    this.hypeInfo.setText(hype !== 0 ? `HYPE\n${hype > 0 ? "+" : ""}${hype}%` : "").setTint(hype >= 0 ? C.pink : C.red2);

    // ticker
    this.tickerTime -= dt;
    if (this.tickerTime <= 0 && this.queue.length) {
      const m = this.queue.shift()!;
      this.ticker.setText(wrap(m.msg, W - 16)).setTint(m.color).setAlpha(1);
      this.tickerTime = 3.2;
    } else if (this.tickerTime <= 0 && this.ticker.alpha > 0) {
      this.ticker.setAlpha(Math.max(0.35, this.ticker.alpha - dt));
    }
  }

  pulse(): void {
    this.scene.tweens.add({ targets: this.btn, y: L.shipY - 3, yoyo: true, duration: 120, repeat: 2 });
  }

  centerLabel(msg: string, color: number): Phaser.GameObjects.BitmapText {
    return centerX(text(this.scene, 0, L.officeTop + 70, msg, color, 2).setDepth(40), W / 2);
  }
}
