import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from unittest.mock import patch

from ci_agent import (  # noqa: E402
    AUTO_PR_MARKER,
    CheckResult,
    pr_body_for_push,
    pr_title_for_push,
    should_open_pr,
    validate_dockerfile,
)


GOOD = """\
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN adduser --system --uid 1001 nextjs
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
"""

BAD_ROOT_AND_SECRET = """\
FROM node:20-alpine
ENV API_KEY=sk-live-not-real
USER root
CMD ["node", "server.js"]
"""

BUILDER_ROOT_RUNNER_SAFE = """\
FROM node:20-alpine AS builder
USER root
RUN npm run build

FROM node:20-alpine AS runner
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
"""


class DockerfileContractTests(unittest.TestCase):
    def test_good_dockerfile_passes_blocking_checks(self):
        checks = {c.name: c for c in validate_dockerfile(GOOD)}
        self.assertTrue(checks["dockerfile-from"].ok)
        self.assertTrue(checks["dockerfile-multistage"].ok)
        self.assertTrue(checks["dockerfile-nonroot-user"].ok)
        self.assertTrue(checks["dockerfile-no-secrets"].ok)
        self.assertTrue(checks["dockerfile-expose"].ok)

    def test_root_user_and_secret_fail(self):
        checks = {c.name: c for c in validate_dockerfile(BAD_ROOT_AND_SECRET)}
        self.assertFalse(checks["dockerfile-nonroot-user"].ok)
        self.assertFalse(checks["dockerfile-no-secrets"].ok)
        self.assertFalse(checks["dockerfile-multistage"].ok)
        self.assertFalse(checks["dockerfile-expose"].ok)

    def test_builder_root_does_not_fail_when_runner_is_nonroot(self):
        checks = {c.name: c for c in validate_dockerfile(BUILDER_ROOT_RUNNER_SAFE)}
        self.assertTrue(checks["dockerfile-nonroot-user"].ok)

    def test_repo_dockerfile_meets_contract(self):
        root = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
        with open(os.path.join(root, "Dockerfile"), encoding="utf-8") as handle:
            contents = handle.read()
        blocking = [c for c in validate_dockerfile(contents) if c.blocking]
        failed = [c.name for c in blocking if not c.ok]
        self.assertEqual(failed, [])


class AutoPrTests(unittest.TestCase):
    def test_feature_branch_push_opens_pr(self):
        self.assertTrue(should_open_pr("push", "feat/live-desk"))

    def test_skip_main_and_master(self):
        self.assertFalse(should_open_pr("push", "main"))
        self.assertFalse(should_open_pr("push", "master"))

    def test_skip_pull_request_event(self):
        self.assertFalse(should_open_pr("pull_request", "feat/x"))

    def test_skip_local_and_empty_branch(self):
        self.assertFalse(should_open_pr("local", "feat/x"))
        self.assertFalse(should_open_pr("push", ""))
        self.assertFalse(should_open_pr("push", "  "))

    def test_skip_dependabot_and_tags(self):
        self.assertFalse(should_open_pr("push", "dependabot/npm_and_yarn/left-pad"))
        self.assertFalse(should_open_pr("push", "renovate/lodash"))
        self.assertFalse(should_open_pr("push", "v1.0.0", ref_type="tag"))

    def test_title_from_commit_subject(self):
        self.assertEqual(pr_title_for_push("Fix the map", "feat/x"), "Fix the map")
        self.assertEqual(pr_title_for_push("  ", "feat/x"), "Auto PR: feat/x")

    def test_body_marks_auto_opened_pr(self):
        body = pr_body_for_push("feat/live-desk")
        self.assertIn(AUTO_PR_MARKER, body)
        self.assertIn("feat/live-desk", body)

    def test_ensure_pr_failure_does_not_fail_gate(self):
        from ci_agent import main

        mocked = CheckResult(name="image-nonroot", ok=True, detail="mocked")
        with patch("ci_agent.ensure_pr", side_effect=FileNotFoundError("gh")):
            with patch("ci_agent.inspect_nonroot", return_value=mocked):
                code = main(
                    [
                        "--ensure-pr",
                        "--skip-build",
                        "--skip-smoke",
                        "--skip-bugbot",
                        "--event",
                        "push",
                    ]
                )
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()
