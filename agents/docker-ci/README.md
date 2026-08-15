# Docker CI Agent

Builds the HawkAI production `Dockerfile`, smoke-tests the image, and gates
the change with Bug Bot. On pull requests it also runs PR Review Bot and posts
a sticky comment.

## When it runs

| Event | What happens |
|---|---|
| Every commit on a PR (`opened` / `synchronize` / `reopened`) | Build image (GHA layer cache) → smoke test → Bug Bot → PR Review Bot → comment |
| Every merge / push to `main` | Same build + smoke + Bug Bot (no PR review comment) |

GitHub Actions workflow: `.github/workflows/docker-ci.yml`.

## Local

```bash
# Full path: lint Dockerfile, docker build, curl the homepage, Bug Bot
python3 agents/docker-ci/ci_agent.py

# If the image is already built
python3 agents/docker-ci/ci_agent.py --skip-build --image hawkai:ci

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
