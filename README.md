# HawkAI (hackathon)

Live trend map across X, Reddit, and Hacker News. Grok 4.6 clusters topics. Divergence is computed in code: a topic exploding on one platform is a different story than one rising everywhere.

## Core idea — Booster Agent

Capturing the current trend hashtags/ QRs/phrases/URLs etc and analyze them and co-relate them on why they are treanding and collect this information to create a cool interactive dashboard that gives us most useful information to all age groups and compititors in the bussiness that will leverage their campains.

The **Booster Agent** is that layer: capture artifacts → correlate why → translate for every age group → arm competitors with campaign moves → keep improvising the product.

```bash
python3 agents/booster-agent/booster_agent.py --self-check
```

North star: [docs/CORE_IDEA.md](docs/CORE_IDEA.md) · Agent: [agents/booster-agent/README.md](agents/booster-agent/README.md) · Live: `GET /api/booster` after `/api/trends`.

Repo: https://github.com/snagaram3/grokhackx

## Team split

| Person | Owns | Do not touch |
|---|---|---|
| Backend | `lib/*`, `app/api/*` | D3 map UI |
| Map | `app/page.tsx`, `components/` (new) | Grok prompts, fetchers |
| Polish | top bar, Ask box, detail panel, Vercel | pipeline timeouts |

**No extra features.** If you are behind, cut tickers and peak-hour — never the map, never `/api/trends`.

## Setup (everyone)

```bash
git clone https://github.com/snagaram3/grokhackx.git
cd grokhackx
git pull
npm install
cp .env.example .env.local
```

Put the xAI key only in `.env.local` (gitignored). Never commit it, never paste it in Discord.

```
XAI_API_KEY=xai-...
```

```bash
npm run dev
```

- App: http://localhost:3000
- Data: http://localhost:3000/api/trends
- Force refresh: http://localhost:3000/api/trends?refresh=1
- Ask: `POST /api/ask` body `{ "q": "what's blowing up in Austin?" }`
- Booster: http://localhost:3000/api/booster  (after trends are cached)

First `/api/trends` can take ~60–90s (Grok cluster). After that it caches **5 minutes**.

## Map teammate — payload contract

`GET /api/trends` returns:

```ts
{
  topics: Topic[]
  updatedAt: string
  sources: { x: boolean; reddit: boolean; hn: boolean }
  degraded: string[]   // e.g. ["reddit offline"]
}
```

Each `Topic`:

- `id` — slug, use as React key
- `label` — human phrase
- `platforms.x | reddit | hn` — `{ score: 0-100, posts: Post[] }`
- `velocity` — `"rising" | "peaking" | "fading"`
- `divergence` — `0` = everywhere, `1` = single-platform bubble
- `tickers` — may be `[]` (cut until map is live)
- `peakHourCT` — optional, e.g. `"7pm"`
- `why` — optional; omit if missing (never fake)

`Post`: `{ platform, title, url, score, createdAt }`

**UI spec (do this next):**

- Full-viewport D3 v7 **circle packing** SVG
- Outer circle = topic, sized by `x.score + reddit.score + hn.score`
- Inner circles = platforms: X `#ffffff`, Reddit `#ff4500`, HN `#ff6600` on `#0a0e14`
- Glow on `velocity === "rising"`
- Click zooms 600ms; right panel: label, velocity, divergence one-liner (`"X-only bubble"` / `"spreading"` / `"everywhere"`), 3 receipt links from `posts`, ticker chips
- Top bar: logo, `updatedAt`, refresh (`?refresh=1`), Ask box
- Loading: skeleton circles, never a blank screen
- If `degraded` has `"reddit offline"`, show a small pill — still render the other sources

Ask box: `POST /api/ask` → `{ answer, topicIds[] }` → highlight + zoom those nodes. Make zoom smooth before making it clever.

D3 is already in `package.json`.

## Known degradations (expected)

- **Reddit** may 403 on some networks. Pill: `reddit offline`. Try venue wifi.
- **X live search** can time out. Clustering still runs on HN (+ Reddit when available).
- **Tickers** are skipped until the map boots.

Never invent posts or a fake WHY.

## Deploy

Push a hello-world to Vercel as soon as `npm run build` works. Set `XAI_API_KEY` in Vercel env. First deploy at 2:40 is how this dies.

## Stack

Next.js 14 (app router) · TypeScript · D3 v7 · Tailwind · xAI Grok 4.6 · no database · no auth
