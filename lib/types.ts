export type Platform = "x" | "reddit" | "hn";

export interface Post {
  platform: Platform;
  title: string;
  url: string;
  score: number;
  createdAt: string;
}

export interface PlatformSlice {
  score: number;
  posts: Post[];
}

export interface Ticker {
  symbol: string;
  sentiment: "pos" | "neg" | "mixed";
  mentions: number;
}

export interface Topic {
  id: string;
  label: string;
  platforms: Record<Platform, PlatformSlice>;
  velocity: "rising" | "peaking" | "fading";
  divergence: number;
  peakHourCT?: string;
  tickers: Ticker[];
  why?: string;
}

export interface SourceHealth {
  x: boolean;
  reddit: boolean;
  hn: boolean;
}

export interface TrendsPayload {
  topics: Topic[];
  updatedAt: string;
  sources: SourceHealth;
  degraded: string[];
}

export type AgeLens = "kids" | "gen-z" | "millennial" | "gen-x" | "boomer";

export type ArtifactKind = "hashtag" | "phrase" | "url" | "qr" | "ticker";

export interface CapturedArtifact {
  kind: ArtifactKind;
  value: string;
  mentions: number;
  platforms: Platform[];
}

export interface CampaignMove {
  angle: string;
  forCompetitors: string;
  risk: "low" | "medium" | "high";
  timing: Topic["velocity"];
  hook: string;
}

export interface AgeTranslation {
  lens: AgeLens;
  label: string;
  takeaway: string;
}

export interface BoosterTopicBrief {
  topicId: string;
  whyTrending: string;
  confidence: number;
  artifacts: CapturedArtifact[];
  audiences: AgeTranslation[];
  campaign: CampaignMove;
}

export interface Improvisation {
  priority: "P0" | "P1" | "P2";
  title: string;
  why: string;
  next: string;
}

export interface BoosterPayload {
  updatedAt: string;
  sourceUpdatedAt: string;
  summary: string;
  briefs: BoosterTopicBrief[];
  improvisations: Improvisation[];
}

export interface RawSignals {
  reddit: Post[];
  hn: Post[];
  x: Post[];
  sources: SourceHealth;
  degraded: string[];
}
