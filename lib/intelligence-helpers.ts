/**
 * Intelligence Helpers - Human-readable labels for technical metrics
 */

import type { Topic } from "./types";

/**
 * Echo Chamber Detector - Convert divergence to actionable insight
 */
export function echoChAmberLabel(divergence: number): {
  label: string;
  emoji: string;
  description: string;
  actionable: string;
} {
  if (divergence <= 0.34) {
    return {
      label: "Everywhere",
      emoji: "🌐",
      description: "Real cross-platform momentum. This is spreading.",
      actionable:
        "Multi-platform trend with broad reach. Campaigns here have staying power.",
    };
  }

  if (divergence >= 0.66) {
    return {
      label: "Bubble",
      emoji: "💭",
      description: "Single-platform echo chamber. Won't spread easily.",
      actionable:
        "Stay native to this platform. Don't expect cross-platform spread without earned media.",
    };
  }

  return {
    label: "Spreading",
    emoji: "📡",
    description: "Breaking out from one platform to others.",
    actionable:
      "Early cross-platform momentum. Watch for spread to additional sources in 6-8 hours.",
  };
}

/**
 * Trend Accelerometer - Velocity with context
 */
export function velocityInsight(
  velocity: Topic["velocity"]
): {
  emoji: string;
  label: string;
  color: string;
  actionable: string;
} {
  switch (velocity) {
    case "rising":
      return {
        emoji: "🔥",
        label: "Rising",
        color: "orange",
        actionable:
          "Early window. Jump in now before peak. Cheap to originate, expensive to amplify later.",
      };
    case "peaking":
      return {
        emoji: "⚡",
        label: "Peaking",
        color: "purple",
        actionable:
          "At maximum velocity. Cheap to amplify, expensive to originate. Post follow-up content.",
      };
    case "fading":
      return {
        emoji: "📉",
        label: "Fading",
        color: "zinc",
        actionable:
          "Peak has passed. Better as recap than new launch. Save budget for next trend.",
      };
    default:
      return {
        emoji: "❓",
        label: "Unknown",
        color: "zinc",
        actionable: "Insufficient velocity data. Monitor for trend signals.",
      };
  }
}

/**
 * Risk Level Labeling
 */
export function riskLevelInsight(level: "low" | "medium" | "high"): {
  emoji: string;
  color: string;
  urgency: string;
  action: string;
} {
  switch (level) {
    case "high":
      return {
        emoji: "🚨",
        color: "red",
        urgency: "URGENT",
        action:
          "Immediate review required. Consider pausing campaign spend until sentiment stabilizes.",
      };
    case "medium":
      return {
        emoji: "⚠️",
        color: "orange",
        urgency: "CAUTION",
        action:
          "Monitor closely over next 2-4 hours. Prepare messaging adjustments if escalates.",
      };
    case "low":
      return {
        emoji: "✓",
        color: "green",
        urgency: "NORMAL",
        action: "Risk levels normal. Continue standard monitoring.",
      };
  }
}

/**
 * Platform Spread Probability Insight
 */
export function spreadProbabilityLabel(probability: number): {
  label: string;
  confidence: string;
  color: string;
} {
  if (probability >= 0.7) {
    return {
      label: "Highly Likely",
      confidence: "Strong signal for spread",
      color: "green",
    };
  }
  if (probability >= 0.5) {
    return {
      label: "Likely",
      confidence: "Moderate signal for spread",
      color: "yellow",
    };
  }
  if (probability >= 0.3) {
    return {
      label: "Possible",
      confidence: "Weak signal for spread",
      color: "zinc",
    };
  }
  return {
    label: "Unlikely",
    confidence: "Minimal signal for spread",
    color: "zinc",
  };
}

/**
 * Campaign Phase Insight
 */
export function campaignPhaseInsight(phase: "rise" | "peak" | "fade"): {
  emoji: string;
  label: string;
  action: string;
} {
  switch (phase) {
    case "rise":
      return {
        emoji: "📈",
        label: "Rising Phase",
        action: "Build momentum. Post consistently. Peak is ahead.",
      };
    case "peak":
      return {
        emoji: "🎯",
        label: "Peak Phase",
        action: "Amplify heavily. Maximum engagement window. Strike now.",
      };
    case "fade":
      return {
        emoji: "🌅",
        label: "Fade Phase",
        action: "Wind down. Recap learnings. Prepare for next cycle.",
      };
  }
}

/**
 * Time Until Peak - Human readable
 */
export function timeUntilPeakLabel(hours: number | null): string {
  if (hours === null) return "Unknown";
  if (hours === 0) return "Now";
  if (hours < 1) return "< 1 hour";
  if (hours === 1) return "1 hour";
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `${days}d ${remainingHours}h`;
}

/**
 * Confidence Badge
 */
export function confidenceBadge(confidence: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (confidence >= 0.8) {
    return { label: "High", color: "green", emoji: "✓" };
  }
  if (confidence >= 0.6) {
    return { label: "Medium", color: "yellow", emoji: "○" };
  }
  if (confidence >= 0.4) {
    return { label: "Low", color: "orange", emoji: "⚠" };
  }
  return { label: "Very Low", color: "red", emoji: "!" };
}

/**
 * Format prediction timestamp for display
 */
export function formatPredictionTime(isoString: string | null): string {
  if (!isoString) return "Unknown";

  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) return "Passed";
    if (diffHours < 1) return `${Math.round(diffHours * 60)} minutes`;
    if (diffHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Unknown";
  }
}

/**
 * Score to Heat Level
 */
export function scoreToHeat(score: number): {
  level: "cold" | "warm" | "hot" | "fire";
  emoji: string;
  color: string;
} {
  if (score >= 80) return { level: "fire", emoji: "🔥", color: "red" };
  if (score >= 50) return { level: "hot", emoji: "♨️", color: "orange" };
  if (score >= 20) return { level: "warm", emoji: "📈", color: "yellow" };
  return { level: "cold", emoji: "❄️", color: "blue" };
}
