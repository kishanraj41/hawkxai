import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cachePeek, cacheSet } from "@/lib/cache";
import { attachXPosts, clusterTopics } from "@/lib/cluster";
import {
  collectorAgent,
  collectorSummary,
  healthFrom,
  reviewerAgent,
  validatorAgent,
} from "@/lib/agents";
import { geoAgent } from "@/lib/geo";
import { grokJson } from "@/lib/grok";
import { tickerListSchema } from "@/lib/schemas";
import type { Topic, TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CACHE_KEY = "trends:v1";

function cacheKeyFor(city: string): string {
  return `${CACHE_KEY}:${city}`;
}

async function attachTickers(topics: Topic[]): Promise<void> {
  if (!process.env.XAI_API_KEY) return;
  const sample = topics
    .slice(0, 12)
    .flatMap((t) =>
      Object.values(t.platforms).flatMap((s) => s.posts.map((p) => p.title)),
    )
    .slice(0, 40);
  try {
    const parsed = await grokJson(
      `From these posts, list stock tickers explicitly mentioned, with sentiment and mention count.
Only tickers literally present in the text. JSON: {"tickers":[{"symbol":"NVDA","sentiment":"pos","mentions":2}]}
POSTS:\n${sample.join("\n")}`,
      (raw) => tickerListSchema.parse(JSON.parse(raw)),
    );
    for (const topic of topics) {
      const blob = Object.values(topic.platforms)
        .flatMap((s) => s.posts.map((p) => p.title))
        .join(" ")
        .toUpperCase();
      topic.tickers = parsed.tickers.filter((tk) =>
        blob.includes(tk.symbol.replace("$", "").toUpperCase()),
      );
    }
  } catch (err) {
    console.error("[tickers] skipped", err);
  }
}

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const geo = geoAgent(req.nextUrl.searchParams.get("city"));
  console.log(geo.log);
  const cacheKey = cacheKeyFor(geo.city);
  if (!refresh) {
    const cached = cacheGet<TrendsPayload>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  const prev = cachePeek<TrendsPayload>(cacheKey)?.topics;
  const collected = collectorAgent(geo);
  const [redditR, hnR] = await Promise.all([collected.reddit, collected.hn]);

  const [clustered, xR] = await Promise.all([
    clusterTopics(
      {
        reddit: redditR.posts,
        hn: hnR.posts,
        x: [],
        sources: { x: false, reddit: redditR.ok, hn: hnR.ok },
        degraded: [],
      },
      prev,
    ),
    collected.x,
  ]);
  if (xR.ok) attachXPosts(clustered, xR.posts);
  const { sources, degraded } = healthFrom([xR, redditR, hnR]);

  const collectorLog = collectorSummary([xR, redditR, hnR]);
  const clusterLog = `cluster: ${clustered.length} topics`;
  console.log(clusterLog);

  const validated = validatorAgent(clustered);
  const reviewed = await reviewerAgent(validated.topics);
  await attachTickers(reviewed.topics);

  const pipeline = `${geo.log} → ${collectorLog} → ${clusterLog} → ${validated.log} → ${reviewed.log}`;
  console.log(`[pipeline] ${pipeline}`);

  const payload: TrendsPayload = {
    topics: reviewed.topics,
    updatedAt: new Date().toISOString(),
    sources,
    degraded,
    pipeline,
  };
  cacheSet(cacheKey, payload);
  cacheSet(CACHE_KEY, payload);
  console.log(`[trends] ${reviewed.topics.length} topics @ ${payload.updatedAt}`);
  return NextResponse.json(payload);
}
