import { PLATFORMS, type CausationDriver, type Platform, type Post, type SentimentMix, type SentimentReport, type Topic } from "./types";

const POS = [
  "love", "great", "win", "wins", "record", "beat", "beats", "upgrade", "award",
  "best", "demand", "waitlist", "sold", "launch", "reliable", "safe", "smooth",
  "impressive", "breakthrough", "surge", "rally", "hit",
];

const NEG = [
  "fail", "fails", "failed", "outage", "crash", "crashes", "lawsuit", "recall",
  "boycott", "scam", "delay", "delayed", "overpriced", "defect", "fire", "stall",
  "stalls", "hate", "worst", "broken", "down", "miss", "misses", "cut",
];

const RISK = [
  "lawsuit", "ban", "hack", "leak", "crash", "layoff", "war", "scam",
  "outage", "recall", "boycott", "protest", "death", "killed", "abuse",
];

function postsOf(topic: Topic): Post[] {
  return PLATFORMS.flatMap((p) => topic.platforms[p]?.posts ?? []);
}

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
}

function scoreTitle(title: string): { pos: number; neg: number; risk: number } {
  let pos = 0;
  let neg = 0;
  let risk = 0;
  for (const w of POS) if (hasWord(title, w)) pos += 1;
  for (const w of NEG) if (hasWord(title, w)) neg += 1;
  for (const w of RISK) if (hasWord(title, w)) risk += 1;
  return { pos, neg, risk };
}

function emptyMix(): SentimentMix {
  return { pos: 0, neg: 0, risk: 0, n: 0 };
}

function leanOf(mix: SentimentMix): SentimentReport["lean"] {
  if (mix.n < 2) return "thin";
  if (mix.pos >= mix.neg * 1.4 && mix.pos > 0) return "pos";
  if (mix.neg >= mix.pos * 1.4 && mix.neg > 0) return "neg";
  if (mix.pos === 0 && mix.neg === 0) return mix.n >= 2 ? "mixed" : "thin";
  return "mixed";
}

/** Sentiment correlation from receipt titles only. Never a generated WHY. */
export function buildSentiment(topic: Topic): SentimentReport {
  const posts = postsOf(topic);
  const overall = emptyMix();
  const byPlatform: Partial<Record<Platform, SentimentMix>> = {};
  const quotes: { title: string; pos: number; neg: number }[] = [];

  for (const post of posts) {
    const hit = scoreTitle(post.title);
    const mix = byPlatform[post.platform] ?? emptyMix();
    mix.n += 1;
    mix.pos += hit.pos;
    mix.neg += hit.neg;
    mix.risk += hit.risk;
    byPlatform[post.platform] = mix;
    overall.n += 1;
    overall.pos += hit.pos;
    overall.neg += hit.neg;
    overall.risk += hit.risk;
    if (hit.pos + hit.neg + hit.risk > 0) quotes.push({ title: post.title, pos: hit.pos, neg: hit.neg });
  }

  const lean = leanOf(overall);
  const drivers: CausationDriver[] = [];
  const denom = Math.max(overall.pos + overall.neg, 1);

  if (overall.pos) {
    drivers.push({
      id: "sent-pos",
      label: "Positive titles",
      weight: Math.round((overall.pos / denom) * 100),
      evidence: `${overall.pos} positive word hits in ${overall.n} receipts`,
    });
  }
  if (overall.neg) {
    drivers.push({
      id: "sent-neg",
      label: "Negative titles",
      weight: Math.round((overall.neg / denom) * 100),
      evidence: `${overall.neg} negative word hits in ${overall.n} receipts`,
    });
  }
  if (overall.risk) {
    drivers.push({
      id: "sent-risk",
      label: "Risk words",
      weight: Math.min(100, 20 + overall.risk * 12),
      evidence: `${overall.risk} controversy hits — treat as a floor risk, not a slogan`,
    });
  }

  for (const p of PLATFORMS) {
    const mix = byPlatform[p];
    if (!mix || mix.n === 0) continue;
    const tone = mix.neg > mix.pos ? "neg" : mix.pos > mix.neg ? "pos" : "flat";
    drivers.push({
      id: `sent-${p}`,
      label: `${p} tone · ${tone}`,
      weight: Math.min(100, mix.n * 8 + Math.abs(mix.pos - mix.neg) * 10),
      evidence: `${mix.n} titles · ${mix.pos} pos / ${mix.neg} neg / ${mix.risk} risk`,
    });
  }

  if (drivers.length === 0) {
    drivers.push({
      id: "sent-thin",
      label: "No tone words in titles",
      weight: 8,
      evidence: posts.length
        ? `${posts.length} receipts, none with pos/neg/risk lexicon hits — will not invent a mood.`
        : "No receipts — will not invent a mood.",
    });
  }

  const max = Math.max(...drivers.map((d) => d.weight), 1);
  const scaled = drivers
    .map((d) => ({ ...d, weight: Math.max(6, Math.round((d.weight / max) * 100)) }))
    .toSorted((a, b) => b.weight - a.weight)
    .slice(0, 8);

  return {
    topicId: topic.id,
    lean,
    overall,
    byPlatform,
    drivers: scaled,
    quotes: quotes
      .toSorted((a, b) => b.pos + b.neg - (a.pos + a.neg))
      .slice(0, 3)
      .map((q) => q.title.slice(0, 90)),
    thin: posts.length < 2,
  };
}
