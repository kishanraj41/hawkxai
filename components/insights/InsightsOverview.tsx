"use client";

import type { InsightsDashboard } from "@/lib/insights-types";

interface InsightsOverviewProps {
  dashboards: InsightsDashboard[];
  selectedId: string | null;
  onSelect: (dashboard: InsightsDashboard) => void;
}

export default function InsightsOverview({
  dashboards,
  selectedId,
  onSelect,
}: InsightsOverviewProps) {
  if (dashboards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="signal-label text-center">
          No insights yet · Analyze a POI to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      {dashboards.map((dashboard) => (
        <button
          key={dashboard.poiId}
          onClick={() => onSelect(dashboard)}
          className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-150 ${
            selectedId === dashboard.poiId
              ? "border-white/30 bg-white/[0.08]"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-white">
                {dashboard.poiLabel}
              </p>
              <p className="mt-0.5 text-[11px] text-white/50">
                {dashboard.category}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[11px] tabular-nums text-white/70">
                {dashboard.footprint.infiltrationScore.toFixed(0)}%
              </span>
              <span className="text-[10px] text-white/40">infiltration</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-white/60">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
              {(dashboard.footprint.organicRatio * 100).toFixed(0)}% organic
            </span>
            <span>·</span>
            <span>
              ${(dashboard.footprint.dollarImpact.estimated / 1000).toFixed(0)}K impact
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mt-1">
            {dashboard.insights.key.slice(0, 2).map((insight, idx) => (
              <span
                key={idx}
                className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/60"
              >
                {insight.length > 40 ? `${insight.slice(0, 37)}...` : insight}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
