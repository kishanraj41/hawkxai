# Booster Agent

HawkAI's core intelligence layer. It does extremely smart things: look up a word or phrase, map its internet footprint, capture live artifacts around it, explain *why* those receipts exist, translate that for every age group, arm competitors with campaign moves, and keep improvising the product.

Look up a campaign name. The same interactive dashboard fills with where that phrase is printing — useful for every age group and for competitors who will leverage their campaigns.

## What it does

| Step | Output |
|---|---|
| **Capture** | Hashtags, QR / short-link campaign codes, phrases, URLs, cashtags from real posts |
| **Correlate** | Why-now from velocity, divergence, receipts, link gravity (never invents a WHY) |
| **Age lenses** | Kids · Gen Z · Millennial · Gen X · Boomer |
| **Campaign** | Hook, timing, risk, and how competitors ride the *need* without cloning the meme |
| **Improvise** | Ranked P0/P1/P2 upgrades written to `IMPROVISATIONS.md` every run |

## Quick start

```bash
# Self-check against the fixture (no network)
python3 agents/booster-agent/booster_agent.py --self-check

# Tests
python3 -m unittest agents/booster-agent/tests/test_booster.py

# Live (app must be running so /api/trends is warm)
python3 agents/booster-agent/booster_agent.py --url http://localhost:3000/api/trends

# Offline file
python3 agents/booster-agent/booster_agent.py --file agents/booster-agent/fixtures/sample_trends.json
```

Reports land in `agents/booster-agent/runs/`. The living backlog is `IMPROVISATIONS.md`.

## Live dashboard

The same brain runs in TypeScript:

- `lib/booster.ts` — capture / correlate / campaign / improvise
- `lib/desk.ts` — category plug, causation drivers, occurrence bins
- `lib/mindmap.ts` — evidence-only correlation graph (shared artifacts only)
- `GET /api/booster` — JSON for other clients (needs `/api/trends` cache)
- `MindDesk` — radial mind map of the looked-up phrase (`G`)
- `ChartDesk` — look up a phrase; mind strip + related prints + causation bars + timeseries
- `PhraseLookup` — empty desk: campaign name or phrase in, footprint out
- `BoosterInsights` — per-topic artifacts, competitor move, age takes

The D3 map and `/api/trends` contract are unchanged.

## North star

See [docs/presentation/CORE_IDEA.md](../../docs/presentation/CORE_IDEA.md).
