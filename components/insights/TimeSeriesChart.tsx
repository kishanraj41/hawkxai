"use client";

import { useMemo } from "react";
import type { TimeSeriesPoint } from "@/lib/insights-types";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
}

export default function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  const { maxValue, points } = useMemo(() => {
    const max = Math.max(...data.map(d => d.value));
    const pts = data.map((d, i) => ({
      ...d,
      x: (i / (data.length - 1)) * 100,
      yTotal: ((d.value / max) * 100),
      yOrganic: ((d.organic / max) * 100),
      ySynthetic: ((d.synthetic / max) * 100),
    }));
    return { maxValue: max, points: pts };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="signal-label">No time series data available</p>
      </div>
    );
  }

  const pathTotal = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${100 - p.yTotal}`
  ).join(' ');

  const pathOrganic = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${100 - p.yOrganic}`
  ).join(' ');

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="signal-label">Time Series Analysis</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-white/60">Total</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white/60">Organic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400/50" />
            <span className="text-white/60">Synthetic</span>
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-white/8 bg-white/[0.02] p-6">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{ minHeight: "300px" }}
        >
          <defs>
            <linearGradient id="gradientTotal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradientOrganic" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={i * 25}
              x2="100"
              y2={i * 25}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.2"
            />
          ))}

          <path
            d={`${pathTotal} L 100 100 L 0 100 Z`}
            fill="url(#gradientTotal)"
          />

          <path
            d={`${pathOrganic} L 100 100 L 0 100 Z`}
            fill="url(#gradientOrganic)"
          />

          <path
            d={pathTotal}
            fill="none"
            stroke="rgb(34, 211, 238)"
            strokeWidth="0.5"
          />

          <path
            d={pathOrganic}
            fill="none"
            stroke="rgb(52, 211, 153)"
            strokeWidth="0.5"
          />

          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={100 - p.yTotal}
                r="0.8"
                fill="rgb(34, 211, 238)"
              />
              <circle
                cx={p.x}
                cy={100 - p.yOrganic}
                r="0.8"
                fill="rgb(52, 211, 153)"
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg Total" value={Math.round(data.reduce((s, d) => s + d.value, 0) / data.length)} />
        <StatCard label="Avg Organic" value={Math.round(data.reduce((s, d) => s + d.organic, 0) / data.length)} />
        <StatCard label="Peak Value" value={Math.max(...data.map(d => d.value))} />
        <StatCard label="Data Points" value={data.length} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] text-white/50 mb-1">{label}</p>
      <p className="font-mono text-xl tabular-nums text-white">{value}</p>
    </div>
  );
}
