"use client";

import type { InsightsDashboard } from "@/lib/insights-types";

interface InsightsDetailProps {
  dashboard: InsightsDashboard | null;
}

export default function InsightsDetail({ dashboard }: InsightsDetailProps) {
  if (!dashboard) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="signal-label text-center">Select a dashboard to view details</p>
      </div>
    );
  }

  const { lineage, footprint, publicSources, poiData } = dashboard;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="text-lg font-medium text-white mb-1">{dashboard.poiLabel}</h2>
        <p className="text-xs text-white/50">{dashboard.category}</p>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <h3 className="signal-label mb-3">Data Lineage</h3>
        
        <div className="mb-4 flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${
            lineage.isOrganic ? "bg-emerald-400" : "bg-amber-400"
          }`} />
          <div className="flex-1">
            <p className="text-sm text-white">
              {lineage.isOrganic ? "Organic Data" : "Mixed Sources"}
            </p>
            <p className="text-xs text-white/50">
              {(lineage.organicScore * 100).toFixed(0)}% organic · {lineage.traceDepth} trace steps
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {lineage.steps.map((step, idx) => (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-mono text-white/60">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-white truncate">{step.source}</p>
                  {step.verified && (
                    <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-white/50">
                  <span className="font-mono">{step.platform}</span>
                  <span>·</span>
                  <span>{step.method}</span>
                  <span>·</span>
                  <span>{(step.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                {step.tool && (
                  <p className="mt-1 text-[10px] font-mono text-white/40">{step.tool}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded bg-white/[0.04] p-3">
          <p className="text-[10px] text-white/50 mb-2">LINEAGE SUMMARY</p>
          <p className="text-xs text-white/70 leading-relaxed">
            Data originated from {lineage.steps.length} distinct source{lineage.steps.length !== 1 ? 's' : ''}.
            {lineage.isOrganic 
              ? " All sources are verified and organic." 
              : " Mixed organic and synthetic sources detected."}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <h3 className="signal-label mb-3">Footprint Analysis</h3>
        
        <div className="space-y-3 mb-4">
          <FootprintMetric
            label="Infiltration Score"
            value={footprint.infiltrationScore}
            max={100}
            color="cyan"
            description="Overall market presence and visibility"
          />
          <FootprintMetric
            label="Market Penetration"
            value={footprint.marketPenetration}
            max={100}
            color="blue"
            description="Estimated market share capture"
          />
          <FootprintMetric
            label="Reach"
            value={footprint.reach}
            max={100}
            color="amber"
            description="Audience reach across platforms"
          />
          <FootprintMetric
            label="Engagement"
            value={footprint.engagement}
            max={100}
            color="emerald"
            description="User interaction and engagement level"
          />
        </div>

        <div className="rounded border border-white/8 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-white">Sentiment Analysis</p>
            <span className={`rounded px-2 py-0.5 text-[10px] ${
              footprint.sentiment === "positive" ? "bg-emerald-500/20 text-emerald-400" :
              footprint.sentiment === "negative" ? "bg-red-500/20 text-red-400" :
              footprint.sentiment === "neutral" ? "bg-white/10 text-white/60" :
              "bg-amber-500/20 text-amber-400"
            }`}>
              {footprint.sentiment}
            </span>
          </div>
          <p className="text-xs text-white/60">
            Based on {footprint.metrics.length} analyzed metrics
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <h3 className="signal-label mb-3">
          Dollar Impact · {footprint.dollarImpact.timeframe}
        </h3>
        
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-mono tabular-nums text-white">
              ${(footprint.dollarImpact.estimated / 1000).toFixed(1)}K
            </span>
            <span className="text-xs text-white/50">estimated</span>
          </div>
          <p className="text-xs text-white/50">
            Range: ${(footprint.dollarImpact.range[0] / 1000).toFixed(1)}K - 
            ${(footprint.dollarImpact.range[1] / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-white/50 mt-1">
            {(footprint.dollarImpact.confidence * 100).toFixed(0)}% confidence
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-white/50 mb-2">IMPACT BREAKDOWN</p>
          {footprint.dollarImpact.breakdown.map((item) => (
            <div key={item.category} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/80">{item.category}</span>
                  <span className="text-xs font-mono tabular-nums text-white/60">
                    ${(item.amount / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500"
                    style={{ 
                      width: `${(item.amount / footprint.dollarImpact.estimated) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <h3 className="signal-label mb-3">Public Data Sources</h3>
        <div className="space-y-2">
          {publicSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] p-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{source.name}</p>
                <p className="text-[10px] text-white/50 mt-0.5">
                  {source.category} · {source.dataPoints.toLocaleString()} points
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400"
                    style={{ width: `${source.reliability * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-white/60">
                  {(source.reliability * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
        <h3 className="signal-label mb-3">POI Data Summary</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-white/50">Total Data Points</span>
            <span className="font-mono text-white">{poiData.dataPoints.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Relevance Score</span>
            <span className="font-mono text-white">{(poiData.relevanceScore * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Keywords</span>
            <span className="text-white">{poiData.keywords.length}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {poiData.keywords.map((keyword, idx) => (
            <span
              key={idx}
              className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/70"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FootprintMetric({
  label,
  value,
  max,
  color,
  description,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  description: string;
}) {
  const colorClasses: Record<string, string> = {
    cyan: "from-cyan-400 to-cyan-600",
    blue: "from-blue-400 to-blue-600",
    amber: "from-amber-400 to-amber-600",
    emerald: "from-emerald-400 to-emerald-600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/80">{label}</span>
        <span className="text-xs font-mono tabular-nums text-white">
          {value.toFixed(1)}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden mb-1">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color] || colorClasses.cyan} transition-all duration-500`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-white/50">{description}</p>
    </div>
  );
}
