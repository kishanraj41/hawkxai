import { TREND_DATABASES, type DeskCategory, type TrendDatabase } from "./types";

export const TREND_DB_PREFIX = process.env.TREND_DB_PREFIX || "hawkxai";

export function isTrendDatabase(value: string): value is TrendDatabase {
  return (TREND_DATABASES as readonly string[]).includes(value);
}

export function databaseName(category: DeskCategory, prefix = TREND_DB_PREFIX): string {
  return `${prefix}_${category}`;
}

export function allDatabaseNames(prefix = TREND_DB_PREFIX): string[] {
  return TREND_DATABASES.map((id) => databaseName(id, prefix));
}

export interface TrendDbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  ssl: boolean;
  prefix: string;
}

export function readTrendDbConfig(): TrendDbConfig | null {
  const host = process.env.TREND_DB_HOST?.trim();
  const user = process.env.TREND_DB_USER?.trim();
  const password = process.env.TREND_DB_PASSWORD ?? "";
  if (!host || !user) return null;
  const port = Number(process.env.TREND_DB_PORT || "5432");
  return {
    host,
    port: Number.isFinite(port) ? port : 5432,
    user,
    password,
    ssl: process.env.TREND_DB_SSL === "1" || process.env.TREND_DB_SSL === "true",
    prefix: TREND_DB_PREFIX,
  };
}

export const CATEGORY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  ingested_at TIMESTAMPTZ NOT NULL,
  plugged TEXT,
  topic_count INT NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS words (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  label TEXT NOT NULL,
  velocity TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  divergence DOUBLE PRECISION NOT NULL,
  receipt_count INT NOT NULL,
  first_platform TEXT,
  first_at TIMESTAMPTZ,
  driver_weight DOUBLE PRECISION,
  PRIMARY KEY (snapshot_id, topic_id)
);
CREATE INDEX IF NOT EXISTS words_topic_idx ON words (topic_id, snapshot_id);
CREATE TABLE IF NOT EXISTS sentiments (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  lean TEXT NOT NULL,
  pos INT NOT NULL,
  neg INT NOT NULL,
  risk INT NOT NULL,
  n INT NOT NULL,
  thin BOOLEAN NOT NULL,
  PRIMARY KEY (snapshot_id, topic_id)
);
CREATE TABLE IF NOT EXISTS artifacts (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  value TEXT NOT NULL,
  mentions INT NOT NULL,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (snapshot_id, topic_id, kind, value)
);
CREATE TABLE IF NOT EXISTS receipts (
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  platform TEXT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMPTZ,
  source_api TEXT,
  PRIMARY KEY (snapshot_id, topic_id, url)
);
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  leaf_id TEXT NOT NULL,
  leaf_kind TEXT NOT NULL,
  outlook TEXT NOT NULL,
  sentiment_lean TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  analysis TEXT NOT NULL,
  evidence TEXT NOT NULL,
  thin BOOLEAN NOT NULL,
  predicted_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS predictions_leaf_idx ON predictions (leaf_id, predicted_at DESC);
`;
