import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cachePeek, cacheSet } from "@/lib/cache";
import { attachXPosts, clusterTopics } from "@/lib/cluster";
import {
  collectorAgent,
  collectorSummary,
  healthFrom,
  reviewerAgent,
  validatorAgent,
  whyAgent,
} from "@/lib/agents";
import { geoAgent, trendsCacheKey } from "@/lib/geo";
import type { TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
// Hobby (no Fluid) max is 60s. 120 requires Pro and fails the production deploy.
export const maxDuration = 60;

const LAST_KEY = "trends:v1";
const inflight = new Map<string, Promise<TrendsPayload>>();

async function runPipeline(geo: ReturnType<typeof geoAgent>, cacheKey: string) {
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
  const briefed = await whyAgent(reviewed.topics);

  const pipeline = `${geo.log} → ${collectorLog} → ${clusterLog} → ${validated.log} → ${reviewed.log} → ${briefed.log}`;
  console.log(`[pipeline] ${pipeline}`);

  const payload: TrendsPayload = {
    topics: briefed.topics,
    updatedAt: new Date().toISOString(),
    sources,
    degraded,
    pipeline,
  };
  cacheSet(cacheKey, payload);
  cacheSet(LAST_KEY, payload);
  console.log(`[trends] ${briefed.topics.length} topics @ ${payload.updatedAt}`);
  return payload;
}

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const geo = geoAgent(req.nextUrl.searchParams.get("city"));
  console.log(geo.log);
  const cacheKey = trendsCacheKey(geo.city);

  if (!refresh) {
    const cached = cacheGet<TrendsPayload>(cacheKey);
    if (cached) return NextResponse.json(cached);
    const stale = cachePeek<TrendsPayload>(cacheKey);
    if (stale) return NextResponse.json(stale);
  }

  const existing = inflight.get(cacheKey);
  if (existing && !refresh) {
    return NextResponse.json(await existing);
  }

  const job = runPipeline(geo, cacheKey).finally(() => {
    if (inflight.get(cacheKey) === job) inflight.delete(cacheKey);
  });
  inflight.set(cacheKey, job);
  return NextResponse.json(await job);
}
