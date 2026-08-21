import { NextRequest, NextResponse } from "next/server";
import { cachePeek } from "@/lib/cache";
import { normalizeAliases } from "@/lib/poi";
import { addWatchlist, insightsFor, listWatchlist, removeWatchlist, tagReceipt } from "@/lib/watchlist-store";
import type { TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const listed = await listWatchlist();
  const tape = cachePeek<TrendsPayload>("trends:v1");
  const insights = await insightsFor(listed.entities, tape);
  return NextResponse.json({
    backend: listed.backend,
    updatedAt: new Date().toISOString(),
    insights,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { label?: string; aliases?: string | string[] };
  const label = (body.label ?? "").trim();
  if (label.length < 2) {
    return NextResponse.json({ error: "label too short" }, { status: 400 });
  }
  const extra = Array.isArray(body.aliases)
    ? body.aliases
    : String(body.aliases ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const entity = await addWatchlist(label, normalizeAliases(label, extra));
  const tape = cachePeek<TrendsPayload>("trends:v1");
  const [insight] = await insightsFor([entity], tape);
  return NextResponse.json({ entity, insight });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    entityId?: string;
    url?: string;
    tag?: string;
  };
  const entityId = (body.entityId ?? "").trim();
  const url = (body.url ?? "").trim();
  const tag = body.tag;
  if (!entityId || !url || (tag !== "official" && tag !== "occupied" && tag !== "ignore")) {
    return NextResponse.json({ error: "entityId, url, and tag required" }, { status: 400 });
  }
  await tagReceipt(entityId, url, tag);
  const listed = await listWatchlist();
  const tape = cachePeek<TrendsPayload>("trends:v1");
  const entity = listed.entities.find((e) => e.id === entityId);
  const insights = entity ? await insightsFor([entity], tape) : [];
  return NextResponse.json({ ok: true, insight: insights[0] ?? null });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim() ?? "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await removeWatchlist(id);
  return NextResponse.json({ ok });
}
