# Documentation

This directory contains research, analysis, planning, and investor documents for HawkAI.

- **[VC one-pager](./VC_ONE_PAGER.md)** — SmartSalesGuy investor proposal (problem, solution, live / next)
- **[SmartSalesGuy](../agents/smartsalesguy/README.md)** — checkout the repo, write the one-pager

## Core idea

HawkAI's north star is the **Booster Agent**: capture hashtags / QRs / phrases / URLs, correlate why they are trending, and feed an interactive dashboard useful to every age group and to competitors running campaigns.

- **[Core idea](./CORE_IDEA.md)** — product contract
- **[Booster Agent](../agents/booster-agent/README.md)** — capture → correlate → campaign → improvise
- **[Improvisations](../agents/booster-agent/IMPROVISATIONS.md)** — living upgrade backlog
- **[Vercel hosting](./VERCEL.md)** — import the GitHub repo, set `XAI_API_KEY`, deploy

## Research

### Trend Analysis Dashboard Research

Comprehensive research and analysis documents for the trend analysis dashboard concept:

- **[Trend Analysis Dashboard Research](./research/trend_analysis_dashboard_research.md)** - Full market analysis, competitive landscape, use cases, monetization strategy, and viability assessment
- **[Quick Implementation Guide](./research/quick_implementation_guide.md)** - 90-day MVP plan, technical architecture, code examples, and step-by-step implementation guide

## Quick Links

### Research Summary
- ⭐ **Viability Rating:** 5/5 - Highly viable with strong commercial potential
- 💰 **Market Opportunity:** $500M-$1B serviceable addressable market
- 🚀 **Time to MVP:** 90 days with 2-3 person team
- 💵 **Bootstrap Budget:** $0-5k (using free tiers)
- 📈 **Success Stories:** Similar to Dataminr ($4.1B), PredictHQ ($50M raised)

### Key Recommendations
1. Start with focused MVP (one vertical: stock traders)
2. Nail 10 perfect correlations (quality over quantity)
3. Launch to finance Twitter community
4. Early adopter pricing: $49/month
5. Goal: 100 users in first month

### Tech Stack
- **Backend:** Python + FastAPI + PostgreSQL/TimescaleDB
- **Frontend:** React + TypeScript + Recharts
- **Data Sources:** Twitter API, Stock APIs, News APIs, Weather/Disaster APIs
- **Analytics:** pandas, scipy (correlation analysis)

---

For detailed analysis and implementation plans, see the research documents above.

<!-- AUTO-GENERATED: presentation files. Source: grokhackx checkout + VC_ONE_PAGER.md. Do not hand-edit. -->

## Proposal presentation

Open beside chat: Cursor canvas `proposal-presentation.canvas.tsx` (workspace canvases folder).

**If you only have five minutes:** `docs/VC_ONE_PAGER.md`, `docs/CORE_IDEA.md`, `docs/research/trend_analysis_dashboard_research.md`, `agent_team_canvas.html`, live demo at http://localhost:3001.

### Narrative

| File | Use in the deck |
|---|---|
| `docs/VC_ONE_PAGER.md` | Master script: problem, solution, why now, live, agents, next, ask |
| `docs/CORE_IDEA.md` | Product contract: capture → correlate → campaign; non-negotiables |
| `README.md` | Setup, `/api/trends` contract, demo URLs |
| `docs/README.md` | Index of investor + research docs |

### Market / ask

| File | Use in the deck |
|---|---|
| `docs/research/trend_analysis_dashboard_research.md` | TAM/SAM/SOM, comparables, gap |
| `docs/research/quick_implementation_guide.md` | 90-day MVP, team, budget |
| `agents/booster-agent/IMPROVISATIONS.md` | Ranked “what’s next” from real product gaps |

### Live product proof

| File | Use in the deck |
|---|---|
| `app/page.tsx` | App entry |
| `components/HawkAIApp.tsx` | Map shell |
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
| `agent_team_canvas.html` | Visual of the agent roster |
| `agents/README.md` | Roster table |
| `agents/booster-agent/README.md` | Core intelligence agent |
| `agents/smartsalesguy/README.md` | How the one-pager is generated |
| `agents/docker-ci/README.md` | Build + Bug Bot gate |
| `agents/bug-bot/README.md` | Security/logic scan |
| `agents/pr-review-bot/README.md` | Review scoring |

Skip for the deck: `agents/*/runs/`, `agents/bug-bot/reports/`, `agents/pr-review-bot/reviews/`.

<!-- /AUTO-GENERATED: presentation files -->

<!-- AUTO-GENERATED: commands. Source: package.json + agent CLIs. Do not hand-edit. -->

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (http://localhost:3000) |
| `npm run build` | Production build with type checking |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint via next lint |
| `npm run booster` | Booster Agent self-check (no network) |
| `npm run sales` | SmartSalesGuy self-check / refresh one-pager |
| `python3 agents/docker-ci/ci_agent.py` | Lint Dockerfile, build image, smoke-test, Bug Bot |
| `python3 agents/bug-bot/bug_bot.py [path] --fail-on critical` | Scan tree; CI gate on critical |
| `python3 agents/pr-review-bot/review_bot.py <pr>` | Review a GitHub PR |
| `docker build -t hawkai:latest .` | Production image |

<!-- /AUTO-GENERATED: commands -->

<!-- AUTO-GENERATED: environment. Source: .env.example. Do not hand-edit. -->

## Environment

Copy `.env.example` to `.env.local` (gitignored). Never commit keys.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `XAI_API_KEY` | Yes (for live Grok) | xAI key for clustering, Ask, and tickers. App still boots without it; Ask/trends degrade. | `xai-...` |

Vercel: set the same variable in project env. Docker: `-e XAI_API_KEY=...`.

<!-- /AUTO-GENERATED: environment -->

<!-- AUTO-GENERATED: API. Source: app/api/*/route.ts. Do not hand-edit. -->

## API

Warm `/api/trends` before Ask or Booster (409 until the cache is populated). First trends call can take 60–90s; then 5-minute cache. `?refresh=1` bypasses cache.

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| `GET` | `/api/trends` | `XAI_API_KEY` for Grok cluster | `{ topics, updatedAt, sources, degraded }` |
| `GET` | `/api/trends?refresh=1` | same | Force refetch |
| `POST` | `/api/ask` | Grok optional | Body `{ "q": "..." }` → `{ answer, topicIds[] }`. 400 if `q` missing; 409 if no trends. |
| `GET` | `/api/booster` | none (uses trends cache) | Artifacts, why-trending, age lenses, campaign. 409 if no trends. |

Vercel `maxDuration` is 60s for trends and ask (`vercel.json`).

<!-- /AUTO-GENERATED: API -->

<!-- AUTO-GENERATED: infra. Source: Dockerfile + .github/workflows/docker-ci.yml. Do not hand-edit. -->

## Infrastructure

- **Dockerfile** — multi-stage Next.js standalone, non-root `nextjs`, port 3000.
- **Docker CI** — `.github/workflows/docker-ci.yml` on every PR commit and every push to `main`: contract tests, Hadolint (advisory), image build, smoke test, Bug Bot `--fail-on critical`.
- **Local image:** Grafana often holds host `:3000`; map HawkAI to `:3001` (`-p 3001:3000`).

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [RUNBOOK.md](./RUNBOOK.md).

<!-- /AUTO-GENERATED: infra -->
