/** Mermaid sources for the live HawkxAI runtime. Keep in sync with docs/ARCHITECTURE.md. */

export const DEPLOY_GRAPH = `flowchart LR
  gh["GitHub<br/>snagaram3/grokhackx"]
  vercel["Vercel project<br/>hawk-ai4/grokhackx"]
  fn["Next.js 14 functions<br/>region iad1"]
  env["Env: GOOGLE_API_KEY<br/>FLEET_URL<br/>YOUTUBE_API_KEY<br/>TREND_DB_*"]
  sql["Cloud SQL Postgres 16<br/>hawkxai-trends · us-east4<br/>35.245.139.208:5432 TLS"]
  dbs["10 databases<br/>hawkxai_all + 9 plugs"]

  gh -->|push / redeploy| vercel
  vercel --> fn
  env --> fn
  fn -->|"pg + TREND_DB_SSL=1"| sql
  sql --> dbs
`;

export const REQUEST_GRAPH = `sequenceDiagram
  participant Desk as Desk browser
  participant Trends as GET /api/trends
  participant Booster as GET /api/booster
  participant Collect as collectAndForecast
  participant SQL as Cloud SQL

  Desk->>Trends: ingest tape (Grok cluster + public APIs)
  Trends-->>Desk: topics (never invent a WHY)
  Desk->>Booster: hydrate after local boost
  Booster->>Collect: collect, then predict
  Collect->>SQL: write snapshot into hawkxai_all and category DB
  Collect->>SQL: read last snapshots from hawkxai_all
  Collect->>SQL: write leaf predictions
  Booster-->>Desk: analysis + next-window on each leaf
`;

export const STORE_GRAPH = `flowchart TB
  cfg{"TREND_DB_HOST set?"}
  mem["memory store<br/>warm instance only"]
  pg["postgres store<br/>pg Pool per database"]
  cfg -->|no| mem
  cfg -->|yes| pg
  pg --> all[(hawkxai_all)]
  pg --> markets[(hawkxai_markets)]
  pg --> news[(hawkxai_news)]
  pg --> weather[(hawkxai_weather)]
  pg --> tech[(hawkxai_tech)]
  pg --> sports[(hawkxai_sports)]
  pg --> health[(hawkxai_health)]
  pg --> security[(hawkxai_security)]
  pg --> campaigns[(hawkxai_campaigns)]
  pg --> culture[(hawkxai_culture)]
`;

export const SCHEMA_GRAPH = `flowchart LR
  snap[snapshots]
  words[words]
  sent[sentiments]
  arts[artifacts]
  rec[receipts]
  pred[predictions]
  snap --> words
  snap --> sent
  snap --> arts
  snap --> rec
  snap --> pred
`;

export const ENV_GRAPH = `flowchart TB
  local["Laptop .env.local<br/>gitignored"]
  vercel["Vercel env<br/>Production + Preview sensitive<br/>Development not sensitive"]
  sql["Cloud SQL postgres user"]
  local -->|"npm run dev"| sql
  vercel -->|"iad1 functions"| sql
  note["Do not vercel env pull over .env.local"]
`;

export const ARCHITECTURE_SECTIONS = [
  {
    id: "deploy",
    title: "Deploy path",
    caption: "GitHub is the source. Vercel hawk-ai4/grokhackx builds Next.js 14 in iad1 and aliases hawkxai.com. Functions reach Cloud SQL over TLS on the public IP.",
    chart: DEPLOY_GRAPH,
  },
  {
    id: "request",
    title: "Collect then predict",
    caption: "/api/trends stays the tape. Booster is additive. History is read from hawkxai_all before a leaf call. Thin evidence stays thin.",
    chart: REQUEST_GRAPH,
  },
  {
    id: "store",
    title: "Ten databases on one instance",
    caption: "One Cloud SQL instance, ten Postgres databases named after the desk plugs. Unset TREND_DB_HOST keeps collection in memory.",
    chart: STORE_GRAPH,
  },
  {
    id: "schema",
    title: "Same schema in each database",
    caption: "Applied by npm run provision:trend-db from sql/trend-category.sql. Predictions are written after collect.",
    chart: SCHEMA_GRAPH,
  },
  {
    id: "env",
    title: "Env contract",
    caption: "Same TREND_DB_* keys locally and on Vercel. Password is sensitive on Production and Preview. vercel env pull replaces .env.local — do not run it over this file.",
    chart: ENV_GRAPH,
  },
] as const;
