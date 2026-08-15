import type { Platform, Post, Topic } from "./types";

function emptySlice() {
  return { score: 0, posts: [] as Post[] };
}

export function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "topic";
}

export function divergenceOf(topic: Pick<Topic, "platforms">): number {
  const n = (["x", "reddit", "hn"] as Platform[]).filter(
    (p) => topic.platforms[p].score > 20,
  ).length;
  return 1 - n / 3;
}

export function velocityOf(
  id: string,
  score: number,
  prev?: Topic[],
): Topic["velocity"] {
  const old = prev?.find((t) => t.id === id);
  if (!old) return score > 60 ? "rising" : "peaking";
  const prevScore = totalScore(old);
  if (score > prevScore * 1.08) return "rising";
  if (score < prevScore * 0.92) return "fading";
  return "peaking";
}

export function totalScore(topic: Pick<Topic, "platforms">): number {
  return (
    topic.platforms.x.score +
    topic.platforms.reddit.score +
    topic.platforms.hn.score
  );
}

export function peakHourCT(posts: Post[]): string | undefined {
  if (posts.length < 10) return undefined;
  const hours = new Array(24).fill(0);
  for (const p of posts) {
    const h = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: "America/Chicago",
      }).format(new Date(p.createdAt)),
    );
    if (!Number.isNaN(h)) hours[h] += 1;
  }
  const peak = hours.indexOf(Math.max(...hours));
  const hour12 = peak % 12 || 12;
  const suffix = peak >= 12 ? "pm" : "am";
  return `${hour12}${suffix}`;
}

export function scalePosts(posts: Post[], cap = 100): number {
  if (!posts.length) return 0;
  const max = Math.max(...posts.map((p) => p.score), 1);
  const avg = posts.reduce((s, p) => s + p.score, 0) / posts.length;
  return Math.max(1, Math.min(cap, Math.round((avg / max) * cap)));
}

export function singletonTopics(posts: Post[], limit = 18): Topic[] {
  const ranked = [...posts].sort((a, b) => b.score - a.score).slice(0, limit);
  return ranked.map((p) => {
    const platforms = { x: emptySlice(), reddit: emptySlice(), hn: emptySlice() };
    platforms[p.platform] = {
      score: Math.min(100, Math.round(Math.log10(p.score + 1) * 40)),
      posts: [p],
    };
    const label = p.title.slice(0, 80);
    return {
      id: slug(label),
      label,
      platforms,
      velocity: "rising" as const,
      divergence: divergenceOf({ platforms }),
      tickers: [],
    };
  });
}
