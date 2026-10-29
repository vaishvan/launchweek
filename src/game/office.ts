// ---------------------------------------------------------------------------
// office.ts
// Purpose : The office cross-section: sky per act, three stacked floors (built as
//           acts unlock, scaffolding before that), desks, and one animated sprite
//           per staff member in hire order.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { C, L, W } from "./theme";
import { text } from "./ui/text";

const DESKS_PER_FLOOR = 5;
const deskX = (j: number) => L.floorX + 8 + j * 30;
const floorY = (i: number) => L.officeTop + (2 - i) * L.floorH;

export class OfficeView {
  private sky: Phaser.GameObjects.Image;
  private floors: Phaser.GameObjects.Image[] = [];
  private roof: Phaser.GameObjects.Image;
  private people: Phaser.GameObjects.Sprite[] = [];
  private staff: string[] = ["lead"];
  private overflow: Phaser.GameObjects.BitmapText;
  private builtFloors = 1;
  private burnout = false;

  constructor(private scene: Phaser.Scene) {
    this.sky = scene.add.image(0, L.officeTop - 8, "sky_1").setOrigin(0, 0);
    scene.add.image(0, L.officeBottom - 40, "office", "city").setOrigin(0, 0);
    for (let i = 0; i < 3; i++) {
      this.floors.push(scene.add.image(L.floorX, floorY(i), "office", i === 0 ? "floor_1" : "scaffold").setOrigin(0, 0));
    }
    this.roof = scene.add.image(0, floorY(0) - 12, "office", "roof").setOrigin(0, 0);
    scene.add.sprite(L.floorX + 164, floorY(0) + 39, "office", "steam_0").play("steam");
    this.overflow = text(scene, 150, floorY(0) + 6, "", C.white).setDepth(5);
    this.layout();
  }

  setAct(act: number, animate: boolean): void {
    this.sky.setTexture(`sky_${Math.min(3, act)}`);
    while (this.builtFloors < act && this.builtFloors < 3) {
      const i = this.builtFloors++;
      const f = this.floors[i];
      f.setFrame(`floor_${i + 1}`);
      if (animate) {
        f.setAlpha(0);
        this.scene.tweens.add({ targets: f, alpha: 1, duration: 700 });
        this.scene.cameras.main.shake(300, 0.004);
      }
    }
    this.roof.y = floorY(this.builtFloors - 1) - 12;
    this.layout();
  }

  addStaff(role: string): void {
    this.staff.push(role);
    this.layout();
    const p = this.people[this.staff.length - 1];
    if (p) {
      p.setScale(1, 0.2);
      this.scene.tweens.add({ targets: p, scaleY: 1, duration: 250, ease: "Back.Out" });
    }
  }

  /** Everyone throws their arms up for a moment. */
  celebrate(ms = 900): void {
    for (const p of this.people) {
      const role = p.getData("role") as string;
      p.stop().setFrame(`p_${role}_2`);
    }
    this.scene.time.delayedCall(ms, () => this.resume());
  }

  setBurnout(on: boolean): void {
    if (on === this.burnout) return;
    this.burnout = on;
    this.resume();
  }

  private resume(): void {
    for (const p of this.people) {
      const role = p.getData("role") as string;
      if (this.burnout && role !== "lead") p.stop().setFrame(`p_${role}_3`);
      else p.play({ key: `type_${role}`, startFrame: Math.floor(Math.random() * 2) });
    }
  }

  private layout(): void {
    const slots = this.builtFloors * DESKS_PER_FLOOR;
    // desks for built floors
    while (this.people.length < Math.min(slots, this.staff.length)) {
      const k = this.people.length;
      const floor = Math.floor(k / DESKS_PER_FLOOR);
      const j = k % DESKS_PER_FLOOR;
      const role = this.staff[k];
      const y = floorY(floor);
      const s = this.scene.add.sprite(deskX(j) + 5, y + 24, "people", `p_${role}_0`).setOrigin(0, 0).setData("role", role);
      s.play({ key: `type_${role}`, startFrame: k % 2 });
      this.scene.add.image(deskX(j), y + 40, "office", "desk").setOrigin(0, 0);
      this.people.push(s);
    }
    const extra = this.staff.length - this.people.length;
    this.overflow.setText(extra > 0 ? `+${extra} REMOTE` : "");
    this.overflow.y = floorY(this.builtFloors - 1) + 6;
    this.overflow.x = W - 8 - this.overflow.width;
  }
}
