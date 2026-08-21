import { geminiJson } from "./gemini";
import { stampPosts } from "./lineage";
import { xTrendListSchema } from "./schemas";
import type { Post } from "./types";

function parseJsonObject(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("no json object");
  }
}

export async function fetchX(place?: string, topic?: string): Promise<Post[]> {
  const where = place ? ` in ${place}` : " worldwide";
  const phrase = topic?.trim();
  const prompt = phrase
    ? `Use Google Search for recent public posts on X/Twitter that mention this exact phrase (campaign, brand, hashtag, or product): "${phrase}"${where}.
This is a footprint lookup — return mentions of the phrase, not unrelated trending topics.
Only include URLs you actually retrieved. Never invent an x.com URL.
Return ONLY JSON: {"topics":[{"topic":"post title or quote that mentions the phrase","volume":0,"urls":["https://x.com/..."]}]}
volume is relative heat 0-100.`
    : `Use Google Search for the 10 hottest public topics in the last 24 hours worldwide (Asia, Africa, Europe, Latin America, and North America — not US-only)${place ? ` with extra weight on ${place}` : ""}.
Prefer public X/Twitter, news, and forum mentions. Only include URLs you actually retrieved.
Return ONLY JSON: {"topics":[{"topic":"short phrase","volume":0,"urls":["https://x.com/..."]}]}
volume is relative heat 0-100.`;
  const parsed = await geminiJson(
    prompt,
    (raw) => xTrendListSchema.parse(parseJsonObject(raw)),
    true,
  );
  return stampPosts(
    parsed.topics.map((t) => ({
      platform: "x" as const,
      title: t.topic,
      url: t.urls[0] ?? "https://x.com",
      score: t.volume,
      createdAt: new Date().toISOString(),
    })),
    "collect_x",
  );
}
