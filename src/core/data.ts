// ---------------------------------------------------------------------------
// data.ts
// Purpose : Typed access to the JSON content files in src/data. Every balance
//           number comes from here, never from literals in logic.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import tuningJson from "../data/tuning.json";
import cardsJson from "../data/cards.json";
import termsJson from "../data/terms.json";
import endingsJson from "../data/endings.json";

export type Tuning = typeof tuningJson;
export type RoleDef = Tuning["hires"]["roles"][number];
export type ChannelDef = { id: string; name: string; unlockUsers: number; unlockAct?: number; cost: number; output: number; risk: string };
export type UpgradeDef = { id: string; name: string; cost: number; tapAdd?: number; comboFill?: number; launchMult?: number; needs?: string; miniLaunchEvery?: number };
export type CheckpointDef = { id: string; name: string; target: number; deadline: number; injection: number; final?: boolean };

export interface Roll { chance: number | "sentiment"; win: Effects; lose: Effects }
export interface Effects {
  users?: number;
  usersPct?: number;
  cash?: number;
  S?: number;
  R?: number;
  M?: number;
  temp?: { stat: "output" | "growth" | "income"; mult: number; sec: number };
  perm?: { stat: "income"; mult: number };
  flag?: string;
  roll?: Roll;
  ending?: string;
  followup?: string;
  note?: string;
}
export interface CardOption { label: string; cost?: number; effects: Effects }
export interface CardDef {
  id: string; act: number; at: number; atUsers?: number; portrait: string; severity: number;
  title: string; body: string; altTitle?: string; altBody?: string; altIfNotFlag?: string; doubleIfFlag?: string;
  options: CardOption[]; default: Effects;
}
export interface TermMods {
  channelMult?: number; nextTargetMult?: number; sentimentFloor?: number; hireCostMult?: number; moraleDrainMult?: number;
  launchMult?: number; sentimentGainMult?: number; incomeMult?: number; tapMult?: number; comboFillMult?: number;
  unlockCostMult?: number; loanPenaltyFree?: number; injectionMult?: number; defaultPenaltyMult?: number;
}
export interface TermDef { id: string; name: string; icon: string; perk: string; catch: string; mods: TermMods }
export interface EndingDef { id: string; title: string; icon: string; good: boolean; epitaph: string }

export const TUNING: Tuning = tuningJson;
export const ROLES: RoleDef[] = tuningJson.hires.roles;
export const CHANNELS: ChannelDef[] = tuningJson.channels.list as ChannelDef[];
export const UPGRADES: UpgradeDef[] = tuningJson.upgrades as UpgradeDef[];
export const CHECKPOINTS: CheckpointDef[] = tuningJson.checkpoints as CheckpointDef[];
export const CARDS: CardDef[] = cardsJson.cards as CardDef[];
export const TERMS: TermDef[] = termsJson.terms as TermDef[];
export const ENDINGS: EndingDef[] = endingsJson.endings as EndingDef[];

export const cardById = (id: string): CardDef => {
  const c = CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown card ${id}`);
  return c;
};
export const termById = (id: string): TermDef => {
  const t = TERMS.find((x) => x.id === id);
  if (!t) throw new Error(`unknown term ${id}`);
  return t;
};
export const endingById = (id: string): EndingDef => {
  const e = ENDINGS.find((x) => x.id === id);
  if (!e) throw new Error(`unknown ending ${id}`);
  return e;
};
