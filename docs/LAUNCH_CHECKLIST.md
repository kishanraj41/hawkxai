# HawkxAI Pre-Launch Checklist

**Goal**: Controlled beta launch to 10-20 performance marketers  
**Timeline**: Ready to launch in 2-3 days  
**Success Metric**: 10 daily active users by Week 4

---

## 🚀 Critical Path (Do These First)

### [ ] 1. Deploy to Production
**Time**: 30 minutes  
**Priority**: P0 (blocks everything)

```bash
# Option A: Vercel (Recommended)
1. Go to vercel.com/new
2. Import kishanraj41/hawkxai
3. Framework: Next.js
4. Root Directory: .
5. Add Environment Variables:
   - GOOGLE_API_KEY=your_gemini_key
   - GEMINI_MODEL=gemini-3.5-flash
   - FLEET_URL=https://your-fleet-url.run.app
6. Deploy

# Option B: Vercel CLI
vercel --prod
```

**Test**: Visit `https://your-app.vercel.app/api/trends` → Should return JSON (may take 60-90s first time)

---

### [ ] 2. Record 90-Second Demo Video
**Time**: 1 hour (including retakes)  
**Priority**: P0 (needed for all launch channels)

**Script**:
```
[0:00-0:10] The Problem
"You launched #SummerCrush campaign. Your founder asks: where did it land? 
You have no answer."

[0:10-0:20] Paste Campaign Phrase
"Open HawkxAI. Paste your campaign name. Hit enter."

[0:20-0:40] Mind Map Walkthrough
"60 seconds later: mind map shows where it printed. X, Reddit, Hacker News. 
Click a node → see receipts. Amber lines = shared artifacts."

[0:40-0:60] Artifacts & Predictions
"Captured: 8 hashtags that co-occurred. 3 QR codes. 12 URLs.
Prediction: Will peak in 6 hours. Post at 2pm CT for max engagement."

[0:60-0:80] Evidence-Only Positioning
"No invented WHY. Every artifact links to actual receipts. Evidence-only correlation."

[0:80-0:90] CTA
"Beta access: DM me your campaign name. First 10 marketers get free access through EOY."
```

**Tool**: Loom (loom.com) or Screen Studio (screen.studio)  
**Upload**: YouTube (public) + Twitter (native video performs better)  
**Thumbnail**: Mind map screenshot with campaign name visible

---

### [ ] 3. Write Launch Post (X/LinkedIn)
**Time**: 30 minutes  
**Priority**: P0

**Template** (customize before posting):

```
🚨 Real talk for performance marketers:

You shipped #SummerCrush campaign last week.
Your founder asks: "Did it land? Where? What's the ROI?"

You have 3 options:
1. Brandwatch → $50k/year, 6-week onboarding
2. Google Alerts → 80% noise, zero correlation
3. ChatGPT → invents sources, no receipts

We built option 4: HawkxAI

→ Paste your campaign phrase (hashtag, product name, slogan)
→ 60 seconds later: where it printed (X/Reddit/HN)
→ Mind map of artifacts: hashtags, QR codes, URLs that co-occurred
→ Peak time prediction: "Will hit maximum velocity in 6h"

Evidence-only. No hallucinated sources.

Brandwatch tells you "what's trending globally."
We tell you "where YOUR campaign landed."

Beta access: DM me with your campaign name.
First 10 marketers get free access through EOY.

🧵 Thread (3 more tweets): [Screenshots + demo video]
```

**Attach**:
1. Mind map screenshot (with real campaign name visible)
2. Prediction panel screenshot ("Will peak in 6h")
3. Demo video link

---

### [ ] 4. Create GitHub Social Preview
**Time**: 10 minutes  
**Priority**: P1

**Update README.md** with:
- Live demo link (Vercel URL)
- 90-second video embed
- "Used by 10+ performance marketers" (after beta)

**Update repository settings**:
- Description: "Campaign Footprint Intelligence for Performance Marketers"
- Website: Your Vercel URL
- Topics: `campaign-tracking`, `social-listening`, `performance-marketing`, `nextjs`, `d3`

---

## 📸 Marketing Assets (Create These)

### [ ] 5. Screenshot Package
**Time**: 30 minutes  
**Priority**: P1

**Needed Screenshots** (1920x1080, high quality):
1. **Trending Desk** - Homepage with circle-pack map, multiple topics visible
2. **Mind Map** - Footprint tab with campaign name + artifacts + amber bridges
3. **Prediction Panel** - "Will peak in 6h" + platform spread bars + risk alert
4. **Research Desk** - Topic dig with Wikipedia + web + HN + Reddit + X citations
5. **Watchlist** - POI table with occupancy scores and Δ columns

**Tool**: Built-in browser screenshots (⌘+Shift+4 on Mac, Win+Shift+S on Windows)  
**Storage**: `/workspace/marketing/screenshots/` (commit to repo)  
**Naming**: `trending-desk.png`, `mind-map-hawkxai.png`, etc.

---

### [ ] 6. Demo Campaign Examples
**Time**: 20 minutes  
**Priority**: P1

**Prepare 3 real campaigns to demo**:
1. **Tech Product Launch** (e.g., "Camry", "iPhone 16", "PS5")
2. **Hashtag Campaign** (e.g., "#HeatWaveFit", "#SummerDrop", "#ClimateAction")
3. **Event/Phrase** (e.g., "Olympics 2026", "Taylor Swift tour", "Bitcoin ETF")

**Why**: Users ask "Show me a real example." Have these ready.

**Test now**:
```bash
# Visit your deployed app
https://your-app.vercel.app/footprint?q=Camry
https://your-app.vercel.app/footprint?q=%23HeatWaveFit
```

Take screenshots → use in launch posts.

---

## 🎯 Distribution Setup

### [ ] 7. Update Social Media Bios
**Time**: 10 minutes  
**Priority**: P1

**X (Twitter)**:
```
Building HawkxAI: campaign footprint intelligence for performance marketers.
Evidence-only. No invented WHY. Open source.
→ [your-vercel-url]
```

**LinkedIn**:
```
Founder, HawkxAI | Campaign Footprint Intelligence
Helping performance marketers track where their campaigns land (X/Reddit/HN) 
with evidence-only correlation. No invented WHY.
→ [your-vercel-url]
```

**GitHub Profile**:
- Pinned repo: `kishanraj41/hawkxai`
- Status: "Launching HawkxAI beta 🚀"

---

### [ ] 8. Beta Signup Form
**Time**: 15 minutes  
**Priority**: P1

**Option A: Google Form** (simplest)
1. Create form: forms.google.com
2. Fields:
   - Email (required)
   - Campaign name you want to track (text)
   - Where did you hear about HawkxAI? (text)
   - Company/Role (optional)
3. Response destination: Google Sheet
4. Share link in launch posts

**Option B: Typeform** (prettier)
- typeform.com/templates/t/beta-signup

**Add to**:
- Website footer
- GitHub README
- Launch post CTA

---

### [ ] 9. Contact & Legal Pages
**Time**: 30 minutes  
**Priority**: P2 (not critical for beta, but good to have)

**Create**:
- `/app/privacy/page.tsx` - Basic privacy policy (use template: termsfeed.com)
- `/app/terms/page.tsx` - Basic terms of service
- Contact email: `support@hawkxai.com` or `hello@hawkxai.com`

**Template Privacy Policy** (simplified for beta):
```
We collect: email (for beta access), usage data (which campaigns you look up).
We don't sell data. We use Google Analytics (optional).
Contact: [email]
```

---

## 📊 Monitoring Setup

### [ ] 10. Basic Analytics
**Time**: 20 minutes  
**Priority**: P1

**Option A: Vercel Analytics** (built-in)
1. Enable in Vercel dashboard → Analytics tab
2. Free tier: 100k events/month

**Option B: Plausible** (privacy-friendly)
1. plausible.io → Add site
2. Add script to `app/layout.tsx`

**Metrics to Track**:
- Page views: `/`, `/footprint`, `/research`, `/watchlist`
- API calls: `/api/trends`, `/api/fleet`
- Conversion: Beta signup clicks

---

### [ ] 11. Error Monitoring
**Time**: 30 minutes  
**Priority**: P2

**Option: Sentry** (recommended)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add to `next.config.mjs`:
```js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your existing Next.js config
}, {
  silent: true,
  org: "your-org",
  project: "hawkxai",
});
```

**Why**: Catch errors users don't report.

---

### [ ] 12. Uptime Monitoring
**Time**: 10 minutes  
**Priority**: P2

**Option: UptimeRobot** (uptimerobot.com)
1. Free tier: 50 monitors
2. Add monitor: `https://your-app.vercel.app/api/trends`
3. Check interval: 5 minutes
4. Alert via: Email + Slack (optional)

**Why**: Know if Vercel goes down before users complain.

---

## 🧪 Pre-Launch Testing

### [ ] 13. End-to-End Test
**Time**: 15 minutes  
**Priority**: P0

**Test Flow**:
1. Visit homepage → Verify map loads (60-90s first time)
2. Click "Footprint" tab → Paste "Camry" → Verify mind map + artifacts appear
3. Click "Research" tab → Search "Taylor Swift" → Verify Wikipedia + web + social citations
4. Click "Watchlist" tab → Verify POI table loads (or empty state if no data)
5. Test on mobile (Chrome iOS/Android) → Verify responsive layout

**Expected Issues**:
- First `/api/trends` call takes 60-90s (Gemini clustering) → Expected, mention in docs
- Reddit may 403 on some networks → Expected, graceful degradation
- X via Google Search may timeout → Expected, falls back to HN only

**If any page crashes** → Fix before launch.

---

### [ ] 14. Load Testing (Optional)
**Time**: 30 minutes  
**Priority**: P3 (only if expecting >100 beta signups)

```bash
# Install k6 (load testing tool)
brew install k6  # macOS
# or: apt-get install k6  # Linux

# Test API endpoint
k6 run - <<EOF
import http from 'k6/http';
export let options = { vus: 10, duration: '30s' };
export default function() {
  http.get('https://your-app.vercel.app/api/trends');
}
EOF
```

**Expected**: 200 OK, <5s response time under 10 concurrent users.

---

## 📣 Launch Day Prep

### [ ] 15. Schedule Posts
**Time**: 20 minutes  
**Priority**: P1

**X (Twitter)**:
- Main launch post: Tuesday 10am CT (paste template from above)
- Follow-up thread: 2 hours later (screenshots + demo video)
- Engagement: Reply to every DM within 1 hour

**LinkedIn**:
- Same post as X, but slightly longer format (LinkedIn favors longer posts)
- Post time: Tuesday 8am CT (earlier than X, B2B audience)

**Reddit** (optional, Week 2):
- r/marketing: Case study format (not promotional)
- r/GrowthHacking: "How I tracked my campaign in 60s"

---

### [ ] 16. Prepare DM Response Templates
**Time**: 10 minutes  
**Priority**: P1

**When someone DMs "Interested in beta"**:
```
Thanks for your interest! 🙌

Quick questions:
1. What campaign are you tracking? (hashtag, product name, event)
2. Which platforms? (X, Reddit, Instagram, TikTok)
3. What's the biggest pain point? (founder asking for ROI, can't afford Brandwatch, etc.)

Live demo: [your-vercel-url]
Just paste your campaign name on the Footprint tab.

I'll send you a beta invite email in the next 24h with:
- Full access through EOY
- Direct Slack/email to me for feedback
- Early access to new features

Looking forward to your feedback!
```

**When someone asks "How is this different from Brandwatch?"**:
```
Great question!

Brandwatch = enterprise monitoring ($50k/year, 6-week onboarding)
HawkxAI = campaign lookup (60 seconds, evidence-only)

Different jobs:
- Brandwatch: "Is our brand healthy?" (passive, always-on)
- HawkxAI: "Where did MY campaign land?" (active, on-demand)

Brandwatch is for Fortune 500 CMOs. We're for performance marketers 
who need to know if #SummerCrush landed, not brand health dashboards.

Does that help?
```

---

## 📈 Post-Launch Tracking

### [ ] 17. Daily Metrics Dashboard
**Time**: 30 minutes (one-time setup)  
**Priority**: P1

**Create Google Sheet** with columns:
- Date
- New signups (from beta form)
- Daily active users (from analytics)
- Campaign lookups (count of `/api/trends?topic=` calls)
- Returning users (users who came back 2nd day)
- Feedback collected (DMs, emails)

**Goal**: Track progress to "10 daily actives by Week 4"

**Update daily** (takes 5 min/day):
```
Mon Aug 26: 3 signups, 2 active users, 8 lookups
Tue Aug 27: 7 signups, 5 active users, 23 lookups
Wed Aug 28: 2 signups, 7 active users, 31 lookups (2 returning!)
...
```

---

### [ ] 18. User Interview Slots
**Time**: 15 minutes  
**Priority**: P1

**Create Calendly** (calendly.com):
- 30-minute slots
- Available: Tue/Thu 2-5pm CT
- Max 3 interviews/week

**Questions to Ask**:
1. What campaign are you tracking? Why?
2. What did you use before HawkxAI? (Brandwatch, Google Alerts, ChatGPT, manual search)
3. What worked? What didn't?
4. Would you pay for this? How much? ($10/mo, $50/mo, $200/mo)
5. What's the one feature you'd add?

**Add to beta invite email**: "Book a 30-min feedback call: [calendly-link]"

---

## ✅ Final Pre-Flight Checklist

**Before you press "Tweet":**

- [ ] Vercel deployment live and stable
- [ ] Demo video uploaded (YouTube + Twitter)
- [ ] Screenshots saved and ready to attach
- [ ] Launch post written (X + LinkedIn)
- [ ] Beta signup form created
- [ ] Social media bios updated
- [ ] DM response templates ready
- [ ] Analytics enabled (Vercel or Plausible)
- [ ] Error monitoring setup (Sentry)
- [ ] Uptime monitoring setup (UptimeRobot)
- [ ] Daily metrics spreadsheet created
- [ ] Calendly interview slots live

**If all checked → YOU'RE READY. LAUNCH.** 🚀

---

## 🎯 Week 4 Success Criteria

**Primary Goal**: 10 daily active users  
**Definition**: Users who look up campaign phrase + return next day to check delta

**Secondary Goals**:
- 50+ beta signups
- 20+ X/LinkedIn mentions
- 3+ organic case studies (users tweet screenshots)
- 10+ user interviews completed

**If you hit these → Proceed to Public Launch (Product Hunt / HN / Reddit)**

**If not → Pivot or kill. See GO_TO_MARKET_STRATEGY.md for guidance.**

---

**Good luck!** You've built something real. Now go find the people who need it. 🚀

---

**Last Updated**: 2026-08-26  
**Owner**: Founder  
**Next Review**: After Week 1 (check daily actives trend)
