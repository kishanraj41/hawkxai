"use client";

import type { BoosterTopicBrief, Topic } from "@/lib/types";

interface PredictionPanelProps {
  topic: Topic;
  brief: BoosterTopicBrief;
}

export function PredictionPanel({ brief }: PredictionPanelProps) {
  const predictions = brief.predictions;

  if (!predictions) {
    return null;
  }

  const { summary, peakTime, platformSpread, campaignArc, riskAlert } = predictions;

  return (
    <div className="space-y-4">
      {/* Prediction Summary - Most Important */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-950/30 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-100">{summary.headline}</h3>
            <p className="mt-1 text-sm text-blue-200">{summary.nextAction}</p>
            <p className="mt-2 text-xs text-blue-300/70">{summary.timeframe}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-blue-300/60">Confidence</div>
            <div className="text-2xl font-bold text-blue-100">
              {Math.round(summary.confidence * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Risk Alert - Conditional */}
      {riskAlert.level !== "low" && (
        <div
          className={`rounded-lg border p-4 ${
            riskAlert.level === "high"
              ? "border-red-500/50 bg-red-950/30"
              : "border-orange-500/50 bg-orange-950/30"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {riskAlert.level === "high" ? "🚨" : "⚠️"}
            </div>
            <div className="flex-1">
              <h3
                className={`font-semibold ${
                  riskAlert.level === "high" ? "text-red-100" : "text-orange-100"
                }`}
              >
                Risk Alert: {riskAlert.level.toUpperCase()}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  riskAlert.level === "high" ? "text-red-200" : "text-orange-200"
                }`}
              >
                {riskAlert.reasoning}
              </p>
              <div className="mt-3 space-y-1">
                {riskAlert.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className={`text-xs ${
                      riskAlert.level === "high" ? "text-red-300/80" : "text-orange-300/80"
                    }`}
                  >
                    {rec}
                  </div>
                ))}
              </div>
              {riskAlert.clustering && (
                <div
                  className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${
                    riskAlert.level === "high"
                      ? "bg-red-900/50 text-red-200"
                      : "bg-orange-900/50 text-orange-200"
                  }`}
                >
                  Clustering detected ({riskAlert.recentPosts} posts in {riskAlert.timeWindow})
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prediction Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Peak Time */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <h4 className="text-sm font-medium text-zinc-300">
            {peakTime.currentPhase === "pre-peak"
              ? "🔥 Peak Time Prediction"
              : peakTime.currentPhase === "at-peak"
                ? "⚡ At Peak Now"
                : "📉 Peak Passed"}
          </h4>
          <div className="mt-2">
            {peakTime.hoursUntilPeak !== null && peakTime.hoursUntilPeak > 0 ? (
              <div className="text-2xl font-bold text-white">
                {peakTime.hoursUntilPeak}h
              </div>
            ) : peakTime.currentPhase === "at-peak" ? (
              <div className="text-xl font-bold text-green-400">Now</div>
            ) : (
              <div className="text-xl font-medium text-zinc-500">Fading</div>
            )}
          </div>
          <p className="mt-2 text-xs text-zinc-400">{peakTime.reasoning}</p>
        </div>

        {/* Campaign Arc */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
          <h4 className="text-sm font-medium text-zinc-300">📊 Campaign Arc</h4>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-white">
                {campaignArc.currentPhase === "rise"
                  ? "Rising"
                  : campaignArc.currentPhase === "peak"
                    ? "At Peak"
                    : "Fading"}
              </span>
              {campaignArc.totalLifecycleHours && (
                <span className="text-xs text-zinc-500">
                  ~{Math.round(campaignArc.totalLifecycleHours / 24)}d total
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-1">
              {campaignArc.arcCurve.map((phase, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded ${
                    phase.phase === campaignArc.currentPhase
                      ? "bg-blue-500"
                      : "bg-zinc-700"
                  }`}
                  style={{
                    opacity:
                      phase.phase === campaignArc.currentPhase
                        ? 1
                        : phase.phase === "peak"
                          ? 0.6
                          : 0.3,
                  }}
                  title={`${phase.phase}: ${phase.durationHours}h`}
                />
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">{campaignArc.reasoning}</p>
        </div>

        {/* Platform Spread */}
        {platformSpread.willSpreadTo.length > 0 && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 sm:col-span-2">
            <h4 className="text-sm font-medium text-zinc-300">
              🌐 Platform Spread Prediction
            </h4>
            <div className="mt-3 space-y-2">
              {platformSpread.willSpreadTo
                .filter((p) => p.probability >= 0.3)
                .map((spread) => (
                  <div key={spread.platform} className="flex items-center gap-3">
                    <div className="w-16 text-xs font-medium uppercase text-zinc-400">
                      {spread.platform}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full transition-all ${
                            spread.probability >= 0.7
                              ? "bg-green-500"
                              : spread.probability >= 0.5
                                ? "bg-yellow-500"
                                : "bg-zinc-600"
                          }`}
                          style={{ width: `${spread.probability * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right text-xs text-zinc-400">
                      {Math.round(spread.probability * 100)}%
                      {spread.estimatedHours && (
                        <span className="ml-1 text-zinc-500">
                          ~{spread.estimatedHours}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            <p className="mt-3 text-xs text-zinc-400">{platformSpread.reasoning}</p>
          </div>
        )}
      </div>

      {/* Confidence Footer */}
      <div className="text-center text-xs text-zinc-500">
        Predictions based on velocity, divergence, and historical patterns · Evidence-only
        correlation
      </div>
    </div>
  );
}
