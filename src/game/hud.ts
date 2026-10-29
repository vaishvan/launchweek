// ---------------------------------------------------------------------------
// hud.ts
// Purpose : Top HUD (Users, Cash, Sentiment, clock), the funding-round bar, and
//           the tap-to-expand detail panel (Reach, Morale, loans, terms).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { CHECKPOINTS, termById } from "../core/data";
import { clock, money, short } from "../core/format";
import type { Sim } from "../core/sim";
import { Sfx } from "./audio";
import { C, L, W } from "./theme";
import { text } from "./ui/text";
import { Button } from "./ui/button";

export class Hud {
  private users: Phaser.GameObjects.BitmapText;
  private ups: Phaser.GameObjects.BitmapText;
  private cash: Phaser.GameObjects.BitmapText;
  private cps: Phaser.GameObjects.BitmapText;
  private sent: Phaser.GameObjects.BitmapText;
  private clockT: Phaser.GameObjects.BitmapText;
  private cpText: Phaser.GameObjects.BitmapText;
  private cpBar: Phaser.GameObjects.Graphics;
  private detail: Phaser.GameObjects.Container;
  private detailText: Phaser.GameObjects.BitmapText;
  private arrow: Phaser.GameObjects.BitmapText;
  open = false;
  onPause: (() => void) | null = null;

  constructor(scene: Phaser.Scene, private sim: Sim) {
    const d = 10;
    const bg = scene.add.graphics().setDepth(d);
    bg.fillStyle(C.ink).fillRect(0, 0, W, L.officeTop);
    bg.fillStyle(C.indigo).fillRect(0, 0, W, L.hudH);
    bg.fillStyle(C.indigo2).fillRect(0, L.hudH - 1, W, 1);
    scene.add.image(3, 3, "ui", "ic_users").setOrigin(0, 0).setDepth(d);
    this.users = text(scene, 14, 2, "0", C.white, 2).setDepth(d);
    this.ups = text(scene, 14, 14, "", C.green2).setDepth(d);
    scene.add.image(86, 3, "ui", "ic_cash").setOrigin(0, 0).setDepth(d);
    this.cash = text(scene, 97, 5, "", C.gold2).setDepth(d);
    this.cps = text(scene, 97, 14, "", C.gold2).setDepth(d);
    scene.add.image(138, 3, "ui", "ic_sent").setOrigin(0, 0).setDepth(d);
    this.sent = text(scene, 149, 5, "", C.white).setDepth(d);
    this.clockT = text(scene, 149, 14, "0:00", C.steel3).setDepth(d);
    this.arrow = text(scene, W - 6, 14, "+", C.steel3).setDepth(d);
    this.cpText = text(scene, 3, L.cpBarY + 1, "", C.cream).setDepth(d);
    this.cpBar = scene.add.graphics().setDepth(d);

    // detail panel
    this.detail = scene.add.container(0, L.hudH).setDepth(25).setVisible(false);
    const pg = scene.add.graphics();
    pg.fillStyle(C.ink).fillRect(0, 0, W, 72);
    pg.fillStyle(C.indigo).fillRect(1, 0, W - 2, 71);
    this.detailText = text(scene, 6, 4, "", C.white).setLineSpacing(2);
    this.detail.add([pg, this.detailText]);
    const pause = new Button(scene, 6, 56, { w: 50, h: 12, label: "PAUSE", face: C.steel2 }, () => this.onPause?.());
    const music = new Button(scene, 62, 56, { w: 56, h: 12, label: Sfx.musicOn ? "MUSIC ON" : "MUSIC OFF", face: C.steel }, () => music.setLabel(Sfx.toggleMusic() ? "MUSIC ON" : "MUSIC OFF"));
    const sfx = new Button(scene, 124, 56, { w: 50, h: 12, label: Sfx.sfxOn ? "SFX ON" : "SFX OFF", face: C.steel }, () => sfx.setLabel(Sfx.toggleSfx() ? "SFX ON" : "SFX OFF"));
    this.detail.add([pause, music, sfx]);

    const zone = scene.add.zone(0, 0, W, L.officeTop).setOrigin(0, 0).setInteractive().setDepth(d);
    zone.on("pointerup", () => this.toggle());
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.detail.setVisible(this.open);
    this.arrow.setText(this.open ? "-" : "+");
    Sfx.play(this.open ? "open" : "close");
  }

  update(): void {
    const s = this.sim.s;
    const sim = this.sim;
    this.users.setText(short(s.users));
    this.ups.setText(`+${short(sim.usersPerSec())}/S`);
    this.cash.setText(money(s.cash));
    const net = sim.income() - sim.salary();
    this.cps.setText(`${net >= 0 ? "+" : ""}${money(net)}/S`).setTint(net >= 0 ? C.gold2 : C.red2);
    this.sent.setText(`${s.sentiment.toFixed(2)}X`).setTint(s.sentiment >= 1 ? C.green2 : s.sentiment >= 0.8 ? C.gold2 : C.red2);
    this.clockT.setText(clock(s.t));

    const cp = CHECKPOINTS[s.cpIndex];
    this.cpBar.clear();
    if (cp) {
      const target = sim.currentTarget();
      const left = Math.max(0, cp.deadline - s.t);
      this.cpText.setText(`${cp.name}: ${short(target)} USERS IN ${clock(left)}`).setTint(left < 30 ? C.red2 : C.cream);
      const p = Math.min(1, s.users / target);
      this.cpBar.fillStyle(C.indigo).fillRect(3, L.cpBarY + 8, W - 6, 2);
      this.cpBar.fillStyle(p >= 1 ? C.green2 : C.orange).fillRect(3, L.cpBarY + 8, Math.round((W - 6) * p), 2);
    } else this.cpText.setText("");

    if (this.open) {
      const reach = Math.round((sim.reachBuff() - 1) * 100);
      const terms = s.terms.map((t) => termById(t).name).join(", ") || "NONE YET";
      this.detailText.setText(
        [
          `HYPE (REACH): ${reach >= 0 ? "+" : ""}${reach}%`,
          `MORALE: ${Math.round(s.morale)}%  (TEAM X${sim.moraleMult().toFixed(2)})`,
          `PAYROLL: ${money(sim.salary())}/S  INCOME: ${money(sim.income())}/S`,
          `LOANS: ${s.loans}/3${s.debt > 0 ? `  DEBT ${money(s.debt)}` : ""}${s.loanPenalty ? "  OUTPUT -15%" : ""}`,
          `ACT ${s.act}  TERMS: ${terms}`,
        ].join("\n"),
      );
      this.detailText.setMaxWidth(W - 12);
    }
  }
}
