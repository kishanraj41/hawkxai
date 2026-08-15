# Runbook

Operational path for HawkAI: local, Docker, Vercel, and CI.

## Health

There is no `/health` route. Treat these as live checks:

| Check | Expect |
|-------|--------|
| `GET /` | 200, map shell |
| `GET /api/trends` | 200 JSON after first cluster (60–90s cold) |
| `GET /api/booster` | 200 after trends are cached; **409** if trends never ran |
| `POST /api/ask` `{"q":"..."}` | 200 `{ answer, topicIds }`; **400** if `q` missing; **409** if no trends |

`degraded` on trends (e.g. `reddit offline`) is expected on some networks — still render other sources.

## Local

```bash
npm install
cp .env.example .env.local   # set XAI_API_KEY
npm run dev
```

Force refresh: `GET /api/trends?refresh=1`. Cache TTL is 5 minutes.

## Docker

```bash
docker build -t hawkai:latest .
docker run --rm -p 3001:3000 -e XAI_API_KEY=xai-... hawkai:latest
```

Host **:3000** is often Grafana. Map the container to **:3001**. Image user is `nextjs` (non-root).

Without `XAI_API_KEY` the UI still boots; Grok clustering and Ask degrade.

## Vercel

1. `npm run build` must pass locally.
2. Set `XAI_API_KEY` in Vercel project env.
3. `vercel.json` sets `maxDuration: 60` on `/api/trends` and `/api/ask`.

Rollback: revert the Vercel deployment to the previous production alias.

## CI

`.github/workflows/docker-ci.yml` runs on every PR commit, every feature-branch push (opens a PR against `main` if missing), and every push to `main`:

1. Dockerfile contract tests
2. Hadolint (advisory)
3. Production image build (GHA layer cache)
4. Smoke-test `GET /`
5. Bug Bot `--fail-on critical` on `app/`, `lib/`, `components/`
6. PR Review Bot (advisory) + sticky comment on pull requests
7. Auto-open a PR against `main` on feature-branch pushes when none exists

Failure of build, smoke, or critical Bug Bot blocks merge.

## Common issues

| Symptom | Fix |
|---------|-----|
| `Bind for 0.0.0.0:3000 failed` | Something else (often Grafana) holds 3000. Use `-p 3001:3000`. |
| `/api/booster` or `/api/ask` 409 | Hit `GET /api/trends` first. |
| Ask says Grok is offline | `XAI_API_KEY` missing in `.env.local`, Docker `-e`, or Vercel env. |
| Reddit pill `reddit offline` | 403 on some networks. Expected; map still renders HN/X. |
| First trends call ~90s | Cold Grok cluster. Subsequent hits use the 5-minute cache. |
| Docker build SWC unicode regex | Production target is ES2017 (`tsconfig`); already fixed on this line. |

## Escalation

Hackathon team: backend owns `lib/*` + `app/api/*`; map owns `components/` + `app/page.tsx`. Do not invent data to unblock a demo — degrade honestly.
