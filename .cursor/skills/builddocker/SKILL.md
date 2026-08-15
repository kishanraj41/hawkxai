---
name: builddocker
description: >-
  Builds the PulseMap Dockerfile and updates docker run so the running
  container matches the new image. Use when the user invokes /builddocker,
  asks to docker build, rebuild the image, or refresh the running container.
disable-model-invocation: true
---

# /builddocker

build the dockerfile and update docker run

Run this from the grokhackx repo root (`Dockerfile` lives there). Do both steps every time — never build without replacing the running container, and never restart an old image.

## 1. Build the Dockerfile

```bash
docker build -t pulsemap:latest -t pulsemap:ci .
```

Use `required_permissions: ["all"]` (Docker socket). `block_until_ms` at least 600000. Fail the skill if the build fails.

Tags: `pulsemap:latest` (run) and `pulsemap:ci` (CI agent). Same image.

## 2. Update docker run

1. If a container named `pulsemap` exists, `docker stop pulsemap` (and `docker rm` if it is not `--rm`).
2. Host **:3000** is often Grafana. Default publish **3001:3000**. If 3001 is taken, pick the next free port.
3. Load `XAI_API_KEY` from `.env.local` (gitignored). Do not print the key. If missing, still run the container; Ask/Grok will degrade.
4. Start:

```bash
docker run -d --name pulsemap --rm -p 3001:3000 --env-file .env.local pulsemap:latest
```

If `.env.local` is absent:

```bash
docker run -d --name pulsemap --rm -p 3001:3000 pulsemap:latest
```

5. Confirm `docker ps --filter name=pulsemap` is Up. Report the URL (`http://localhost:<host-port>`).

If the user's terminal already has a foreground `docker run --rm`, stopping `pulsemap` will end that process — that is expected; the detached replacement is the update.

## Do not

- Bind host `:3000` unless the user asked and Grafana is gone.
- Pass `XAI_API_KEY=xai-your-real-key` (placeholder).
- Echo secrets.
- Skip the restart after a cache-hit build — the run still needs to match `latest`.
