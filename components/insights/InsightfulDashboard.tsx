"use client";

import type { InsightsDashboard } from "@/lib/insights-types";

interface InsightfulDashboardProps {
  dashboard: InsightsDashboard;
}

export default function InsightfulDashboard({ dashboard }: InsightfulDashboardProps) {
  const { footprint, analysis, insights } = dashboard;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Infiltration Score"
          value={`${footprint.infiltrationScore.toFixed(1)}%`}
          trend={footprint.metrics[0]?.trend || "stable"}
          description="Overall market presence"
        />
        <MetricCard
          label="Market Penetration"
          value={`${footprint.marketPenetration.toFixed(1)}%`}
          trend="stable"
          description="Market share estimate"
        />
        <MetricCard
          label="Organic Ratio"
          value={`${(footprint.organicRatio * 100).toFixed(1)}%`}
          trend={footprint.organicRatio > 0.7 ? "increasing" : "stable"}
          description="Authentic content percentage"
        />
        <MetricCard
          label="Dollar Impact"
          value={`$${(footprint.dollarImpact.estimated / 1000).toFixed(0)}K`}
          trend="increasing"
          description={`${footprint.dollarImpact.timeframe} estimate`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InsightSection
          title="Key Insights"
          items={insights.key}
          color="emerald"
        />
        <InsightSection
          title="Actionable Recommendations"
          items={insights.actionable}
          color="blue"
        />
      </div>

      {insights.risks.length > 0 && (
        <InsightSection
          title="Risks & Concerns"
          items={insights.risks}
          color="red"
        />
      )}

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <h3 className="signal-label mb-3">Industry Analysis · {analysis.category}</h3>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/60">Overall Score</span>
            <span className="font-mono text-sm tabular-nums text-white">
              {analysis.score.toFixed(1)}/100
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${analysis.score}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded bg-white/[0.04] p-3">
            <p className="text-[10px] text-white/50 mb-2">TOP FACTORS</p>
            {analysis.factors.slice(0, 3).map((factor) => (
              <div key={factor.id} className="mb-1.5 last:mb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/80 truncate">{factor.name}</span>
                  <span className={`text-xs ${
                    factor.trend === "up" ? "text-emerald-400" :
                    factor.trend === "down" ? "text-red-400" :
                    "text-white/50"
                  }`}>
                    {factor.trend === "up" ? "↑" : factor.trend === "down" ? "↓" : "→"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded bg-white/[0.04] p-3">
            <p className="text-[10px] text-white/50 mb-2">CONSTRAINTS</p>
            {analysis.constraints.slice(0, 3).map((constraint) => (
              <div key={constraint.id} className="mb-1.5 last:mb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/80 truncate">{constraint.name}</span>
                  <span className={`text-xs ${constraint.met ? "text-emerald-400" : "text-amber-400"}`}>
                    {constraint.met ? "✓" : "!"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded bg-white/[0.04] p-3">
            <p className="text-[10px] text-white/50 mb-2">VARIABLES</p>
            {analysis.variables.slice(0, 3).map((variable) => (
              <div key={variable.id} className="mb-1.5 last:mb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/80 truncate">{variable.name}</span>
                  <span className="text-xs text-white/60 font-mono">
                    {variable.type === "boolean" 
                      ? (variable.value ? "T" : "F")
                      : String(variable.value).slice(0, 6)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
  description,
}: {
  label: string;
  value: string;
  trend: "increasing" | "decreasing" | "stable";
  description: string;
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] text-white/50 uppercase tracking-wide">{label}</p>
        <span className={`text-xs ${
          trend === "increasing" ? "text-emerald-400" :
          trend === "decreasing" ? "text-red-400" :
          "text-white/40"
        }`}>
          {trend === "increasing" ? "↑" : trend === "decreasing" ? "↓" : "→"}
        </span>
      </div>
      <p className="font-mono text-2xl tabular-nums text-white mb-1">{value}</p>
      <p className="text-xs text-white/50">{description}</p>
    </div>
  );
}

function InsightSection({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: "emerald" | "blue" | "red";
}) {
  const colorClasses = {
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    blue: "border-blue-500/20 bg-blue-500/5",
    red: "border-red-500/20 bg-red-500/5",
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <h3 className="signal-label mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-2 text-sm text-white/80">
            <span className="shrink-0 mt-1.5 h-1 w-1 rounded-full bg-white/40" />
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
