#!/usr/bin/env node
/**
 * Create the 10 HawkxAI category databases and apply sql/trend-category.sql.
 *
 *   node --env-file=.env.local scripts/provision-trend-dbs.mjs
 *
 * Needs TREND_DB_HOST, TREND_DB_USER, TREND_DB_PASSWORD on the admin database
 * (defaults to `postgres`). Does not print the password.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const CATEGORIES = [
  "all",
  "markets",
  "news",
  "weather",
  "tech",
  "sports",
  "health",
  "security",
  "campaigns",
  "culture",
];

const host = process.env.TREND_DB_HOST;
const user = process.env.TREND_DB_USER;
const password = process.env.TREND_DB_PASSWORD ?? "";
const port = Number(process.env.TREND_DB_PORT || "5432");
const prefix = process.env.TREND_DB_PREFIX || "hawkxai";
const ssl = process.env.TREND_DB_SSL === "1" || process.env.TREND_DB_SSL === "true";
const adminDb = process.env.TREND_DB_ADMIN || "postgres";

if (!host || !user) {
  console.error("Set TREND_DB_HOST and TREND_DB_USER (password via TREND_DB_PASSWORD).");
  process.exit(1);
}

const schema = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "sql", "trend-category.sql"),
  "utf8",
);

function ident(name) {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error(`refusing unsafe database name ${name}`);
  }
  return `"${name}"`;
}

const admin = new pg.Client({
  host,
  port,
  user,
  password,
  database: adminDb,
  ssl: ssl ? { rejectUnauthorized: false } : undefined,
});

await admin.connect();
for (const category of CATEGORIES) {
  const name = `${prefix}_${category}`;
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (exists.rowCount) {
    console.log(`exists ${name}`);
    continue;
  }
  await admin.query(`CREATE DATABASE ${ident(name)}`);
  console.log(`created ${name}`);
}
await admin.end();

for (const category of CATEGORIES) {
  const name = `${prefix}_${category}`;
  const client = new pg.Client({
    host,
    port,
    user,
    password,
    database: name,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  await client.query(schema);
  await client.end();
  console.log(`schema ${name}`);
}

const watchSql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "sql", "watchlist.sql"), "utf8");
const watchClient = new pg.Client({
  host,
  port,
  user,
  password,
  database: `${prefix}_all`,
  ssl: ssl ? { rejectUnauthorized: false } : undefined,
});
await watchClient.connect();
await watchClient.query(watchSql);
await watchClient.end();
console.log(`schema ${prefix}_all watchlist`);

console.log(`provisioned ${CATEGORIES.length} databases on ${host}:${port}`);
