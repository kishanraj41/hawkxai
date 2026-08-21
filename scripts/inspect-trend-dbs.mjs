#!/usr/bin/env node
/**
 * Read-only inventory of TREND_DB_* Postgres. Does not print the password.
 *
 *   node --env-file=.env.local scripts/inspect-trend-dbs.mjs
 */
import pg from "pg";

const host = process.env.TREND_DB_HOST;
const user = process.env.TREND_DB_USER;
const password = process.env.TREND_DB_PASSWORD ?? "";
const port = Number(process.env.TREND_DB_PORT || "5432");
const ssl = process.env.TREND_DB_SSL === "1" || process.env.TREND_DB_SSL === "true" || true;

if (!host || !user) {
  console.error("Set TREND_DB_HOST and TREND_DB_USER.");
  process.exit(1);
}

function client(database) {
  return new pg.Client({
    host,
    port,
    user,
    password,
    database,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
  });
}

const admin = client(process.env.TREND_DB_ADMIN || "postgres");
await admin.connect();
const dbs = await admin.query(`
  SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size
  FROM pg_database
  WHERE datistemplate = false
  ORDER BY datname
`);
console.log(`host ${host}:${port}`);
console.log(`databases ${dbs.rows.length}`);
for (const row of dbs.rows) {
  console.log(`db ${row.datname} ${row.size}`);
}
await admin.end();

for (const row of dbs.rows) {
  if (row.datname === "cloudsqladmin") continue;
  const c = client(row.datname);
  await c.connect();
  const tables = await c.query(`
    SELECT n.nspname AS schema, c.relname AS name, c.reltuples::bigint AS est
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY 1, 2
  `);
  let nonempty = 0;
  for (const t of tables.rows) {
    const count = await c.query(`SELECT COUNT(*)::int AS n FROM ${t.schema}."${t.name}"`);
    const n = count.rows[0].n;
    if (n > 0) {
      nonempty += 1;
      console.log(`rows ${row.datname}.${t.schema}.${t.name} ${n}`);
    }
  }
  if (!nonempty) console.log(`empty ${row.datname} tables=${tables.rows.length}`);
  await c.end();
}
