/**
 * Advanced Predictive Analytics for HawkxAI
 *
 * World-class predictions: peak time, platform spread, campaign arc, risk shifts
 */

import type {
  BoosterTopicBrief,
  Platform,
  SentimentReport,
  Topic,
} from "./types";
import { totalScore } from "./metrics";

// Peak time prediction constants
const PEAK_WINDOW_HOURS = 24;
const MIN_DATA_POINTS = 3;

// Platform spread probabilities
const SPREAD_THRESHOLDS = {
  divergence: 0.34, // Below this = spreading
  minScore: 30, // Minimum score to consider spreading
  lagHours: 8, // Typical spread window
};

// Campaign arc phases
const ARC_PHASES = {
  rise: { multiplier: 1.5, durationHours: 48 },
  peak: { multiplier: 1.0, durationHours: 72 },
  fade: { multiplier: 0.5, durationHours: 120 },
} as const;

// Risk clustering thresholds
const RISK_CLUSTERING = {
  timeWindowMinutes: 120,
  minPosts: 4,
  riskThreshold: 0.25, // 25% of posts show risk
};

export interface PeakTimePrediction {
  predictedPeakTime: string | null; // ISO timestamp
  confidence: number; // 0-1
  reasoning: string;
  currentPhase: "pre-peak" | "at-peak" | "post-peak" | "unknown";
  hoursUntilPeak: number | null;
}

export interface PlatformSpreadPrediction {
  willSpreadTo: {
    platform: Platform;
    probability: number; // 0-1
    estimatedHours: number | null;
  }[];
  reasoning: string;
  confidence: number;
}

export interface CampaignArcPrediction {
  currentPhase: "rise" | "peak" | "fade";
  estimatedPhaseEnd: string | null; // ISO timestamp
  totalLifecycleHours: number | null;
  arcCurve: {
    phase: "rise" | "peak" | "fade";
    durationHours: number;
    peakMultiplier: number;
  }[];
  confidence: number;
  reasoning: string;
}

export interface RiskAlert {
  level: "low" | "medium" | "high";
  clustering: boolean;
  recentPosts: number;
  riskRatio: number; // 0-1
  timeWindow: string;
  reasoning: string;
  recommendations: string[];
}

/**
 * Predict when a topic will hit peak velocity
 */
export function predictPeakTime(
  topic: Topic,
  brief?: BoosterTopicBrief,
): PeakTimePrediction {
  const velocity = topic.velocity;
  const score = totalScore(topic);
  const now = new Date();

  // If already peaked or fading, no future peak
  if (velocity === "peaking") {
    return {
      predictedPeakTime: null,
      confidence: 0.8,
      reasoning: "Topic is currently at peak velocity. Peak time is now.",
      currentPhase: "at-peak",
      hoursUntilPeak: 0,
    };
  }

  if (velocity === "fading") {
    return {
      predictedPeakTime: null,
      confidence: 0.9,
      reasoning: "Topic is fading. Peak has already passed.",
      currentPhase: "post-peak",
      hoursUntilPeak: null,
    };
  }

  // Rising topics: predict based on velocity and score
  if (velocity === "rising") {
    // Simple heuristic: higher score = closer to peak
    // Typical rise phase is 24-48 hours
    const scoreRatio = Math.min(score / 100, 1);
    const hoursUntilPeak = Math.round(
      PEAK_WINDOW_HOURS * (1 - scoreRatio * 0.7),
    );

    // Estimate peak time
    const predictedPeak = new Date(now.getTime() + hoursUntilPeak * 3600000);

    // Adjust for divergence - single-platform bubbles peak faster
    const div = topic.divergence ?? 0.5;
    const adjustedHours = div >= 0.66 ? Math.round(hoursUntilPeak * 0.6) : hoursUntilPeak;
    const adjustedPeak = new Date(now.getTime() + adjustedHours * 3600000);

    const reasoning = div >= 0.66
      ? `Single-platform bubble peaks faster. Rising velocity + divergence ${div.toFixed(2)} → estimated ${adjustedHours}h until peak.`
      : `Rising velocity with score ${Math.round(score)}. Multi-platform spread takes longer → estimated ${adjustedHours}h until peak.`;

    return {
      predictedPeakTime: adjustedPeak.toISOString(),
      confidence: score > 50 ? 0.75 : 0.6,
      reasoning,
      currentPhase: "pre-peak",
      hoursUntilPeak: adjustedHours,
    };
  }

  return {
    predictedPeakTime: null,
    confidence: 0.3,
    reasoning: "Insufficient velocity data to predict peak time.",
    currentPhase: "unknown",
    hoursUntilPeak: null,
  };
}

/**
 * Predict platform spread probability
 */
export function predictPlatformSpread(
  topic: Topic,
  brief?: BoosterTopicBrief,
): PlatformSpreadPrediction {
  const activePlatforms = Object.entries(topic.platforms)
    .filter(([_, slice]) => slice.score > 0)
    .map(([name]) => name as Platform);

  const inactivePlatforms = (
    ["x", "reddit", "hn", "public"] as Platform[]
  ).filter((p) => !activePlatforms.includes(p));

  const score = totalScore(topic);
  const div = topic.divergence ?? 0.5;
  const velocity = topic.velocity;

  const predictions = inactivePlatforms.map((platform) => {
    // Base probability from divergence (low divergence = already spreading)
    let probability = div <= SPREAD_THRESHOLDS.divergence ? 0.8 : 0.3;

    // Adjust for velocity
    if (velocity === "rising") probability += 0.15;
    if (velocity === "fading") probability -= 0.25;

    // Adjust for score (higher score = more momentum)
    if (score > 80) probability += 0.1;
    if (score < 30) probability -= 0.2;

    // Platform-specific adjustments
    if (platform === "hn" && brief?.category === "tech") {
      probability += 0.2;
    }
    if (platform === "reddit" && div < 0.5) {
      probability += 0.15; // Reddit picks up multi-platform trends
    }
    if (platform === "x" && div < 0.4) {
      probability += 0.2; // X is often where trends spread first
    }

    // Clamp between 0-1
    probability = Math.max(0.05, Math.min(0.95, probability));

    // Estimate hours (faster for high-velocity, low-divergence)
    const baseHours = SPREAD_THRESHOLDS.lagHours;
    const adjustedHours =
      velocity === "rising" && div < 0.5 ? Math.round(baseHours * 0.6) : baseHours;

    return {
      platform,
      probability: Math.round(probability * 100) / 100,
      estimatedHours: probability > 0.5 ? adjustedHours : null,
    };
  });

  // Sort by probability descending
  predictions.sort((a, b) => b.probability - a.probability);

  const highProb = predictions.filter((p) => p.probability >= 0.7);
  const reasoning =
    highProb.length > 0
      ? `Divergence ${div.toFixed(2)} + ${velocity} velocity → ${highProb.length} platform${highProb.length > 1 ? "s" : ""} likely to spread in ${SPREAD_THRESHOLDS.lagHours}h`
      : div >= 0.66
        ? `High divergence (${div.toFixed(2)}) = single-platform bubble. Low spread probability.`
        : `Multi-platform momentum building. Spread potential moderate.`;

  return {
    willSpreadTo: predictions,
    reasoning,
    confidence: score > 50 && velocity !== "unknown" ? 0.7 : 0.5,
  };
}

/**
 * Predict campaign lifecycle arc
 */
export function predictCampaignArc(
  topic: Topic,
  brief?: BoosterTopicBrief,
): CampaignArcPrediction {
  const velocity = topic.velocity;
  const div = topic.divergence ?? 0.5;
  const score = totalScore(topic);

  // Determine current phase
  let currentPhase: "rise" | "peak" | "fade" = "peak";
  if (velocity === "rising") currentPhase = "rise";
  if (velocity === "fading") currentPhase = "fade";

  // Build arc curve
  const arcCurve: CampaignArcPrediction["arcCurve"] = [];

  // Phase durations adjusted by divergence and category
  const riseHours = div >= 0.66 ? 24 : 48; // Bubbles rise faster
  const peakHours = brief?.category === "news" ? 48 : 72; // News peaks shorter
  const fadeHours = div >= 0.66 ? 72 : 120; // Bubbles fade faster

  if (currentPhase === "rise") {
    arcCurve.push({ phase: "rise", durationHours: riseHours, peakMultiplier: 0.6 });
    arcCurve.push({ phase: "peak", durationHours: peakHours, peakMultiplier: 1.0 });
    arcCurve.push({ phase: "fade", durationHours: fadeHours, peakMultiplier: 0.4 });
  } else if (currentPhase === "peak") {
    arcCurve.push({ phase: "peak", durationHours: peakHours, peakMultiplier: 1.0 });
    arcCurve.push({ phase: "fade", durationHours: fadeHours, peakMultiplier: 0.4 });
  } else {
    arcCurve.push({ phase: "fade", durationHours: fadeHours, peakMultiplier: 0.4 });
  }

  const totalLifecycleHours = riseHours + peakHours + fadeHours;
  const now = new Date();
  const phaseEndHours = arcCurve[0]?.durationHours ?? 48;
  const estimatedPhaseEnd = new Date(now.getTime() + phaseEndHours * 3600000);

  const reasoning =
    currentPhase === "rise"
      ? `Rising → will peak in ~${riseHours}h, then fade over ${fadeHours}h. Total lifecycle ~${Math.round(totalLifecycleHours / 24)}d.`
      : currentPhase === "peak"
        ? `At peak now → will hold ${peakHours}h, then fade over ${fadeHours}h. ~${Math.round((peakHours + fadeHours) / 24)}d remaining.`
        : `Fading now → will cool over ~${fadeHours}h. Better for recap than new launch.`;

  return {
    currentPhase,
    estimatedPhaseEnd: estimatedPhaseEnd.toISOString(),
    totalLifecycleHours,
    arcCurve,
    confidence: velocity !== "unknown" ? 0.7 : 0.4,
    reasoning,
  };
}

/**
 * Detect risk clustering and sentiment shifts
 */
export function detectRiskClustering(
  topic: Topic,
  sentiment: SentimentReport,
): RiskAlert {
  const posts = Object.values(topic.platforms).flatMap((s) => s.posts);
  const recentPosts = posts.length;
  const riskCount = sentiment.overall.risk;
  const negCount = sentiment.overall.neg;
  const totalCount = sentiment.overall.n;

  const riskRatio = totalCount > 0 ? riskCount / totalCount : 0;
  const negRatio = totalCount > 0 ? negCount / totalCount : 0;

  // Clustering: multiple risk posts in short timeframe
  const clustering = riskCount >= RISK_CLUSTERING.minPosts;

  // Determine alert level
  let level: RiskAlert["level"] = "low";
  if (riskRatio >= 0.35 || (clustering && riskRatio >= 0.25)) {
    level = "high";
  } else if (riskRatio >= 0.2 || negRatio >= 0.4) {
    level = "medium";
  }

  const recommendations: string[] = [];
  if (level === "high") {
    recommendations.push("🚨 Immediate action: Review negative posts with receipts");
    recommendations.push("Consider pausing related campaign spend until sentiment stabilizes");
    recommendations.push("Prepare response messaging for potential crisis escalation");
  } else if (level === "medium") {
    recommendations.push("⚠️ Monitor closely: Negative sentiment building");
    recommendations.push("Review campaign messaging for tone adjustments");
    recommendations.push("Track next 2-4 hours for escalation signs");
  } else {
    recommendations.push("✓ Risk levels normal");
    recommendations.push("Continue standard monitoring");
  }

  const reasoning =
    level === "high"
      ? `Risk clustering detected: ${riskCount} risk words in ${totalCount} receipts (${Math.round(riskRatio * 100)}%). ${clustering ? "Multiple posts in short timeframe." : ""}`
      : level === "medium"
        ? `Elevated negative sentiment: ${negCount} negative + ${riskCount} risk in ${totalCount} receipts.`
        : `Sentiment stable: ${riskCount} risk words across ${totalCount} receipts (${Math.round(riskRatio * 100)}%).`;

  return {
    level,
    clustering,
    recentPosts,
    riskRatio: Math.round(riskRatio * 100) / 100,
    timeWindow: `${RISK_CLUSTERING.timeWindowMinutes}min`,
    reasoning,
    recommendations,
  };
}

/**
 * Generate simple, actionable prediction summary
 */
export interface PredictionSummary {
  headline: string;
  nextAction: string;
  confidence: number;
  timeframe: string;
}

export function generatePredictionSummary(
  topic: Topic,
  brief?: BoosterTopicBrief,
): PredictionSummary {
  const peakPrediction = predictPeakTime(topic, brief);
  const spreadPrediction = predictPlatformSpread(topic, brief);
  const arcPrediction = predictCampaignArc(topic, brief);

  if (peakPrediction.currentPhase === "pre-peak" && peakPrediction.hoursUntilPeak) {
    const hours = peakPrediction.hoursUntilPeak;
    return {
      headline: `Will peak in ${hours}h`,
      nextAction: `Post now or at ~${new Date(Date.now() + hours * 3600000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} CT for maximum engagement`,
      confidence: peakPrediction.confidence,
      timeframe: `Next ${hours} hours`,
    };
  }

  if (peakPrediction.currentPhase === "at-peak") {
    const highSpread = spreadPrediction.willSpreadTo.filter((p) => p.probability >= 0.7);
    if (highSpread.length > 0) {
      return {
        headline: `At peak, spreading to ${highSpread.map((p) => p.platform).join(", ")}`,
        nextAction: `Amplify now while hot. Spread to ${highSpread.length} more platform${highSpread.length > 1 ? "s" : ""} likely in 6-8h`,
        confidence: spreadPrediction.confidence,
        timeframe: "Next 6-8 hours",
      };
    }
    return {
      headline: "At peak velocity now",
      nextAction: "Cheap to amplify, expensive to originate. Post follow-up content.",
      confidence: 0.8,
      timeframe: `Peak lasts ~${arcPrediction.arcCurve[0]?.durationHours ?? 48}h`,
    };
  }

  if (peakPrediction.currentPhase === "post-peak") {
    return {
      headline: "Fading — peak has passed",
      nextAction: "Better as recap than new launch. Save budget for next trend.",
      confidence: 0.9,
      timeframe: `Will cool over ~${arcPrediction.arcCurve[0]?.durationHours ?? 72}h`,
    };
  }

  return {
    headline: "Monitoring for signals",
    nextAction: "Insufficient data for prediction. Wait for velocity signal.",
    confidence: 0.3,
    timeframe: "Check back in 1-2 hours",
  };
}
