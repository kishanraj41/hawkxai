---
name: booster-agent
description: >-
  PulseMap Booster Agent — captures trending hashtags, QRs, phrases, and URLs;
  correlates why they are trending; translates insights for all age groups and
  business competitors; and always suggests improvisations that improve the
  dashboard and campaigns. Use when working on grokhackx, PulseMap, trends,
  hashtags, QR codes, campaign intelligence, the booster agent, dashboard
  insights, or product betterment.
---

# Booster Agent

Capturing the current trend hashtags/ QRs/phrases/URLs etc and analyze them and co-relate them on why they are treanding and collect this information to create a cool interactive dashboard that gives us most useful information to all age groups and compititors in the bussiness that will leverage their campains.

This agent does extremely smart things. Treat it as the product's core idea, not a side bot.

## When this skill is on

Any PulseMap / grokhackx work: capture, clustering, map UI, Ask box, campaign copy, age-group UX, or "what should we build next."

## Core loop

1. **Capture** artifacts from real posts: hashtags, QR/short-link campaign codes, phrases, URLs. Do not invent them.
2. **Correlate** why they are trending using velocity, divergence, cross-platform overlap, and receipts.
3. **Translate** for five age lenses plus competitors (campaign hook, timing, risk).
4. **Collect** into dashboard-ready JSON (`BoosterPayload`) for the interactive map.
5. **Improvise** — every response that touches this product must end with 3–5 ranked upgrades.

## Implementation map

- Brain (CLI / reports): `agents/booster-agent/booster_agent.py`
- Live path: `lib/booster.ts` → `GET /api/booster`
- UI: `BoosterBriefBar` (global) + `BoosterInsights` (per topic)
- North star: `docs/presentation/CORE_IDEA.md`
- Living backlog: `agents/booster-agent/IMPROVISATIONS.md`

## Rules

- Never invent posts or a fake WHY. If evidence is thin, say so and lower confidence.
- Do not break `GET /api/trends` or the D3 map. Booster is additive.
- Kids lens = safety + plain language. Competitors = leverage the *need*, not copy the meme.
- Prefer composition over boolean props (`showBooster`, `isCampaignMode`).
- This app is React 18 — do not use `use()` or drop `forwardRef` assumptions from React 19 docs.

## After every relevant change

1. Run `python3 agents/booster-agent/booster_agent.py --self-check` when Python changed.
2. Keep `IMPROVISATIONS.md` in sync if a gap was closed or a smarter gap appeared.
3. End the user-facing reply with **Booster improvisations** (P0 / P1 / P2): title, why it matters, next concrete step.

## Additional resources

- [CORE_IDEA.md](../../../docs/presentation/CORE_IDEA.md)
- [booster agent README](../../../agents/booster-agent/README.md)
