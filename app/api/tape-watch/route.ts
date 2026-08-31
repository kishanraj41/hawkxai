import { NextRequest, NextResponse } from "next/server";
import { loadTapeWatch, saveTapeWatch } from "@/lib/watchlist-store";
import { parseWatchStore } from "@/lib/watch";

export const dynamic = "force-dynamic";

/** Starred prints + measured snapshots. Cloud SQL when TREND_DB_* is set; else memory. */
export async function GET() {
  const listed = await loadTapeWatch();
  return NextResponse.json({
    backend: listed.backend,
    store: listed.store,
    updatedAt: new Date().toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { store?: unknown };
  const store = parseWatchStore(JSON.stringify(body.store ?? body));
  const saved = await saveTapeWatch(store);
  return NextResponse.json({ backend: saved.backend, store, ok: true });
}
