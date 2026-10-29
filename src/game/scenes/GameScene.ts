// ---------------------------------------------------------------------------
// GameScene.ts
// Purpose : The run. Owns the Sim, drives it every frame, and wires the views
//           (office, HUD, SHIP bar, tabs, modal overlays) to its state and events.
// Notes   : UI follows sim *state* for modals (card / review / loan), so a bot or
//           a human produce the same screens. ?autoplay runs log CHECKPOINT /
//           CARD / ENDING markers for `dev.py smoke --until`.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import * as Phaser from "phaser";
import { Bot } from "../../core/bot";
import { CHANNELS, CHECKPOINTS, ROLES, TUNING as T, UPGRADES, cardById } from "../../core/data";
import { Log } from "../../core/log";
import { Sim, type SimEvent } from "../../core/sim";
import { Sfx } from "../audio";
import { Hud } from "../hud";
import { OfficeView } from "../office";
import { options } from "../options";
import { CardView, LoanView, ReviewView } from "../overlays";
import { Panels } from "../panels";
import { ShipBar } from "../shipBar";
import { C, W } from "../theme";
import { centerX, text } from "../ui/text";
import { companyName } from "../names";

export interface RunSummary {
  ending: string;
  users: number;
  time: number;
  loans: number;
  results: ("pass" | "miss")[];
  company: string;
  terms: string[];
  choices: string[];
}

export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private bot: Bot | null = null;
  private office!: OfficeView;
  private hud!: Hud;
  private ship!: ShipBar;
  private panels!: Panels;
  private cardView!: CardView;
  private reviewView!: ReviewView;
  private loanView!: LoanView;
  private company = "";
  private uiTimer = 0;
  private hinted: Record<string, boolean> = {};
  private ending = false;
  private paused: Phaser.GameObjects.Container | null = null;

  constructor() {
    super("game");
  }

  init(data: { company?: string }): void {
    this.company = data.company ?? companyName();
    this.ending = false;
    this.hinted = {};
  }

  create(): void {
    Sfx.bind(this);
    this.sim = new Sim(options.seed);
    if (options.autoplay) this.bot = new Bot(options.autoplay, undefined, options.botDelay);
    this.office = new OfficeView(this);
    this.hud = new Hud(this, this.sim);
    this.ship = new ShipBar(this, this.sim);
    this.panels = new Panels(this, this.sim);
    this.cardView = new CardView(this, this.sim);
    this.reviewView = new ReviewView(this, this.sim);
    this.loanView = new LoanView(this, this.sim);

    this.cardView.onChoose = (i) => this.sim.chooseCard(i);
    this.reviewView.onPick = (id) => this.sim.pickTerm(id);
    this.loanView.onAccept = () => this.sim.acceptLoan();
    this.panels.onBuy = (kind, id) => this.onBuy(kind, id);
    this.hud.onPause = () => this.pause();
    this.ship.onTap = () => {
      if (!this.hinted.firstTap) this.hinted.firstTap = true;
    };

    Sfx.playMusic("mus_act1");
    this.ship.say(`WELCOME TO ${this.company}. TAP SHIP TO POST YOUR FIRST CONTENT.`, C.gold2);
    this.ship.pulse();
    Log.info("game", `RUN_START seed=${options.seed} autoplay=${options.autoplay ?? "none"}`);
  }

  /** Freeze the run (the doc's single sitting still needs a bathroom break). */
  private pause(): void {
    if (this.paused) return;
    this.hud.toggle(false);
    const c = this.add.container(0, 0).setDepth(60);
    const g = this.add.graphics();
    g.fillStyle(C.ink, 0.85).fillRect(0, 0, W, 320);
    c.add(g);
    c.add(centerX(text(this, 0, 140, "PAUSED", C.white, 2), W / 2));
    c.add(centerX(text(this, 0, 160, "TAP ANYWHERE TO RESUME", C.cream), W / 2));
    const z = this.add.zone(0, 0, W, 320).setOrigin(0, 0).setInteractive();
    c.add(z);
    z.once("pointerup", () => {
      c.destroy();
      this.time.delayedCall(50, () => (this.paused = null));
    });
    this.paused = c;
  }

  update(_time: number, deltaMs: number): void {
    if (this.paused) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    const step = dt * (this.bot ? options.speed : 1);
    if (this.bot) this.bot.step(this.sim, step);
    this.sim.update(step);
    for (const e of this.sim.drain()) this.onEvent(e);
    this.syncModals();

    this.ship.update(dt);
    this.cardView.update();
    this.uiTimer -= dt;
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.1;
      this.hud.update();
      this.panels.update();
      this.office.setBurnout(this.sim.s.morale < T.morale.burnoutBelow);
      this.hints();
    }
  }

  /** Modals follow sim state: open what the state says is open, close the rest. */
  private syncModals(): void {
    const s = this.sim.s;
    const cardId = s.card?.id ?? null;
    if (cardId !== this.cardView.shownId) {
      if (cardId) {
        if (this.panels.current) this.panels.toggle(null);
        if (this.hud.open) this.hud.toggle(false);
        this.cardView.show();
      } else this.cardView.hide();
    }
    if (s.phase !== "review") this.reviewView.hide();
    if (s.phase !== "loan") this.loanView.hide();
  }

  private onEvent(e: SimEvent): void {
    const s = this.sim.s;
    switch (e.type) {
      case "card":
        Log.info("game", `CARD ${e.id} t=${s.t.toFixed(0)}`);
        break;
      case "cardResult": {
        const def = cardById(e.id);
        if (e.timedOut) {
          Sfx.play("default_fired");
          this.ship.say(`TOO SLOW. "${def.title}" WENT THE DEFAULT WAY.`, C.red2);
        }
        for (const n of e.notes) this.ship.say(n, C.cream);
        break;
      }
      case "review": {
        const r = s.review!;
        Log.info("game", `CHECKPOINT ${CHECKPOINTS[r.checkpoint].id} pass t=${s.t.toFixed(0)}`);
        this.closeMenus();
        this.office.celebrate(1500);
        this.reviewView.show();
        break;
      }
      case "loan": {
        Log.info("game", `LOAN ${s.loan!.reason} t=${s.t.toFixed(0)}`);
        this.closeMenus();
        this.loanView.show();
        break;
      }
      case "act": {
        Log.info("game", `ACT ${e.act}`);
        this.office.setAct(e.act, true);
        Sfx.play("act_up");
        Sfx.playMusic(`mus_act${Math.min(3, e.act)}`);
        const name = T.acts.find((a) => a.act === e.act)?.name ?? "";
        const t = this.ship.centerLabel(`ACT ${e.act}: ${name.toUpperCase()}`, C.gold2);
        this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 600, onComplete: () => t.destroy() });
        break;
      }
      case "launch":
        if (!e.mini) {
          Sfx.play("launch");
          this.office.celebrate();
          this.ship.say("LAUNCH MOMENT! HYPE IS UP. KEEP SHIPPING.", C.pink);
        } else Sfx.play("mini_launch");
        break;
      case "burst":
        Sfx.play("burst");
        this.ship.say(e.channel === "creators" ? "A CREATOR WENT VIRAL ABOUT YOU." : "PARTNER EVENT: PARTNERSHIP OUTPUT UP FOR 20S.", C.sky);
        break;
      case "unlock": {
        const ch = CHANNELS.find((c) => c.id === e.channel)!;
        Sfx.play("unlock");
        this.ship.say(`NEW CHANNEL UNLOCKED: ${ch.name}`, C.green2);
        break;
      }
      case "buy":
        if (this.bot) this.onBuy(e.kind, e.id);
        break;
      case "ending":
        Log.info("game", `ENDING ${e.id} t=${s.t.toFixed(0)} users=${Math.round(s.users)}`);
        this.finish(e.id);
        break;
      default:
        break;
    }
  }

  private onBuy(kind: "hire" | "channel" | "upgrade", id: string): void {
    if (kind === "hire") {
      this.office.addStaff(id);
      const r = ROLES.find((x) => x.id === id)!;
      if (!this.bot) this.ship.say(`HIRED A ${r.name}.`, C.green2);
    } else if (kind === "channel" && !this.bot) {
      const ch = CHANNELS.find((x) => x.id === id)!;
      this.ship.say(`${ch.name} IS NOW LEVEL ${this.sim.s.channels[id]}.`, C.blue2);
    } else if (kind === "upgrade" && !this.bot) {
      this.ship.say(`${UPGRADES.find((u) => u.id === id)!.name}: INSTALLED.`, C.purple);
    }
    this.hinted.bought = true;
  }

  private closeMenus(): void {
    if (this.panels.current) this.panels.toggle(null);
    if (this.hud.open) this.hud.toggle(false);
  }

  /** Teach through Act 1 with ticker hints instead of a tutorial. */
  private hints(): void {
    if (this.bot) return;
    const s = this.sim.s;
    const once = (key: string, cond: boolean, msg: string, color: number = C.gold2) => {
      if (!this.hinted[key] && cond) {
        this.hinted[key] = true;
        this.ship.say(msg, color);
        Sfx.play("notify");
      }
    };
    once("afford", !this.hinted.bought && (this.sim.canHire("marketer") || this.sim.canBuyChannel("twitter") || this.sim.canBuyUpgrade("templates")),
      "YOU CAN AFFORD SOMETHING. OPEN TEAM, CHANNELS OR UPGRADES (GREEN DOT).");
    once("payroll", s.t > T.morale.graceUntilSec - 20 && this.sim.salary() > this.sim.income() * T.morale.salaryShareLimit,
      "PAYROLL IS OVER 60% OF INCOME. MORALE WILL START TO SLIP.", C.red2);
    once("hud", s.t > 45, "TAP THE TOP BAR FOR HYPE, MORALE AND LOANS.", C.cream);
    once("cashlow", s.cash < 20 && this.sim.income() < this.sim.salary(), "CASH IS RUNNING OUT. AT ZERO YOU TAKE A BRIDGE LOAN.", C.red2);
    once("deadline", !!CHECKPOINTS[s.cpIndex] && CHECKPOINTS[s.cpIndex].deadline - s.t < 30 && s.users < this.sim.currentTarget(),
      "30 SECONDS TO THE FUNDING DEADLINE.", C.red2);
  }

  private finish(id: string): void {
    if (this.ending) return;
    this.ending = true;
    this.closeMenus();
    this.cardView.hide();
    const s = this.sim.s;
    const summary: RunSummary = {
      ending: id, users: s.users, time: s.t, loans: s.loans, results: s.cpResults.slice(0, 5),
      company: this.company, terms: s.terms, choices: s.choices,
    };
    const t = centerX(text(this, 0, 120, id === "zombie" ? "TIME'S UP" : id === "shutdown" ? "LIGHTS OUT" : "THAT'S A WRAP", C.white, 2).setDepth(50), W / 2);
    this.cameras.main.fadeOut(1400, 8, 6, 14);
    this.tweens.add({ targets: t, alpha: 0.4, yoyo: true, repeat: 2, duration: 300 });
    this.time.delayedCall(1500, () => this.scene.start("end", summary));
  }
}
