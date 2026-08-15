import type { Post } from "./types";

const TOP = "https://hacker-news.firebaseio.com/v0/topstories.json";
const ITEM = (id: number) =>
  `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

interface HnItem {
  id?: number;
  title?: string;
  url?: string;
  score?: number;
  time?: number;
  type?: string;
  dead?: boolean;
  deleted?: boolean;
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function fetchHn(limit = 60): Promise<Post[]> {
  const idsRes = await fetch(TOP, { cache: "no-store" });
  if (!idsRes.ok) throw new Error(`hn topstories ${idsRes.status}`);
  const ids = ((await idsRes.json()) as number[]).slice(0, limit);

  const items = await mapPool(ids, 8, async (id) => {
    const res = await fetch(ITEM(id), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HnItem;
  });

  const posts = items
    .filter((it): it is HnItem => Boolean(it?.title) && !it?.dead && !it?.deleted)
    .map((it) => ({
      platform: "hn" as const,
      title: it.title ?? "",
      url: it.url ?? `https://news.ycombinator.com/item?id=${it.id}`,
      score: Number(it.score ?? 0),
      createdAt: new Date((it.time ?? 0) * 1000).toISOString(),
    }));

  console.log(`[hn] ${posts.length} stories`);
  return posts;
}
