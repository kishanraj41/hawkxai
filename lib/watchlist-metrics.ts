import type { PoiInsight } from "./types";

export interface WatchlistRollup {
  watched: number;
  receipts: number;
  thin: number;
  occupied: number;
  rising: number;
  fading: number;
  organicMean: number | null;
  occupancyMean: number | null;
  lead: PoiInsight | null;
  officialReceipts: number;
  occupiedReceipts: number;
}

export function rollupWatchlist(insights: PoiInsight[]): WatchlistRollup {
  const watched = insights.length;
  const receipts = insights.reduce((n, row) => n + row.receiptCount, 0);
  const thin = insights.filter((row) => row.thin).length;
  const scored = insights.filter((row) => !row.thin);
  const occupied = scored.filter((row) => row.occupancy >= 0.5).length;
  const rising = scored.filter((row) => row.outlook === "rising").length;
  const fading = scored.filter((row) => row.outlook === "fading").length;
  const organicMean =
    scored.length === 0
      ? null
      : scored.reduce((n, row) => n + row.organic, 0) / scored.length;
  const occupancyMean =
    scored.length === 0
      ? null
      : scored.reduce((n, row) => n + row.occupancy, 0) / scored.length;
  const officialReceipts = insights.reduce((n, row) => n + row.officialCount, 0);
  const occupiedReceipts = insights.reduce((n, row) => n + row.occupiedCount, 0);
  return {
    watched,
    receipts,
    thin,
    occupied,
    rising,
    fading,
    organicMean,
    occupancyMean,
    lead: insights[0] ?? null,
    officialReceipts,
    occupiedReceipts,
  };
}

export type WatchSort = "rank" | "occupancy" | "organic" | "delta" | "receipts" | "outlook";

function sortValue(row: PoiInsight, sort: WatchSort): number {
  if (sort === "occupancy") return row.thin ? -1 : row.occupancy;
  if (sort === "organic") return row.thin ? -1 : row.organic;
  if (sort === "delta") return row.delta;
  if (sort === "receipts") return row.receiptCount;
  if (sort === "outlook") {
    const order = { rising: 4, peaking: 3, fading: 2, stable: 1, thin: 0 };
    return row.thin ? 0 : order[row.outlook] ?? 0;
  }
  return row.rankScore;
}

export function sortInsights(
  insights: PoiInsight[],
  sort: WatchSort,
  dir: "asc" | "desc" = "desc",
): PoiInsight[] {
  const mul = dir === "desc" ? -1 : 1;
  return [...insights].toSorted((a, b) => {
    const av = sortValue(a, sort);
    const bv = sortValue(b, sort);
    if (av === bv) return a.entity.label.localeCompare(b.entity.label);
    return (av - bv) * mul;
  });
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function deltaLabel(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
