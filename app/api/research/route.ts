import { NextRequest, NextResponse } from "next/server";
import { researchTopic } from "@/lib/research";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Deep topic research: Wikipedia, web, HN, Reddit, X, optional Grok deep pass. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "q required" }, { status: 400 });
  }
  try {
    const payload = await researchTopic(q);
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[research]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "research failed" },
      { status: 502 },
    );
  }
}
