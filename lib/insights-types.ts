import type { Platform, Post } from "./types";

export type IndustryCategory = 
  | "technology"
  | "finance"
  | "healthcare"
  | "retail"
  | "automotive"
  | "real-estate"
  | "entertainment"
  | "education"
  | "hospitality"
  | "manufacturing";

export interface DataLineageStep {
  id: string;
  source: string;
  platform: Platform | "aggregated";
  collectedAt: string;
  tool?: string;
  method: "api" | "scrape" | "manual" | "derived";
  confidence: number;
  verified: boolean;
}

export interface DataLineage {
  originId: string;
  steps: DataLineageStep[];
  isOrganic: boolean;
  organicScore: number;
  traceDepth: number;
}

export interface IndustryFactor {
  id: string;
  name: string;
  weight: number;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
}

export interface IndustryConstraint {
  id: string;
  name: string;
  threshold: number;
  current: number;
  met: boolean;
  impact: "critical" | "high" | "medium" | "low";
}

export interface IndustryVariable {
  id: string;
  name: string;
  type: "numeric" | "boolean" | "categorical";
  value: string | number | boolean;
  impact: number;
}

export interface IndustryAnalysis {
  category: IndustryCategory;
  factors: IndustryFactor[];
  constraints: IndustryConstraint[];
  variables: IndustryVariable[];
  score: number;
  insights: string[];
}

export interface PublicDataSource {
  id: string;
  name: string;
  platform: Platform | "micro" | "tech" | "b2b" | "etech" | "silicon";
  category: string;
  dataPoints: number;
  lastUpdated: string;
  reliability: number;
}

export interface POIData {
  id: string;
  label: string;
  category: IndustryCategory;
  keywords: string[];
  dataPoints: number;
  relevanceScore: number;
}

export interface InfiltrationMetric {
  metric: string;
  value: number;
  benchmark: number;
  percentile: number;
  trend: "increasing" | "decreasing" | "stable";
}

export interface FootprintAnalysis {
  poiId: string;
  infiltrationScore: number;
  marketPenetration: number;
  reach: number;
  engagement: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  metrics: InfiltrationMetric[];
  dollarImpact: {
    estimated: number;
    range: [number, number];
    confidence: number;
    timeframe: "monthly" | "quarterly" | "annual";
    breakdown: {
      category: string;
      amount: number;
    }[];
  };
  organicRatio: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  organic: number;
  synthetic: number;
  sources: number;
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  label: string;
}

export interface ComparisonItem {
  id: string;
  label: string;
  value: number;
  change: number;
  benchmark: number;
}

export interface InsightsDashboard {
  poiId: string;
  poiLabel: string;
  category: IndustryCategory;
  updatedAt: string;
  publicSources: PublicDataSource[];
  poiData: POIData;
  analysis: IndustryAnalysis;
  lineage: DataLineage;
  footprint: FootprintAnalysis;
  timeSeries: TimeSeriesPoint[];
  heatmap: HeatmapCell[];
  comparisons: ComparisonItem[];
  insights: {
    key: string[];
    actionable: string[];
    risks: string[];
  };
}

export interface InsightsPayload {
  dashboards: InsightsDashboard[];
  updatedAt: string;
  summary: string;
  degraded: string[];
}
