"use client";

import type { Topic } from "@/lib/types";

interface IntelligenceBadgesProps {
  topic: Topic;
  compact?: boolean;
}

/**
 * Intelligence badges: Divergence, Velocity, Risk indicators
 * Make key insights glanceable at topic level
 */
export function IntelligenceBadges({ topic, compact = false }: IntelligenceBadgesProps) {
  const divergence = topic.divergence ?? 0.5;
  const velocity = topic.velocity;

  // Divergence badge (Echo Chamber Detector)
  const divergenceLabel =
    divergence <= 0.34 ? "Everywhere" : divergence >= 0.66 ? "Bubble" : "Spreading";
  const divergenceColor =
    divergence <= 0.34
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : divergence >= 0.66
        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
        : "bg-blue-500/20 text-blue-300 border-blue-500/30";

  // Velocity badge (Trend Accelerometer)
  const velocityEmoji = velocity === "rising" ? "🔥" : velocity === "peaking" ? "⚡" : "📉";
  const velocityColor =
    velocity === "rising"
      ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
      : velocity === "peaking"
        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
        : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${velocityColor}`}
          title={`Velocity: ${velocity}`}
        >
          {velocityEmoji}
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${divergenceColor}`}
          title={`Divergence: ${divergenceLabel} (${(divergence * 100).toFixed(0)}%)`}
        >
          {divergenceLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Velocity Badge */}
      <div className={`rounded-lg border px-3 py-1.5 ${velocityColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{velocityEmoji}</span>
          <div>
            <div className="text-xs font-semibold capitalize">{velocity}</div>
            <div className="text-[10px] opacity-70">Trend Accelerometer</div>
          </div>
        </div>
      </div>

      {/* Divergence Badge (Echo Chamber Detector) */}
      <div className={`rounded-lg border px-3 py-1.5 ${divergenceColor}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">
            {divergence <= 0.34 ? "🌐" : divergence >= 0.66 ? "💭" : "📡"}
          </span>
          <div>
            <div className="text-xs font-semibold">{divergenceLabel}</div>
            <div className="text-[10px] opacity-70">
              Echo Chamber Detector · {(divergence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Peak Hour Badge (if available) */}
      {topic.peakHourCT && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-blue-300">
          <div className="flex items-center gap-2">
            <span className="text-base">⏰</span>
            <div>
              <div className="text-xs font-semibold">Peak: {topic.peakHourCT}</div>
              <div className="text-[10px] opacity-70">Historical CT</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Risk Radar Badge - Standalone component for risk level
 */
interface RiskRadarBadgeProps {
  level: "low" | "medium" | "high";
  riskRatio?: number;
  clustering?: boolean;
}

export function RiskRadarBadge({ level, riskRatio, clustering }: RiskRadarBadgeProps) {
  if (level === "low") return null; // Don't show low risk

  const emoji = level === "high" ? "🚨" : "⚠️";
  const colorClass =
    level === "high"
      ? "bg-red-500/20 text-red-300 border-red-500/40"
      : "bg-orange-500/20 text-orange-300 border-orange-500/40";

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${colorClass}`}>
      <span className="text-base">{emoji}</span>
      <div>
        <div className="text-xs font-semibold">Risk: {level.toUpperCase()}</div>
        {riskRatio !== undefined && (
          <div className="text-[10px] opacity-70">
            {(riskRatio * 100).toFixed(0)}% risk words
            {clustering && " · Clustering"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Platform Distribution Indicator
 * Shows which platforms are active with heat bars
 */
interface PlatformHeatProps {
  topic: Topic;
}

export function PlatformHeat({ topic }: PlatformHeatProps) {
  const platforms = [
    { id: "x", label: "X", color: "bg-blue-500" },
    { id: "reddit", label: "Reddit", color: "bg-orange-500" },
    { id: "hn", label: "HN", color: "bg-amber-500" },
    { id: "public", label: "APIs", color: "bg-green-500" },
  ] as const;

  const maxScore = Math.max(
    ...platforms.map((p) => topic.platforms[p.id]?.score ?? 0),
    1
  );

  return (
    <div className="space-y-1.5">
      {platforms.map((platform) => {
        const score = topic.platforms[platform.id]?.score ?? 0;
        const width = (score / maxScore) * 100;
        const postCount = topic.platforms[platform.id]?.posts?.length ?? 0;

        if (score === 0) return null;

        return (
          <div key={platform.id} className="flex items-center gap-2">
            <div className="w-12 text-[10px] font-medium uppercase text-zinc-400">
              {platform.label}
            </div>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full transition-all ${platform.color}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-[10px] tabular-nums text-zinc-500">
              {Math.round(score)}
              <span className="ml-1 text-zinc-600">({postCount})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Quick Intelligence Summary - One-liner for topic cards
 */
interface QuickIntelligenceProps {
  topic: Topic;
  peakPrediction?: {
    hoursUntilPeak: number | null;
    currentPhase: string;
  };
}

export function QuickIntelligence({ topic, peakPrediction }: QuickIntelligenceProps) {
  const divergence = topic.divergence ?? 0.5;
  const velocity = topic.velocity;

  let insight = "";

  if (peakPrediction?.hoursUntilPeak && peakPrediction.hoursUntilPeak > 0) {
    insight = `🔥 Peaks in ${peakPrediction.hoursUntilPeak}h`;
  } else if (velocity === "peaking") {
    if (divergence >= 0.66) {
      insight = "⚡ At peak · Single-platform bubble";
    } else {
      insight = "⚡ At peak · Multi-platform momentum";
    }
  } else if (velocity === "rising") {
    insight = "📈 Rising · Early window";
  } else {
    insight = "📉 Fading · Better as recap";
  }

  return (
    <div className="rounded bg-white/5 px-2 py-1 text-xs text-white/70">
      {insight}
    </div>
  );
}
