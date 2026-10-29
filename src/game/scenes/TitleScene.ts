// ---------------------------------------------------------------------------
// TitleScene.ts
// Purpose : Title screen: logo, company name (re-rollable), sound toggles, then a
//           short intro card before the run starts.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { version } from "../../../package.json";
import { Sfx } from "../audio";
import { companyName } from "../names";
import { C, H, W } from "../theme";
import { Button } from "../ui/button";
import { centerX, text, wrap } from "../ui/text";

export class TitleScene extends Phaser.Scene {
  private company = companyName();

  constructor() {
    super("title");
  }

  create(): void {
    Sfx.bind(this);
    this.add.image(0, 0, "sky_3").setOrigin(0, 0).setScale(1, H / 184);
    this.add.image(0, H - 120, "office", "city").setOrigin(0, 0);
    this.add.rectangle(0, H - 80, W, 80, C.night).setOrigin(0, 0);
    // a lit building silhouette
    const g = this.add.graphics();
    g.fillStyle(C.indigo).fillRect(50, 150, 80, 90);
    for (let y = 156; y < 236; y += 8) for (let x = 56; x < 126; x += 8) if ((x * 7 + y * 3) % 5 !== 0) g.fillStyle((x + y) % 3 ? C.gold2 : C.sky).fillRect(x, y, 4, 4);
    g.fillStyle(C.steel).fillRect(88, 136, 2, 14);
    this.add.image(W / 2, 52, "ui", "logo").setOrigin(0.5);
    centerX(text(this, 0, 82, "1,000,000 USERS. 30 MINUTES.", C.cream), W / 2);
    centerX(text(this, 0, 90, "ONE BAD TWEET.", C.red2), W / 2);

    const nameLbl = centerX(text(this, 0, 106, `YOUR STARTUP: ${this.company}`, C.gold2), W / 2);
    new Button(this, 64, 116, { w: 52, h: 11, label: "RENAME", face: C.steel2 }, () => {
      this.company = companyName();
      centerX(nameLbl.setText(`YOUR STARTUP: ${this.company}`), W / 2);
    });

    const start = centerX(text(this, 0, 252, "TAP TO START", C.white, 2), W / 2);
    this.tweens.add({ targets: start, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
    const music = new Button(this, 6, H - 18, { w: 60, h: 12, label: Sfx.musicOn ? "MUSIC ON" : "MUSIC OFF", face: C.steel }, () => music.setLabel(Sfx.toggleMusic() ? "MUSIC ON" : "MUSIC OFF"));
    const sfx = new Button(this, 70, H - 18, { w: 52, h: 12, label: Sfx.sfxOn ? "SFX ON" : "SFX OFF", face: C.steel }, () => sfx.setLabel(Sfx.toggleSfx() ? "SFX ON" : "SFX OFF"));
    text(this, W - 26, H - 14, `V${version}`, C.steel2);

    const zone = this.add.zone(0, 130, W, 160).setOrigin(0, 0).setInteractive();
    zone.once("pointerup", () => {
      Sfx.playMusic("mus_title");
      this.intro();
    });
  }

  private intro(): void {
    const g = this.add.graphics();
    g.fillStyle(C.ink, 0.75).fillRect(0, 0, W, H);
    g.fillStyle(C.ink).fillRect(10, 70, W - 20, 150);
    g.fillStyle(C.indigo2).fillRect(11, 71, W - 22, 148);
    g.fillStyle(C.indigo).fillRect(12, 72, W - 24, 146);
    this.add.image(28, 92, "people", "p_lead_0").setScale(2);
    text(this, 46, 80, "DAY ONE", C.gold2, 2);
    text(this, 46, 94, "GROWTH LEAD", C.cream);
    const body = wrap(
      `You are the first growth hire at ${this.company}. Get to 1,000,000 users. Hire, open channels, ship content and survive the drama. Miss a funding round and you live on bridge loans.`,
      W - 40,
    );
    text(this, 18, 112, body, C.white).setLineSpacing(2);
    new Button(this, 40, 190, { w: W - 80, h: 20, label: "LET'S SHIP", face: C.orange, edge: 0xa70813, scale: 1, sound: "launch" }, () => {
      this.scene.start("game", { company: this.company });
    });
  }
}
