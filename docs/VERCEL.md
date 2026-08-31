# Host HawkxAI on Vercel

The app is Next.js 14 (App Router). Demo locally with `npm run dev`. Use Vercel for a public URL.

`GET /api/trends` can take **45–90s** on a cold collect (Gemini cluster + WHY). Without Fluid Compute, Hobby `maxDuration` is **60s** — do not set 120 (that fails the production deploy and asks for Pro). If the first load times out, refresh once, or enable **Fluid Compute** in the Vercel project (Hobby then allows up to 300s). In-memory cache will not survive across serverless instances.

## 1. Prerequisites

- GitHub repo: `https://github.com/kishanraj41/hawkxai`
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- A [Vercel](https://vercel.com) account (GitHub login is fastest)

Do **not** put `GOOGLE_API_KEY` in git. Local only: `.env.local`.

## 2. Deploy from the dashboard (recommended)

1. Open [vercel.com/new](https://vercel.com/new).
2. Import **kishanraj41/hawkxai**.
3. Set **Framework Preset** to **Next.js** (auto-detected).
4. Set **Root Directory** to `.` (repo root).
5. Production branch: `main` or `feat/d3-map` if that is the demo branch.
6. Environment variables (Production + Preview):

   | Name | Value |
   |---|---|
   | `GOOGLE_API_KEY` | Gemini API key from Google AI Studio |
   | `GEMINI_MODEL` | `gemini-3.5-flash` |
   | `FLEET_URL` | Cloud Run fleet URL (required for `/footprint` ingest; `GET /api/fleet` warms it) |
   | `CRON_SECRET` | optional — Vercel Cron bearer for `/api/collect?hourly=1` |
   | `YOUTUBE_API_KEY` | optional — official YouTube / Shorts titles. Skip the feed if unset. |
   | `TREND_DB_HOST` | Cloud SQL primary (`35.245.139.208`). Skip to collect in memory. |
   | `TREND_DB_USER` | `postgres` |
   | `TREND_DB_PASSWORD` | Cloud SQL password (sensitive on Production / Preview) |
   | `TREND_DB_PORT` | `5432` |
   | `TREND_DB_SSL` | `1` |
   | `TREND_DB_PREFIX` | `hawkxai` |
   | `TREND_DB_ADMIN` | `postgres` (provision script) |

7. Click **Deploy**.
8. After the build succeeds, open `https://hawkxai.vercel.app` (legacy `https://grokhackx.vercel.app` redirects here).
9. First visit: wait up to a minute for `/api/trends`. Open **Footprint** for a campaign-name lookup. If you see a 504, refresh once.

## Custom domain (`hawkxai.com`)

The Vercel project already has `hawkxai.com` and `www.hawkxai.com`. Apex redirects to `www`. GoDaddy still uses `ns55.domaincontrol.com` / `ns56.domaincontrol.com`, so DNS must be edited **at GoDaddy** (Vercel cannot write those records).

In GoDaddy → hawkxai.com → **DNS** → **Records**:

1. Turn off **Forwarding** / the parking page if it is on (it owns the extra A records).
2. Delete A records for `@` that are **not** `216.198.79.1` or `64.29.17.1` (today that is `13.248.243.5` and `76.223.105.230`).
3. Set these records (TTL 600 is fine):

| Type | Name | Value |
|---|---|---|
| A | `@` | `216.198.79.1` |
| A | `@` | `64.29.17.1` |
| CNAME | `www` | `ec5f747d6cfb4611.vercel-dns-017.com` |

4. Save. Wait 5–30 minutes, then `https://www.hawkxai.com` should serve the desk (`https://hawkxai.com` 308s to www).

Do not switch nameservers unless you want Vercel to own all DNS. Keep GoDaddy NS and only change the records above.

## 3. Deploy from the CLI

```bash
npm i -g vercel
cd hawkxai
npx vercel login
npx vercel
```

Link the existing GitHub project if prompted. Then set the secret:

```bash
npx vercel env add GOOGLE_API_KEY production
npx vercel --prod
```

## 4. What this repo already configures

- `vercel.json` — framework, function time limits, daily cron `GET /api/collect?hourly=1` at `0 12 * * *` (Hobby). Pro can run that path hourly.
- Cloud SQL `hawkxai-trends` in `us-east4` — see [ARCHITECTURE.md](./ARCHITECTURE.md). Hobby currently allowlists `0.0.0.0/0` so functions can reach Postgres; replace with Static IPs later.
- `next.config.mjs` — `output: "standalone"` only **off** Vercel (Docker still works)
- `package.json` — `next build` / `next start`

## 5. After deploy checklist

- [ ] `https://<url>/` shows HAWKXAI header
- [ ] Circles appear (or “clustering…” then circles)
- [ ] Click a circle → WHY + 3 receipt links
- [ ] Ask box returns an answer
- [ ] City dropdown still works
- [ ] `.env.local` was never committed

## 6. Common failures

| Symptom | Fix |
|---|---|
| Build OK, map empty, `Trends failed (504)` | Function timed out. Upgrade to Pro or retry; first Gemini cluster is slow. |
| `GOOGLE_API_KEY` missing | Add it in Vercel → Settings → Environment Variables, then **Redeploy**. |
| Reddit / X pills say NO SIGNAL | Expected on some networks. HN still fills the map. |
| Docker vs Vercel | Docker uses `Dockerfile` + standalone. Vercel ignores Docker. |
