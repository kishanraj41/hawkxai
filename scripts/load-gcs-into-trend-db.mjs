#!/usr/bin/env node
/**
 * Load GCS fleet ingest JSON into Cloud SQL category databases.
 * Source of receipts: gs://hawkxai-fleet-snapshots/ingest/
 * Destination: TREND_DB_* (hawkxai_all + hawkxai_campaigns for phrase plugs).
 *
 *   gcloud storage cp -r gs://hawkxai-fleet-snapshots/ingest ./tmp-ingest
 *   node --env-file=.env.local scripts/load-gcs-into-trend-db.mjs ./tmp-ingest
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const host = process.env.TREND_DB_HOST;
const user = process.env.TREND_DB_USER;
const password = process.env.TREND_DB_PASSWORD ?? "";
const port = Number(process.env.TREND_DB_PORT || "5432");
const ssl = true;
const root = process.argv[2];

if (!host || !user || !root) {
  console.error("Need TREND_DB_HOST, TREND_DB_USER, and a local ingest directory.");
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (name.endsWith(".json")) acc.push(path);
  }
  return acc;
}

function slug(label) {
  return (
    String(label || "topic")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "topic"
  );
}

function isoOrNull(value) {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function client(database) {
  return new pg.Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  });
}

async function ensureLineage(c) {
  await c.query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS tool TEXT`);
  await c.query(`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ`);
}

async function loadInto(database, snap) {
  const c = client(database);
  await c.connect();
  await ensureLineage(c);
  const snapshotId = String(snap.uri || `${snap.phrase}|${snap.posts?.[0]?.collectedAt || Date.now()}`);
  const ingestedAt = isoOrNull(snap.posts?.[0]?.collectedAt) || new Date().toISOString();
  const topicId = slug(snap.phrase);
  const posts = Array.isArray(snap.posts) ? snap.posts : [];
  await c.query(
    `INSERT INTO snapshots (id, ingested_at, plugged, topic_count, source_updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [snapshotId, ingestedAt, snap.phrase ?? null, 1, ingestedAt],
  );
  const hn = posts.filter((p) => p.platform === "hn").length;
  const pub = posts.filter((p) => p.platform === "public").length;
  const score = posts.reduce((n, p) => n + (Number(p.score) || 0), 0);
  await c.query(
    `INSERT INTO words (snapshot_id, topic_id, label, velocity, score, divergence, receipt_count, first_platform, first_at, driver_weight)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (snapshot_id, topic_id) DO NOTHING`,
    [
      snapshotId,
      topicId,
      snap.phrase || topicId,
      "peaking",
      score,
      hn && pub ? 0.3 : 0.8,
      posts.length,
      posts[0]?.platform ?? null,
      isoOrNull(posts[0]?.createdAt),
      null,
    ],
  );
  await c.query(
    `INSERT INTO sentiments (snapshot_id, topic_id, lean, pos, neg, risk, n, thin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (snapshot_id, topic_id) DO NOTHING`,
    [snapshotId, topicId, "thin", 0, 0, 0, posts.length, posts.length < 4],
  );
  let receipts = 0;
  for (const post of posts) {
    const url = String(post.url || "").trim();
    const title = String(post.title || "").trim();
    if (!url || !title) continue;
    await c.query(
      `INSERT INTO receipts (snapshot_id, topic_id, url, title, platform, score, created_at, source_api, tool, collected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (snapshot_id, topic_id, url) DO NOTHING`,
      [
        snapshotId,
        topicId,
        url,
        title,
        String(post.platform || "public"),
        Number(post.score) || 0,
        isoOrNull(post.createdAt),
        post.sourceApi ?? null,
        post.tool ?? null,
        isoOrNull(post.collectedAt),
      ],
    );
    receipts += 1;
  }
  await c.end();
  console.log(`loaded ${database} ${snap.phrase} receipts=${receipts} id=${snapshotId}`);
}

const files = walk(root);
console.log(`files ${files.length}`);
for (const file of files) {
  const snap = JSON.parse(readFileSync(file, "utf8"));
  if (!snap?.phrase) continue;
  await loadInto("hawkxai_all", snap);
  await loadInto("hawkxai_campaigns", snap);
}
