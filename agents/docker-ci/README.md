# Docker CI Agent

Builds the HawkAI production `Dockerfile`, smoke-tests the image, and gates
the change with Bug Bot. On pull requests it also runs PR Review Bot and posts
a sticky comment. Every push to a feature branch opens a PR against `main`
if one is not already open.

## When it runs

| Event | What happens |
|---|---|
| Every push to a feature branch | Open a PR against `main` if missing, then build → smoke → Bug Bot → review |
| Every commit on a PR (`opened` / `synchronize` / `reopened`) | Build image (GHA layer cache) → smoke test → Bug Bot → PR Review Bot → comment |
| Every merge / push to `main` | Same build + smoke + Bug Bot (no new PR) |

`main`, `master`, tags, and `dependabot/` / `renovate/` branches are skipped
for auto-PR. Later pushes reuse the existing open PR.

GitHub Actions workflow: `.github/workflows/docker-ci.yml`.

## Local

```bash
# Full path: lint Dockerfile, docker build, curl the homepage, Bug Bot
python3 agents/docker-ci/ci_agent.py

# If the image is already built
python3 agents/docker-ci/ci_agent.py --skip-build --image hawkai:ci

# Open a PR for the current feature branch if CI would (needs gh + GITHUB_TOKEN)
python3 agents/docker-ci/ci_agent.py --skip-build --skip-smoke --skip-bugbot --ensure-pr --event push

# Contract tests (no Docker required)
python3 -m unittest agents/docker-ci/tests/test_ci_agent.py
```

## CI split

The workflow uses `docker/build-push-action` so layer cache actually hits.
The agent then validates the loaded image (`--skip-build`) plus Bug Bot.

Blocking failures:

- Dockerfile missing, no `FROM`, root `USER`, or secrets in `ENV`/`ARG`
- `docker build` failure
- Homepage smoke test never returns success
- Bug Bot `--fail-on critical` on `app/`, `lib/`, `components/`

Advisory (does not fail the gate):

- Missing `EXPOSE` / single-stage Dockerfile
- Hadolint
- PR Review Bot score

## Reports

Written to `agents/docker-ci/reports/` (`latest.md`, `latest.json`). That
directory is gitignored.
