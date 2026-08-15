import { totalScore } from "./metrics";
import type { Platform, Post, Topic } from "./types";

export { totalScore };

const PLATFORM_LABEL: Record<Platform, string> = {
  x: "X",
  reddit: "Reddit",
  hn: "HN",
};

export const PLATFORM_COLOR: Record<Platform, string> = {
  x: "#ffffff",
  reddit: "#ff4500",
  hn: "#ff6600",
};

export function dominantPlatform(topic: Topic): Platform | null {
  const active = (["x", "reddit", "hn"] as Platform[]).filter(
    (p) => topic.platforms[p].score > 20,
  );
  return active.length === 1 ? active[0] : null;
}

export function divergenceLabel(topic: Topic): string {
  if (topic.divergence <= 0.34) return "everywhere";
  if (topic.divergence >= 0.66) {
    const dom = dominantPlatform(topic);
    if (dom) return `${PLATFORM_LABEL[dom]}-only bubble`;
    return "single-platform bubble";
  }
  return "spreading";
}

export function topPosts(topic: Topic, limit = 3): Post[] {
  return Object.values(topic.platforms)
    .flatMap((slice) => slice.posts)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "waiting for signals…";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}
