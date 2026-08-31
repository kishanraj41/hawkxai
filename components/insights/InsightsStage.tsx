"use client";

import { useState } from "react";
import type { InsightsDashboard } from "@/lib/insights-types";
import TimeSeriesChart from "./TimeSeriesChart";
import HeatmapChart from "./HeatmapChart";
import ComparisonChart from "./ComparisonChart";
import InsightfulDashboard from "./InsightfulDashboard";

type DashboardView = "insightful" | "timeseries" | "heatmap" | "comparison";

interface InsightsStageProps {
  dashboard: InsightsDashboard | null;
  loading: boolean;
}

export default function InsightsStage({ dashboard, loading }: InsightsStageProps) {
  const [view, setView] = useState<DashboardView>("insightful");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-white/45">Loading insights…</p>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="signal-label">
        Industry model — not live receipts. Live tape is the occurrence board above.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setView("insightful")}
          className={`rounded px-3 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
            view === "insightful"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Insightful
        </button>
        <button
          onClick={() => setView("timeseries")}
          className={`rounded px-3 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
            view === "timeseries"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Time Series
        </button>
        <button
          onClick={() => setView("heatmap")}
          className={`rounded px-3 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
            view === "heatmap"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Heatmap
        </button>
        <button
          onClick={() => setView("comparison")}
          className={`rounded px-3 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
            view === "comparison"
              ? "bg-white text-black"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Comparison
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {view === "insightful" && <InsightfulDashboard dashboard={dashboard} />}
        {view === "timeseries" && <TimeSeriesChart data={dashboard.timeSeries} />}
        {view === "heatmap" && <HeatmapChart data={dashboard.heatmap} />}
        {view === "comparison" && <ComparisonChart data={dashboard.comparisons} />}
      </div>
    </div>
  );
}
