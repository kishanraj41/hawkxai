import { slug } from "./metrics";
import { overlapRows, scorePoi, type PoiReceipt } from "./poi";
import { databaseName, readTrendDbConfig } from "./trend-db";
import type { PoiInsight, Post, TrendsPayload, WatchlistEntity } from "./types";

const OWNER = "demo";

const WATCHLIST_SQL = `
CREATE TABLE IF NOT EXISTS watchlist (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL DEFAULT 'demo',
  label TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS watchlist_owner_idx ON watchlist (owner);
CREATE TABLE IF NOT EXISTS poi_overlap (
  entity_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT '',
  official BOOLEAN NOT NULL DEFAULT false,
  collected_at TIMESTAMPTZ,
  PRIMARY KEY (entity_id, snapshot_id, url)
);
CREATE INDEX IF NOT EXISTS poi_overlap_entity_idx ON poi_overlap (entity_id);
CREATE TABLE IF NOT EXISTS poi_scores (
  entity_id TEXT PRIMARY KEY,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_count INT NOT NULL,
  official_count INT NOT NULL,
  occupied_count INT NOT NULL,
  organic REAL NOT NULL,
  occupancy REAL NOT NULL,
  outlook TEXT NOT NULL,
  confidence REAL NOT NULL,
  thin BOOLEAN NOT NULL,
  delta INT NOT NULL DEFAULT 0,
  baseline_ratio REAL NOT NULL DEFAULT 0,
  snapshot_count INT NOT NULL DEFAULT 0,
  rank_score REAL NOT NULL DEFAULT 0
);
`;

type PgPool = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

const memory: WatchlistEntity[] = [];
let schemaReady = false;
let pool: PgPool | null | undefined;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asAliases(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  return [];
}

async function allPool(): Promise<PgPool | null> {
  const cfg = readTrendDbConfig();
  if (!cfg) return null;
  if (pool !== undefined) return pool;
  try {
    const pg = (await import("pg")) as { default?: { Pool: new (c: object) => PgPool }; Pool?: new (c: object) => PgPool };
    const Pool = pg.Pool ?? pg.default?.Pool;
    if (!Pool) {
      pool = null;
      return null;
    }
    pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: databaseName("all"),
      ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 2_000,
    });
    return pool;
  } catch {
    pool = null;
    return null;
  }
}

async function ensureSchema(db: PgPool): Promise<void> {
  if (schemaReady) return;
  await db.query(WATCHLIST_SQL);
  schemaReady = true;
}

function rowToEntity(row: Record<string, unknown>): WatchlistEntity {
  return {
    id: asString(row.id),
    label: asString(row.label),
    aliases: asAliases(row.aliases),
    owner: asString(row.owner, OWNER),
    createdAt: asString(row.created_at) || new Date().toISOString(),
  };
}

export async function listWatchlist(): Promise<{ backend: "postgres" | "memory"; entities: WatchlistEntity[] }> {
  const db = await allPool();
  if (!db) return { backend: "memory", entities: [...memory] };
  await ensureSchema(db);
  const res = await db.query(
    `SELECT id, owner, label, aliases, created_at FROM watchlist WHERE owner = $1 ORDER BY created_at ASC`,
    [OWNER],
  );
  return { backend: "postgres", entities: res.rows.map(rowToEntity) };
}

export async function addWatchlist(label: string, aliases: string[]): Promise<WatchlistEntity> {
  const entity: WatchlistEntity = {
    id: slug(label) || `poi-${Date.now()}`,
    label: label.trim().slice(0, 80),
    aliases,
    owner: OWNER,
    createdAt: new Date().toISOString(),
  };
  const db = await allPool();
  if (!db) {
    const i = memory.findIndex((e) => e.id === entity.id);
    if (i >= 0) memory[i] = { ...memory[i], aliases: entity.aliases };
    else memory.push(entity);
    return memory.find((e) => e.id === entity.id) ?? entity;
  }
  await ensureSchema(db);
  await db.query(
    `INSERT INTO watchlist (id, owner, label, aliases, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, aliases = EXCLUDED.aliases`,
    [entity.id, OWNER, entity.label, entity.aliases, entity.createdAt],
  );
  return entity;
}

export async function removeWatchlist(id: string): Promise<boolean> {
  const db = await allPool();
  if (!db) {
    const n = memory.length;
    const next = memory.filter((e) => e.id !== id);
    memory.splice(0, memory.length, ...next);
    return next.length !== n;
  }
  await ensureSchema(db);
  await db.query(`DELETE FROM poi_overlap WHERE entity_id = $1`, [id]);
  await db.query(`DELETE FROM poi_scores WHERE entity_id = $1`, [id]);
  const res = await db.query(`DELETE FROM watchlist WHERE id = $1 AND owner = $2`, [id, OWNER]);
  return (res.rowCount ?? 0) > 0;
}

async function loadReceipts(db: PgPool | null): Promise<PoiReceipt[]> {
  if (!db) return [];
  try {
    const res = await db.query(
      `SELECT snapshot_id, url, title, platform, score, created_at, source_api, tool, collected_at
       FROM receipts
       ORDER BY collected_at DESC NULLS LAST
       LIMIT 4000`,
    );
    return res.rows.map((row) => ({
      snapshotId: asString(row.snapshot_id),
      url: asString(row.url),
      title: asString(row.title),
      platform: asString(row.platform),
      score: Number(row.score) || 0,
      createdAt: asString(row.created_at) || null,
      sourceApi: asString(row.source_api) || undefined,
      tool: asString(row.tool) || undefined,
      collectedAt: asString(row.collected_at) || undefined,
    }));
  } catch (err) {
    console.warn("[watchlist] receipts", err instanceof Error ? err.message : err);
    return [];
  }
}

function postsToReceipts(payload: TrendsPayload | null): PoiReceipt[] {
  if (!payload) return [];
  const snap = payload.updatedAt || "memory";
  const posts: Post[] = payload.topics.flatMap((t) =>
    Object.values(t.platforms).flatMap((s) => s.posts),
  );
  return posts.map((p) => ({
    snapshotId: snap,
    url: p.url,
    title: p.title,
    platform: p.platform,
    score: p.score,
    createdAt: p.createdAt || null,
    sourceApi: p.sourceApi,
    tool: p.tool,
    collectedAt: p.collectedAt,
  }));
}

export async function insightsFor(
  entities: WatchlistEntity[],
  tape?: TrendsPayload | null,
): Promise<PoiInsight[]> {
  const db = await allPool();
  const fromSql = await loadReceipts(db);
  const fromTape = postsToReceipts(tape ?? null);
  const seen = new Set<string>();
  const receipts: PoiReceipt[] = [];
  for (const r of [...fromSql, ...fromTape]) {
    const key = `${r.snapshotId}|${r.url}`;
    if (!r.url || seen.has(key)) continue;
    seen.add(key);
    receipts.push(r);
  }
  const insights = entities
    .map((e) => scorePoi(e, receipts))
    .toSorted((a, b) => b.rankScore - a.rankScore || b.receiptCount - a.receiptCount);
  if (db) {
    await persistInsights(db, insights, receipts).catch((err) => {
      console.warn("[watchlist] persist overlap", err instanceof Error ? err.message : err);
    });
  }
  return insights;
}

async function persistInsights(
  db: PgPool,
  insights: PoiInsight[],
  receipts: PoiReceipt[],
): Promise<void> {
  await ensureSchema(db);
  for (const insight of insights) {
    const rows = overlapRows(insight.entity, receipts);
    for (const row of rows.slice(0, 800)) {
      await db.query(
        `INSERT INTO poi_overlap (entity_id, snapshot_id, url, title, host, official, collected_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (entity_id, snapshot_id, url) DO UPDATE SET
           title = EXCLUDED.title,
           host = EXCLUDED.host,
           official = EXCLUDED.official`,
        [row.entityId, row.snapshotId, row.url, row.title, row.host, row.official, row.collectedAt],
      );
    }
    await db.query(
      `INSERT INTO poi_scores (
         entity_id, scored_at, receipt_count, official_count, occupied_count,
         organic, occupancy, outlook, confidence, thin, delta, baseline_ratio,
         snapshot_count, rank_score
       ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (entity_id) DO UPDATE SET
         scored_at = EXCLUDED.scored_at,
         receipt_count = EXCLUDED.receipt_count,
         official_count = EXCLUDED.official_count,
         occupied_count = EXCLUDED.occupied_count,
         organic = EXCLUDED.organic,
         occupancy = EXCLUDED.occupancy,
         outlook = EXCLUDED.outlook,
         confidence = EXCLUDED.confidence,
         thin = EXCLUDED.thin,
         delta = EXCLUDED.delta,
         baseline_ratio = EXCLUDED.baseline_ratio,
         snapshot_count = EXCLUDED.snapshot_count,
         rank_score = EXCLUDED.rank_score`,
      [
        insight.entity.id,
        insight.receiptCount,
        insight.officialCount,
        insight.occupiedCount,
        insight.organic,
        insight.occupancy,
        insight.outlook,
        insight.confidence,
        insight.thin,
        insight.delta,
        insight.baselineRatio,
        insight.snapshotCount,
        insight.rankScore,
      ],
    );
  }
}
