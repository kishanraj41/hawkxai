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

export interface RawSignals {
  reddit: Post[];
  hn: Post[];
  x: Post[];
  sources: SourceHealth;
  degraded: string[];
}
