# Host HawkxAI on Cloud Run

The desk runs on Cloud Run. Vercel stays up until `www.hawkxai.com` serves this service over HTTPS. Do not delete the Vercel project until that is confirmed.

## Cloud Run endpoints

Same service, two URLs:

| URL | Use |
|---|---|
| https://hawkxai-qalms3xvxq-uc.a.run.app | Canonical — give this to the DNS team |
| https://hawkxai-303927325261.us-central1.run.app | Project-number alias |

Project: `project-16647bb0-5d45-4404-956` (Hawkxai) · region `us-central1` · service `hawkxai`.

Fleet (unchanged): https://hawkxai-fleet-qalms3xvxq-uc.a.run.app

## GoDaddy (keep nameservers)

Keep `ns55.domaincontrol.com` / `ns56.domaincontrol.com`. Only change records.

### 1. Verify the domain (GCP account)

Cloud Run custom domains require Search Console verification as **nyayex.root@gmail.com** (the gcloud account). Currently only `appealmyaid.com` is verified.

1. Open [Search Console](https://search.google.com/search-console) signed in as `nyayex.root@gmail.com`.
2. Add domain property `hawkxai.com` (domain, not URL-prefix).
3. Put the TXT record Google shows on `@` at GoDaddy.
4. Wait until Search Console says verified (often minutes).

Then from the repo:

```bash
gcloud beta run domain-mappings create --service hawkxai --domain www.hawkxai.com --project=project-16647bb0-5d45-4404-956 --region us-central1
```

That command prints the CNAME to paste. It is usually:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `ghs.googlehosted.com.` | 600 |

Optional apex: GoDaddy **Forwarding** `hawkxai.com` → `https://www.hawkxai.com` (301). Or map `hawkxai.com` the same way after www works.

### 2. Remove Vercel records (only after www HTTPS works)

Delete these when `https://www.hawkxai.com` shows the HawkxAI desk:

| Type | Name | Value |
|---|---|---|
| A | `@` | `216.198.79.1` |
| A | `@` | `64.29.17.1` |
| CNAME | `www` | `….vercel-dns-017.com` |

Turn off parking / old forwarding if it still owns extra A records.

## Env on Cloud Run

Set on the `hawkxai` service (Console → Cloud Run → hawkxai → Edit → Variables, or `gcloud run services update`).

| Name | Notes |
|---|---|
| `GEMINI_MODEL` | Set: `gemini-3.5-flash` |
| `FLEET_URL` | Set: fleet `.run.app` above |
| `GOOGLE_API_KEY` | Set on revision `hawkxai-00002` from the GCP Gemini API key. |
| `YOUTUBE_API_KEY` | Optional |
| `TREND_DB_HOST` | `35.245.139.208` — copy from Vercel with user/password/SSL. Without these, Watch is memory-only. |
| `TREND_DB_USER` / `PASSWORD` / `PORT` / `SSL` / `PREFIX` | Same as Vercel Production |

Do not cut Vercel until `GOOGLE_API_KEY` and `TREND_DB_*` are on Cloud Run.

## Redeploy

```bash
gcloud run deploy hawkxai --source . --project=project-16647bb0-5d45-4404-956 --region us-central1
```

Timeout 300s, min instances 1, max 3, memory 1Gi. `GET /api/trends` is unchanged.
