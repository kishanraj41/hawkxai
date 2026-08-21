"use client";

import { useMemo } from "react";
import type { HeatmapCell } from "@/lib/insights-types";

interface HeatmapChartProps {
  data: HeatmapCell[];
}

export default function HeatmapChart({ data }: HeatmapChartProps) {
  const { grid, xLabels, yLabels, maxValue } = useMemo(() => {
    const xs = Array.from(new Set(data.map(d => d.x)));
    const ys = Array.from(new Set(data.map(d => d.y)));
    const max = Math.max(...data.map(d => d.value));
    
    const gridData: Record<string, Record<string, number>> = {};
    for (const cell of data) {
      if (!gridData[cell.y]) gridData[cell.y] = {};
      gridData[cell.y][cell.x] = cell.value;
    }
    
    return { 
      grid: gridData, 
      xLabels: xs, 
      yLabels: ys,
      maxValue: max,
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="signal-label">No heatmap data available</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="signal-label">Cross-Platform Heatmap</h3>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span>Low</span>
          <div className="flex gap-0.5">
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(opacity => (
              <div
                key={opacity}
                className="h-3 w-3 rounded-sm bg-cyan-400"
                style={{ opacity }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="flex-1 rounded-lg border border-white/8 bg-white/[0.02] p-6 overflow-auto">
        <div className="min-w-[600px]">
          <div className="grid gap-2" style={{ 
            gridTemplateColumns: `100px repeat(${xLabels.length}, 1fr)` 
          }}>
            <div />
            {xLabels.map(x => (
              <div
                key={x}
                className="text-center text-[10px] font-mono uppercase text-white/60"
              >
                {x}
              </div>
            ))}

            {yLabels.map(y => (
              <>
                <div
                  key={`label-${y}`}
                  className="flex items-center justify-end pr-3 text-[10px] font-mono uppercase text-white/60"
                >
                  {y}
                </div>
                {xLabels.map(x => {
                  const value = grid[y]?.[x] ?? 0;
                  const intensity = maxValue > 0 ? value / maxValue : 0;
                  return (
                    <div
                      key={`${y}-${x}`}
                      className="aspect-square rounded border border-white/5 flex items-center justify-center transition-all duration-150 hover:border-white/20 cursor-default group relative"
                      style={{
                        backgroundColor: `rgba(34, 211, 238, ${intensity * 0.6})`,
                      }}
                    >
                      <span className="text-[10px] font-mono tabular-nums text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(value * 100).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <p className="signal-label mb-2">Analysis</p>
        <p className="text-xs text-white/60 leading-relaxed">
          This heatmap shows the cross-platform performance across different metrics. 
          Brighter cells indicate stronger performance. Hover over cells to see exact values.
        </p>
      </div>
    </div>
  );
}
