import { fetchHn } from "./hn";
import { fetchReddit } from "./reddit";
import { grokJson } from "./grok";
import { xTrendListSchema } from "./schemas";
import type { Post, RawSignals, SourceHealth } from "./types";

function emptyHealth(): SourceHealth {
  return { x: false, reddit: false, hn: false };
}

async function fetchX(): Promise<Post[]> {
  const parsed = await grokJson(
    `List the 15 most discussed topics on X in the last 24 hours in tech/business/culture.
For each: topic phrase, rough volume 0-100, 3 example post URLs.
Return strict JSON: {"topics":[{"topic":"","volume":0,"urls":["https://x.com/..."]}]}`,
    (raw) => xTrendListSchema.parse(JSON.parse(raw)),
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

export async function collectSignals(): Promise<RawSignals> {
  const sources = emptyHealth();
  const degraded: string[] = [];
  const redditP = fetchReddit().then(
    (posts) => {
      sources.reddit = true;
      return posts;
    },
    (err) => {
      console.error("[reddit]", err);
      degraded.push("reddit offline");
      return [] as Post[];
    },
  );
  const hnP = fetchHn().then(
    (posts) => {
      sources.hn = true;
      return posts;
    },
    (err) => {
      console.error("[hn]", err);
      degraded.push("hn offline");
      return [] as Post[];
    },
  );
  const xP = process.env.XAI_API_KEY
    ? fetchX().then(
        (posts) => {
          sources.x = true;
          console.log(`[x] ${posts.length} topics`);
          return posts;
        },
        (err) => {
          console.error("[x]", err);
          degraded.push("x offline");
          return [] as Post[];
        },
      )
    : Promise.resolve([] as Post[]).then((posts) => {
        degraded.push("x offline");
        return posts;
      });

  const [reddit, hn, x] = await Promise.all([redditP, hnP, xP]);
  console.log(
    `[signals] reddit=${reddit.length} hn=${hn.length} x=${x.length} degraded=${degraded.join(",") || "none"}`,
  );
  return { reddit, hn, x, sources, degraded };
}
