"use client";

import { useState } from "react";
import { IntelligenceBadges, PlatformHeat, QuickIntelligence, RiskRadarBadge } from "./IntelligenceBadges";
import { PredictionPanel } from "./PredictionPanel";
import type { BoosterTopicBrief, Topic } from "@/lib/types";

interface TopicCardProps {
  topic: Topic;
  brief?: BoosterTopicBrief;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * Enhanced Topic Card with Intelligence Indicators
 * Shows: Badges, Platform Heat, Quick Intelligence, Expandable Predictions
 */
export function TopicCard({ topic, brief, onClick, compact = false }: TopicCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={`group cursor-pointer rounded-lg border transition-all ${
        expanded
          ? "border-blue-500/50 bg-blue-950/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      }`}
      onClick={handleClick}
    >
      {/* Card Header */}
      <div className="p-4">
        {/* Title and Risk Badge */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="flex-1 text-base font-semibold text-white group-hover:text-blue-100">
            {topic.label}
          </h3>
          {brief?.predictions?.riskAlert && (
            <RiskRadarBadge
              level={brief.predictions.riskAlert.level}
              riskRatio={brief.predictions.riskAlert.riskRatio}
              clustering={brief.predictions.riskAlert.clustering}
            />
          )}
        </div>

        {/* Intelligence Badges */}
        {!compact && (
          <div className="mb-3">
            <IntelligenceBadges topic={topic} />
          </div>
        )}

        {/* Quick Intelligence Summary */}
        {brief?.predictions?.summary && !compact && (
          <div className="mb-3">
            <div className="rounded-lg border border-blue-500/20 bg-blue-950/10 p-2">
              <div className="text-xs font-semibold text-blue-200">
                {brief.predictions.summary.headline}
              </div>
              <div className="mt-1 text-[11px] text-blue-300/70">
                {brief.predictions.summary.nextAction}
              </div>
            </div>
          </div>
        )}

        {/* Platform Distribution */}
        {!compact && (
          <div className="mb-3">
            <PlatformHeat topic={topic} />
          </div>
        )}

        {/* Compact view elements */}
        {compact && (
          <div className="space-y-2">
            <IntelligenceBadges topic={topic} compact />
            {brief?.predictions?.peakTime && (
              <QuickIntelligence
                topic={topic}
                peakPrediction={{
                  hoursUntilPeak: brief.predictions.peakTime.hoursUntilPeak,
                  currentPhase: brief.predictions.peakTime.currentPhase,
                }}
              />
            )}
          </div>
        )}

        {/* Brief Summary (if available) */}
        {brief && !compact && (
          <div className="mt-3 border-t border-white/5 pt-3">
            <div className="text-xs text-white/60">{brief.whyTrending}</div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
              <span className="font-mono tabular-nums">
                {Math.round(brief.confidence * 100)}% evidence
              </span>
              <span>·</span>
              <span className="capitalize">{brief.category}</span>
            </div>
          </div>
        )}

        {/* Expand/Collapse Indicator */}
        <div className="mt-3 text-center text-[10px] text-blue-400/60 group-hover:text-blue-400">
          {expanded ? "▲ Collapse" : "▼ View Predictions"}
        </div>
      </div>

      {/* Expanded Predictions Panel */}
      {expanded && brief && (
        <div className="border-t border-white/10 p-4">
          <PredictionPanel topic={topic} brief={brief} />
        </div>
      )}
    </div>
  );
}

/**
 * Topic Grid - Grid layout for topic cards
 */
interface TopicGridProps {
  topics: Topic[];
  briefs?: BoosterTopicBrief[];
  onTopicClick?: (topic: Topic) => void;
  limit?: number;
}

export function TopicGrid({ topics, briefs = [], onTopicClick, limit }: TopicGridProps) {
  const displayTopics = limit ? topics.slice(0, limit) : topics;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {displayTopics.map((topic) => {
        const brief = briefs.find((b) => b.topicId === topic.id);
        return (
          <TopicCard
            key={topic.id}
            topic={topic}
            brief={brief}
            onClick={() => onTopicClick?.(topic)}
          />
        );
      })}
    </div>
  );
}

/**
 * Topic List - Compact list view
 */
interface TopicListProps {
  topics: Topic[];
  briefs?: BoosterTopicBrief[];
  onTopicClick?: (topic: Topic) => void;
}

export function TopicList({ topics, briefs = [], onTopicClick }: TopicListProps) {
  return (
    <div className="space-y-2">
      {topics.map((topic) => {
        const brief = briefs.find((b) => b.topicId === topic.id);
        return (
          <TopicCard
            key={topic.id}
            topic={topic}
            brief={brief}
            onClick={() => onTopicClick?.(topic)}
            compact
          />
        );
      })}
    </div>
  );
}
