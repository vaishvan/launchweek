// ---------------------------------------------------------------------------
// button.ts
// Purpose : A flat pixel button (code-drawn rectangle + bitmap label) with a
//           pressed state, a disabled state and a click sound.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { C } from "../theme";
import { text } from "./text";
import { Sfx } from "../audio";

export interface ButtonOpts {
  w: number;
  h: number;
  label: string;
  face?: number;
  edge?: number;
  textColor?: number;
  scale?: number;
  sound?: string;
}

export class Button extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.BitmapText;
  enabled = true;
  private down = false;
  private hit: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, x: number, y: number, readonly o: ButtonOpts, onClick: () => void) {
    super(scene, x, y);
    this.g = scene.add.graphics();
    this.label = text(scene, 0, 0, o.label, o.textColor ?? C.white, o.scale ?? 1);
    this.add([this.g, this.label]);
    // Hit area: a zone child with a top-left origin. (A Container's own hit area is
    // centred on its position, which shifted every button's tap target up and left.)
    this.hit = scene.add.zone(0, 0, o.w, o.h).setOrigin(0, 0).setInteractive();
    this.add(this.hit);
    this.hit.on("pointerdown", () => {
      if (!this.enabled) return;
      this.down = true;
      this.draw();
    });
    this.hit.on("pointerout", () => {
      this.down = false;
      this.draw();
    });
    this.hit.on("pointerup", () => {
      if (!this.down) return;
      this.down = false;
      this.draw();
      if (!this.enabled) return;
      Sfx.play(o.sound ?? "click");
      onClick();
    });
    this.draw();
    scene.add.existing(this);
  }

  setLabel(s: string): this {
    this.label.setText(s.toUpperCase());
    this.draw();
    return this;
  }

  setEnabled(on: boolean): this {
    if (this.enabled !== on) {
      this.enabled = on;
      this.draw();
    }
    return this;
  }

  draw(): void {
    const { w, h } = this.o;
    const face = this.enabled ? (this.o.face ?? C.blue) : C.steel;
    const edge = this.enabled ? (this.o.edge ?? C.indigo) : C.indigo;
    const dy = this.down ? 1 : 0;
    this.g.clear();
    this.g.fillStyle(C.ink).fillRect(0, 0, w, h);
    this.g.fillStyle(edge).fillRect(1, 1, w - 2, h - 2);
    this.g.fillStyle(face).fillRect(1, 1 + dy, w - 2, h - 3);
    this.label.setTint(this.enabled ? (this.o.textColor ?? C.white) : C.steel3);
    this.label.x = Math.round((w - this.label.width) / 2);
    this.label.y = Math.round((h - 1 - this.label.height) / 2) + dy;
  }
}
