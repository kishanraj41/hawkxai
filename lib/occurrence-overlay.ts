import type { SnapshotPoint, TimeBucket } from "./types";

function msOf(iso: string): number | null {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : null;
}

/** Map overlay bucket totals onto the primary occurrence windows. No shared WHY. */
export function alignTotals(primary: TimeBucket[], overlay: TimeBucket[]): number[] {
  if (primary.length === 0) return [];
  if (overlay.length === 0) return primary.map(() => 0);

  const step =
    primary.length > 1
      ? Math.abs((msOf(primary[1].t) ?? 0) - (msOf(primary[0].t) ?? 0)) || 3600_000
      : 3600_000;

  return primary.map((bucket) => {
    const t = msOf(bucket.t);
    if (t === null) return 0;
    let best = 0;
    let bestDist = Infinity;
    for (const other of overlay) {
      const ot = msOf(other.t);
      if (ot === null) continue;
      const d = Math.abs(ot - t);
      if (d < bestDist) {
        bestDist = d;
        best = other.total;
      }
    }
    return bestDist <= step / 2 ? best : 0;
  });
}

export interface HistoryMark {
  at: string;
  receipts: number;
  score: number;
}

/** Hourly snapshot marks in the live series time range. Thin history stays off the chart. */
export function historyMarks(series: TimeBucket[], history: SnapshotPoint[]): HistoryMark[] {
  if (series.length === 0 || history.length < 2) return [];
  const t0 = msOf(series[0].t);
  const t1 = msOf(series[series.length - 1].t);
  if (t0 === null || t1 === null) return [];
  const lo = Math.min(t0, t1);
  const hi = Math.max(t0, t1);
  const pad = Math.max(hi - lo, 3600_000) * 0.05;

  return history.flatMap((point) => {
    const t = msOf(point.at);
    if (t === null) return [];
    if (t < lo - pad || t > hi + pad) return [];
    return [{ at: point.at, receipts: point.receipts, score: point.score }];
  });
}

export function xAtTime(iso: string, series: TimeBucket[], width: number): number | null {
  if (series.length === 0) return null;
  if (series.length === 1) return width / 2;
  const t0 = msOf(series[0].t);
  const t1 = msOf(series[series.length - 1].t);
  const t = msOf(iso);
  if (t0 === null || t1 === null || t === null || t1 === t0) return series.length === 1 ? width / 2 : 0;
  const u = (t - t0) / (t1 - t0);
  return Math.max(0, Math.min(1, u)) * width;
}
