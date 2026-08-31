# 4-minute unedited video script

Contest: All Things Agentic · **Taskmaster** · max **4:00**, **one take**, **1× speed**, English.  
Hosted proof: **https://hawkxai-qalms3xvxq-uc.a.run.app/footprint**  
Repo: **https://github.com/kishanraj41/hawkxai**

Do not cut, rearrange, hide errors, or speed up. If Camry receipts are thin, say so. Never invent a WHY. X is not the centerpiece — HN + public APIs are.

## Before you hit record (2 minutes)

Close Slack, Discord, email. Do Not Disturb. Browser zoom **125%**. Hide bookmarks.

Open **four tabs**, left to right:

1. Google Cloud Console → Cloud Run → services `hawkxai` and `hawkxai-fleet` (URL column visible).
2. Desk: https://hawkxai-qalms3xvxq-uc.a.run.app/footprint
3. ADK UI: https://hawkxai-fleet-qalms3xvxq-uc.a.run.app/dev-ui
4. Architecture poster: http://localhost:3000/demo/architecture.html — fullscreen (F11) so all five lanes are in frame.

Click the address bar on tab 2 so `.run.app` is readable. Phrase to type: **Camry**.  
If Footprint is still loading, wait before record. Do **not** demo `hawkxai.vercel.app` as the hosted project.

Upload the file to **YouTube or Vimeo**, public (or unlisted if the link still plays without login). Paste that URL on Devpost.

---

## Spoken script (~3:40, ~30s slack)

Read this. Pause where it says **[click]**. Glance at the timer. Stop talking at **3:50**.

### 0:00–0:22 · Problem

A marketing team already owns a phrase — a product, a campaign, a hashtag. Today they babysit five feeds, then invent a story about why it is printing. HawkxAI is the opposite: you plug the phrase you own, an agent fleet captures live receipts, and the desk maps the footprint. Receipts only. Never an invented WHY.

### 0:22–0:48 · Google Cloud proof  **[tab 1, then tab 2]**

**[click]** Cloud Console, Cloud Run. Two services: the HawkxAI desk, and the ingest fleet. Both on Cloud Run.

**[click]** Footprint. Address bar: `hawkxai-qalms3xvxq-uc.a.run.app`. That is the hosted project. Tagline on screen: receipts only — never an invented WHY.

### 0:48–1:10 · Architecture (say the triad)

Mandatory stack: Gemini 3.5 Flash for clustering and scoring, Google ADK for the ingest agent, Cloud Run for both services. Snapshots go to Cloud Storage. Lineage keeps `tool` and `collectedAt` on each receipt. The Next.js desk predates this contest. What we built in the window is this fleet, the merge into Footprint, and a generated handbook.

### 1:10–2:20 · Proof of Action  **[tab 2, then tab 3]**

**[click]** Plug **Camry**. Submit.

**[click]** ADK UI on the fleet `.run.app`. This is live execution — the ingest agent fans out. Tools on: Hacker News, public APIs — Wikipedia, Google News, NHTSA — then score and dedup. X is not the centerpiece. Watch the run. No cuts.

*(If the agent is still running, stay on this tab and keep talking. Do not jump to a finished screenshot.)*

Each collect step stamps which tool produced the receipt and when. That is lineage, not a second product.

### 2:20–3:15 · Desk fills  **[back to tab 2]**

**[click]** Footprint again. Same phrase. Prints, artifacts — hashtags, URLs, QR-shaped codes if they printed — mind map of receipts. Shared artifacts only become bridges. If evidence is thin, the desk says so. I am not going to narrate a fake WHY.

*(Scroll the mind map, click one receipt, show the source link. If a lineage strip is visible, point at `tool` + `collectedAt`. Do not claim occupancy gold tags for Camry.)*

Category is Taskmaster: a multi-step chore — collect, score, store, merge — not a chatbot.

### 3:15–3:40 · Architecture diagram  **[tab 4]**

**[click]** Full-page ingest architecture. Phrase on the left. Two Cloud Run services. ADK agent with Gemini 3.5 Flash in the center. Channels, then GCS and Cloud SQL with `tool` and `collectedAt`. Dashed box is GET /api/trends — the fleet never writes that tape. This diagram is the submission artifact.

### 3:40–3:55 · Close

Repo is `github.com/kishanraj41/hawkxai`. Plug a phrase you own. The fleet does the babysitting. The desk never invents the story.

**Stop.** Leave 5 seconds of silence. End recording.

---

## If something breaks mid-take

Keep rolling. Name the failure. Switch to whichever surface still proves Cloud Run (Console, `.run.app` URL, ADK logs, GCS bucket `hawkxai-fleet-snapshots`). A live miss with logs beats a cut to a perfect screenshot.

Fallback phrase if Camry returns empty: **WWDC**. Same rule — only receipts on screen.

Do not: open Vercel as the hero URL · invent why Camry is trending · call occupancy “fitted” · mention Fortified Enterprise Fleet · go past 4:00.

## After the take

1. Watch it once. Confirm `.run.app` is in the frame and ADK or Cloud Run logs appear.
2. Upload YouTube/Vimeo. Copy the link.
3. Devpost paste pack is in `docs/hackathon/SUBMISSION.md`.
