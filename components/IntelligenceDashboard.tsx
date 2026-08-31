"use client";

import { useMemo } from "react";
import type { BoosterPayload, TrendsPayload } from "@/lib/types";

interface IntelligenceDashboardProps {
  payload: TrendsPayload;
  booster?: BoosterPayload;
}

/**
 * Intelligence Dashboard - High-level overview of predictions and alerts
 * Shows: Rising topics, risk alerts, peak predictions, platform distribution
 */
export function IntelligenceDashboard({ payload, booster }: IntelligenceDashboardProps) {
  const stats = useMemo(() => {
    const topics = payload.topics;
    const briefs = booster?.briefs ?? [];

    // Count by velocity
    const rising = topics.filter((t) => t.velocity === "rising").length;
    const peaking = topics.filter((t) => t.velocity === "peaking").length;
    const fading = topics.filter((t) => t.velocity === "fading").length;

    // Count by divergence (echo chamber detection)
    const bubbles = topics.filter((t) => (t.divergence ?? 0.5) >= 0.66).length;
    const spreading = topics.filter(
      (t) => (t.divergence ?? 0.5) > 0.34 && (t.divergence ?? 0.5) < 0.66
    ).length;
    const everywhere = topics.filter((t) => (t.divergence ?? 0.5) <= 0.34).length;

    // Risk alerts from predictions
    const riskAlerts = briefs.filter(
      (b) => b.predictions?.riskAlert?.level === "high" || b.predictions?.riskAlert?.level === "medium"
    );
    const highRisk = riskAlerts.filter((b) => b.predictions?.riskAlert?.level === "high").length;
    const mediumRisk = riskAlerts.filter((b) => b.predictions?.riskAlert?.level === "medium").length;

    // Peak predictions
    const peakingSoon = briefs.filter((b) => {
      const hours = b.predictions?.peakTime?.hoursUntilPeak;
      return hours != null && hours > 0 && hours <= 8;
    });

    // Platform spread predictions
    const spreadingTopics = briefs.filter(
      (b) => b.predictions?.platformSpread?.willSpreadTo?.some((p) => p.probability >= 0.7)
    );

    return {
      velocity: { rising, peaking, fading },
      divergence: { bubbles, spreading, everywhere },
      risk: { high: highRisk, medium: mediumRisk, total: riskAlerts.length },
      predictions: {
        peakingSoon: peakingSoon.length,
        spreading: spreadingTopics.length,
      },
    };
  }, [payload, booster]);

  return (
    <div className="space-y-4">
      {/* Intelligence Summary Header */}
      <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-100">
          <span className="text-lg">🧠</span>
          Intelligence Overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Velocity Distribution */}
          <div className="rounded-lg bg-black/20 p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-blue-300/60">
              Trend Accelerometer
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-orange-300">🔥 Rising</span>
                <span className="font-semibold text-white">{stats.velocity.rising}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-purple-300">⚡ Peaking</span>
                <span className="font-semibold text-white">{stats.velocity.peaking}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">📉 Fading</span>
                <span className="font-semibold text-white">{stats.velocity.fading}</span>
              </div>
            </div>
          </div>

          {/* Echo Chamber Detection */}
          <div className="rounded-lg bg-black/20 p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-blue-300/60">
              Echo Chamber Detector
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-amber-300">💭 Bubbles</span>
                <span className="font-semibold text-white">{stats.divergence.bubbles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-300">📡 Spreading</span>
                <span className="font-semibold text-white">{stats.divergence.spreading}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-300">🌐 Everywhere</span>
                <span className="font-semibold text-white">{stats.divergence.everywhere}</span>
              </div>
            </div>
          </div>

          {/* Risk Radar */}
          <div className="rounded-lg bg-black/20 p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-blue-300/60">
              Risk Radar
            </div>
            {stats.risk.total > 0 ? (
              <div className="space-y-1 text-xs">
                {stats.risk.high > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-300">🚨 High</span>
                    <span className="font-semibold text-white">{stats.risk.high}</span>
                  </div>
                )}
                {stats.risk.medium > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-orange-300">⚠️ Medium</span>
                    <span className="font-semibold text-white">{stats.risk.medium}</span>
                  </div>
                )}
                <div className="mt-2 text-[10px] text-blue-300/60">
                  {stats.risk.total} alert{stats.risk.total !== 1 ? "s" : ""} active
                </div>
              </div>
            ) : (
              <div className="text-xs text-green-300">
                <div className="mb-1">✓ All Clear</div>
                <div className="text-[10px] text-blue-300/60">No risk alerts</div>
              </div>
            )}
          </div>

          {/* Predictions */}
          <div className="rounded-lg bg-black/20 p-3">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-blue-300/60">
              Predictions Active
            </div>
            <div className="space-y-1 text-xs">
              {stats.predictions.peakingSoon > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-orange-300">⏰ Peak Soon</span>
                  <span className="font-semibold text-white">
                    {stats.predictions.peakingSoon}
                  </span>
                </div>
              )}
              {stats.predictions.spreading > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">📡 Spreading</span>
                  <span className="font-semibold text-white">
                    {stats.predictions.spreading}
                  </span>
                </div>
              )}
              {stats.predictions.peakingSoon === 0 && stats.predictions.spreading === 0 && (
                <div className="text-blue-300/60">
                  <div className="text-[10px]">Monitoring trends...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Risk Alerts (if any) */}
      {stats.risk.total > 0 && booster?.briefs && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-red-300/60">
            🚨 Active Risk Alerts
          </h3>
          {booster.briefs
            .filter((b) => b.predictions?.riskAlert?.level !== "low")
            .slice(0, 3)
            .map((brief) => {
              const alert = brief.predictions?.riskAlert;
              if (!alert) return null;

              const topic = payload.topics.find((t) => t.id === brief.topicId);
              if (!topic) return null;

              return (
                <div
                  key={brief.topicId}
                  className={`rounded-lg border p-3 ${
                    alert.level === "high"
                      ? "border-red-500/40 bg-red-950/20"
                      : "border-orange-500/40 bg-orange-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div
                        className={`text-sm font-semibold ${
                          alert.level === "high" ? "text-red-200" : "text-orange-200"
                        }`}
                      >
                        {topic.label}
                      </div>
                      <div
                        className={`mt-1 text-xs ${
                          alert.level === "high" ? "text-red-300/80" : "text-orange-300/80"
                        }`}
                      >
                        {alert.reasoning}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 rounded px-2 py-1 text-[10px] font-semibold ${
                        alert.level === "high"
                          ? "bg-red-500/30 text-red-200"
                          : "bg-orange-500/30 text-orange-200"
                      }`}
                    >
                      {alert.level.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Peak Predictions (next 8 hours) */}
      {stats.predictions.peakingSoon > 0 && booster?.briefs && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-orange-300/60">
            ⏰ Peaking Soon (Next 8 Hours)
          </h3>
          {booster.briefs
            .filter((b) => {
              const hours = b.predictions?.peakTime?.hoursUntilPeak;
              return hours != null && hours > 0 && hours <= 8;
            })
            .sort(
              (a, b) =>
                (a.predictions?.peakTime?.hoursUntilPeak ?? 999) -
                (b.predictions?.peakTime?.hoursUntilPeak ?? 999)
            )
            .slice(0, 3)
            .map((brief) => {
              const topic = payload.topics.find((t) => t.id === brief.topicId);
              const peak = brief.predictions?.peakTime;
              if (!topic || !peak) return null;

              return (
                <div
                  key={brief.topicId}
                  className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-orange-950/20 p-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-orange-200">{topic.label}</div>
                    <div className="mt-0.5 text-xs text-orange-300/70">{peak.reasoning}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold text-orange-100">
                      {peak.hoursUntilPeak}h
                    </div>
                    <div className="text-[10px] text-orange-300/60">until peak</div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
