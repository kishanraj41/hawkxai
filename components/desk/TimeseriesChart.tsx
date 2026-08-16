import { PLATFORM_COLOR } from "@/lib/ui-helpers";
import { PLATFORMS, type Platform, type TimeBucket } from "@/lib/types";

interface TimeseriesChartProps {
  series: TimeBucket[];
  firstAt?: string | null;
  height?: number;
}

function stackedPath(
  series: TimeBucket[],
  width: number,
  height: number,
  yOf: (bucket: TimeBucket) => { y0: number; y1: number },
  maxTotal: number,
): string {
  if (series.length === 0 || maxTotal <= 0) return "";
  const step = series.length === 1 ? width : width / (series.length - 1);
  const top: string[] = [];
  const bottom: string[] = [];
  series.forEach((bucket, i) => {
    const x = i * step;
    const { y0, y1 } = yOf(bucket);
    top.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y1.toFixed(1)}`);
    bottom.push(`${x.toFixed(1)},${y0.toFixed(1)}`);
  });
  return `${top.join(" ")} L${bottom.toReversed().join(" L")} Z`;
}

export default function TimeseriesChart({ series, firstAt = null, height = 128 }: TimeseriesChartProps) {
  const width = 480;
  const padY = 4;
  const maxTotal = Math.max(...series.map((b) => b.total), 1);
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
    const d = stackedPath(
      series,
      width,
      height,
      (bucket) => {
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
      maxTotal,
    );
    return { platform, d };
  });

  const tickEvery = Math.max(1, Math.ceil(series.length / 6));
  const markerX =
    firstIndex >= 0 && series.length > 1 ? (firstIndex / (series.length - 1)) * width : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 18}`}
      className="h-32 w-full"
      role="img"
      aria-label="Occurrence timeseries by source"
    >
      <defs>
        {PLATFORMS.map((p) => (
          <linearGradient key={p} id={`ts-${p}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PLATFORM_COLOR[p]} stopOpacity="0.35" />
            <stop offset="100%" stopColor={PLATFORM_COLOR[p]} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {paths.map(({ platform, d }) =>
        d ? (
          <path key={platform} d={d} fill={`url(#ts-${platform})`} stroke={PLATFORM_COLOR[platform]} strokeWidth="1" />
        ) : null,
      )}
      {markerX !== null ? (
        <line
          x1={markerX}
          x2={markerX}
          y1={padY}
          y2={height - padY}
          stroke="#e8a23a"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ) : null}
      {series.map((bucket, i) =>
        i % tickEvery === 0 ? (
          <text
            key={bucket.t}
            x={series.length === 1 ? 0 : (i / (series.length - 1)) * width}
            y={height + 14}
            fill="rgba(244,244,245,0.45)"
            fontSize="9"
            fontFamily="var(--font-plex), ui-monospace, monospace"
          >
            {bucket.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
