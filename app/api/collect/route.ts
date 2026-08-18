import { NextRequest, NextResponse } from "next/server";
import { cachePeek } from "@/lib/cache";
import { collectAndForecast } from "@/lib/collect";
import { allDatabaseNames, readTrendDbConfig } from "@/lib/trend-db";
import { trendStore } from "@/lib/trend-store";
import type { BoosterPayload, DeskCategory, TrendsPayload } from "@/lib/types";
import { TREND_DATABASES } from "@/lib/types";

export const dynamic = "force-dynamic";

function asCategory(value: string | null): DeskCategory {
  if (value && (TREND_DATABASES as readonly string[]).includes(value)) {
    return value as DeskCategory;
  }
  return "all";
}

export async function GET(req: NextRequest) {
  const store = trendStore();
  const configured = Boolean(readTrendDbConfig());
  const category = asCategory(req.nextUrl.searchParams.get("category"));
  const trends = cachePeek<TrendsPayload>("trends:v1");
  const booster = cachePeek<BoosterPayload>("booster:v1");
  if (!trends) {
    return NextResponse.json({
      backend: store.backend,
      configured,
      databases: allDatabaseNames(),
      snapshots: await store.snapshotCount().catch(() => 0),
      waiting: "Load GET /api/trends first so collection has a tape.",
    });
  }

  const result = await collectAndForecast(trends, booster?.briefs ?? [], category);
  return NextResponse.json({
    backend: result.collection.backend,
    configured,
    databases: result.collection.databases,
    snapshots: result.collection.snapshots,
    predicted: result.collection.predicted,
    category,
    forecasts: result.forecasts,
  });
}
