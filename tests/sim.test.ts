// ---------------------------------------------------------------------------
// sim.test.ts
// Purpose : Rules tests for the Launch Week simulation (src/core/sim.ts).
// Usage   : python tools/dev.py test
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { Sim } from "../src/core/sim";
import { Bot, runBot } from "../src/core/bot";
import { CARDS, CHECKPOINTS, ENDINGS, TERMS, TUNING as T } from "../src/core/data";
import { clock, money, short } from "../src/core/format";

const run = (sim: Sim, sec: number) => {
  for (let i = 0; i < sec * 10; i++) sim.update(0.1);
};

describe("format", () => {
  it("shortens big numbers without eating integer zeros", () => {
    expect(short(340_000)).toBe("340K");
    expect(short(1_000_000)).toBe("1M");
    expect(short(12_500)).toBe("12.5K");
    expect(short(999)).toBe("999");
    expect(money(-1500)).toBe("-$1.5K");
    expect(clock(125)).toBe("2:05");
  });
});

describe("economy", () => {
  it("hire cost grows per copy and caps at max copies", () => {
    const sim = new Sim(1);
    sim.s.cash = 1e9;
    const c0 = sim.hireCost("marketer");
    sim.hire("marketer");
    expect(sim.hireCost("marketer")).toBeCloseTo(c0 * T.hires.copyCostMult, -1);
    for (let i = 0; i < 10; i++) sim.hire("marketer");
    expect(sim.s.hires.marketer).toBe(T.hires.maxCopies);
  });

  it("matching hires boost their channels (synergy)", () => {
    const sim = new Sim(1);
    sim.s.channels.reddit = 2;
    const before = sim.channelOutput("reddit");
    sim.s.hires.community = 2;
    expect(sim.channelOutput("reddit")).toBeCloseTo(before * (1 + 2 * T.hires.synergyPerHire));
  });

  it("channels unlock by peak users, paid ads by act", () => {
    const sim = new Sim(1);
    expect(sim.channelUnlocked("reddit")).toBe(false);
    sim.s.peakUsers = 600;
    expect(sim.channelUnlocked("reddit")).toBe(true);
    sim.s.peakUsers = 1e9;
    expect(sim.channelUnlocked("paidads")).toBe(false);
    sim.s.act = 2;
    expect(sim.channelUnlocked("paidads")).toBe(true);
  });

  it("salaries burn cash and an empty bank offers a bridge loan", () => {
    const sim = new Sim(1);
    sim.s.hires.engineer = 5;
    sim.s.cash = 10;
    run(sim, 5);
    expect(sim.s.phase).toBe("loan");
    sim.acceptLoan();
    expect(sim.s.loans).toBe(1);
    expect(sim.s.loanPenalty).toBe(true);
    expect(sim.s.cash).toBeGreaterThan(0);
  });

  it("a cash crunch after the last loan is a shutdown", () => {
    const sim = new Sim(1);
    sim.s.loans = T.loan.maxLoans;
    sim.s.hires.engineer = 5;
    sim.s.cash = 1;
    run(sim, 5);
    expect(sim.s.ending).toBe("shutdown");
  });
});

describe("tapping", () => {
  it("each tap adds users and fills the combo, a full combo fires a Launch Moment", () => {
    const sim = new Sim(1);
    expect(sim.tap()).toBeGreaterThan(0);
    const taps = Math.ceil(1 / T.tap.comboPerTap) + 1;
    for (let i = 0; i < taps; i++) sim.tap();
    expect(sim.drain().some((e) => e.type === "launch")).toBe(true);
    expect(sim.reachBuff()).toBeGreaterThan(1);
  });

  it("upgrades raise tap power", () => {
    const sim = new Sim(1);
    const p = sim.tapPower();
    sim.s.cash = 1e6;
    sim.buyUpgrade("templates");
    expect(sim.tapPower()).toBeGreaterThan(p);
    expect(sim.canBuyUpgrade("demo")).toBe(false); // needs an engineer
  });
});

describe("checkpoints", () => {
  it("hitting a target pays out and offers 3 distinct terms", () => {
    const sim = new Sim(3);
    sim.s.users = CHECKPOINTS[0].target;
    run(sim, 0.2);
    expect(sim.s.phase).toBe("review");
    const offer = sim.s.review!.offer;
    expect(new Set(offer).size).toBe(3);
    sim.pickTerm(offer[0]);
    expect(sim.s.terms).toEqual([offer[0]]);
    expect(sim.s.cpIndex).toBe(1);
    expect(sim.s.phase).toBe("play");
  });

  it("the player can ask for a bridge loan, turn it down, or take it", () => {
    const sim = new Sim(1);
    sim.requestLoan();
    expect(sim.s.phase).toBe("loan");
    sim.declineLoan();
    expect(sim.s.phase).toBe("play");
    expect(sim.s.loans).toBe(0);
    const cash = sim.s.cash;
    sim.requestLoan();
    sim.acceptLoan();
    expect(sim.s.loans).toBe(1);
    expect(sim.s.cash).toBeGreaterThan(cash);
    expect(sim.s.debt).toBeGreaterThan(0);
    expect(sim.s.cpIndex).toBe(0); // asking does not skip the funding round
    sim.s.loans = T.loan.maxLoans;
    expect(sim.canRequestLoan()).toBe(false);
  });

  it("forced loans cannot be declined", () => {
    const sim = new Sim(1);
    sim.s.cash = -1;
    run(sim, 0.1);
    sim.declineLoan();
    expect(sim.s.phase).toBe("loan");
  });

  it("a missed deadline is a bridge loan with a debt repaid from the next injection", () => {
    const sim = new Sim(1);
    sim.s.t = CHECKPOINTS[0].deadline - 0.05;
    run(sim, 0.2);
    expect(sim.s.phase).toBe("loan");
    sim.acceptLoan();
    expect(sim.s.debt).toBeGreaterThan(0);
    expect(sim.s.cpIndex).toBe(1);
    sim.s.users = CHECKPOINTS[1].target;
    run(sim, 0.2);
    expect(sim.s.review!.debtPaid).toBeGreaterThan(0);
  });

  it("passing Seed starts Act 2", () => {
    const sim = new Sim(1);
    sim.s.cpIndex = 1;
    sim.s.users = CHECKPOINTS[1].target;
    run(sim, 0.2);
    sim.pickTerm();
    expect(sim.s.act).toBe(2);
  });

  it("terms stack their modifiers", () => {
    const sim = new Sim(1);
    sim.s.terms = ["operator", "brandAngel"];
    expect(sim.mods().hireCostMult).toBeCloseTo(0.75 * 1.2);
    expect(sim.sentimentMin()).toBe(0.8);
    expect(TERMS).toHaveLength(8);
  });
});

describe("crisis cards", () => {
  it("all 12 scripted cards exist with 2-3 options", () => {
    expect(CARDS.filter((c) => c.at >= 0)).toHaveLength(12);
    for (const c of CARDS) expect(c.options.length).toBeGreaterThanOrEqual(2);
  });

  it("a card opens on schedule and the default fires on timeout", () => {
    const sim = new Sim(1);
    sim.s.cash = 1e6;
    sim.s.users = 100;
    sim.s.t = 89.95;
    run(sim, 0.2);
    expect(sim.s.card?.id).toBe("early_bird");
    run(sim, T.cards.timerSec + 1);
    expect(sim.s.card).toBe(null);
    expect(sim.s.choices).toContain("early_bird:default");
  });

  it("the card timer pauses while a panel is open", () => {
    const sim = new Sim(1);
    sim.s.t = 89.95;
    run(sim, 0.2);
    const left = sim.s.card!.timeLeft;
    sim.panelOpen = true;
    run(sim, 3);
    expect(sim.s.card!.timeLeft).toBeCloseTo(left);
  });

  it("doubling down on the Bad Tweet doubles the Pile-On penalties", () => {
    const a = new Sim(1);
    const b = new Sim(1);
    b.s.flags.doubledDown = true;
    for (const sim of [a, b]) {
      sim.s.fired = Object.fromEntries(CARDS.map((c) => [c.id, c.id !== "pile_on"]));
      sim.s.cpIndex = CHECKPOINTS.length - 1;
      sim.s.t = CARDS.find((c) => c.id === "pile_on")!.at;
      sim.s.users = 1000;
      run(sim, 0.1);
      expect(sim.s.card?.id).toBe("pile_on");
      sim.chooseCard(2); // hit back: S -20
    }
    expect(T.run.startSentiment - b.s.sentiment).toBeCloseTo(2 * (T.run.startSentiment - a.s.sentiment), 2);
  });

  it("paying the early creator changes card 6's framing", () => {
    const sim = new Sim(1);
    sim.s.flags.paidCreator = true;
    sim.s.fired = Object.fromEntries(CARDS.map((c) => [c.id, c.id !== "creator_raise"]));
    sim.s.cpIndex = CHECKPOINTS.length - 1;
    sim.s.t = CARDS.find((c) => c.id === "creator_raise")!.at;
    run(sim, 0.1);
    expect(sim.s.card?.title).toBe("The Creator Wants a Raise");
  });

  it("accepting the acquisition ends the run", () => {
    const sim = new Sim(1);
    sim.s.fired = Object.fromEntries(CARDS.map((c) => [c.id, c.id !== "acquisition"]));
    sim.s.cpIndex = CHECKPOINTS.length - 1;
    sim.s.t = CARDS.find((c) => c.id === "acquisition")!.at;
    run(sim, 0.1);
    sim.chooseCard(0);
    expect(sim.s.ending).toBe("acquired_early");
  });
});

describe("endings", () => {
  const finish = (setup: (s: Sim) => void) => {
    const sim = new Sim(1);
    sim.s.cpIndex = CHECKPOINTS.length - 1;
    setup(sim);
    sim.s.users = 1_050_000;
    run(sim, 0.1);
    return sim.s.ending;
  };
  it("are checked in order", () => {
    expect(finish(() => {})).toBe("ipo");
    expect(finish((s) => (s.s.sentiment = 0.7))).toBe("scandal");
    expect(finish((s) => (s.s.morale = 20))).toBe("burnout");
    expect(finish((s) => (s.s.loans = 2))).toBe("acquired_big");
    expect(ENDINGS.map((e) => e.id)).toEqual(["shutdown", "acquired_early", "scandal", "burnout", "acquired_big", "ipo", "zombie"]);
  });
  it("time running out under 1M is a Zombie Startup", () => {
    const sim = new Sim(1);
    sim.s.cpIndex = CHECKPOINTS.length - 1;
    sim.s.t = T.run.hardEndSec - 0.05;
    run(sim, 0.2);
    expect(sim.s.ending).toBe("zombie");
  });
});

describe("full runs (bots)", () => {
  it("a casual player (1.5 taps/s) reaches 1M in roughly 13-17 minutes", () => {
    for (const seed of [1, 2]) {
      const sim = runBot(new Sim(seed), new Bot("pace", 1.5));
      expect(sim.s.ending).not.toBe("zombie");
      expect(sim.s.t).toBeGreaterThan(13 * 60);
      expect(sim.s.t).toBeLessThan(17 * 60);
    }
  });
  it("a steady player reaches 1M sooner, with taps a real share of growth", () => {
    for (const seed of [1, 2]) {
      const sim = runBot(new Sim(seed), new Bot("pace", 2.75));
      expect(sim.s.ending).not.toBe("zombie");
      expect(sim.s.t).toBeGreaterThan(9 * 60);
      expect(sim.s.t).toBeLessThan(15 * 60);
      const share = sim.s.tapUsers / (sim.s.tapUsers + sim.s.idleUsers);
      expect(share).toBeGreaterThan(0.2);
      expect(share).toBeLessThan(0.4);
    }
  });
  it("tapping alone or idling alone does not reach 1M", () => {
    expect(runBot(new Sim(1), new Bot("tapper")).s.ending).toBe("zombie");
    expect(runBot(new Sim(1), new Bot("idler")).s.ending).toBe("zombie");
  });
});
