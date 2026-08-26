"use client";

import { useId } from "react";
import type { EventTick } from "@/lib/event-ticks";
import { historyMarks, xAtTime, type HistoryMark } from "@/lib/occurrence-overlay";
import { PLATFORM_COLOR } from "@/lib/ui-helpers";
import { PLATFORMS, type Platform, type SnapshotPoint, type TimeBucket } from "@/lib/types";

interface TimeseriesChartProps {
  series: TimeBucket[];
  firstAt?: string | null;
  height?: number;
  selectedT?: string | null;
  onSelect?: (t: string | null) => void;
  overlay?: { label: string; totals: number[] } | null;
  ticks?: EventTick[];
  history?: SnapshotPoint[];
}

function stackedPath(
  series: TimeBucket[],
  width: number,
  yOf: (bucket: TimeBucket) => { y0: number; y1: number },
): string {
  if (series.length === 0) return "";
  const step = series.length === 1 ? width : width / (series.length - 1);
  const top: string[] = [];
  const bottom: string[] = [];
  series.forEach((bucket, i) => {
    const x = i * step;
    const { y0, y1 } = yOf(bucket);
    top.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y1.toFixed(1)}`);
    bottom.push(`${x.toFixed(1)},${y0.toFixed(1)}`);
  });
  return `${top.join(" ")} L${[...bottom].reverse().join(" L")} Z`;
}

function linePath(values: number[], width: number, height: number, padY: number, maxTotal: number): string {
  if (values.length === 0) return "";
  const step = values.length === 1 ? width : width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - padY - (Math.max(v, 0) / maxTotal) * (height - padY * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function historyPath(marks: HistoryMark[], series: TimeBucket[], width: number, height: number, padY: number, maxTotal: number): string {
  const pts = marks.flatMap((mark) => {
    const x = xAtTime(mark.at, series, width);
    if (x === null) return [];
    const y = height - padY - (Math.max(mark.receipts, 0) / maxTotal) * (height - padY * 2);
    return [{ x, y }];
  });
  if (pts.length < 2) return "";
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

export default function TimeseriesChart({
  series,
  firstAt = null,
  height = 128,
  selectedT = null,
  onSelect,
  overlay = null,
  ticks = [],
  history = [],
}: TimeseriesChartProps) {
  const uid = useId().replace(/:/g, "");
  const width = 480;
  const padY = 4;
  const overlayMax = overlay ? Math.max(...overlay.totals, 0) : 0;
  const hist = historyMarks(series, history);
  const histMax = hist.reduce((n, m) => Math.max(n, m.receipts), 0);
  const maxTotal = Math.max(...series.map((b) => b.total), overlayMax, histMax, 1);
  const firstMs = firstAt ? new Date(firstAt).getTime() : null;
  const firstIndex =
    firstMs && series.length
      ? series.findIndex((b, i) => {
          const t = new Date(b.t).getTime();
          const next = series[i + 1];
          const end = next ? new Date(next.t).getTime() : t + 3600_000;
          return firstMs >= t && firstMs < end;
        })
      : -1;

  if (series.length === 0) {
    return (
      <p className="signal-label">No dated receipts — occurrence chart needs timestamps.</p>
    );
  }

  const order: Platform[] = ["public", "hn", "reddit", "x"];
  const paths = order.map((platform) => {
    const d = stackedPath(series, width, (bucket) => {
        let y0count = 0;
        for (const p of order) {
          if (p === platform) break;
          y0count += bucket[p];
        }
        const y1count = y0count + bucket[platform];
        const y0 = height - padY - (y0count / maxTotal) * (height - padY * 2);
        const y1 = height - padY - (y1count / maxTotal) * (height - padY * 2);
        return { y0, y1 };
      },
    );
    return { platform, d };
  });

  const tickEvery = Math.max(1, Math.ceil(series.length / 6));
  const markerX =
    firstIndex >= 0 && series.length > 1 ? (firstIndex / (series.length - 1)) * width : null;
  const overlayD =
    overlay && overlay.totals.length === series.length
      ? linePath(overlay.totals, width, height, padY, maxTotal)
      : "";
  const historyD = historyPath(hist, series, width, height, padY, maxTotal);

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 18}`}
      className="w-full"
      style={{ height: height + 18 }}
      role={onSelect ? "group" : "img"}
      aria-label={
        onSelect
          ? "Occurrence timeseries by source. Select a window to filter receipts."
          : "Occurrence timeseries by source"
      }
    >
      <defs>
        {PLATFORMS.map((p) => (
          <linearGradient key={p} id={`ts-${uid}-${p}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PLATFORM_COLOR[p]} stopOpacity="0.35" />
            <stop offset="100%" stopColor={PLATFORM_COLOR[p]} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {paths.map(({ platform, d }) =>
        d ? (
          <path key={platform} d={d} fill={`url(#ts-${uid}-${platform})`} stroke={PLATFORM_COLOR[platform]} strokeWidth="1" />
        ) : null,
      )}
      {onSelect
        ? series.map((bucket, i) => {
            const step = series.length <= 1 ? width : width / (series.length - 1);
            const cx = series.length === 1 ? width / 2 : i * step;
            const hitW = Math.max(step, 8);
            const on = selectedT === bucket.t;
            return (
              <rect
                key={`hit-${bucket.t}`}
                x={cx - hitW / 2}
                y={padY}
                width={hitW}
                height={height - padY * 2}
                fill={on ? "rgba(232,162,58,0.16)" : "transparent"}
                className="watch-ts-hit"
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`${bucket.label}: ${bucket.total} receipt${bucket.total === 1 ? "" : "s"}`}
                onClick={() => onSelect(on ? null : bucket.t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(on ? null : bucket.t);
                  }
                }}
              />
            );
          })
        : null}
      {overlayD ? (
        <path d={overlayD} fill="none" stroke="#e4e4e7" strokeWidth="1.6" strokeDasharray="4 3" pointerEvents="none" />
      ) : null}
      {historyD ? (
        <path d={historyD} fill="none" stroke="#a78bfa" strokeWidth="1.4" strokeDasharray="2 3" pointerEvents="none" />
      ) : null}
      {markerX !== null ? (
        <line
          x1={markerX}
          x2={markerX}
          y1={padY}
          y2={height - padY}
          stroke="#e8a23a"
          strokeWidth="1"
          strokeDasharray="3 3"
          pointerEvents="none"
        />
      ) : null}
      {ticks.map((tick) => {
        const x = xAtTime(tick.t, series, width);
        if (x === null) return null;
        const fill = tick.kind === "gdelt" ? "#7dd3fc" : "#38bdf8";
        const lag =
          tick.lagHours == null
            ? "no social first print to lag against"
            : tick.inWindow
              ? `${tick.lagHours}h after first social print`
              : `${tick.lagHours}h lag · outside 0–24h window`;
        const label = `${tick.kind === "gdelt" ? "GDELT" : "NWS"}: ${tick.title}. ${lag}. Receipt only — not a WHY.`;
        return tick.url ? (
          <a key={tick.id} href={tick.url} target="_blank" rel="noreferrer">
            <circle cx={x} cy={padY + 6} r={5} fill={fill} className="ts-event-tick" aria-label={label} />
          </a>
        ) : (
          <circle key={tick.id} cx={x} cy={padY + 6} r={5} fill={fill} className="ts-event-tick" aria-label={label} />
        );
      })}
      {series.map((bucket, i) =>
        i % tickEvery === 0 ? (
          <text
            key={bucket.t}
            x={series.length === 1 ? 0 : (i / (series.length - 1)) * width}
            y={height + 14}
            fill="rgba(244,244,245,0.45)"
            fontSize="9"
            fontFamily="var(--font-plex), ui-monospace, monospace"
            pointerEvents="none"
          >
            {bucket.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
