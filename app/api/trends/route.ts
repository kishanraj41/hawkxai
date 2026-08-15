import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cachePeek, cacheSet } from "@/lib/cache";
import { clusterTopics } from "@/lib/cluster";
import { collectSignals } from "@/lib/signals";
import { grokJson } from "@/lib/grok";
import { tickerListSchema } from "@/lib/schemas";
import type { Topic, TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const CACHE_KEY = "trends:v1";

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
  if (!refresh) {
    const cached = cacheGet<TrendsPayload>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  const prev = cachePeek<TrendsPayload>(CACHE_KEY)?.topics;
  const signals = await collectSignals();
  const topics = await clusterTopics(signals, prev);
  await attachTickers(topics);

  const payload: TrendsPayload = {
    topics,
    updatedAt: new Date().toISOString(),
    sources: signals.sources,
    degraded: signals.degraded,
  };
  cacheSet(CACHE_KEY, payload);
  console.log(`[trends] ${topics.length} topics @ ${payload.updatedAt}`);
  return NextResponse.json(payload);
}
