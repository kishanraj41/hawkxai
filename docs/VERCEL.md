# Host HawkAI on Vercel

The app is Next.js 14 (App Router). Demo locally with `npm run dev`. Use Vercel for a public URL.

`GET /api/trends` can take **45–90s** on a cold collect (Grok cluster + WHY). Without Fluid Compute, Hobby `maxDuration` is **60s** — do not set 120 (that fails the production deploy and asks for Pro). If the first load times out, refresh once, or enable **Fluid Compute** in the Vercel project (Hobby then allows up to 300s). In-memory cache will not survive across serverless instances.

## 1. Prerequisites

- GitHub repo: `https://github.com/snagaram3/grokhackx`
- An xAI key from [console.x.ai](https://console.x.ai)
- A [Vercel](https://vercel.com) account (GitHub login is fastest)

Do **not** put `XAI_API_KEY` in git. Local only: `.env.local`.

## 2. Deploy from the dashboard (recommended)

1. Open [vercel.com/new](https://vercel.com/new).
2. Import **snagaram3/grokhackx**.
3. Set **Framework Preset** to **Next.js** (auto-detected).
4. Set **Root Directory** to `.` (repo root).
5. Production branch: `main` or `feat/d3-map` if that is the demo branch.
6. Environment variables (Production + Preview):

   | Name | Value |
   |---|---|
   | `XAI_API_KEY` | `xai-...` (from console.x.ai) |
   | `YOUTUBE_API_KEY` | optional — official YouTube / Shorts titles. Skip the feed if unset. |

7. Click **Deploy**.
8. After the build succeeds, open `https://<project>.vercel.app`.
9. First visit: wait up to a minute for `/api/trends`. Open **Footprint ↗** for a campaign-name lookup in a new tab. If you see a 504, refresh once.

## 3. Deploy from the CLI

```bash
npm i -g vercel
cd grokhackx
npx vercel login
npx vercel
```

Link the existing GitHub project if prompted. Then set the secret:

```bash
npx vercel env add XAI_API_KEY production
npx vercel --prod
```

## 4. What this repo already configures

- `vercel.json` — framework, `iad1` region, function time limits
- `next.config.mjs` — `output: "standalone"` only **off** Vercel (Docker still works)
- `package.json` — `next build` / `next start`

## 5. After deploy checklist

- [ ] `https://<url>/` shows HAWKAI header
- [ ] Circles appear (or “clustering…” then circles)
- [ ] Click a circle → WHY + 3 receipt links
- [ ] Ask box returns an answer
- [ ] City dropdown still works
- [ ] `.env.local` was never committed

## 6. Common failures

| Symptom | Fix |
|---|---|
| Build OK, map empty, `Trends failed (504)` | Function timed out. Upgrade to Pro or retry; first Grok cluster is slow. |
| `XAI_API_KEY` missing | Add it in Vercel → Settings → Environment Variables, then **Redeploy**. |
| Reddit / X pills say NO SIGNAL | Expected on some networks. HN still fills the map. |
| Docker vs Vercel | Docker uses `Dockerfile` + standalone. Vercel ignores Docker. |
