import { cacheGet, cachePeek, cacheSet } from "./cache";

const KEY = "rl:feeds:v1";
const EPS = 0.12;

export interface BanditArm {
  name: string;
  pulls: number;
  reward: number;
}

export interface BanditState {
  arms: Record<string, BanditArm>;
  total: number;
}

function empty(name: string): BanditArm {
  return { name, pulls: 0, reward: 0 };
}

export function loadBandit(): BanditState {
  return cachePeek<BanditState>(KEY) ?? { arms: {}, total: 0 };
}

function save(state: BanditState) {
  cacheSet(KEY, state);
}

function arm(state: BanditState, name: string): BanditArm {
  if (!state.arms[name]) state.arms[name] = empty(name);
  return state.arms[name];
}

/** UCB1 score. Unpulled arms explore first. */
export function ucb(arm: BanditArm, total: number): number {
  if (arm.pulls === 0) return Number.POSITIVE_INFINITY;
  const mean = arm.reward / arm.pulls;
  return mean + Math.sqrt((2 * Math.log(Math.max(total, 1))) / arm.pulls);
}

export function pickFeeds(names: string[], k: number): string[] {
  const state = loadBandit();
  const ranked = [...names].toSorted(
    (a, b) => ucb(arm(state, b), state.total) - ucb(arm(state, a), state.total),
  );
  const chosen = new Set(ranked.slice(0, Math.max(1, k)));
  for (const name of names) {
    if (chosen.size >= Math.min(names.length, k + 3)) break;
    if (Math.random() < EPS) chosen.add(name);
  }
  return names.filter((n) => chosen.has(n));
}

export function recordPulls(names: string[]) {
  const state = loadBandit();
  for (const name of names) {
    arm(state, name).pulls += 1;
    state.total += 1;
  }
  save(state);
}

/** Bernoulli-style reward in [0, 1] for a feed that contributed a clicked topic. */
export function recordReward(name: string, reward: number) {
  const state = loadBandit();
  const a = arm(state, name);
  if (a.pulls === 0) {
    a.pulls = 1;
    state.total += 1;
  }
  a.reward += Math.max(0, Math.min(1, reward));
  save(state);
  return { ...a };
}

export function banditSnapshot(): BanditArm[] {
  const state = loadBandit();
  return Object.values(state.arms).toSorted((a, b) => ucb(b, state.total) - ucb(a, state.total));
}

export function topicBoost(sourceApis: string[]): number {
  const state = loadBandit();
  if (!sourceApis.length) return 1;
  let s = 0;
  for (const name of sourceApis) {
    const a = state.arms[name];
    s += a && a.pulls ? a.reward / a.pulls : 0.5;
  }
  return 1 + s / sourceApis.length;
}
