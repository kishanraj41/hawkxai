# Booster improvisations

Living backlog. Regenerated from real gaps after HistGB persist + handbook diff.

Last run: 2026-08-21T23:40:00+00:00

## P0 — Tag Camry occupiers for occupancy HistGB

- **Why:** Next-window HistGB is live and now stored on `poi_models`. Occupancy still uses host-class L1 until 20 gold inspect tags.
- **Next:** On Watch inspect, mark occupiers Official / Occupied / Ignore. Camry first. Unlabeled rows sort to the top. Do not invent tags.

## P0 — Generated handbook + permission diff

- **Why:** Shipped. `/handbook` diffs `fleet/permissions.json` against the last render (Cloud SQL `poi_models` / memory). Flip a tool, refresh once, the table shows on → off.
- **Next:** Contest clip: disable `collect_public_apis`, open `/handbook`, show the diff, re-enable.

## P0 — HistGB model persist

- **Why:** Shipped. Fitted next-window and occupancy models write to `poi_models` so Cloud Run and Vercel do not each start from stumps.
- **Next:** Tag Camry until occupancy HistGB loads from that row instead of L1.

## P0 — Wire Footprint plug → Cloud Run fleet

- **Why:** Shipped. `/footprint` POSTs the phrase to `/api/fleet`. `GET /api/trends` is untouched.
- **Next:** Keep `FLEET_URL` on both Vercel and Cloud Run `hawkxai` until www DNS cutover.

## P0 — Stabilize X ingest

- **Why:** Hashtag and QR campaigns mostly start on X. Offline X blinds the booster.
- **Next:** Keep Gemini Google Search for X mentions, add a Google Trends fallback so capture still runs.

## P1 — Compare two campaign phrases on Footprint

- **Why:** Watch can overlay two names. Footprint still plots one plugged phrase.
- **Next:** Second lookup slot on Footprint occurrence — same last-4 series, no invented shared WHY.

## P1 — Shared-artifact bridges on the mind map

- **Why:** The mind map only draws amber dashes when the same hashtag, QR, URL, or ticker prints on two names. Zero bridges means correlation is still a star, not a graph.
- **Next:** Keep capturing overlapping campaign codes across topics — never invent a bridge to fill the map.

## P2 — News + disaster markers on the same timeseries

- **Why:** GDELT and NWS land as receipts, but they are not lagged as event ticks against social velocity.
- **Next:** Overlay public-api events on the occurrence chart with a 0–24h lag, never as an invented WHY.

## P2 — TREND_DB_* on Cloud Run desk

- **Why:** Watch and HistGB persist need Cloud SQL. The new `hawkxai` service still needs the same `TREND_DB_*` as Vercel before DNS cutover.
- **Next:** Copy Production env onto Cloud Run `hawkxai`, confirm `GET /api/collect` says backend=postgres.

## Shipped this pass

- HistGB next-window on receipt transitions; L2 stumps under 16 samples.
- Occupancy HistGB when ≥20 gold tags; unlabeled occupiers sort first.
- `poi_models` JSON for HistGB + handbook permission baseline.
- `/handbook` + `GET /api/handbook` model card, fleet mermaid, AutoLineage, live permission diff.
- `python -m handbook.render` still writes `docs/hackathon/ARCHITECTURE.md`.
