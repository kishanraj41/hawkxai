import { fetchHn } from "./hn";
import { fetchReddit } from "./reddit";
import { grokJson } from "./grok";
import { xTrendListSchema } from "./schemas";
import type { Post, RawSignals, SourceHealth } from "./types";

function emptyHealth(): SourceHealth {
  return { x: false, reddit: false, hn: false, public: false };
}

function parseJsonObject(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("no json object");
  }
}

export async function fetchX(place?: string): Promise<Post[]> {
  const where = place ? ` in ${place}` : "";
  const parsed = await grokJson(
    `Search X once for the 10 hottest topics in the last 24 hours (tech, business, culture)${where}.
Return ONLY JSON: {"topics":[{"topic":"short phrase","volume":0,"urls":["https://x.com/..."]}]}
volume is relative heat 0-100. Prefer real x.com URLs.`,
    (raw) => xTrendListSchema.parse(parseJsonObject(raw)),
    true,
  );
  return parsed.topics.map((t) => ({
    platform: "x" as const,
    title: t.topic,
    url: t.urls[0] ?? "https://x.com",
    score: t.volume,
    createdAt: new Date().toISOString(),
  }));
}

function settleReddit(): Promise<Post[]> {
  return fetchReddit().then(
    (posts) => posts,
    (err) => {
      console.error("[reddit]", err);
      return [] as Post[];
    },
  );
}

function settleHn(): Promise<Post[]> {
  return fetchHn().then(
    (posts) => posts,
    (err) => {
      console.error("[hn]", err);
      return [] as Post[];
    },
  );
}

function settleX(): Promise<Post[]> {
  if (!process.env.XAI_API_KEY) return Promise.resolve([] as Post[]);
  return fetchX().then(
    (posts) => {
      console.log(`[x] ${posts.length} topics`);
      return posts;
    },
    (err) => {
      console.error("[x]", err);
      return [] as Post[];
    },
  );
}

export function beginSignals(): {
  core: Promise<Pick<RawSignals, "reddit" | "hn">>;
  x: Promise<Post[]>;
} {
  return {
    core: Promise.all([settleReddit(), settleHn()]).then(([reddit, hn]) => ({
      reddit,
      hn,
    })),
    x: settleX(),
  };
}

export async function collectSignals(): Promise<RawSignals> {
  const { core, x: xP } = beginSignals();
  const [{ reddit, hn }, x] = await Promise.all([core, xP]);
  const sources = emptyHealth();
  const degraded: string[] = [];
  if (reddit.length) sources.reddit = true;
  else degraded.push("reddit offline");
  if (hn.length) sources.hn = true;
  else degraded.push("hn offline");
  if (x.length) sources.x = true;
  else degraded.push("x offline");
  console.log(
    `[signals] reddit=${reddit.length} hn=${hn.length} x=${x.length} degraded=${degraded.join(",") || "none"}`,
  );
  return { reddit, hn, x, public: [], sources, degraded };
}
