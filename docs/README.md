# Documentation

Ops docs for PulseMap live here. **Pitch and investor materials** are in **[presentation/](./presentation/)**.

- **[Contributing](./CONTRIBUTING.md)** — setup, scripts, tests, PR checklist
- **[Runbook](./RUNBOOK.md)** — local / Docker / Vercel / CI, health checks, rollback
- **[Presentation](./presentation/README.md)** — VC one-pager, core idea, research, agent canvas

North star (product contract): [presentation/CORE_IDEA.md](./presentation/CORE_IDEA.md) · Booster: [agents/booster-agent/README.md](../agents/booster-agent/README.md) · Improvisations: [IMPROVISATIONS.md](../agents/booster-agent/IMPROVISATIONS.md)

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
| `docker build -t pulsemap:latest .` | Production image |

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
- **Local image:** Grafana often holds host `:3000`; map PulseMap to `:3001` (`-p 3001:3000`).

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [RUNBOOK.md](./RUNBOOK.md).

<!-- /AUTO-GENERATED: infra -->
