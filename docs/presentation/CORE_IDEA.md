# HawkAI Core Idea

Capturing the current trend hashtags/ QRs/phrases/URLs etc and analyze them and co-relate them on why they are treanding and collect this information to create a cool interactive dashboard that gives us most useful information to all age groups and compititors in the bussiness that will leverage their campains.

## What this means in product terms

HawkAI is not only a live circle-pack of topics. The **Booster Agent** is the intelligence layer that:

1. **Captures** live artifacts — hashtags, QR / short-link campaign codes, phrases, URLs, cashtags.
2. **Analyzes** them against velocity, platform divergence, and receipt posts.
3. **Correlates** *why* something is trending (evidence only — never invent a WHY).
4. **Translates** the same signal for every age group: kids, Gen Z, millennials, Gen X, boomers.
5. **Arms competitors** with campaign moves: hook, timing, risk, and how to ride the need without copying the meme.
6. **Improvises** after every run — ranked upgrades that make the dashboard more useful.

The map stays the map. Booster sits beside it: capture → correlate → campaign → improvise.

## Non-negotiables

- Never invent posts or a fake WHY.
- `/api/trends` contract stays stable (additive fields only).
- If a source is degraded, say so — still boost the sources that worked.
- Kids lens must prefer safety and plain language over slang.
- Campaign advice must include risk, not just opportunity.

## Surfaces

| Surface | Owner |
|---|---|
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
3. Google Trends + news (GDELT) time-lag correlation.
4. Age-group toggle on the map itself.
5. Brand-risk radar (controversy vs ride-along).
6. Geo / city pulse (Ask already hints at Austin-style questions).
7. Campaign calendar using `peakHourCT`.
8. Export a one-page campaign brief for a competitor.
