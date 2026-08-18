# HawkxAI — Hackathon

A live trend map across X, Reddit, and Hacker News. Grok 4.6 clusters related topics, while divergence is calculated in code. A topic exploding on one platform tells a different story from one gaining momentum across all platforms.

**Additional tab:** Footprint (`/footprint`) opens from the dashboard in a new browser tab. Look up a campaign name or phrase and see its internet footprint on the same desk, mind, and map.

# Core Idea — Booster Agent

The Booster Agent captures trending signals such as hashtags, phrases, URLs, and other emerging topics, then analyzes and correlates them to understand why they are trending.

It also looks up a particular word or phrase a marketing team already owns, and fills the same interactive dashboard with that phrase's footprint.

Capture signals → Correlate trends → Explain why → Identify audience relevance → Generate campaign insights → Continuously improve

Phrase lookup is additive: `/` stays the trending desk. `/footprint` is the campaign-name war-room.

```bash
python3 agents/booster-agent/booster_agent.py --self-check
```

North star: [docs/presentation/CORE_IDEA.md](docs/presentation/CORE_IDEA.md) — trending desk on `/`, phrase footprint on `/footprint`. Live: `GET /api/trends` and `GET /api/trends?topic=Camry`.

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
- Footprint tab: http://localhost:3000/footprint
- Data: http://localhost:3000/api/trends
- Phrase lookup: http://localhost:3000/api/trends?topic=Camry
- Force refresh: http://localhost:3000/api/trends?refresh=1
- Ask: `POST /api/ask` body `{ "q": "what's printing worldwide?" }`
- Booster: http://localhost:3000/api/booster  (after trends are cached)

First `/api/trends` can take ~60–90s (Grok cluster). After that it caches **5 minutes**.

## Map teammate — payload contract

`GET /api/trends?topic=` returns:

```ts
{
  topics: Topic[]
  updatedAt: string
  sources: { x: boolean; reddit: boolean; hn: boolean; public: boolean }
  degraded: string[]   // e.g. ["reddit offline"]
  plugged?: string     // the looked-up phrase
  query?: { raw, kind, category, match, hitCount, floor }
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
- Top bar: logo, footprint status, lookup (`⌘K`)
- Loading: skeleton circles, never a blank screen
- If `degraded` has `"reddit offline"`, show a small pill — still render the other sources

Lookup: header search or `/?q=Camry` → `GET /api/trends?topic=Camry` → same mind / desk / map for that phrase.

D3 is already in `package.json`.

## Known degradations (expected)

- **Reddit** may 403 on some networks. Pill: `reddit offline`. Try venue wifi.
- **X live search** can time out. Clustering still runs on HN (+ Reddit when available).
- **Tickers** are skipped until the map boots.

Never invent posts or a fake WHY.

## Deploy

Public URL: host on **Vercel**. Step-by-step: [docs/VERCEL.md](docs/VERCEL.md).

1. Import `snagaram3/grokhackx` at [vercel.com/new](https://vercel.com/new)
2. Framework: Next.js · root: `.`
3. Env: `XAI_API_KEY` (Production + Preview)
4. Deploy. First `/api/trends` can take up to ~60s.

Do not commit `.env.local`. Docker CI still builds the production image on every PR and opens a PR on every feature-branch push (`agents/docker-ci`).

## Stack

Next.js 14 (app router) · TypeScript · D3 v7 · Tailwind · xAI Grok 4.6 · Cloud SQL Postgres (10 category DBs) · no auth

Runtime topology (Mermaid): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · live at `/architecture`.

## Agents

Roster: [agents/README.md](agents/README.md)

| Agent | Role |
|---|---|
| [Booster](agents/booster-agent/README.md) | Capture → correlate → campaign (core idea) |
| [PR Review Bot](agents/pr-review-bot/README.md) | AI code review with quality scoring |
| [Bug Bot](agents/bug-bot/README.md) | Security and logic scan |
| [Docker CI](agents/docker-ci/README.md) | Production image build, smoke test, Bug Bot; auto-PR on every feature-branch push |
| [SmartSalesGuy](agents/smartsalesguy/README.md) | VC one-pager from this checkout |

```bash
python3 agents/booster-agent/booster_agent.py --self-check
python3 agents/docker-ci/ci_agent.py
python3 agents/smartsalesguy/smartsalesguy.py
```

Canonical investor page: [docs/presentation/VC_ONE_PAGER.md](docs/presentation/VC_ONE_PAGER.md) · Deck file list: [docs/presentation/README.md](docs/presentation/README.md#proposal-presentation)
