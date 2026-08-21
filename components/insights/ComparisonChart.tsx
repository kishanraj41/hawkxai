"use client";

import type { ComparisonItem } from "@/lib/insights-types";

interface ComparisonChartProps {
  data: ComparisonItem[];
}

export default function ComparisonChart({ data }: ComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="signal-label">No comparison data available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="signal-label">Benchmark Comparison</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-white/60">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-white/30" />
            <span className="text-white/60">Benchmark</span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-auto">
        {data.map((item) => (
          <div key={item.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  vs benchmark · {item.benchmark.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl tabular-nums text-white">
                  {item.value.toFixed(2)}
                </p>
                <p className={`text-xs font-mono tabular-nums ${
                  item.change > 0 ? "text-emerald-400" : 
                  item.change < 0 ? "text-red-400" : 
                  "text-white/50"
                }`}>
                  {item.change > 0 ? "+" : ""}{item.change.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="relative h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div
                  className="absolute h-full bg-cyan-400/80 transition-all duration-500"
                  style={{ width: `${Math.min(100, (item.value / 1) * 100)}%` }}
                />
                <div
                  className="absolute h-full w-0.5 bg-white/40"
                  style={{ left: `${Math.min(100, (item.benchmark / 1) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span>0.00</span>
                <span>1.00</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {item.value > item.benchmark ? (
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                  Above benchmark
                </span>
              ) : item.value < item.benchmark ? (
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">
                  Below benchmark
                </span>
              ) : (
                <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/60">
                  At benchmark
                </span>
              )}
              <span className="text-[10px] text-white/40">
                {((item.value / item.benchmark - 1) * 100).toFixed(1)}% difference
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
