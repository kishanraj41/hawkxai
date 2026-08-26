import { PLATFORMS, type PoiInsight, type Post, type TimeBucket, type Topic, type TrendsPayload } from "./types";

export function topicPosts(topic: Topic | null | undefined): Post[] {
  if (!topic) return [];
  return PLATFORMS.flatMap((p) => topic.platforms[p]?.posts ?? []);
}

export function leadTopic(payload: TrendsPayload | null | undefined): Topic | null {
  return payload?.topics[0] ?? null;
}

export function relatedPrints(payload: TrendsPayload | null | undefined, limit = 8): Topic[] {
  if (!payload) return [];
  return payload.topics.slice(1, 1 + limit);
}

export function allTopicPosts(topics: Topic[]): Post[] {
  return topics.flatMap((t) => topicPosts(t));
}

export function topicsInBucket(
  topics: Topic[],
  series: TimeBucket[],
  bucketT: string | null,
): Topic[] {
  if (!bucketT) return topics;
  return topics.filter((t) => postsInBucket(topicPosts(t), series, bucketT).length > 0);
}

export function postsInBucket(
  posts: Post[],
  series: TimeBucket[],
  bucketT: string | null,
): Post[] {
  if (!bucketT || series.length === 0) return posts;
  const i = series.findIndex((b) => b.t === bucketT);
  if (i < 0) return posts;
  const start = new Date(series[i].t).getTime();
  if (!Number.isFinite(start)) return posts;
  const next = series[i + 1];
  const end = next ? new Date(next.t).getTime() : Number.POSITIVE_INFINITY;
  return posts.filter((p) => {
    const t = new Date(p.createdAt).getTime();
    return Number.isFinite(t) && t >= start && t < end;
  });
}

export function insightForQuery(insights: PoiInsight[], query: string): PoiInsight | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = insights.find((row) => {
    if (row.entity.label.toLowerCase() === q) return true;
    return row.entity.aliases.some((a) => a.toLowerCase() === q);
  });
  if (exact) return exact;
  return (
    insights.find(
      (row) =>
        row.entity.label.toLowerCase().includes(q) ||
        row.entity.aliases.some((a) => a.toLowerCase().includes(q)),
    ) ?? null
  );
}
