// ---------------------------------------------------------------------------
// sim.ts
// Purpose : The whole game rules engine for Launch Week. Engine-free and
//           deterministic (seeded), so bots and tests can replay full runs.
// Usage   : const sim = new Sim(seed); sim.update(dt); sim.tap(); sim.hire("marketer");
//           UI reads sim.s (state) and drains sim.events each frame.
// Notes   : Phases: "play" (clock runs, cards may be open), "review" (checkpoint
//           screen, clock paused), "loan" (bridge-loan card, clock paused), "ended".
//           All numbers come from src/data via data.ts.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import {
  CARDS, CHANNELS, CHECKPOINTS, ROLES, TERMS, TUNING as T, UPGRADES,
  cardById, termById, type CardDef, type Effects, type TermMods,
} from "./data";
import { Rng } from "./rng";

export type Phase = "play" | "review" | "loan" | "ended";
export type TempStat = "output" | "growth" | "income";

interface ReachEntry { amount: number; hold: number; decay: number; age: number }
interface TempEffect { stat: TempStat; mult: number; left: number }

export interface ActiveCard {
  id: string;
  title: string;
  body: string;
  timeLeft: number;
  doubled: boolean;
}

export interface Review {
  checkpoint: number;
  passed: boolean;
  injection: number;
  debtPaid: number;
  offer: string[]; // term ids, empty on miss or final
}

export interface LoanOffer { reason: "miss" | "cash" | "ask"; advance: number; checkpoint: number }

export type SimEvent =
  | { type: "card"; id: string }
  | { type: "cardResult"; id: string; notes: string[]; timedOut: boolean }
  | { type: "review" }
  | { type: "loan" }
  | { type: "ending"; id: string }
  | { type: "launch"; mini: boolean }
  | { type: "burst"; channel: string }
  | { type: "unlock"; channel: string }
  | { type: "act"; act: number }
  | { type: "tap"; users: number }
  | { type: "buy"; kind: "hire" | "channel" | "upgrade"; id: string };

export interface State {
  t: number;
  users: number;
  peakUsers: number;
  cash: number;
  sentiment: number;
  morale: number;
  reach: ReachEntry[];
  hires: Record<string, number>;
  channels: Record<string, number>;
  upgrades: Record<string, boolean>;
  combo: number;
  tapCount: number;
  tapTimes: number[];
  temps: TempEffect[];
  permIncomeMult: number;
  flags: Record<string, boolean>;
  terms: string[];
  cpIndex: number;
  cpResults: ("pass" | "miss")[];
  nextTargetMult: number;
  loans: number;
  loanPenalty: boolean;
  debt: number;
  act: number;
  fired: Record<string, boolean>;
  card: ActiveCard | null;
  cardQueue: string[];
  cardWait: number;
  sinceCard: number;
  phase: Phase;
  review: Review | null;
  loan: LoanOffer | null;
  ending: string | null;
  salaryOverSec: number;
  comebackLeft: number;
  comebackCooldown: number;
  history: number[];
  historyTimer: number;
  twitterSpike: number;
  twitterTimer: number;
  creatorTimer: number;
  partnerTimer: number;
  partnerEventLeft: number;
  tapUsers: number;
  idleUsers: number;
  choices: string[];
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export class Sim {
  s: State;
  events: SimEvent[] = [];
  /** UI sets this while a Team/Channels/Upgrades panel is open (delays cards). */
  panelOpen = false;
  readonly rng: Rng;

  constructor(seed = 1) {
    this.rng = new Rng(seed);
    this.s = {
      t: 0, users: 0, peakUsers: 0, cash: T.run.startCash,
      sentiment: T.run.startSentiment, morale: T.run.startMorale, reach: [],
      hires: Object.fromEntries(ROLES.map((r) => [r.id, 0])),
      channels: Object.fromEntries(CHANNELS.map((c) => [c.id, 0])),
      upgrades: {}, combo: 0, tapCount: 0, tapTimes: [], temps: [], permIncomeMult: 1,
      flags: {}, terms: [], cpIndex: 0, cpResults: [], nextTargetMult: 1,
      loans: 0, loanPenalty: false, debt: 0, act: 1, fired: {}, card: null, cardQueue: [], cardWait: 0, sinceCard: 999,
      phase: "play", review: null, loan: null, ending: null, salaryOverSec: 0,
      comebackLeft: 0, comebackCooldown: 0, history: [], historyTimer: 0,
      twitterSpike: 1, twitterTimer: 0, creatorTimer: 0, partnerTimer: 0, partnerEventLeft: 0,
      tapUsers: 0, idleUsers: 0, choices: [],
    };
  }

  // ---- modifiers -----------------------------------------------------------
  mods(): Required<TermMods> {
    const m: Required<TermMods> = {
      channelMult: 1, nextTargetMult: 1, sentimentFloor: 0, hireCostMult: 1, moraleDrainMult: 1, launchMult: 1,
      sentimentGainMult: 1, incomeMult: 1, tapMult: 1, comboFillMult: 1, unlockCostMult: 1, loanPenaltyFree: 0,
      injectionMult: 1, defaultPenaltyMult: 1,
    };
    for (const id of this.s.terms) {
      const tm = termById(id).mods;
      for (const k of Object.keys(tm) as (keyof TermMods)[]) {
        const v = tm[k] as number;
        if (k === "sentimentFloor" || k === "loanPenaltyFree") m[k] = Math.max(m[k], v);
        else m[k] *= v;
      }
    }
    return m;
  }

  tempMult(stat: TempStat): number {
    return this.s.temps.filter((e) => e.stat === stat).reduce((a, e) => a * e.mult, 1);
  }

  reachBuff(): number {
    const pts = this.s.reach.reduce((a, r) => a + this.reachValue(r), 0);
    return clamp(1 + pts * T.reach.unitBuff, T.reach.minBuff, T.reach.maxBuff);
  }
  reachPoints(): number {
    return this.s.reach.reduce((a, r) => a + this.reachValue(r), 0);
  }
  private reachValue(r: ReachEntry): number {
    if (r.age <= r.hold) return r.amount;
    return r.amount * Math.max(0, 1 - (r.age - r.hold) / r.decay);
  }

  moraleMult(): number {
    const k = this.s.morale / 100;
    return T.morale.multAt0 + (T.morale.multAt100 - T.morale.multAt0) * k;
  }

  sentimentMin(): number {
    return Math.max(T.sentiment.min, this.mods().sentimentFloor);
  }

  // ---- economy -------------------------------------------------------------
  /** Price curve: expensive items scale up more than cheap ones (keeps the early game as written, slows the late game). */
  price(base: number, kind: "buy" | "upgrade"): number {
    const e = T.economy;
    const k = Math.max(1, base / e.priceCurveFrom);
    if (kind === "upgrade") return e.upgradeScale * base * Math.pow(k, e.upgradeExp);
    return e.priceScale * base * Math.pow(k, e.priceCurveExp);
  }
  hireCost(id: string): number {
    const r = ROLES.find((x) => x.id === id)!;
    return Math.round(this.price(r.cost, "buy") * Math.pow(T.hires.copyCostMult, this.s.hires[id]) * this.mods().hireCostMult);
  }
  channelCost(id: string): number {
    const c = CHANNELS.find((x) => x.id === id)!;
    const lvl = this.s.channels[id];
    const unlock = lvl === 0 ? this.mods().unlockCostMult : 1;
    return Math.round(this.price(c.cost, "buy") * Math.pow(T.channels.levelCostMult, lvl) * unlock);
  }
  channelUnlocked(id: string): boolean {
    const c = CHANNELS.find((x) => x.id === id)!;
    if (c.unlockAct) return this.s.act >= c.unlockAct;
    return this.s.peakUsers >= c.unlockUsers;
  }
  upgradeAvailable(id: string): boolean {
    const u = UPGRADES.find((x) => x.id === id)!;
    if (this.s.upgrades[id]) return false;
    if (u.needs && this.s.hires[u.needs] < 1) return false;
    return true;
  }

  salary(): number {
    return ROLES.reduce((a, r) => a + r.salary * this.s.hires[r.id], 0);
  }
  income(): number {
    return this.s.users * T.income.perUserPerSec * this.mods().incomeMult * this.s.permIncomeMult * this.tempMult("income");
  }

  synergy(channelId: string): number {
    let n = 0;
    for (const r of ROLES) if (r.boosts.includes(channelId)) n += this.s.hires[r.id];
    return 1 + T.hires.synergyPerHire * n;
  }

  teamOutput(): number {
    const burnt = this.s.morale < T.morale.burnoutBelow ? T.morale.burnoutHireMult : 1;
    // the landing page trickles users in from the start
    return T.run.landingPageOutput + ROLES.reduce((a, r) => a + r.output * this.s.hires[r.id], 0) * burnt;
  }

  channelOutput(id: string): number {
    const c = CHANNELS.find((x) => x.id === id)!;
    const lvl = this.s.channels[id];
    if (!lvl) return 0;
    let risk = 1;
    if (c.risk === "spiky") risk = this.s.twitterSpike;
    if (c.risk === "medium") risk = this.s.sentiment;
    if (c.risk === "events") risk = this.s.partnerEventLeft > 0 ? T.channels.partnerEventMult : T.channels.partnerQuietMult;
    return lvl * c.output * this.synergy(id) * risk * this.mods().channelMult;
  }
  channelsOutput(): number {
    return CHANNELS.reduce((a, c) => a + this.channelOutput(c.id), 0);
  }

  /** Combined growth multiplier, capped (guardrail against death spirals). */
  growthMult(): number {
    const loan = this.s.loanPenalty && !this.mods().loanPenaltyFree ? T.loan.outputPenalty : 1;
    const comeback = this.s.comebackLeft > 0 ? T.comeback.buff : 1;
    const m = this.s.sentiment * this.reachBuff() * this.moraleMult() * this.tempMult("output") * this.tempMult("growth") * loan * comeback;
    return clamp(m, T.multipliers.floor, T.multipliers.ceiling);
  }
  usersPerSec(): number {
    return (this.teamOutput() + this.channelsOutput()) * this.growthMult();
  }

  tapPower(): number {
    let p = T.tap.base;
    for (const u of UPGRADES) if (this.s.upgrades[u.id] && u.tapAdd) p += u.tapAdd;
    p *= 1 + T.tap.designerTapBonus * this.s.hires.designer;
    return p * this.mods().tapMult;
  }
  tapValue(): number {
    const combo = 1 + T.tap.comboBonusMax * this.s.combo;
    // A tap ships content: a flat amount plus a slice of what your channels already do.
    return (this.tapPower() * this.s.sentiment * this.reachBuff() + T.tap.idleShare * this.usersPerSec()) * combo;
  }

  currentTarget(): number {
    const cp = CHECKPOINTS[this.s.cpIndex];
    return cp ? cp.target * this.s.nextTargetMult : Infinity;
  }

  // ---- actions -------------------------------------------------------------
  tap(): number {
    if (this.s.phase !== "play") return 0;
    const v = this.tapValue();
    this.addUsers(v);
    this.s.tapUsers += v;
    this.s.tapCount++;
    this.s.tapTimes.push(this.s.t);
    // spam: too many taps per second for your content quality chips sentiment
    this.s.tapTimes = this.s.tapTimes.filter((x) => this.s.t - x < 1);
    const quality = this.s.hires.designer + Object.values(this.s.upgrades).filter(Boolean).length;
    if (this.s.tapTimes.length > T.tap.spamRateBase + quality * T.tap.spamRatePerQuality) {
      this.addSentiment(-T.tap.spamSentimentPerTap);
    }
    let fill = T.tap.comboPerTap * this.mods().comboFillMult;
    for (const u of UPGRADES) if (this.s.upgrades[u.id] && u.comboFill) fill *= u.comboFill;
    this.s.combo += fill;
    if (this.s.combo >= 1) {
      this.s.combo = 0;
      this.launchMoment(false);
    }
    const hooks = UPGRADES.find((u) => u.id === "hooks")!;
    if (this.s.upgrades.hooks && hooks.miniLaunchEvery && this.s.tapCount % hooks.miniLaunchEvery === 0) this.launchMoment(true);
    this.events.push({ type: "tap", users: v });
    return v;
  }

  private launchMoment(mini: boolean): void {
    let len = this.mods().launchMult;
    for (const u of UPGRADES) if (this.s.upgrades[u.id] && u.launchMult) len *= u.launchMult;
    const amt = mini ? T.tap.launchMomentReach / 3 : T.tap.launchMomentReach;
    const hold = (mini ? 3 : T.tap.launchMomentHoldSec) * len;
    this.s.reach.push({ amount: amt, hold, decay: T.tap.launchMomentDecaySec, age: 0 });
    this.events.push({ type: "launch", mini });
  }

  canHire(id: string): boolean {
    return this.s.phase === "play" && this.s.hires[id] < T.hires.maxCopies && this.s.cash >= this.hireCost(id);
  }
  hire(id: string): boolean {
    if (!this.canHire(id)) return false;
    this.s.cash -= this.hireCost(id);
    this.s.hires[id]++;
    this.events.push({ type: "buy", kind: "hire", id });
    return true;
  }
  canBuyChannel(id: string): boolean {
    return this.s.phase === "play" && this.channelUnlocked(id) && this.s.channels[id] < T.channels.maxLevel && this.s.cash >= this.channelCost(id);
  }
  buyChannel(id: string): boolean {
    if (!this.canBuyChannel(id)) return false;
    this.s.cash -= this.channelCost(id);
    this.s.channels[id]++;
    this.events.push({ type: "buy", kind: "channel", id });
    return true;
  }
  upgradeCost(id: string): number {
    const u = UPGRADES.find((x) => x.id === id)!;
    return Math.round(this.price(u.cost, "upgrade"));
  }
  canBuyUpgrade(id: string): boolean {
    return this.s.phase === "play" && this.upgradeAvailable(id) && this.s.cash >= this.upgradeCost(id);
  }
  buyUpgrade(id: string): boolean {
    if (!this.canBuyUpgrade(id)) return false;
    this.s.cash -= this.upgradeCost(id);
    this.s.upgrades[id] = true;
    this.events.push({ type: "buy", kind: "upgrade", id });
    return true;
  }

  // ---- cards ---------------------------------------------------------------
  optionAffordable(i: number): boolean {
    const c = this.s.card;
    if (!c) return false;
    const o = cardById(c.id).options[i];
    return !o.cost || this.s.cash >= o.cost;
  }

  chooseCard(i: number): boolean {
    const c = this.s.card;
    if (!c || this.s.phase !== "play" || !this.optionAffordable(i)) return false;
    const def = cardById(c.id);
    const o = def.options[i];
    if (o.cost) this.s.cash -= o.cost;
    this.s.choices.push(`${def.id}:${i}`);
    this.resolveCard(def, o.effects, c.doubled ? 2 : 1, false);
    return true;
  }

  private resolveCard(def: CardDef, fx: Effects, negMult: number, timedOut: boolean): void {
    this.s.card = null;
    const notes: string[] = [];
    this.applyEffects(fx, negMult, notes);
    this.events.push({ type: "cardResult", id: def.id, notes, timedOut });
  }

  private openCard(id: string): void {
    const def = cardById(id);
    const alt = def.altIfNotFlag ? !this.s.flags[def.altIfNotFlag] : false;
    const doubled = def.doubleIfFlag ? !!this.s.flags[def.doubleIfFlag] : false;
    this.s.card = {
      id,
      title: alt && def.altTitle ? def.altTitle : def.title,
      body: (alt || doubled) && def.altBody ? def.altBody : def.body,
      timeLeft: T.cards.timerSec,
      doubled,
    };
    this.s.fired[id] = true;
    this.s.sinceCard = 0;
    this.events.push({ type: "card", id });
  }

  rollChance(chance: number | "sentiment"): number {
    if (chance === "sentiment") return clamp(0.2 + 0.4 * this.s.sentiment, 0.1, 0.9);
    return clamp(chance + (this.s.sentiment - 1) * 0.25, 0.05, 0.95);
  }

  applyEffects(fx: Effects, negMult: number, notes: string[]): void {
    const neg = (v: number) => (v < 0 ? v * negMult : v);
    if (fx.users) this.addUsers(neg(fx.users));
    if (fx.usersPct) this.addUsers((this.s.users * neg(fx.usersPct)) / 100);
    if (fx.cash) this.s.cash += neg(fx.cash) * T.economy.cardCashScale;
    if (fx.S) this.addSentiment(neg(fx.S) * T.sentiment.unit);
    if (fx.M) this.s.morale = clamp(this.s.morale + neg(fx.M), T.morale.min, T.morale.max);
    if (fx.R) this.s.reach.push({ amount: neg(fx.R), hold: T.reach.cardHoldSec, decay: T.reach.cardDecaySec, age: 0 });
    if (fx.temp) {
      const m = fx.temp.mult < 1 ? 1 - (1 - fx.temp.mult) * negMult : fx.temp.mult;
      this.s.temps.push({ stat: fx.temp.stat, mult: m, left: fx.temp.sec });
    }
    if (fx.perm) this.s.permIncomeMult *= fx.perm.mult;
    if (fx.flag) this.s.flags[fx.flag] = true;
    if (fx.note) notes.push(fx.note);
    if (fx.roll) {
      const win = this.rng.chance(this.rollChance(fx.roll.chance));
      this.applyEffects(win ? fx.roll.win : fx.roll.lose, negMult, notes);
    }
    if (fx.followup) this.s.cardQueue.unshift(fx.followup);
    if (fx.ending) this.end(fx.ending);
  }

  // ---- checkpoints and loans ------------------------------------------------
  private passCheckpoint(): void {
    const cp = CHECKPOINTS[this.s.cpIndex];
    this.s.cpResults.push("pass");
    this.s.nextTargetMult = 1;
    this.s.loanPenalty = false;
    if (cp.final) {
      this.s.cpIndex++;
      this.end(this.finalEnding());
      return;
    }
    const gross = Math.round(cp.injection * T.economy.injectionScale * this.mods().injectionMult);
    const debtPaid = Math.min(this.s.debt, gross);
    this.s.debt -= debtPaid;
    this.s.cash += gross - debtPaid;
    const remaining = TERMS.map((t) => t.id).filter((id) => !this.s.terms.includes(id));
    this.s.review = { checkpoint: this.s.cpIndex, passed: true, injection: gross, debtPaid, offer: this.rng.pick(remaining, 3) };
    this.s.phase = "review";
    this.events.push({ type: "review" });
  }

  private missCheckpoint(): void {
    const cp = CHECKPOINTS[this.s.cpIndex];
    this.s.cpResults.push("miss");
    if (cp.final) {
      this.s.cpIndex++;
      this.end("zombie");
      return;
    }
    this.offerLoan("miss");
  }

  private offerLoan(reason: LoanOffer["reason"]): void {
    if (this.s.loans >= T.loan.maxLoans) {
      // out of loans: a cash crunch is fatal, a missed target just moves on with no money
      if (reason === "cash") return this.end("shutdown");
      this.s.loanPenalty = true;
      this.advanceCheckpoint();
      return;
    }
    const cp = CHECKPOINTS[Math.min(this.s.cpIndex, CHECKPOINTS.length - 2)];
    this.s.loan = { reason, advance: Math.round(cp.injection * T.economy.injectionScale * T.loan.advanceShare), checkpoint: this.s.cpIndex };
    this.s.phase = "loan";
    this.events.push({ type: "loan" });
  }

  /** Player asks for a bridge loan from the HUD. Only between cards, while loans are left. */
  canRequestLoan(): boolean {
    return this.s.phase === "play" && !this.s.card && this.s.loans < T.loan.maxLoans;
  }

  requestLoan(): void {
    if (this.canRequestLoan()) this.offerLoan("ask");
  }

  /** Only a loan the player asked for can be turned down; crunch and miss loans are forced. */
  declineLoan(): void {
    if (this.s.phase !== "loan" || this.s.loan?.reason !== "ask") return;
    this.s.loan = null;
    this.s.phase = "play";
  }

  acceptLoan(): void {
    const l = this.s.loan;
    if (!l || this.s.phase !== "loan") return;
    this.s.loans++;
    this.s.debt += l.advance;
    this.s.cash = Math.max(0, this.s.cash) + l.advance;
    this.s.loanPenalty = true;
    this.s.loan = null;
    this.s.phase = "play";
    if (l.reason === "miss") this.advanceCheckpoint();
  }

  /** Close the review screen. termId may be omitted when nothing was offered. */
  pickTerm(termId?: string): void {
    const r = this.s.review;
    if (!r || this.s.phase !== "review") return;
    if (termId && r.offer.includes(termId)) {
      this.s.terms.push(termId);
      const nt = termById(termId).mods.nextTargetMult;
      if (nt) this.s.nextTargetMult = nt;
    }
    this.s.review = null;
    this.s.phase = "play";
    this.advanceCheckpoint();
  }

  private advanceCheckpoint(): void {
    const cp = CHECKPOINTS[this.s.cpIndex];
    this.s.cpIndex++;
    for (const a of T.acts) {
      if (a.afterCheckpoint === cp.id && this.s.act < a.act) {
        this.s.act = a.act;
        this.events.push({ type: "act", act: a.act });
      }
    }
  }

  finalEnding(): string {
    const s = this.s;
    if (s.sentiment < 0.8) return "scandal";
    if (s.morale < 25) return "burnout";
    if (s.loans >= 2) return "acquired_big";
    return "ipo";
  }

  private end(id: string): void {
    if (this.s.phase === "ended") return;
    this.s.ending = id;
    this.s.phase = "ended";
    this.s.card = null;
    this.events.push({ type: "ending", id });
  }

  // ---- state helpers --------------------------------------------------------
  private addUsers(n: number): void {
    this.s.users = Math.max(0, this.s.users + n);
    if (this.s.users > this.s.peakUsers) {
      const before = this.s.peakUsers;
      this.s.peakUsers = this.s.users;
      for (const c of CHANNELS) {
        if (!c.unlockAct && c.unlockUsers > 0 && before < c.unlockUsers && this.s.peakUsers >= c.unlockUsers) {
          this.events.push({ type: "unlock", channel: c.id });
        }
      }
    }
  }

  private addSentiment(d: number): void {
    const g = d > 0 ? d * this.mods().sentimentGainMult : d;
    this.s.sentiment = clamp(this.s.sentiment + g, this.sentimentMin(), T.sentiment.max);
  }

  // ---- main loop -------------------------------------------------------------
  /** Advance by dt seconds (sub-stepped at the tuning tick rate). */
  update(dt: number): void {
    const step = 1 / T.run.tickHz;
    let left = Math.min(dt, 1);
    while (left > 1e-9 && this.s.phase !== "ended") {
      const h = Math.min(step, left);
      this.tick(h);
      left -= h;
    }
  }

  private tick(dt: number): void {
    const s = this.s;
    if (s.phase !== "play") return;
    s.t += dt;

    // timed modifiers
    for (const r of s.reach) r.age += dt;
    s.reach = s.reach.filter((r) => r.age < r.hold + r.decay);
    for (const e of s.temps) e.left -= dt;
    s.temps = s.temps.filter((e) => e.left > 0);
    s.combo = Math.max(0, s.combo - T.tap.comboDecayPerSec * dt * (s.tapTimes.length && s.t - s.tapTimes[s.tapTimes.length - 1] < 0.6 ? 0 : 1));
    if (s.comebackLeft > 0) s.comebackLeft -= dt;
    if (s.comebackCooldown > 0) s.comebackCooldown -= dt;

    this.channelRisks(dt);

    // growth
    const gain = this.usersPerSec() * dt;
    this.addUsers(gain);
    s.idleUsers += gain;
    if (s.sentiment < T.sentiment.churnBelow) {
      const rate = (T.sentiment.churnPerSec * (T.sentiment.churnBelow - s.sentiment)) / (T.sentiment.churnBelow - T.sentiment.min);
      this.addUsers(-s.users * rate * dt);
    }

    // sentiment drift and channel side effects
    const drift = Math.sign(T.sentiment.driftToward - s.sentiment) * T.sentiment.driftPerSec * dt;
    if (Math.abs(T.sentiment.driftToward - s.sentiment) > Math.abs(drift)) this.addSentiment(drift);
    if (s.channels.seo) this.addSentiment(T.channels.seoSentimentPerLevelSec * s.channels.seo * dt);
    if (s.channels.paidads) this.addSentiment(T.channels.adsSentimentPerLevelSec * s.channels.paidads * dt);

    // cash
    const inc = this.income();
    const sal = this.salary();
    s.cash += (inc - sal) * dt;

    // morale
    if (s.t > T.morale.graceUntilSec && sal > inc * T.morale.salaryShareLimit) {
      s.salaryOverSec += dt;
      if (s.salaryOverSec > T.morale.salaryGraceSec) {
        s.morale = clamp(s.morale - T.morale.drainPerSec * this.mods().moraleDrainMult * dt, T.morale.min, T.morale.max);
      }
    } else {
      s.salaryOverSec = 0;
      const d = T.morale.recoverToward - s.morale;
      if (d > 0) s.morale = Math.min(T.morale.recoverToward, s.morale + T.morale.recoverPerSec * dt);
    }

    // comeback bonus: a sharp drop over the window grants a short buff
    s.historyTimer += dt;
    if (s.historyTimer >= 1) {
      s.historyTimer = 0;
      s.history.push(s.users);
      if (s.history.length > T.comeback.windowSec) s.history.shift();
      const peak = Math.max(...s.history);
      if (s.comebackCooldown <= 0 && peak > 500 && s.users < peak * (1 - T.comeback.dropPct)) {
        s.comebackLeft = T.comeback.durationSec;
        s.comebackCooldown = T.comeback.cooldownSec;
      }
    }

    // hard fail: sentiment and morale both on the floor
    if (s.sentiment < 0.6 && s.morale < 15) return this.end("shutdown");

    // cash crunch -> bridge loan (or shutdown after the third)
    if (s.cash < 0) {
      s.cash = 0;
      return this.offerLoan("cash");
    }

    // checkpoints
    const cp = CHECKPOINTS[s.cpIndex];
    if (cp) {
      if (s.users >= this.currentTarget()) return this.passCheckpoint();
      if (s.t >= cp.deadline) return this.missCheckpoint();
    } else if (s.t >= T.run.hardEndSec) {
      return this.end("zombie");
    }

    this.cards(dt);
  }

  private channelRisks(dt: number): void {
    const s = this.s;
    const C = T.channels;
    s.twitterTimer -= dt;
    if (s.twitterTimer <= 0) {
      s.twitterTimer = C.twitterSpikeEverySec;
      s.twitterSpike = this.rng.range(C.twitterSpikeMin, C.twitterSpikeMax);
    }
    s.creatorTimer -= dt;
    if (s.creatorTimer <= 0) {
      s.creatorTimer = C.creatorBurstEverySec;
      if (s.channels.creators && this.rng.chance(C.creatorBurstChance)) {
        s.reach.push({ amount: C.creatorBurstReach, hold: 5, decay: 15, age: 0 });
        this.addUsers(this.channelOutput("creators") * C.creatorBurstUsersSec);
        this.events.push({ type: "burst", channel: "creators" });
      }
    }
    if (s.partnerEventLeft > 0) s.partnerEventLeft -= dt;
    s.partnerTimer -= dt;
    if (s.partnerTimer <= 0) {
      s.partnerTimer = C.partnerEventEverySec;
      if (s.channels.partnerships) {
        s.partnerEventLeft = C.partnerEventSec;
        this.events.push({ type: "burst", channel: "partnerships" });
      }
    }
  }

  private cards(dt: number): void {
    const s = this.s;
    if (s.card) {
      if (!this.panelOpen) s.card.timeLeft -= dt;
      if (s.card.timeLeft <= 0) {
        const def = cardById(s.card.id);
        const mult = (s.card.doubled ? 2 : 1) * this.mods().defaultPenaltyMult;
        s.choices.push(`${def.id}:default`);
        this.resolveCard(def, def.default, mult, true);
      }
      return;
    }
    s.sinceCard += dt;
    if (!s.cardQueue.length) {
      for (const c of CARDS) {
        if (c.at < 0 || s.fired[c.id]) continue;
        if (s.t >= c.at || (c.atUsers !== undefined && s.users >= c.atUsers)) s.cardQueue.push(c.id);
      }
    }
    if (!s.cardQueue.length || s.sinceCard < T.cards.minGapSec) return;
    if (this.panelOpen && s.cardWait < T.cards.maxPanelWaitSec) {
      s.cardWait += dt;
      return;
    }
    s.cardWait = 0;
    this.openCard(s.cardQueue.shift()!);
  }

  /** Drain UI events. */
  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
