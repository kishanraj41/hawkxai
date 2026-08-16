import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cachePeek, cacheSet } from "@/lib/cache";
import { attachPublicPosts, attachXPosts, clusterTopics, neighborTopics, plugTopicFromPosts } from "@/lib/cluster";
import {
  collectorAgent,
  collectorSummary,
  healthFrom,
  reviewerAgent,
  validatorAgent,
  whyAgent,
} from "@/lib/agents";
import { geoAgent, trendsCacheKey } from "@/lib/geo";
import { enrichQueryIntent, inferQueryIntent, toQueryInsight } from "@/lib/query";
import { recordPulls } from "@/lib/rl";
import { buildSentiment } from "@/lib/sentiment";
import type { TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
// Hobby (no Fluid) max is 60s. 120 requires Pro and fails the production deploy.
export const maxDuration = 60;

const LAST_KEY = "trends:v1";
const inflight = new Map<string, Promise<TrendsPayload>>();

function markPlatformPulls(sources: TrendsPayload["sources"]) {
  const names = [
    ...(sources.x ? ["X"] : []),
    ...(sources.reddit ? ["Reddit"] : []),
    ...(sources.hn ? ["HN"] : []),
  ];
  if (names.length) recordPulls(names);
}

async function runPipeline(geo: ReturnType<typeof geoAgent>, cacheKey: string) {
  const prev = cachePeek<TrendsPayload>(cacheKey)?.topics;
  const collected = collectorAgent(geo);
  const [redditR, hnR, publicR] = await Promise.all([
    collected.reddit,
    collected.hn,
    collected.public,
  ]);

  const [clustered, xR] = await Promise.all([
    clusterTopics(
      {
        reddit: redditR.posts,
        hn: hnR.posts,
        x: [],
        public: [],
        sources: { x: false, reddit: redditR.ok, hn: hnR.ok, public: publicR.ok },
        degraded: [],
      },
      prev,
    ),
    collected.x,
  ]);
  if (xR.ok) attachXPosts(clustered, xR.posts);
  if (publicR.ok) attachPublicPosts(clustered, publicR.posts);
  const { sources, degraded } = healthFrom([xR, redditR, hnR, publicR]);
  markPlatformPulls(sources);

  const collectorLog = collectorSummary([xR, redditR, hnR, publicR]);
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
    publicApis: publicR.publicApis,
  };
  cacheSet(cacheKey, payload);
  cacheSet(LAST_KEY, payload);
  console.log(`[trends] ${briefed.topics.length} topics @ ${payload.updatedAt}`);
  return payload;
}

async function runPlug(
  geo: ReturnType<typeof geoAgent>,
  topic: string,
  cacheKey: string,
) {
  const local = inferQueryIntent(topic);
  const intentPromise = enrichQueryIntent(local);
  const collected = collectorAgent(geo, local.search);
  const [redditR, hnR, xR, publicR, intent] = await Promise.all([
    collected.reddit,
    collected.hn,
    collected.x,
    collected.public,
    intentPromise,
  ]);
  const posts = [...redditR.posts, ...hnR.posts, ...xR.posts, ...publicR.posts];
  let clustered = plugTopicFromPosts(topic, posts, intent);
  const used = new Set(clustered.map((t) => t.id));
  const tape = cachePeek<TrendsPayload>(LAST_KEY)?.topics ?? [];
  const neighbors = neighborTopics(topic, intent.aliases, tape).filter((t) => !used.has(t.id));
  if (neighbors.length) clustered = [...clustered, ...neighbors];
  const { sources, degraded } = healthFrom([xR, redditR, hnR, publicR]);
  markPlatformPulls(sources);

  const collectorLog = collectorSummary([xR, redditR, hnR, publicR]);
  const clusterLog = `plug: "${topic}" ${clustered.length} topics from ${posts.length} posts · ${intent.kind}/${intent.category}`;
  console.log(clusterLog);

  const validated = validatorAgent(clustered);
  const pipeline = `${geo.log} → ${collectorLog} → ${clusterLog} → ${validated.log}`;
  console.log(`[pipeline] ${pipeline}`);

  const lead = validated.topics[0] ?? null;
  const sentiment = lead ? buildSentiment(lead) : null;
  const payload: TrendsPayload = {
    topics: validated.topics,
    updatedAt: new Date().toISOString(),
    sources,
    degraded,
    pipeline,
    publicApis: publicR.publicApis,
    plugged: topic,
    query: toQueryInsight(intent, validated.topics, sentiment),
  };
  cacheSet(cacheKey, payload);
  cacheSet(LAST_KEY, payload);
  console.log(`[trends] plugged "${topic}" ${validated.topics.length} topics @ ${payload.updatedAt}`);
  return payload;
}

export async function GET(req: NextRequest) {
  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const geo = geoAgent(req.nextUrl.searchParams.get("city"));
  const topic = (req.nextUrl.searchParams.get("topic") ?? "").trim();
  console.log(topic ? `${geo.log} topic="${topic}"` : geo.log);
  const cacheKey = trendsCacheKey(geo.city, topic || undefined);

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

  const job = (
    topic ? runPlug(geo, topic, cacheKey) : runPipeline(geo, cacheKey)
  ).finally(() => {
    if (inflight.get(cacheKey) === job) inflight.delete(cacheKey);
  });
  inflight.set(cacheKey, job);
  return NextResponse.json(await job);
}
