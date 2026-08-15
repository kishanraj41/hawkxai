import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/cache";
import { grokJson } from "@/lib/grok";
import type { TrendsPayload } from "@/lib/types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const answerSchema = z.object({
  answer: z.string(),
  topicIds: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { q?: string };
  const q = (body.q ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "q required" }, { status: 400 });
  }

  const trends = cacheGet<TrendsPayload>("trends:v1");
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
    const parsed = await grokJson(
      `User question: ${q}
Current topics JSON: ${JSON.stringify(trends.topics.map((t) => ({ id: t.id, label: t.label, divergence: t.divergence, velocity: t.velocity })))}
Return strict JSON: {"answer":"2-4 sentences","topicIds":["id"]}`,
      (raw) => answerSchema.parse(JSON.parse(raw)),
      true,
    );
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
