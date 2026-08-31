# HawkxAI Data Model & Collection Strategy

**Generated**: 2026-08-25  
**Purpose**: Explain the data collection model, pricing rationale, and competitive advantages

---

## Executive Summary

HawkxAI uses a **client-directed intelligence model**: we don't track everything — we track what you care about. Paying clients provide their "points of interest" (campaign names, product hashtags, owned phrases), and HawkxAI tracks those specific phrases across platforms.

**Key Distinction**:
- **Public data layer**: Sample trending topics (free to view on `/`)
- **Client POI layer**: Paid clients' owned phrases tracked continuously with full history

This is not a limitation — it's a **strategic advantage** that makes HawkxAI more focused, cost-effective, and valuable than "track everything" enterprise tools.

---

## Data Collection Model

### Tier 1: Public Trending Data (Sample)

**What it is**:  
General trending topics across X, Reddit, HN, YouTube — curated and clustered to show "what's hot right now."

**Who sees it**:  
- Everyone (unauthenticated visitors)
- Available at `/` (main dashboard)
- Refreshed every 5 minutes (cached)

**What's included**:
- ✓ Trending topics with velocity (rising/peaking/fading)
- ✓ Platform divergence (X-only bubble vs. spreading everywhere)
- ✓ Sample posts (receipts)
- ✓ Basic sentiment from titles
- ✗ No historical tracking (ephemeral, current snapshot only)
- ✗ No overnight deltas
- ✗ No campaign intelligence

**Purpose**:  
- Attract users ("see what's trending")
- Demo the UI and data quality
- Lead generation for paid tiers

**Cost structure**:  
- Minimal: shared public API calls
- No per-user storage
- Cached heavily (5-minute TTL)

---

### Tier 2: Client Points of Interest (Paid)

**What it is**:  
Specific phrases, campaign names, hashtags, products that **paying clients explicitly ask us to track**.

**Who provides POIs**:  
- Starter: Client provides up to 3 phrases to "star" for ongoing tracking
- Pro: Client provides up to 15 phrases
- Agency: Client provides 50+ phrases
- Enterprise: Unlimited client-defined phrases

**Examples of POIs**:
- Campaign hashtag: `#HeatWaveFit`
- Product name: `Camry`
- Brand phrase: `Just Do It`
- Event: `WWDC 2026`
- Competitor: `@rivalBrand`

**What's included**:
- ✓ Continuous tracking (hourly snapshots)
- ✓ 30-90 day history (depending on tier)
- ✓ Overnight deltas (star Monday, see changes Tuesday)
- ✓ Campaign intelligence (mind maps, competitor playbooks, age lenses)
- ✓ Sentiment correlation with receipts
- ✓ Risk flags and alerts
- ✓ Export to PDF/CSV/Markdown

**Data retention**:
- Starter: 7 days
- Pro: 30 days
- Agency: 90 days
- Enterprise: Custom (1+ year)

**Cost structure**:  
- Per-phrase storage (Postgres row per snapshot)
- Hourly collection jobs (targeted API calls)
- Client pays for what they track (not everything)

---

## Why This Model Wins

### 1. Cost-Efficient (Pass Savings to Clients)

**Traditional model** (Brandwatch, Meltwater):  
"Track everything, charge everyone $50k/year to access the firehose"

**HawkxAI model**:  
"Track what you care about, pay $200/month for your phrases"

**Advantage**:  
- No wasted resources tracking irrelevant data
- Lower infrastructure costs = lower client prices
- Clients don't subsidize other clients' data

---

### 2. Focused Intelligence (Not a Firehose)

**Problem with enterprise tools**:  
Drinking from a firehose. 10 million mentions per day, 99.9% irrelevant to your campaign.

**HawkxAI approach**:  
You launched `#HeatWaveFit`. We track `#HeatWaveFit` and show you **only that campaign's footprint**. No noise.

**Client benefit**:  
- Signal, not noise
- Actionable insights, not data overload
- 30 seconds to value, not 30 minutes parsing irrelevant mentions

---

### 3. Client Privacy & Control

**Enterprise tools**:  
Your competitor using Brandwatch can see your campaign mentions because Brandwatch tracks everything.

**HawkxAI**:  
Your POIs are **private**. We only track phrases you explicitly request. Other clients can't see what you're monitoring.

**Example**:  
- Nike tracks `#JustDoIt` (their POI)
- Adidas tracks `#ImpossibleIsNothing` (their POI)
- Neither sees the other's POI data (unless they independently add it)

**Advantage**:  
- Competitive intelligence stays private
- No "everyone sees everything" model
- Clients control their data footprint

---

### 4. Scalable Pricing (Pay for What You Use)

**Pricing tied to value**:

```
Starter $49/mo:   3 POIs × 7 days history   = casual user
Pro $199/mo:     15 POIs × 30 days history  = active marketer
Agency $999/mo:  50+ POIs × 90 days history = multi-client agency
```

**Fair model**:  
- Small business tracking 1 campaign: $49/month
- Agency tracking 20 client campaigns: $999/month (still cheaper than 1 Brandwatch seat)

**Scales with value delivered**, not arbitrary seat counts.

---

### 5. No Speculative Data Waste

**Traditional model trap**:  
"Let's track every mention of every brand just in case someone searches for it"  
→ Massive storage costs  
→ Massive API costs  
→ Passed to clients as $50k/year pricing

**HawkxAI reality**:  
"Client says 'track Camry' → we track Camry → client gets Camry insights"  
→ Minimal wasted resources  
→ Lower costs  
→ $200/month pricing

---

## How It Works (Technical Flow)

### Free User Journey

1. User visits `/` (no login)
2. Sees **public trending topics** (sample data, current snapshot)
3. Clicks a trending topic → sees sample posts and velocity
4. Wants to track their own campaign → **paywall**: "Star your own phrase with Pro"

---

### Paid User Journey (POI Tracking)

1. User signs up for **Pro ($199/mo)**
2. User adds POI: "Track `#HeatWaveFit`" (the campaign they just launched)
3. HawkxAI begins **hourly collection**:
   - X API: search for `#HeatWaveFit`
   - Reddit API: search for `#HeatWaveFit`
   - HN Algolia: search for `HeatWaveFit`
   - YouTube Data API: search for `HeatWaveFit`
4. Every hour: snapshot stored in Postgres (`hawkxai_pois` table)
5. User returns next morning:
   - **Overnight delta**: "847 mentions (↑ 23% from yesterday)"
   - **Mind map**: Related phrases, shared artifacts
   - **Campaign intelligence**: Competitor moves, age lenses, risk flags
6. User exports PDF for 9am standup

---

### Data Retention

| Tier | POI Limit | History | Snapshots | Storage Cost |
|------|-----------|---------|-----------|--------------|
| **Starter** | 3 | 7 days | 3 POIs × 168 hours = 504 snapshots | ~$1/month |
| **Pro** | 15 | 30 days | 15 POIs × 720 hours = 10,800 snapshots | ~$20/month |
| **Agency** | 50+ | 90 days | 50 POIs × 2,160 hours = 108,000 snapshots | ~$150/month |

**Margins**:  
- Starter: $49/mo revenue - $1 storage = **$48 margin (98%)**
- Pro: $199/mo revenue - $20 storage = **$179 margin (90%)**
- Agency: $999/mo revenue - $150 storage = **$849 margin (85%)**

Infrastructure costs (API calls, compute) add ~20-30% on top, but margins remain healthy.

---

## Positioning This Model

### Turn "Limitation" Into Strength

**Don't say**:  
"We only track what you tell us to track because we can't afford to track everything"

**Do say**:  
"HawkxAI is **client-directed intelligence**. You tell us what campaigns matter, and we focus 100% on tracking those — no noise, no irrelevant data, just your campaign footprint with receipts."

---

### Messaging Framework

#### Problem (Enterprise Tools)
"Brandwatch tracks 10 billion mentions per day. 99.9% are irrelevant to your campaign. You're paying $50k/year to drink from a firehose."

#### Solution (HawkxAI)
"HawkxAI tracks **only what you care about**. You launched `#HeatWaveFit`. We track `#HeatWaveFit`. You get focused intelligence, not data overload."

#### Proof
"Your campaign, your data, your insights. Star a phrase Monday, see overnight deltas Tuesday. No firehose, no noise, just signal."

---

## Objection Handling

### Objection: "You don't have historical data"

**Response**:  
"Correct — we don't speculatively track everything. Here's why that's better for you:

1. **You tell us what to track**: The day you sign up, we start tracking your campaigns. No paying for years of data you'll never use.

2. **Historical data is expensive**: Brandwatch charges $50k/year partly because they store 10 years of everything. You pay for that whether you need it or not.

3. **Your campaigns are new**: When you launch `#HeatWaveFit` on Monday, there's no historical data anyway. We start tracking Monday, you see results Tuesday. That's the data that matters."

**Follow-up**:  
"If you need historical data for a specific phrase, we can backfill it (API costs apply). But most clients find that real-time forward-looking tracking is what drives decisions."

---

### Objection: "What if I want to track a trending topic you're not tracking?"

**Response**:  
"Perfect use case! That's exactly what the paid tiers are for.

See something trending on `/`? Click 'Track This' and it becomes your POI. Or add any phrase you want — your competitor's campaign, your product name, your event hashtag.

The public trending feed is the window. Your POIs are the telescope."

---

### Objection: "Can't I just search manually when I need it?"

**Response**:  
"You can, but here's what you lose:

1. **Overnight deltas**: Manual search is a one-time snapshot. HawkxAI tracks every hour, so you see *trends over time* — not just 'how many mentions right now.'

2. **Historical context**: On Tuesday, you can see Monday's peak and know if you're rising or fading. Manual search can't tell you that.

3. **Alerts**: We notify you when your POI hits risk flags (negative sentiment clustering). Manual search means you have to remember to check every day.

Manual search is reactive. POI tracking is proactive."

---

## Sales Pitch: Client-Directed Intelligence

### Elevator Pitch

"HawkxAI is **client-directed campaign intelligence**. Unlike Brandwatch, which tracks everything and charges you $50k/year for a firehose, HawkxAI tracks **only what you care about**.

You tell us your campaign hashtags, product names, or competitor phrases. We track those across X, Reddit, HN, and YouTube — hourly snapshots, overnight deltas, campaign playbooks.

You pay $199/month for 15 tracked phrases. No noise. No irrelevant data. Just your campaign footprint with receipts."

---

### Demo Script

**Step 1: Show Public Feed**  
"This is what everyone sees — trending topics right now. Free, no login required."

**Step 2: Click a Topic**  
"Click a topic, you see sample posts and velocity. But this is ephemeral — no history, no tracking."

**Step 3: Paywall**  
"Want to track your own campaign? That's where POI tracking comes in. Watch this."

**Step 4: Add POI (Paid Feature)**  
[Login as demo account]  
"I'll add `#HeatWaveFit` — a campaign we just launched. HawkxAI now tracks this hourly."

**Step 5: Show Delta**  
[Switch to another demo POI tracked for 2 days]  
"Here's a phrase I tracked starting Monday. Look — 847 mentions yesterday, 1,041 today. That's a 23% increase. I can see:
- When it peaked (2-4pm CT)
- Where it's spreading (X → Reddit)
- Risk flags (6 negative posts on Reddit about pricing)
- Competitor moves (RivalBrand launched counter-campaign 8 hours later)"

**Step 6: Close**  
"This is what you can't get from manual search or ChatGPT. It's tracked, measured, and evidence-based. And it's $199/month for 15 campaigns like this."

---

## Product Roadmap Implications

### Phase 1: Launch (Current State)
- ✓ Public trending feed (sample data)
- ✓ POI tracking for paid users (manual entry)
- ✓ 7-30 day retention
- ✓ Hourly snapshots

### Phase 2: Smart POI Discovery (Next 3 Months)
- [ ] **Auto-suggest POIs**: "We noticed your website mentions `#HeatWaveFit`. Want to track it?"
- [ ] **Competitor auto-add**: "Track your top 3 competitors' campaign hashtags automatically"
- [ ] **Import from bio**: Scrape client's X/LinkedIn bio for owned hashtags

### Phase 3: POI Expansion (6 Months)
- [ ] **Shared POI marketplace**: "Track what other Nike marketers are tracking" (opt-in)
- [ ] **Industry POI packs**: "Track all athletic apparel campaigns" (20 pre-selected POIs)
- [ ] **AI-suggested POIs**: "Based on your tracked phrases, you might also want to track these 5"

### Phase 4: Historical Backfill (9 Months)
- [ ] **On-demand backfill**: "Want 90 days of history for `#HeatWaveFit`? $50 one-time fee."
- [ ] **Pre-built archives**: "Top 100 brands' campaigns, already backfilled, available for purchase"

---

## Competitive Advantage Summary

| Factor | Brandwatch | HawkxAI |
|--------|-----------|---------|
| **Data model** | Track everything | Track client POIs only |
| **Cost to provider** | Massive (10B mentions/day) | Minimal (client-directed) |
| **Cost to client** | $50k/year (subsidize all data) | $200/month (pay for your data) |
| **Noise level** | 99.9% irrelevant | 100% relevant (your campaigns) |
| **Privacy** | Everyone sees everything | Your POIs are private |
| **Historical data** | 10+ years (you pay for it) | 7-90 days (pay for what you need) |
| **Setup time** | 6 weeks (learning the firehose) | 5 minutes (add your POIs) |

**Bottom line**: HawkxAI's client-directed model is a feature, not a bug. It's why we're 100x cheaper and 100x more focused.

---

## Messaging Do's and Don'ts

### ❌ Don't Say
- "We can't afford to track everything"
- "Limited historical data"
- "We only track what you ask us to because of cost constraints"

### ✅ Do Say
- "Client-directed intelligence — no firehose, just signal"
- "Pay only for the phrases you care about"
- "Your campaigns, your data, your privacy"
- "Focus on forward-looking insights, not 10 years of irrelevant history"
- "Tracking starts the day you sign up — perfect for new campaign launches"

---

## FAQ for Sales Team

**Q: What if a client wants 10 years of historical data?**  
A: Recommend Brandwatch. That's their strength. We're built for forward-looking campaign tracking, not archival research.

**Q: Can we backfill historical data?**  
A: Technically yes (some APIs support it), but it's expensive (API costs) and not our core value prop. Offer it as a custom service (Agency/Enterprise tier) with cost pass-through.

**Q: What if two clients track the same POI?**  
A: Data is deduplicated in storage (we don't double-collect), but each client's dashboard is private. They each see "their" POI's data, but they don't know the other client is also tracking it.

**Q: Can clients share POI data with their team?**  
A: Yes — multi-seat plans (Agency tier) allow team members to see all POIs tracked under that account.

**Q: What's the max number of POIs per client?**  
A: Currently 50 (Agency tier). For 100+ POIs, move to Enterprise (custom pricing). Each POI costs us ~$1-2/month in storage + API, so price accordingly.

---

## Internal Metrics to Track

- **POI churn**: How many clients stop tracking a POI after 30 days? (Indicates campaign ended or POI was irrelevant)
- **POI utilization**: Average # of active POIs per tier (are Pro users using all 15 slots?)
- **POI conversion**: % of free users who add a POI within 7 days of seeing trending feed
- **POI value**: Which POIs drive the most engagement (clicks, exports, deltas checked)?

**Goal**: Optimize pricing tiers based on actual POI usage patterns.

---

**Last Updated**: 2026-08-25  
**Next Review**: After first 100 paying POI clients  
**Owner**: Product / Marketing

