// ---------------------------------------------------------------------------
// bot.ts
// Purpose : Scripted players for balance checks, tests and the smoke autoplay.
//           "pace"  : sensible player (taps ~3/s, buys the best value, picks
//                     reasonable card options).
//           "idler" : never taps (checks tap share / that idle alone is slower).
//           "tapper": only taps and buys tap upgrades (idle engine must matter).
//           "chaos" : picks the riskiest card options (drives bad endings).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { CHANNELS, ROLES, UPGRADES, TUNING as T, cardById, type Effects } from "./data";
import type { Sim } from "./sim";

export type BotKind = "pace" | "idler" | "tapper" | "chaos" | "acquire";

export class Bot {
  private tapAcc = 0;
  private thinkAcc = 0;
  private cardWait = 0;
  private reviewWait = 0;
  constructor(readonly kind: BotKind, readonly tapRate = T.tap.targetRate, readonly thinkTime = 2) {}

  step(sim: Sim, dt: number): void {
    const s = sim.s;
    if (s.phase === "ended") return;
    if (s.phase === "loan" || s.phase === "review") {
      // menus pause the sim, so wait in real (step) time
      this.reviewWait += dt;
      if (this.reviewWait < this.thinkTime / 4) return;
      this.reviewWait = 0;
      if (s.phase === "loan") return sim.acceptLoan();
      const offer = s.review!.offer;
      return sim.pickTerm(offer.length ? this.pickTerm(offer) : undefined);
    }
    if (s.card) {
      this.cardWait += dt;
      if (this.cardWait > this.thinkTime) {
        this.cardWait = 0;
        this.chooseCard(sim);
      }
    }
    if (this.kind !== "idler") {
      this.tapAcc += this.tapRate * dt;
      while (this.tapAcc >= 1) {
        this.tapAcc -= 1;
        sim.tap();
      }
    }
    this.thinkAcc += dt;
    if (this.thinkAcc >= 0.5) {
      this.thinkAcc = 0;
      this.shop(sim);
    }
  }

  private pickTerm(offer: string[]): string {
    const pref = ["growthVC", "revenue", "operator", "accel", "hypeFund", "brandAngel", "nepo", "patient"];
    return [...offer].sort((a, b) => pref.indexOf(a) - pref.indexOf(b))[0];
  }

  private chooseCard(sim: Sim): void {
    const def = cardById(sim.s.card!.id);
    let best = -1;
    let bestScore = -Infinity;
    def.options.forEach((o, i) => {
      if (!sim.optionAffordable(i)) return;
      let sc = this.kind === "chaos" ? this.chaosScore(o.effects) : this.score(sim, o.effects) - (o.cost ?? 0) / (sim.income() * 30 + 100);
      if (o.effects.ending) sc = this.kind === "acquire" ? 1e9 : -1e9;
      if (sc > bestScore) {
        bestScore = sc;
        best = i;
      }
    });
    if (best >= 0) sim.chooseCard(best);
  }

  private chaosScore(fx: Effects): number {
    if (fx.ending) return -1e9;
    return (fx.R ?? 0) - (fx.S ?? 0) - (fx.M ?? 0);
  }

  private score(sim: Sim, fx: Effects): number {
    const ups = Math.max(1, sim.usersPerSec());
    let v = 0;
    v += (fx.users ?? 0) / (ups * 3 + 10);
    v += ((fx.usersPct ?? 0) * sim.s.users) / 100 / (ups * 3 + 10);
    v += (fx.cash ?? 0) / (sim.income() * 30 + 100);
    v += (fx.R ?? 0) * 0.3 + (fx.S ?? 0) * 1.2 + (fx.M ?? 0) * 0.6;
    if (fx.temp) v += (fx.temp.mult - 1) * fx.temp.sec * (fx.temp.stat === "income" ? 0.1 : 0.5);
    if (fx.perm) v -= 15;
    if (fx.roll) {
      const p = sim.rollChance(fx.roll.chance);
      v += p * this.score(sim, fx.roll.win) + (1 - p) * this.score(sim, fx.roll.lose);
    }
    return v;
  }

  private shop(sim: Sim): void {
    // buy repeatedly while something worthwhile is affordable
    for (let guard = 0; guard < 10; guard++) {
      const pick = this.bestBuy(sim);
      if (!pick) return;
      pick();
    }
  }

  private bestBuy(sim: Sim): (() => void) | null {
    const s = sim.s;
    let best: (() => void) | null = null;
    let bestRatio = 0;
    const base = sim.usersPerSec();
    const consider = (ratio: number, act: () => void) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = act;
      }
    };
    const tapsPerSec = this.kind === "idler" ? 0 : this.tapRate;
    for (const u of UPGRADES) {
      if (!sim.canBuyUpgrade(u.id)) continue;
      const before = sim.tapValue();
      s.upgrades[u.id] = true;
      const after = sim.tapValue();
      s.upgrades[u.id] = false;
      let gain = (after - before) * tapsPerSec;
      if (u.launchMult || u.comboFill) gain += base * 0.05 + 1;
      consider(gain / sim.upgradeCost(u.id), () => sim.buyUpgrade(u.id));
    }
    if (this.kind === "tapper") return best;
    const inc = sim.income();
    const sal = sim.salary();
    for (const r of ROLES) {
      if (!sim.canHire(r.id)) continue;
      const cost = sim.hireCost(r.id);
      const newSal = sal + r.salary;
      const affordable = newSal <= inc * 0.55 || (s.t < T.morale.graceUntilSec && s.cash - cost > newSal * 45);
      if (!affordable) continue;
      s.hires[r.id]++;
      const gain = sim.usersPerSec() - base + (r.id === "designer" ? (sim.tapValue() - 0) * 0 : 0);
      s.hires[r.id]--;
      consider(gain / (cost + r.salary * 120), () => sim.hire(r.id));
    }
    for (const c of CHANNELS) {
      if (!sim.canBuyChannel(c.id)) continue;
      const cost = sim.channelCost(c.id);
      s.channels[c.id]++;
      const gain = sim.usersPerSec() - base;
      s.channels[c.id]--;
      consider(gain / cost, () => sim.buyChannel(c.id));
    }
    return best;
  }
}

/** Run a whole game headless. Returns the sim at the end. */
export function runBot(sim: Sim, bot: Bot, dt = 0.1, maxSec = 2400): Sim {
  let wall = 0;
  while (sim.s.phase !== "ended" && wall < maxSec * 3) {
    bot.step(sim, dt);
    sim.update(dt);
    sim.drain();
    wall += dt;
  }
  return sim;
}
