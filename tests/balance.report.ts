// Balance report: run with `npx vitest run --config tools/balance/vitest.balance.ts`
import { it } from "vitest";
import { Sim } from "../src/core/sim";
import { Bot, type BotKind } from "../src/core/bot";
import { CHECKPOINTS } from "../src/core/data";
import { clock, short } from "../src/core/format";

it("balance report", () => {
  const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
  const kinds: BotKind[] = ((globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env.BOTS ?? "pace,idler,tapper,chaos").split(",") as BotKind[];
  const seeds = Number((globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env.SEEDS ?? 5);
  for (const k of kinds) {
    for (let seed = 1; seed <= seeds; seed++) {
      const sim = new Sim(seed);
      const bot = new Bot(k, Number(env.TAP ?? 3));
      const marks: Record<number, number> = {};
      const cpTimes: string[] = [];
      let lastCp = 0;
      let wall = 0;
      while (sim.s.phase !== "ended" && wall < 7200) {
        bot.step(sim, 0.1);
        sim.update(0.1);
        sim.drain();
        wall += 0.1;
        const m = Math.floor(sim.s.t / 60);
        if (marks[m] === undefined) marks[m] = sim.s.users;
        if (sim.s.cpResults.length > lastCp) {
          lastCp = sim.s.cpResults.length;
          cpTimes.push(`${CHECKPOINTS[lastCp - 1].name}:${sim.s.cpResults[lastCp - 1]}@${clock(sim.s.t)}`);
        }
      }
      const s = sim.s;
      const curve = [1, 3, 5, 7, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30].map((m) => `${m}m=${short(marks[m] ?? s.users)}`).join(" ");
      console.log(`[${k} #${seed}] ${s.ending} t=${clock(s.t)} users=${short(s.users)} S=${s.sentiment.toFixed(2)} M=${s.morale.toFixed(0)} loans=${s.loans} tapShare=${((s.tapUsers / Math.max(1, s.tapUsers + s.idleUsers)) * 100).toFixed(0)}%`);
      console.log(`   ${curve}`);
      console.log(`   ${cpTimes.join(" ")} terms=${s.terms.join(",")}`);
      console.log(`   hires=${JSON.stringify(s.hires)} ch=${JSON.stringify(s.channels)} up=${Object.keys(s.upgrades).join(",")}`);
    }
  }
}, 600000);
