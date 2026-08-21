# HawkxAI ingest fleet — architecture

Generated from `fleet/` files and `fleet/permissions.json`. Not an invented diagram.

```mermaid
flowchart LR
  marketer[Marketer] --> footprint["Vercel Footprint /footprint"]
  footprint -->|"POST /api/fleet"| vercelApi["Next.js POST /api/fleet"]
  trendsTab["Trends GET /api/trends"] --> deskCollectors["Vercel collectors"]
  vercelApi --> cloudRun["Cloud Run hawkxai-fleet"]
  cloudRun --> adk["ADK ingest_agent Gemini 3.5"]
  adk --> hnTool["collect_hn on"]
  adk --> apiTool["collect_public_apis on"]
  adk --> scoreTool["score_and_dedup on"]
  hnTool --> gcs["GCS snapshot JSON"]
  apiTool --> gcs
  scoreTool --> gcs
  gcs --> vercelApi
  vercelApi --> footprint
```

Lineage (AutoLineage): each receipt keeps `tool` + `collectedAt` from the collect step that produced it. RudriQ is the extraction layer. Visible on the desk as a lineage strip; Save .md includes the table.

## Files

- `fleet/ingest_agent/agent.py` — ADK root_agent
- `fleet/ingest_agent/runner.py` — Runner.run_async then persist
- `fleet/tools/hn_channel.py` — HN Algolia
- `fleet/tools/public_apis.py` — Wikipedia, Google News RSS, NHTSA
- `fleet/tools/score.py` — dedup + Gemini rank of existing titles
- `fleet/tools/snapshot.py` — GCS or local JSON
- `app/api/fleet/route.ts` — desk merge (does not touch GET /api/trends)
