// ---------------------------------------------------------------------------
// overlays.ts
// Purpose : Modal screens over the office: crisis cards (with countdown and
//           effect hints), the funding review + investor term pick, and the
//           bridge-loan card.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { CHECKPOINTS, TUNING as T, cardById, termById, type Effects } from "../core/data";
import { money, short } from "../core/format";
import type { Sim } from "../core/sim";
import { Sfx } from "./audio";
import { Log } from "../core/log";
import { C, H, W } from "./theme";
import { Button } from "./ui/button";
import { centerX, text, wrap } from "./ui/text";

/** Short coloured hints for what an option does: [label, good?]. */
export function hints(fx: Effects, cost = 0): [string, boolean][] {
  const out: [string, boolean][] = [];
  const n = (v: number) => (v > 0 ? `+${short(v)}` : `-${short(-v)}`);
  if (cost) out.push([`-$${short(cost)}`, false]);
  if (fx.users) out.push([`USERS${n(fx.users)}`, fx.users > 0]);
  if (fx.usersPct) out.push([`USERS${fx.usersPct}%`, fx.usersPct > 0]);
  if (fx.cash) out.push([`$${n(fx.cash * T.economy.cardCashScale)}`, fx.cash > 0]);
  if (fx.R) out.push([`HYPE${n(fx.R)}`, fx.R > 0]);
  if (fx.S) out.push([`SENT${n(fx.S)}`, fx.S > 0]);
  if (fx.M) out.push([`MORALE${n(fx.M)}`, fx.M > 0]);
  if (fx.temp) out.push([`${fx.temp.stat.toUpperCase()} X${fx.temp.mult} ${fx.temp.sec}S`, fx.temp.mult > 1]);
  if (fx.perm) out.push([`INCOME X${fx.perm.mult} FOREVER`, false]);
  if (fx.roll) out.push([fx.roll.chance === "sentiment" ? "GAMBLE (SENTIMENT)" : "COIN FLIP", true]);
  if (fx.ending) out.push(["ENDS THE RUN", true]);
  if (!out.length) out.push(["NO CHANGE", true]);
  return out;
}

function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, face: number = C.indigo): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(C.ink, 0.7).fillRect(0, 0, W, H);
  g.fillStyle(C.ink).fillRect(x, y, w, h);
  g.fillStyle(C.indigo2).fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(face).fillRect(x + 2, y + 2, w - 4, h - 4);
  return g;
}

/** Puts coloured hint chips in a row, wrapping inside maxW. */
function chips(scene: Phaser.Scene, c: Phaser.GameObjects.Container, x: number, y: number, maxW: number, items: [string, boolean][]): number {
  let cx = x;
  let cy = y;
  for (const [label, good] of items) {
    const t = text(scene, 0, 0, label, good ? C.green2 : C.red2);
    if (cx + t.width > x + maxW) {
      cx = x;
      cy += 7;
    }
    t.setPosition(cx, cy);
    c.add(t);
    cx += t.width + 5;
  }
  return cy + 7 - y;
}

export class CardView {
  private c: Phaser.GameObjects.Container | null = null;
  private timer: Phaser.GameObjects.Graphics | null = null;
  private lastTick = 99;
  shownId: string | null = null;
  onChoose: ((i: number) => void) | null = null;

  constructor(private scene: Phaser.Scene, private sim: Sim) {}

  show(): void {
    this.hide();
    const card = this.sim.s.card;
    if (!card) return;
    const def = cardById(card.id);
    const s = this.scene;
    const c = s.add.container(0, 0).setDepth(30);
    const x = 8, y = 38, w = W - 16;
    const bodyText = wrap(card.body, w - 16);
    const bodyLines = bodyText.split("\n").length;
    const optY = y + 52 + bodyLines * 7 + 10;
    const h = optY - y + def.options.length * 32 + 6;
    c.add(panel(s, x, y, w, h, def.severity >= 3 ? 0x3a1030 : C.indigo));
    if (def.portrait === "server") c.add(s.add.sprite(x + 6, y + 6, "people", "por_server_0").setOrigin(0, 0).play("server_fire"));
    else c.add(s.add.image(x + 6, y + 6, "people", `por_${def.portrait}`).setOrigin(0, 0));
    c.add(text(s, x + 44, y + 8, `ACT ${def.act}${card.doubled ? "  DOUBLED!" : ""}`, card.doubled ? C.red2 : C.steel3));
    c.add(text(s, x + 44, y + 17, wrap(card.title, w - 50, 1), C.gold2).setLineSpacing(2));
    c.add(text(s, x + 8, y + 44, bodyText, C.white).setLineSpacing(2));
    this.timer = s.add.graphics();
    c.add(this.timer);
    def.options.forEach((o, i) => {
      const by = optY + i * 32;
      const affordable = this.sim.optionAffordable(i);
      const b = new Button(s, x + 6, by, { w: w - 12, h: 29, label: "", face: affordable ? C.steel : C.indigo, edge: C.night, sound: "select" }, () => this.onChoose?.(i));
      b.setEnabled(affordable);
      b.add(text(s, 5, 4, o.label + (affordable ? "" : " (CAN'T AFFORD)"), affordable ? C.white : C.steel3));
      chips(s, b, 5, 13, w - 22, hints(o.effects, o.cost));
      c.add(b);
    });
    c.setAlpha(0);
    c.y = 12;
    s.tweens.add({ targets: c, alpha: 1, y: 0, duration: 180, ease: "Cubic.Out", onComplete: () => Log.info("game", `CARD_SHOWN ${card.id}`) });
    this.c = c;
    this.shownId = card.id;
    this.lastTick = 99;
    Sfx.play("card_in");
  }

  hide(): void {
    this.c?.destroy();
    this.c = null;
    this.timer = null;
    this.shownId = null;
  }

  update(): void {
    const card = this.sim.s.card;
    if (!card || !this.timer || !this.c) return;
    const p = Math.max(0, card.timeLeft / T.cards.timerSec);
    const g = this.timer;
    g.clear();
    const x = 14, y = 38 + 36 + 0, w = W - 28;
    g.fillStyle(C.ink).fillRect(x + 36, y - 4, w - 40, 4);
    g.fillStyle(p < 0.33 ? C.red : C.gold).fillRect(x + 36, y - 4, Math.round((w - 40) * p), 4);
    const sec = Math.ceil(card.timeLeft);
    if (sec <= 5 && sec !== this.lastTick) {
      this.lastTick = sec;
      Sfx.play("tick");
    }
  }
}

export class ReviewView {
  private c: Phaser.GameObjects.Container | null = null;
  onPick: ((termId?: string) => void) | null = null;
  constructor(private scene: Phaser.Scene, private sim: Sim) {}

  show(): void {
    this.hide();
    const r = this.sim.s.review;
    if (!r) return;
    const s = this.scene;
    const st = this.sim.s;
    const cp = CHECKPOINTS[r.checkpoint];
    const c = s.add.container(0, 0).setDepth(30);
    const x = 8, y = 36, w = W - 16, h = 250;
    c.add(panel(s, x, y, w, h));
    c.add(centerX(text(s, 0, y + 8, `${cp.name} CLOSED!`, C.gold2, 2), W / 2));
    const lines = [
      [`USERS`, short(st.users)],
      [`SENTIMENT`, `${st.sentiment.toFixed(2)}X`],
      [`MORALE`, `${Math.round(st.morale)}%`],
      [`CASH IN`, `+${money(r.injection)}`],
      ...(r.debtPaid ? [[`LOAN REPAID`, `-${money(r.debtPaid)}`]] : []),
    ];
    lines.forEach(([k, v], i) => {
      c.add(text(s, x + 14, y + 28 + i * 8, k, C.steel3));
      c.add(text(s, x + 90, y + 28 + i * 8, v, k === "LOAN REPAID" ? C.red2 : C.white));
    });
    let ty = y + 34 + lines.length * 8;
    if (r.offer.length) {
      c.add(centerX(text(s, 0, ty, "PICK ONE INVESTOR. IT LASTS ALL RUN.", C.cream), W / 2));
      ty += 10;
      r.offer.forEach((id, i) => {
        const t = termById(id);
        const b = new Button(s, x + 6, ty + i * 40, { w: w - 12, h: 37, label: "", face: C.steel, edge: C.night, sound: "term_pick" }, () => this.onPick?.(id));
        b.add(s.add.image(4, 4, "ui", t.icon).setOrigin(0, 0));
        b.add(text(s, 24, 4, t.name, C.gold2));
        const perk = text(s, 24, 13, wrap(`+ ${t.perk}`, w - 40), C.green2).setLineSpacing(1);
        b.add(perk);
        b.add(text(s, 24, 13 + perk.height + 3, wrap(`- ${t.catch}`, w - 40), C.red2));
        c.add(b);
      });
    } else {
      c.add(new Button(s, x + 30, ty + 10, { w: w - 60, h: 20, label: "ONWARD", face: C.green }, () => this.onPick?.()));
    }
    this.c = c;
    Sfx.play("cp_pass");
    s.time.delayedCall(50, () => Log.info("game", `REVIEW_SHOWN ${cp.id}`));
  }

  hide(): void {
    this.c?.destroy();
    this.c = null;
  }
}

export class LoanView {
  private c: Phaser.GameObjects.Container | null = null;
  onAccept: (() => void) | null = null;
  onDecline: (() => void) | null = null;
  constructor(private scene: Phaser.Scene, private sim: Sim) {}

  show(): void {
    this.hide();
    const l = this.sim.s.loan;
    if (!l) return;
    const s = this.scene;
    const c = s.add.container(0, 0).setDepth(30);
    const x = 14, y = 70, w = W - 28, h = 150;
    c.add(panel(s, x, y, w, h, 0x3a1030));
    c.add(centerX(text(s, 0, y + 8, "BRIDGE LOAN", C.red2, 2), W / 2));
    const cp = CHECKPOINTS[l.checkpoint];
    const why = l.reason === "miss" ? `YOU MISSED THE ${cp?.name ?? ""} TARGET.` : l.reason === "cash" ? "THE BANK ACCOUNT HIT ZERO." : "NEED CASH NOW?";
    const body = wrap(`${why} AN INVESTOR WILL BRIDGE YOU. AT A PRICE.`, w - 16);
    c.add(text(s, x + 8, y + 28, body, C.white).setLineSpacing(2));
    const after = this.sim.s.loans + 1;
    const facts = [
      [`+${money(l.advance)} NOW`, true],
      [this.sim.mods().loanPenaltyFree ? "NO OUTPUT PENALTY (PATIENT CAPITAL)" : "OUTPUT -15% UNTIL THE NEXT ROUND", false],
      ["REPAID FROM THE NEXT ROUND", false],
      [`LOANS: ${after}/3${after >= 3 ? " (NEXT CRUNCH = SHUTDOWN)" : ""}`, after < 3],
    ] as const;
    facts.forEach(([t, good], i) => c.add(text(s, x + 8, y + 58 + i * 9, t, good ? C.green2 : C.red2).setMaxWidth(w - 16)));
    if (l.reason === "ask") {
      const bw = (w - 24) / 2;
      c.add(new Button(s, x + 8, y + h - 30, { w: bw, h: 20, label: "NO THANKS", face: C.steel2 }, () => this.onDecline?.()));
      c.add(new Button(s, x + 16 + bw, y + h - 30, { w: bw, h: 20, label: "TAKE IT", face: C.red, sound: "loan" }, () => this.onAccept?.()));
    } else {
      c.add(new Button(s, x + 20, y + h - 30, { w: w - 40, h: 20, label: "TAKE THE MONEY", face: C.red, sound: "loan" }, () => this.onAccept?.()));
    }
    this.c = c;
    Sfx.play(l.reason === "ask" ? "open" : "cp_miss");
  }

  hide(): void {
    this.c?.destroy();
    this.c = null;
  }
}
