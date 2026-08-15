import type { Post } from "./types";

const SUBS = [
  "technology",
  "wallstreetbets",
  "news",
  "Austin",
  "artificial",
] as const;

const UA =
  "PulseMap/0.1 (hackathon; https://github.com/snagaram3/grokhackx)";

interface RedditChild {
  data?: {
    title?: string;
    permalink?: string;
    url?: string;
    ups?: number;
    score?: number;
    created_utc?: number;
    stickied?: boolean;
  };
}

async function fetchSub(sub: string): Promise<Post[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${sub}/hot.json?limit=50&raw_json=1`,
    {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`reddit r/${sub} ${res.status}`);
  }
  const json = (await res.json()) as { data?: { children?: RedditChild[] } };
  const children = json.data?.children ?? [];
  return children
    .map((c) => c.data)
    .filter((d): d is NonNullable<typeof d> => Boolean(d?.title) && !d?.stickied)
    .map((d) => {
      const path = d.permalink ?? "";
      return {
        platform: "reddit" as const,
        title: d.title ?? "",
        url: path
          ? `https://www.reddit.com${path}`
          : (d.url ?? "https://www.reddit.com"),
        score: Number(d.ups ?? d.score ?? 0),
        createdAt: new Date((d.created_utc ?? 0) * 1000).toISOString(),
      };
    });
}

export async function fetchReddit(): Promise<Post[]> {
  const settled = await Promise.allSettled(SUBS.map((s) => fetchSub(s)));
  const posts: Post[] = [];
  let failed = 0;
  for (const item of settled) {
    if (item.status === "fulfilled") posts.push(...item.value);
    else failed += 1;
  }
  if (failed === SUBS.length) {
    throw new Error("reddit: all subreddits failed");
  }
  console.log(
    `[reddit] ${posts.length} posts from ${SUBS.length - failed}/${SUBS.length} subs`,
  );
  return posts;
}
