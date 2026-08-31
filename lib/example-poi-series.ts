import { nextWindowFromSeries } from "./poi";
import type { ExamplePoiCompare, ExamplePoiIndustry, ForecastOutlook } from "./types";

export interface IndustryHourSnap {
  hour: string;
  counts: Partial<Record<ExamplePoiIndustry, number>>;
  locatedCount: number;
}

const MAX_HOURS = 8;
const series: IndustryHourSnap[] = [];

export function hourBucket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 13) + ":00:00.000Z";
  d.setUTCMinutes(0, 0, 0);
  d.setUTCMilliseconds(0);
  return d.toISOString();
}

export function recordIndustryHour(compare: ExamplePoiCompare, at = compare.collectedAt): IndustryHourSnap {
  const hour = hourBucket(at);
  const counts: IndustryHourSnap["counts"] = {};
  for (const row of compare.industries) counts[row.category] = row.liveNear;
  const snap: IndustryHourSnap = { hour, counts, locatedCount: compare.locatedCount };
  const idx = series.findIndex((s) => s.hour === hour);
  if (idx >= 0) series[idx] = snap;
  else series.push(snap);
  series.sort((a, b) => a.hour.localeCompare(b.hour));
  if (series.length > MAX_HOURS) series.splice(0, series.length - MAX_HOURS);
  return snap;
}

export function industryWindow(category: ExamplePoiIndustry): number[] {
  return series.map((s) => s.counts[category] ?? 0);
}

export function industryBaselines(category: ExamplePoiIndustry): { last: number; prev: number } {
  const last = series.at(-1);
  const prev = series.at(-2);
  const lastCount = last?.counts[category] ?? 0;
  const prevCount = prev?.counts[category] ?? 0;
  const lastBase = last && last.locatedCount > 0 ? lastCount / last.locatedCount : 0;
  const prevBase = prev && prev.locatedCount > 0 ? prevCount / prev.locatedCount : 0;
  return { last: lastBase, prev: prevBase };
}

export function industryOutlookFromHours(
  category: ExamplePoiIndustry,
  liveNear: number,
): { outlook: ForecastOutlook; window: number[] } {
  const window = industryWindow(category);
  const seriesWindow = window.length ? window : [liveNear];
  const { last, prev } = industryBaselines(category);
  if (seriesWindow.length < 2) {
    return { outlook: "thin", window: seriesWindow };
  }
  return { outlook: nextWindowFromSeries(seriesWindow, last, prev), window: seriesWindow };
}

export function peekIndustrySeries(): IndustryHourSnap[] {
  return series.map((s) => ({ ...s, counts: { ...s.counts } }));
}

export function resetIndustrySeries(): void {
  series.length = 0;
}
