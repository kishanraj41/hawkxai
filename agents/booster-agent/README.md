# Booster Agent

PulseMap's core intelligence layer. It does extremely smart things: capture live trend artifacts, explain *why* they are trending, translate that for every age group, arm competitors with campaign moves, and keep improvising the product.

Capturing the current trend hashtags/ QRs/phrases/URLs etc and analyze them and co-relate them on why they are treanding and collect this information to create a cool interactive dashboard that gives us most useful information to all age groups and compititors in the bussiness that will leverage their campains.

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
- `GET /api/booster` — JSON for other clients (needs `/api/trends` cache)
- `BoosterBriefBar` — strip under the Ask box
- `BoosterInsights` — per-topic artifacts, competitor move, age takes

The D3 map and `/api/trends` contract are unchanged.

## North star

See [docs/presentation/CORE_IDEA.md](../../docs/presentation/CORE_IDEA.md).
