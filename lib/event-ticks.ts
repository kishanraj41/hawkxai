import type { Post, Topic } from "./types";
import { topicPosts } from "./watchlist-lookup";

export type EventKind = "gdelt" | "nws";

export interface EventTick {
  id: string;
  kind: EventKind;
  t: string;
  title: string;
  url: string;
  lagHours: number | null;
  inWindow: boolean;
}

export function eventKindOf(sourceApi?: string): EventKind | null {
  const s = (sourceApi ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("gdelt")) return "gdelt";
  if (s === "nws" || s.includes("national weather") || s.includes("weather.gov") || s.includes("noaa")) {
    return "nws";
  }
  return null;
}

function validMs(iso: string): number | null {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : null;
}

function firstSocialAt(posts: Post[]): number | null {
  let min: number | null = null;
  for (const post of posts) {
    if (eventKindOf(post.sourceApi)) continue;
    if (post.platform === "public") continue;
    const t = validMs(post.createdAt);
    if (t === null) continue;
    if (min === null || t < min) min = t;
  }
  return min;
}

/** GDELT / NWS receipts as ticks. Lag is vs first X/Reddit/HN print — never an invented WHY. */
export function buildEventTicks(topics: Topic[], limit = 8): EventTick[] {
  const posts = topics.flatMap((t) => topicPosts(t));
  const origin = firstSocialAt(posts);
  const ticks: EventTick[] = [];
  const seen = new Set<string>();

  for (const post of posts) {
    const kind = eventKindOf(post.sourceApi);
    if (!kind) continue;
    const t = validMs(post.createdAt);
    if (t === null) continue;
    const key = post.url || `${kind}:${post.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const lagHours = origin === null ? null : Number(((t - origin) / 3600_000).toFixed(1));
    const inWindow = lagHours !== null && lagHours >= 0 && lagHours <= 24;
    ticks.push({
      id: key,
      kind,
      t: new Date(t).toISOString(),
      title: post.title,
      url: post.url,
      lagHours,
      inWindow,
    });
  }

  return ticks
    .toSorted((a, b) => a.t.localeCompare(b.t))
    .slice(0, limit);
}
