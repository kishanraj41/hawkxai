---
name: builddocker
description: >-
  Builds the HawkAI Dockerfile and updates docker run so the running
  container matches the new image. Use when the user invokes /builddocker,
  asks to docker build, rebuild the image, or refresh the running container.
  After a PR merge to main, follow the merge-watch path (see rebuild-on-merge).
disable-model-invocation: true
---

# /builddocker

build the dockerfile and update docker run

Run this from the grokhackx repo root (`Dockerfile` lives there). Do both steps every time — never build without replacing the running container, and never restart an old image.

On a `/loop` tick, first follow [rebuild-on-merge](../rebuild-on-merge/SKILL.md). Only continue here if that skill reports a new merge.

## 1. Build the Dockerfile

Build **`origin/main` after the merge**, not a dirty feature branch.

```bash
git fetch origin main
docker build -t hawkai:latest -t hawkai:ci .
```

If the working tree is not on `main` (or is dirty), use a detached worktree so the image matches what just merged:

```bash
git fetch origin main
WT="/tmp/hawkai-rebuild-$$"
git worktree add --detach "$WT" origin/main
docker build -t hawkai:latest -t hawkai:ci "$WT"
git worktree remove --force "$WT"
```

Use `required_permissions: ["all"]` (Docker socket). `block_until_ms` at least 600000. Fail the skill if the build fails.

Tags: `hawkai:latest` (run) and `hawkai:ci` (CI agent). Same image.

## 2. Update docker run

1. Reuse the host port already published by `hawkai` (`docker port hawkai 3000/tcp`). If none, pick the first free port in **3001–3005**. Host **:3000** is often Grafana; `:3001` is often `next dev` — skip taken ports.
2. If a container named `hawkai` exists, `docker stop hawkai` (and `docker rm` if it is not `--rm`).
3. Load `XAI_API_KEY` from the **repo** `.env.local` (gitignored), even when the build used a worktree. Do not print the key. If missing, still run the container; Ask/Grok will degrade.
4. Start (substitute `$PORT`):

```bash
docker run -d --name hawkai --rm -p ${PORT}:3000 --env-file .env.local hawkai:latest
```

If `.env.local` is absent:

```bash
docker run -d --name hawkai --rm -p ${PORT}:3000 hawkai:latest
```

5. Confirm `docker ps --filter name=hawkai` is Up. Report the URL (`http://localhost:<host-port>`).

If the user's terminal already has a foreground `docker run --rm`, stopping `hawkai` will end that process — that is expected; the detached replacement is the update.

## Do not

- Bind host `:3000` unless the user asked and Grafana is gone.
- Pass `XAI_API_KEY=xai-your-real-key` (placeholder).
- Echo secrets.
- Skip the restart after a cache-hit build — the run still needs to match `latest`.
- Rebuild on a 5-minute tick when no PR merged — that is a skip, not a build.