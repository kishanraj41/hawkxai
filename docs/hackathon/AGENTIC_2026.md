# HawkxAI — All Things Agentic (Aug 31, 2026)

Locked framing. One product. One new fleet. One wedge.

Contest: [All Things Agentic](https://allthingsagentichackathon.devpost.com/) · Taskmaster · deadline **Aug 31 5:00pm PDT**.

## Roles (do not mash three brands on stage)

| Piece | Role | Demo? |
|---|---|---|
| **HawkxAI** | The product. Live desk: Trends / Footprint / Research. Receipts only — never an invented WHY. | **Yes** — Footprint plug is the opening beat |
| **Ingest fleet (new)** | Contest-window work. ADK + Gemini 3.5 + Cloud Run. Per-channel agents write snapshots the desk already knows how to show. | **Yes** — terminal logs + desk filling |
| **Handbook wedge** | Documents the fleet. Generates the architecture diagram the submission requires. Gate 1 artifact for agency DMs after Sep 1. | **Yes** — 2–3 days, after one channel is live |
| **RudriQ / AutoLineage** | Extraction-and-facts layer *inside* the handbook (which collect step produced which receipt). Credit it. Do not demo as a second product. | No |

HawkxAI is not rebuilt on ADK. The Vercel frontend stays. The fleet on Cloud Run is the Google Cloud proof.

## What judges must see (unedited)

1. Open [https://hawkxai.vercel.app/footprint](https://hawkxai.vercel.app/footprint). Tagline: “Receipts only — never an invented WHY.”
2. Plug **Camry** (or WWDC). Terminal: Cloud Run ADK agent fans out (HN first; X is never the centerpiece).
3. Desk fills: prints, artifacts, mind map. No “Waiting on live sources.”
4. Handbook regenerates. Optional money shot: change one tool permission in fleet config → handbook diffs.

Live as of 2026-08-18: Trends hydrates (~42 prints, 27/28 public APIs). **X is off.** Reddit/HN/APIs work. Demo on HN + public APIs, not X.

## Stack (required)

- Gemini 3.5 Flash (Vertex or Gemini API)
- Google ADK (`google-adk`)
- Cloud Run (this `fleet/` service)
- Optional second service: Firestore or GCS for snapshots
- Existing desk: Next.js on Vercel (`grokhackx` / hawkxai.vercel.app)

## Disclose in the write-up (Official Rules)

> Projects must be newly created during the Submission Period. Participants may use standard development tools, including frameworks, libraries, starter templates, and AI coding assistants, but **must disclose any other pre-existing code or work incorporated into the Project**. The work described and submitted must have been built during the Submission Period.

HawkxAI desk (now Gemini 3.5 + Google Search) and AutoLineage **predate** this contest window — disclose the desk; clustering is Google as of this contest. The **new** work is the ADK ingest fleet, snapshot store, scoring/dedup agent, Cloud Run deploy, and handbook extractor. Open-source is allowed if you enhance it and comply with licenses. Read the [full rules](https://allthingsagentichackathon.devpost.com/rules) before submit.

## 13-day cut (day job)

- **Aug 18–19** Register. Credits. ADK skeleton on Cloud Run. **One** channel (HN) into a snapshot JSON. Ugly is fine.
- **Aug 20–24** Second channel (Reddit or public APIs). Snapshot store. Scoring agent. Desk POST that merges fleet snapshots without breaking `GET /api/trends`.
- **Aug 25–27** Handbook wedge. Timebox. Diff if time.
- **Aug 28–31** Real phrases. 4-min unedited video. README spin-up. Architecture diagram (generated). Blog + `#AllThingsAgenticHackathon`. Submit with a day of slack.

If anything slips: cut trace extractor, cut X, cut pretty UI. Never cut the live plug, never cut Cloud Run proof, never invent a WHY.
