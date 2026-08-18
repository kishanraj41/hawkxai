import { NextResponse } from "next/server";
import { boostTrends } from "@/lib/booster";
import { cacheGet, cacheSet } from "@/lib/cache";
import { attachCollection } from "@/lib/collect";
import type { BoosterPayload, TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const TRENDS_KEY = "trends:v1";
const BOOSTER_KEY = "booster:v1";

export async function GET() {
  const trends = cacheGet<TrendsPayload>(TRENDS_KEY);
  if (!trends) {
    return NextResponse.json(
      { error: "Load the tape first (GET /api/trends), then plug a close alias." },
      { status: 409 },
    );
  }

  const cached = cacheGet<BoosterPayload>(BOOSTER_KEY);
  if (cached && cached.sourceUpdatedAt === trends.updatedAt && cached.forecasts?.length) {
    return NextResponse.json(cached);
  }

  const boosted = cached?.sourceUpdatedAt === trends.updatedAt ? cached : boostTrends(trends);
  const payload = await attachCollection(trends, boosted);
  cacheSet(BOOSTER_KEY, payload);
  return NextResponse.json(payload);
}
