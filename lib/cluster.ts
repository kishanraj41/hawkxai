import { grokJson } from "./grok";
import { clusteredListSchema } from "./schemas";
import {
  divergenceOf,
  peakHourCT,
  scalePosts,
  singletonTopics,
  slug,
  totalScore,
  velocityOf,
} from "./metrics";
import type { Platform, Post, RawSignals, Topic } from "./types";

const PLATFORMS: Platform[] = ["x", "reddit", "hn"];

function compact(posts: Post[], n: number) {
  return [...posts]
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((p, i) => ({ i, title: p.title.slice(0, 140), score: p.score }));
}

function empty() {
  return { score: 0, posts: [] as Post[] };
}

function hydrate(
  label: string,
  buckets: Record<Platform, Post[]>,
): Topic {
  const platforms = {
    x: empty(),
    reddit: empty(),
    hn: empty(),
  };
  for (const p of PLATFORMS) {
    const posts = buckets[p].slice(0, 5);
    platforms[p] = {
      posts,
      score: p === "x" ? (posts[0]?.score ?? 0) : scalePosts(posts),
    };
  }
  const all = PLATFORMS.flatMap((p) => platforms[p].posts);
  return {
    id: slug(label),
    label,
    platforms,
    velocity: "peaking",
    divergence: divergenceOf({ platforms }),
    peakHourCT: peakHourCT(all),
    tickers: [],
  };
}

export async function clusterTopics(
  signals: RawSignals,
  prev?: Topic[],
): Promise<Topic[]> {
  const reddit = compact(signals.reddit, 25);
  const hn = compact(signals.hn, 25);
  const x = compact(signals.x, 15);
  const all = { reddit: signals.reddit, hn: signals.hn, x: signals.x };

  if (!process.env.XAI_API_KEY) {
    return singletonTopics([...signals.reddit, ...signals.hn, ...signals.x]);
  }

  try {
    const parsed = await grokJson(
      `Group these posts into 12-20 cross-platform topics.
Use only the provided items. Empty posts arrays are allowed.
Return strict JSON:
{"topics":[{"id":"slug","label":"phrase","platforms":{"x":{"score":0,"posts":[]},"reddit":{"score":0,"posts":[]},"hn":{"score":0,"posts":[]}}}]}
posts items must be {platform,title,url,score,createdAt} copied from inputs when possible.

X: ${JSON.stringify(x)}
Reddit: ${JSON.stringify(reddit)}
HN: ${JSON.stringify(hn)}`,
      (raw) => clusteredListSchema.parse(JSON.parse(raw)),
    );

    const topics = parsed.topics.map((t) => {
      const buckets: Record<Platform, Post[]> = { x: [], reddit: [], hn: [] };
      for (const p of PLATFORMS) {
        const fromModel = t.platforms[p].posts;
        buckets[p] = fromModel
          .map((fp) =>
            all[p].find(
              (rp) =>
                rp.url === fp.url ||
                rp.title.toLowerCase() === fp.title.toLowerCase(),
            ),
          )
          .filter((x): x is Post => Boolean(x));
        if (!buckets[p].length) {
          const idxs = fromModel
            .map((fp) => reddit.find((r) => r.title === fp.title)?.i)
            .filter((n): n is number => n !== undefined);
          if (p === "reddit") {
            buckets[p] = idxs.map((i) => all.reddit[i]).filter(Boolean);
          }
        }
      }
      const topic = hydrate(t.label, buckets);
      const score = totalScore(topic);
      topic.velocity = velocityOf(topic.id, score, prev);
      return topic;
    });
    console.log(`[cluster] grok grouped ${topics.length} topics`);
    return topics;
  } catch (err) {
    console.error("[cluster] falling back to singletons", err);
    return singletonTopics([...signals.reddit, ...signals.hn, ...signals.x]);
  }
}
