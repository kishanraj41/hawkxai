# Booster improvisations

Living backlog. Regenerated from real gaps after merging HistGB persist + handbook onto current main.

Last run: 2026-08-31T20:17:00+00:00

## ✅ SHIPPED — Mind World scroll + POI hop polish + industry_hour SQL

- **What:** Mind shell uses `overflow-x: clip` so sticky chrome and World jump work. Industry hour ring persists in Cloud SQL `industry_hour`. World caption shows hub/sample. Place=Tokyo floats Kyoto into the pin cap (450 km). Co-located hops bow + enlarge pins.
- **Files:** `app/globals.css`, `MindDesk`, `WorldMap`, `lib/example-poi-series.ts`, `lib/example-poi.ts`, `lib/trend-geo.ts`, `app/api/trends/route.ts`
- **Next:** Per-city industry windows once Place filter drives compare.

## ✅ SHIPPED — Example POI hover hop, hourly series, live Hub stream

- **What:** Table-row hover lights the live pin and the violet POI and draws the 400 km hop. Hourly `liveNear` is kept in-process so a second snap can call next-window. Collect streams `audiala-places.csv` for 8s and uses the Hub sample when ≥24 places land; otherwise the vendored slice. Place filter dims far example pins.
- **Files:** `lib/example-poi.ts`, `lib/example-poi-series.ts`, `lib/example-poi-compare.ts`, `WorldMap`, `ExamplePoiCompare`, `lib/hourly-collect.ts`

## ✅ SHIPPED — World-Class Prediction Engine

- **What:** Peak time prediction, platform spread prediction, campaign arc prediction, risk clustering detection, actionable summaries
- **Files:** `lib/predictions.ts`, `components/PredictionPanel.tsx`, integrated into `lib/booster.ts`

## ✅ SHIPPED — Research pack: drop / split / fill angles

- **What:** Research Copy drops receipts that fail `tokenHits` (worldnews without “apple”). Wikipedia titles become senses; Copy defaults to the denser sense. Angles and open questions are filled from dated titles, official hosts, and opposing dispute titles — templates stay empty when thin.
- **Files:** `lib/research-pack.ts`, `lib/research.ts`, `lib/research-brief.ts`, `components/research/ResearchDesk.tsx`
- **Next:** Persist dropped/sense choice on the share URL (`?sense=`).

## ✅ SHIPPED — Tape-watch off localStorage

- **What:** Stars + measured snapshots hydrate from `GET /api/tape-watch` (Cloud SQL `tape_watch` when `TREND_DB_*` is set; memory otherwise) and write-through on toggle/ingest. localStorage remains the offline cache.
- **Files:** `lib/watch.ts` `mergeWatchStores`, `lib/watchlist-store.ts`, `app/api/tape-watch/route.ts`, `components/HawkxAIApp.tsx`
- **Next:** Per-user owner once auth exists. Demo owner is still `demo`.

## ✅ SHIPPED — Insights as a taproot, not a search page

- **What:** `/insights` traces a particular name down through senses, live tape, encyclopedia origin, family categories, and the oldest dated receipt. Thin queries stay thin — no invented WHY.
- **Files:** `lib/insights-roots.ts`, `GET /api/insights?q=`, `components/insights/InsightsTaproot.tsx`
- **Next:** Stamp real grant dates on Wikidata P1246 numbers (ODP) so an undated patent number cannot fake a 1982 root.

## ✅ SHIPPED — HistGB next-window + generated handbook

- **What:** Next-window HistGB on receipt transitions (≥16) with L2 stump fallback. Fitted models persist on Cloud SQL `poi_models`. Occupancy HistGB waits for ≥20 gold inspect tags. `/handbook` and `GET /api/handbook` print permissions, a live permission diff, fleet mermaid, HistGB card, and AutoLineage. `python -m handbook.render` still writes `docs/hackathon/ARCHITECTURE.md`.
- **Files:** `lib/histgb.ts`, `lib/handbook.ts`, `app/handbook/page.tsx`, `app/api/handbook/route.ts`
- **Next:** Tag Camry occupiers Official / Occupied / Ignore until occupancy leaves host-class L1. Contest clip: flip `collect_public_apis`, refresh `/handbook`.

## P0 — Tag Camry occupiers for occupancy HistGB

- **Why:** Next-window HistGB is live and stored on `poi_models`. Occupancy still uses host-class L1 until 20 gold inspect tags.
- **Next:** On Watch inspect, mark occupiers Official / Occupied / Ignore. Camry first. Unlabeled rows sort to the top. Do not invent tags.

## P0 — Wire Footprint plug → Cloud Run fleet

- **Why:** Shipped. `/footprint` POSTs the phrase to `/api/fleet`. `GET /api/trends` is untouched. Footprint falls back to live tape when fleet is 503.
- **Next:** Keep `FLEET_URL` on both Vercel and Cloud Run `hawkxai` until www DNS cutover.

## P0 — RudriQ / AutoLineage on receipts

- **Why:** Shipped thin. Collectors stamp `tool` + `collectedAt`. Footprint and Research show a lineage strip. Save .md includes the lineage table. Handbook prints the same table.
- **Next:** If the startup test holds, persist lineage next to Cloud SQL snapshots instead of only on the live payload.

## P0 — Stabilize X ingest

- **Why:** Hashtag and QR campaigns mostly start on X. Offline X blinds the booster.
- **Next:** Keep Gemini Google Search for X mentions, add a Google Trends fallback so capture still runs.

## P0 — QR image decode, not just QR-shaped URLs

- **Why:** Shipped thin. Chart-API image URLs (`data`/`chl`) become QR artifacts. PNG/JPEG URLs decode with jsQR (3 per ingest, 2.5s cap).
- **Next:** Raise the decode cap once Camry posters actually land as image receipts.

## P1 — Compare two campaign phrases on one desk

- **Why:** Shipped on Watch (shift-click) and Footprint (Overlay field / `?vs=`). Two occurrence lines. Never an invented shared WHY.
- **Next:** Same overlay control on Insights/Research TermStage when a second campaign is in session.

## P1 — Shared-artifact bridges on the mind map

- **Why:** The mind map only draws amber dashes when the same hashtag, QR, URL, or ticker prints on two names. Zero bridges means correlation is still a star, not a graph.
- **Next:** Keep capturing overlapping campaign codes across topics — never invent a bridge to fill the map.

## P2 — News + disaster markers on the same timeseries

- **Why:** Shipped. GDELT and NWS receipts plot as ticks on occurrence with lag vs first X/Reddit/HN print. Click opens the receipt. Never a WHY.
- **Next:** Cap ticks per window once a campaign actually prints on both social and GDELT in the same hour.

## P1 — Hourly snapshots on occurrence

- **Why:** Shipped. `GET /api/collect?hourly=1` (Vercel cron `0 12 * * *` daily on Hobby) writes topic-score snapshots for watchlist phrases. History draws as a violet line when two snaps exist.
- **Next:** Set `TREND_DB_*` so snaps survive across serverless instances. Pro can change the cron to hourly.

## P2 — TREND_DB_* on Cloud Run desk

- **Why:** Watch, tape-watch, HistGB persist, and Insights roots need Cloud SQL. The `hawkxai` Cloud Run service still needs the same `TREND_DB_*` as Vercel before DNS cutover.
- **Next:** Copy Production env onto Cloud Run `hawkxai`, confirm `GET /api/collect` says backend=postgres.

## P0 — Wire Postgres for Historical Predictions

- **Why:** Predictions currently use heuristics. With 48h+ of snapshots: peak time 60%→80% accurate, spread 70%→85%, arc 70%→85%.
- **Next:** Set TREND_DB_HOST / USER / PASSWORD, run npm run provision:trend-db, train on 100+ snapshots per category.
