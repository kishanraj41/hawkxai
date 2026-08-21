# All Things Agentic — submission pack

Contest: [All Things Agentic](https://allthingsagentichackathon.devpost.com/) · Taskmaster · due Aug 31 2026 5:00pm PDT. Submit **Aug 30**.

Architecture diagram (generated): [ARCHITECTURE.md](./ARCHITECTURE.md)

## Disclose (paste into Devpost)

HawkxAI’s Next.js desk (Trends / Footprint / Research) and its collectors predate this contest window. During the Submission Period we built a Google ADK ingest fleet on Cloud Run with Gemini 3.5, GCS snapshots, scoring/dedup of existing receipts, a Vercel POST merge into Footprint, and a generated handbook/architecture diagram. Clustering on the desk uses Gemini as of this contest. AutoLineage is credited only as receipt lineage inside the handbook.

## Technologies

Gemini 3.5 Flash, Google ADK, Cloud Run, Cloud Storage, Next.js on Vercel, HN Algolia, Wikipedia API, Google News RSS, NHTSA recalls API.

## Spin-up

Desk (pre-existing):

```bash
npm install
cp .env.example .env.local
# GOOGLE_API_KEY=...
# FLEET_URL=https://YOUR-SERVICE.run.app
npm run dev
```

Fleet (new):

```bash
cd fleet
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# GOOGLE_API_KEY=...
# GCS_BUCKET=...   (optional locally)
uvicorn main:app --reload --port 8080
```

Proof of Action: `POST http://localhost:8080/v1/ingest` with `{"phrase":"Camry"}` then open `/footprint` and plug Camry. ADK logs: `http://localhost:8080/dev-ui`.

## 4-minute unedited video (record live)

1. Problem (20s): a marketer owns a phrase and should not babysit feeds or invent a WHY.
2. Open https://hawkxai.vercel.app/footprint. Tagline visible.
3. Second window: Cloud Run logs or `/dev-ui`. Plug **Camry**.
4. Desk fills: prints, artifacts, mind map. No invented WHY. X is not the centerpiece.
5. `python -m handbook.render` — architecture diagram. Optional: flip `collect_public_apis.enabled` in `fleet/permissions.json` and re-render to show a diff.
6. Cloud Console: Cloud Run `.run.app` URL on screen.

Do not submit until the `.run.app` URL is in the video. Blog + `#AllThingsAgenticHackathon` if time.

## Hosted URLs

- Desk: https://hawkxai.vercel.app/footprint
- Fleet: https://hawkxai-fleet-303927325261.us-central1.run.app
- ADK UI: https://hawkxai-fleet-303927325261.us-central1.run.app/dev-ui
- Snapshot store: `gs://hawkxai-fleet-snapshots/`

Set Vercel env `FLEET_URL=https://hawkxai-fleet-303927325261.us-central1.run.app`
