// ---------------------------------------------------------------------------
// panels.ts
// Purpose : Bottom tab bar (Team / Channels / Upgrades) and the list panels that
//           slide over the office. Rows show level, output and a buy button.
// Notes   : While a panel is open sim.panelOpen is true, so crisis cards wait
//           (the doc's "no unfair interrupts" rule).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { CHANNELS, ROLES, TUNING as T, UPGRADES } from "../core/data";
import { money, short } from "../core/format";
import type { Sim } from "../core/sim";
import { Sfx } from "./audio";
import { C, L, W } from "./theme";
import { Button } from "./ui/button";
import { text } from "./ui/text";

type Tab = "team" | "channels" | "upgrades";

interface Row {
  update(): void;
}

const ROW_H = 30;
const TOP = L.panelTop + 16;

export class Panels {
  private tabs: Record<Tab, Button>;
  private badges: Record<Tab, Phaser.GameObjects.Graphics>;
  private panel: Phaser.GameObjects.Container | null = null;
  private rows: Row[] = [];
  current: Tab | null = null;
  onBuy: ((kind: "hire" | "channel" | "upgrade", id: string) => void) | null = null;

  constructor(private scene: Phaser.Scene, private sim: Sim) {
    const bg = scene.add.graphics().setDepth(10);
    bg.fillStyle(C.ink).fillRect(0, L.tabsY, W, 320 - L.tabsY);
    const mk = (tab: Tab, x: number, label: string, icon: string) => {
      const b = new Button(scene, x, L.tabsY + 2, { w: 58, h: 20, label: "", face: C.steel, edge: C.indigo, sound: "tab" }, () => this.toggle(tab));
      b.setDepth(11);
      const ic = scene.add.image(5, 5, "ui", icon).setOrigin(0, 0);
      const lb = text(scene, 17, 7, label, C.white);
      b.add([ic, lb]);
      return b;
    };
    this.tabs = { team: mk("team", 2, "TEAM", "ic_team"), channels: mk("channels", 61, "CHANNELS", "ic_channels"), upgrades: mk("upgrades", 120, "UPGRADES", "ic_upgrades") };
    this.badges = {} as Record<Tab, Phaser.GameObjects.Graphics>;
    for (const t of Object.keys(this.tabs) as Tab[]) {
      const g = scene.add.graphics().setDepth(12);
      g.fillStyle(C.ink).fillRect(0, 0, 5, 5);
      g.fillStyle(C.green2).fillRect(1, 1, 3, 3);
      g.setPosition(this.tabs[t].x + 51, L.tabsY + 3).setVisible(false);
      this.badges[t] = g;
    }
  }

  toggle(tab: Tab | null): void {
    this.panel?.destroy();
    this.panel = null;
    this.rows = [];
    if (!tab || this.current === tab) {
      this.current = null;
      this.sim.panelOpen = false;
      this.highlight();
      return;
    }
    this.current = tab;
    this.sim.panelOpen = true;
    this.build(tab);
    this.highlight();
    Sfx.play("open");
  }

  private highlight(): void {
    for (const t of Object.keys(this.tabs) as Tab[]) {
      const b = this.tabs[t];
      b.o.face = t === this.current ? C.blue : C.steel;
      b.draw();
    }
  }

  private build(tab: Tab): void {
    const s = this.scene;
    const c = s.add.container(0, 0).setDepth(20);
    const g = s.add.graphics();
    g.fillStyle(C.ink).fillRect(0, L.panelTop, W, L.panelBottom - L.panelTop);
    g.fillStyle(C.indigo).fillRect(1, L.panelTop + 1, W - 2, L.panelBottom - L.panelTop - 2);
    c.add(g);
    const title = { team: "TEAM: HIRE UP TO 5 OF EACH", channels: "CHANNELS: LEVEL UP TO 8", upgrades: "UPGRADES: SHIP BETTER CONTENT" }[tab];
    c.add(text(s, 5, L.panelTop + 5, title, C.gold2));
    const close = new Button(s, W - 16, L.panelTop + 3, { w: 12, h: 10, label: "X", face: C.red }, () => this.toggle(null));
    c.add(close);
    if (tab === "team") ROLES.forEach((r, i) => this.rows.push(this.teamRow(c, r.id, i)));
    if (tab === "channels") CHANNELS.forEach((ch, i) => this.rows.push(this.channelRow(c, ch.id, i, ROW_H - 4)));
    if (tab === "upgrades") UPGRADES.forEach((u, i) => this.rows.push(this.upgradeRow(c, u.id, i)));
    this.panel = c;
    this.update();
  }

  private rowBase(c: Phaser.GameObjects.Container, i: number, h = ROW_H): number {
    const y = TOP + i * h;
    const g = this.scene.add.graphics();
    g.fillStyle(i % 2 ? C.indigo : C.night, i % 2 ? 1 : 0.35).fillRect(3, y, W - 6, h - 2);
    c.add(g);
    return y;
  }

  private teamRow(c: Phaser.GameObjects.Container, id: string, i: number): Row {
    const s = this.scene;
    const r = ROLES.find((x) => x.id === id)!;
    const y = this.rowBase(c, i);
    c.add(s.add.image(5, y + 5, "people", `p_${id}_0`).setOrigin(0, 0));
    const name = text(s, 25, y + 3, r.name, C.white);
    const info = text(s, 25, y + 11, "", C.green2);
    const boost = text(s, 25, y + 19, `BOOSTS ${r.boosts.map((b) => CHANNELS.find((x) => x.id === b)!.name).join(", ")}`, C.steel3);
    const btn = new Button(s, W - 48, y + 5, { w: 44, h: 16, label: "", face: C.green, edge: 0x1f4f39, sound: "hire" }, () => {
      if (this.sim.hire(id)) this.onBuy?.("hire", id);
      else Sfx.play("cant_afford");
    });
    c.add([name, info, boost, btn]);
    return {
      update: () => {
        const n = this.sim.s.hires[id];
        const maxed = n >= T.hires.maxCopies;
        info.setText(`${n}/${T.hires.maxCopies}  +${r.output}/S  PAY $${r.salary}/S`);
        btn.setLabel(maxed ? "MAX" : money(this.sim.hireCost(id))).setEnabled(!maxed && this.sim.canHire(id));
      },
    };
  }

  private channelRow(c: Phaser.GameObjects.Container, id: string, i: number, h: number): Row {
    const s = this.scene;
    const ch = CHANNELS.find((x) => x.id === id)!;
    const y = this.rowBase(c, i, h);
    const icon = s.add.image(6, y + 7, "ui", `ch_${id}`).setOrigin(0, 0);
    const name = text(s, 20, y + 3, ch.name, C.white);
    const info = text(s, 20, y + 11, "", C.green2);
    const btn = new Button(s, W - 48, y + 4, { w: 44, h: 16, label: "", face: C.blue, edge: 0x111375, sound: "buy" }, () => {
      if (this.sim.buyChannel(id)) this.onBuy?.("channel", id);
      else Sfx.play("cant_afford");
    });
    c.add([icon, name, info, btn]);
    const riskText: Record<string, string> = { spiky: "SPIKY", low: "LOW RISK", seo: "SLOW, +SENT", safe: "SAFE", medium: "x SENTIMENT", bursty: "RANDOM BURSTS", ads: "FAST, -SENT", events: "PARTNER EVENTS" };
    return {
      update: () => {
        const lvl = this.sim.s.channels[id];
        const unlocked = this.sim.channelUnlocked(id);
        icon.setFrame(unlocked ? `ch_${id}` : "ic_lock");
        if (!unlocked) {
          info.setText(ch.unlockAct ? `UNLOCKS IN ACT ${ch.unlockAct}` : `UNLOCKS AT ${short(ch.unlockUsers)} USERS`).setTint(C.steel3);
          btn.setLabel("LOCKED").setEnabled(false);
          return;
        }
        const out = this.sim.channelOutput(id);
        info.setText(`LV ${lvl}/${T.channels.maxLevel}  ${lvl ? `+${short(out)}/S  ` : ""}${riskText[ch.risk] ?? ""}`).setTint(C.green2);
        const maxed = lvl >= T.channels.maxLevel;
        btn.setLabel(maxed ? "MAX" : money(this.sim.channelCost(id))).setEnabled(!maxed && this.sim.canBuyChannel(id));
      },
    };
  }

  private upgradeRow(c: Phaser.GameObjects.Container, id: string, i: number): Row {
    const s = this.scene;
    const u = UPGRADES.find((x) => x.id === id)!;
    const y = this.rowBase(c, i, 40);
    c.add(s.add.image(6, y + 8, "ui", `up_${id}`).setOrigin(0, 0));
    const name = text(s, 20, y + 4, u.name, C.white);
    const desc = [u.tapAdd ? `TAP +${u.tapAdd}` : "", u.comboFill ? "COMBO FILLS FASTER" : "", u.launchMult ? "LAUNCH MOMENTS LAST 2X" : "", u.miniLaunchEvery ? `EVERY ${u.miniLaunchEvery}TH TAP: MINI LAUNCH` : "", u.needs ? "NEEDS AN ENGINEER" : ""]
      .filter(Boolean).join(", ");
    const info = text(s, 20, y + 12, "", C.green2).setMaxWidth(104);
    info.setText(desc);
    const btn = new Button(s, W - 48, y + 6, { w: 44, h: 16, label: "", face: C.purple, edge: 0x36258a, sound: "upgrade" }, () => {
      if (this.sim.buyUpgrade(id)) this.onBuy?.("upgrade", id);
      else Sfx.play("cant_afford");
    });
    c.add([name, info, btn]);
    return {
      update: () => {
        const owned = !!this.sim.s.upgrades[id];
        btn.setLabel(owned ? "OWNED" : money(this.sim.upgradeCost(id))).setEnabled(!owned && this.sim.canBuyUpgrade(id));
      },
    };
  }

  update(): void {
    for (const r of this.rows) r.update();
    const sim = this.sim;
    this.badges.team.setVisible(ROLES.some((r) => sim.canHire(r.id)));
    this.badges.channels.setVisible(CHANNELS.some((c) => sim.canBuyChannel(c.id)));
    this.badges.upgrades.setVisible(UPGRADES.some((u) => sim.canBuyUpgrade(u.id)));
  }
}
