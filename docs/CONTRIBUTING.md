# Contributing

HawkxAI is a hackathon wedge. Keep the map and `/api/trends` stable. Never invent posts or a WHY.

## Prerequisites

- Node 20+
- npm
- Python 3.7+ (agents; stdlib only except optional PyYAML)
- Docker (image build / CI agent)
- GitHub CLI (`gh`) for PR Review Bot comments

## Setup

```bash
git clone https://github.com/snagaram3/grokhackx.git
cd grokhackx
npm install
cp .env.example .env.local
```

Set `GOOGLE_API_KEY` in `.env.local` only. Never commit it.

```bash
npm run dev
```

App: http://localhost:3000 · lookup: `/?q=Camry` · booster: `/api/booster` (after a phrase lookup).

## Commands

<!-- AUTO-GENERATED: commands. Source: package.json + agent CLIs. Do not hand-edit. -->

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build with type checking |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint via next lint |
| `npm run booster` | Booster Agent self-check |
| `npm run sales` | SmartSalesGuy self-check |
| `python3 -m unittest agents/docker-ci/tests/test_ci_agent.py` | Dockerfile contract tests |
| `python3 -m unittest agents/booster-agent/tests/test_booster.py` | Booster unit tests |
| `python3 -m unittest agents/smartsalesguy/tests/test_smartsalesguy.py` | One-pager unit tests |
| `python3 agents/bug-bot/bug_bot.py app --fail-on critical` | Bug Bot CI-style scan |
| `docker build -t hawkxai:latest .` | Production image |

<!-- /AUTO-GENERATED: commands -->

## Tests

- TypeScript: `npm run build` (typecheck + Next production compile) and `npm run lint`.
- Python: `python3 -m unittest agents/<agent>/tests/test_*.py`.
- Docker contract (no daemon): `python3 -m unittest agents/docker-ci/tests/test_ci_agent.py`.

New agent tests live next to the agent (`agents/<name>/tests/`). Do not invent WHY or posts in fixtures.

## Code style

- TypeScript + ESLint (`eslint-config-next`).
- Additive `/api/trends` fields only.
- If a source is degraded, say so in `degraded[]` — still render the rest.
- Kids age lens: safety and plain language over slang.
- Campaign advice must include risk.

## PR checklist

- [ ] `npm run lint` and `npm run build` pass
- [ ] Agent tests pass if you touched `agents/`
- [ ] No secrets in the diff (`.env`, `.env.local`, `*.pem`)
- [ ] Docker CI on the PR is green (image build + Bug Bot critical gate)
- [ ] Description says why, not only what
- [ ] Did not invent posts or a fake WHY

Team split is in the root [README.md](../README.md). Investor file list is in [presentation/README.md](./presentation/README.md#proposal-presentation).
