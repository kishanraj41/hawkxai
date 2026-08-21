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
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <p className="signal-label text-center">
          No dashboard selected
        </p>
        <p className="text-sm text-white/50 text-center max-w-md">
          Create a new insight by entering a campaign, product, or brand name above,
          or select an existing dashboard from the list.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-4">
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
