import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from ci_agent import validate_dockerfile  # noqa: E402


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


if __name__ == "__main__":
    unittest.main()
