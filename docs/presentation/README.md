# Presentation

Investor and pitch materials for PulseMap. Ops docs stay in [docs/](../README.md) (`CONTRIBUTING.md`, `RUNBOOK.md`).

- **[VC one-pager](./VC_ONE_PAGER.md)** — SmartSalesGuy investor proposal (problem, solution, live / next)
- **[Core idea](./CORE_IDEA.md)** — product contract: capture → correlate → campaign
- **[Agent roster canvas](./agent_team_canvas.html)** — visual of the agent team
- **[SmartSalesGuy](../../agents/smartsalesguy/README.md)** — checkout the repo, write the one-pager

## Research

- **[Trend Analysis Dashboard Research](./research/trend_analysis_dashboard_research.md)** — market analysis, competitive landscape, use cases, monetization, viability
- **[Quick Implementation Guide](./research/quick_implementation_guide.md)** — 90-day MVP plan, architecture, budget

## Quick links

- **Viability:** 5/5 — highly viable with strong commercial potential
- **Market:** $500M–$1B serviceable addressable market
- **Time to MVP:** 90 days with a 2–3 person team
- **Bootstrap budget:** $0–5k (free tiers)
- **Comparables:** Dataminr ($4.1B), PredictHQ ($50M raised)

The living product backlog is [IMPROVISATIONS.md](../../agents/booster-agent/IMPROVISATIONS.md) — not duplicated here.

<!-- AUTO-GENERATED: presentation files. Source: grokhackx checkout + docs/presentation/. Do not hand-edit. -->

## Proposal presentation

Open beside chat: Cursor canvas `proposal-presentation.canvas.tsx` (workspace canvases folder).

**If you only have five minutes:** `docs/presentation/VC_ONE_PAGER.md`, `docs/presentation/CORE_IDEA.md`, `docs/presentation/research/trend_analysis_dashboard_research.md`, `docs/presentation/agent_team_canvas.html`, live demo at http://localhost:3001.

### Narrative

| File | Use in the deck |
|---|---|
| `docs/presentation/VC_ONE_PAGER.md` | Master script: problem, solution, why now, live, agents, next, ask |
| `docs/presentation/CORE_IDEA.md` | Product contract: capture → correlate → campaign; non-negotiables |
| `README.md` | Setup, `/api/trends` contract, demo URLs |
| `docs/presentation/README.md` | Index of investor + research docs |

### Market / ask

| File | Use in the deck |
|---|---|
| `docs/presentation/research/trend_analysis_dashboard_research.md` | TAM/SAM/SOM, comparables, gap |
| `docs/presentation/research/quick_implementation_guide.md` | 90-day MVP, team, budget |
| `agents/booster-agent/IMPROVISATIONS.md` | Ranked “what’s next” from real product gaps |

### Live product proof

| File | Use in the deck |
|---|---|
| `app/page.tsx` | App entry |
| `components/PulseMapApp.tsx` | Map shell |
| `components/BoosterBriefBar.tsx` | Always-on briefing strip |
| `components/BoosterInsights.tsx` | Artifacts, age lenses, competitor move |
| `app/api/trends/route.ts` | Live X / Reddit / HN clustering |
| `app/api/booster/route.ts` | Intelligence API |
| `app/api/ask/route.ts` | Natural-language ask → zoom |
| `lib/booster.ts` | Capture / correlate / campaign logic |
| `Dockerfile` | Production image |
| `.github/workflows/docker-ci.yml` | Build + Bug Bot on every PR and `main` |

### Team / agents

| File | Use in the deck |
|---|---|
| `docs/presentation/agent_team_canvas.html` | Visual of the agent roster |
| `agents/README.md` | Roster table |
| `agents/booster-agent/README.md` | Core intelligence agent |
| `agents/smartsalesguy/README.md` | How the one-pager is generated |
| `agents/docker-ci/README.md` | Build + Bug Bot gate |
| `agents/bug-bot/README.md` | Security/logic scan |
| `agents/pr-review-bot/README.md` | Review scoring |

Skip for the deck: `agents/*/runs/`, `agents/bug-bot/reports/`, `agents/pr-review-bot/reviews/`.

<!-- /AUTO-GENERATED: presentation files -->
