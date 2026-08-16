# HawkAI Core Idea

Capturing the current trend hashtags/ QRs/phrases/URLs etc and analyze them and co-relate them on why they are treanding and collect this information to create a cool interactive dashboard that gives us most useful information to all age groups and compititors in the bussiness that will leverage their campains.

## Plug-and-play desk

A **category is a plug**. Drop Markets, News, Weather, Tech, Sports, Health, Security, Campaigns, or Culture into the desk — the same modules fill from live evidence:

1. **Trends in that category** — ranked names, velocity, risk.
2. **Causation graph** — measured drivers only: first print, source heat, cross-source lag, hashtag/QR/ticker load, risk words. Never a generated story.
3. **Occurrence timeseries** — when receipts actually landed (area by source, CT). First print is marked.
4. **Campaign brief** — hook, timing, risk, five age lenses.

The map is one more module you can plug in (`M`). The desk is the operating surface (`D`). `J/K` walks the tape. `⌘K` focuses Ask.

Same modules compose into the topic rail when a name is selected. Swap the category plug; keep the UI.

## What this means in product terms

HawkAI is not only a live circle-pack of topics. The **Booster Agent** is the intelligence layer that:

1. **Captures** live artifacts — hashtags, QR / short-link campaign codes, phrases, URLs, cashtags.
2. **Analyzes** them against velocity, platform divergence, and receipt posts.
3. **Correlates** *why* something is trending (evidence only — never invent a WHY). Drivers are graphed, not narrated.
4. **Plugs** the same signal into a category desk — current trends, causation bars, occurrence timeseries.
5. **Translates** the same signal for every age group: kids, Gen Z, millennials, Gen X, boomers.
6. **Arms competitors** with campaign moves: hook, timing, risk, and how to ride the need without copying the meme.
7. **Improvises** after every run — ranked upgrades that make the dashboard more useful.

The map stays the map. Booster sits beside it: capture → correlate → **plug a category** → campaign → improvise.

## Non-negotiables

- Never invent posts or a fake WHY. If receipts are thin, the causation chart says so and lowers confidence.
- `/api/trends` contract stays stable (additive fields only). Category, causation, and timeseries are derived from receipts already on the topic.
- If a source is degraded, say so — still boost the sources that worked.
- Kids lens must prefer safety and plain language over slang.
- Campaign advice must include risk, not just opportunity.
- No pie charts. Time-series is area. Causation is horizontal bars.

## Surfaces

| Surface | Owner |
|---|---|
| Category plugs + desk | `components/desk/` + `components/ChartDesk.tsx` |
| Occurrence + causation | `lib/desk.ts` (live) · `agents/booster-agent/` (CLI) |
| Live map | `components/TrendMap.tsx` |
| Topic receipts | `components/TopicDetailPanel.tsx` |
| Booster briefing | `components/BoosterBriefBar.tsx` + `components/BoosterInsights.tsx` |
| Live boost API | `GET /api/booster` |
| Offline / CLI brain | `agents/booster-agent/` |
| Living upgrade backlog | `agents/booster-agent/IMPROVISATIONS.md` |

## Next-wave improvisations (always keep adding)

The Booster Agent re-ranks these from real gaps in each run. Seed list:

1. TikTok / YouTube Shorts / Instagram ingest — Gen Z campaigns are mostly invisible today.
2. QR *image* decode (scan attached media, not just QR-shaped URLs).
3. Persist hourly snapshots so occurrence charts cover more than one ingest.
4. Overlay GDELT / NWS events as lagged markers on the same timeseries (never as an invented WHY).
5. Age-group toggle on the map itself.
6. Brand-risk radar (controversy vs ride-along).
7. Geo / city pulse (Ask already hints at Austin-style questions).
8. Export a one-page campaign brief for a competitor.
