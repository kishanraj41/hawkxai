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
import { topicBoost } from "./rl";
import { PLATFORMS, type Platform, type Post, type RawSignals, type Topic } from "./types";

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
    public: empty(),
  };
  for (const p of PLATFORMS) {
    const posts = (buckets[p] ?? []).slice(0, 5);
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
  const all = {
    reddit: signals.reddit,
    hn: signals.hn,
    x: signals.x,
    public: signals.public ?? [],
  };

  if (!process.env.XAI_API_KEY) {
    return singletonTopics([
      ...signals.reddit,
      ...signals.hn,
      ...signals.x,
      ...(signals.public ?? []),
    ]);
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
      const buckets: Record<Platform, Post[]> = { x: [], reddit: [], hn: [], public: [] };
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
    return singletonTopics([
      ...signals.reddit,
      ...signals.hn,
      ...signals.x,
      ...(signals.public ?? []),
    ]);
  }
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n / Math.min(a.size, b.size);
}

function matchesQuery(title: string, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const t = title.toLowerCase();
  if (t.includes(q)) return true;
  const qTok = new Set(q.split(/[^a-z0-9]+/).filter((w) => w.length > 1));
  if ([...qTok].some((w) => w.length > 2 && t.includes(w))) return true;
  return overlap(qTok, tokens(title)) >= 0.18;
}

/** Build a desk-ready topic from any query + live posts. No invented WHY. */
export function plugTopicFromPosts(query: string, posts: Post[]): Topic[] {
  const label = query.trim() || "topic";
  const buckets: Record<Platform, Post[]> = { x: [], reddit: [], hn: [], public: [] };
  const related: Post[] = [];
  for (const p of posts) {
    if (matchesQuery(p.title, label)) buckets[p.platform].push(p);
    else related.push(p);
  }
  const hitCount = PLATFORMS.reduce((n, p) => n + buckets[p].length, 0);
  if (hitCount === 0) {
    for (const p of posts.slice(0, 24)) buckets[p.platform].push(p);
  }
  const topic = hydrate(label, buckets);
  topic.platforms.public.posts = buckets.public.slice(0, 12);
  const apis = topic.platforms.public.posts.flatMap((p) => (p.sourceApi ? [p.sourceApi] : []));
  topic.platforms.public.score = Math.round(scalePosts(buckets.public) * topicBoost(apis));
  topic.divergence = divergenceOf(topic);
  const topics: Topic[] = [topic];
  const leftover = related
    .filter((p) => !buckets[p.platform].includes(p))
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 24);
  const used = new Set(topics.map((t) => t.id));
  for (const p of leftover) {
    const extra = hydrate(p.title, {
      x: p.platform === "x" ? [p] : [],
      reddit: p.platform === "reddit" ? [p] : [],
      hn: p.platform === "hn" ? [p] : [],
      public: p.platform === "public" ? [p] : [],
    });
    if (used.has(extra.id)) continue;
    used.add(extra.id);
    topics.push(extra);
  }
  return topics;
}

/** Attach X topics after clustering so x_search can run in parallel with Grok. */
export function attachXPosts(topics: Topic[], xPosts: Post[]): Topic[] {
  if (!xPosts.length) return topics;
  const used = new Set<string>();
  for (const topic of topics) {
    const labelTok = tokens(topic.label);
    const matched = xPosts.filter(
      (p) => !used.has(p.title) && overlap(labelTok, tokens(p.title)) >= 0.25,
    );
    for (const p of matched) used.add(p.title);
    if (!matched.length) continue;
    topic.platforms.x.posts = matched.slice(0, 5);
    topic.platforms.x.score = matched[0]?.score ?? 0;
    topic.divergence = divergenceOf(topic);
  }
  for (const p of xPosts) {
    if (used.has(p.title)) continue;
    topics.push(hydrate(p.title, { x: [p], reddit: [], hn: [], public: [] }));
    used.add(p.title);
  }
  return topics;
}

/** Attach public-apis receipts after clustering so Grok is not blocked on 20+ feeds. */
export function attachPublicPosts(topics: Topic[], publicPosts: Post[]): Topic[] {
  if (!publicPosts.length) return topics;
  const used = new Set<string>();
  for (const topic of topics) {
    const labelTok = tokens(topic.label);
    const matched = publicPosts.filter(
      (p) => !used.has(p.title) && overlap(labelTok, tokens(p.title)) >= 0.22,
    );
    for (const p of matched) used.add(p.title);
    if (!matched.length) continue;
    topic.platforms.public.posts = matched.slice(0, 5);
    topic.platforms.public.score = Math.round(
      scalePosts(matched) * topicBoost(matched.flatMap((p) => (p.sourceApi ? [p.sourceApi] : []))),
    );
    topic.divergence = divergenceOf(topic);
  }
  const leftover = publicPosts
    .filter((p) => !used.has(p.title))
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 24);
  for (const p of leftover) {
    topics.push(hydrate(p.title, { x: [], reddit: [], hn: [], public: [p] }));
  }
  return topics;
}
