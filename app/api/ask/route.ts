import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/cache";
import { grokChat } from "@/lib/grok";
import { geoAgent, trendsCacheKey } from "@/lib/geo";
import type { TrendsPayload } from "@/lib/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  answer: z.string(),
  topicIds: z.array(z.string()),
});

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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    q?: string;
    city?: string;
  };
  const q = (body.q ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "q required" }, { status: 400 });
  }

  const city = geoAgent(body.city).city;
  const trends =
    cacheGet<TrendsPayload>(trendsCacheKey(city)) ??
    cacheGet<TrendsPayload>("trends:v1");
  if (!trends) {
    return NextResponse.json(
      { error: "no trends yet — hit GET /api/trends first" },
      { status: 409 },
    );
  }

  if (!process.env.XAI_API_KEY) {
    return NextResponse.json({
      answer: "Grok is offline. Showing current map only.",
      topicIds: trends.topics.slice(0, 3).map((t) => t.id),
    });
  }

  try {
    const raw = await grokChat(
      `User question: ${q}
Answer from these cached topics only. 2-4 sentences. Cite topic labels, not URLs.
Return JSON: {"answer":"","topicIds":["id"]}
Topics: ${JSON.stringify(trends.topics.map((t) => ({ id: t.id, label: t.label, divergence: t.divergence, velocity: t.velocity, why: t.why ?? "" })))}`,
      15_000,
    );
    const parsed = answerSchema.parse(parseJsonObject(raw));
    const known = new Set(trends.topics.map((t) => t.id));
    parsed.topicIds = parsed.topicIds.filter((id) => known.has(id));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[ask]", err);
    return NextResponse.json({
      answer: "Could not parse a Grok answer. Map is unchanged.",
      topicIds: [],
    });
  }
}
