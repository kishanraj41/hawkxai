#!/usr/bin/env python3
"""
Docker CI agent — build the production Dockerfile, smoke-test the image,
and gate the change with Bug Bot (and PR Review Bot on pull requests).

Local:
    python3 agents/docker-ci/ci_agent.py

CI (image already built with layer cache):
    python3 agents/docker-ci/ci_agent.py --skip-build --image hawkai:ci --pr 12
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
REPORT_DIR = HERE / "reports"
MARKER = "<!-- hawkai-docker-ci -->"

SECRET_ENV = re.compile(
    r"^\s*(?:ENV|ARG)\s+(?:API[_-]?KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY)\b",
    re.IGNORECASE | re.MULTILINE,
)
ROOT_USER = re.compile(r"^\s*USER\s+(?:0|root)\s*$", re.IGNORECASE | re.MULTILINE)
USER_DIRECTIVE = re.compile(r"^\s*USER\s+\S+", re.IGNORECASE | re.MULTILINE)
FROM_DIRECTIVE = re.compile(r"^\s*FROM\s+\S+", re.IGNORECASE | re.MULTILINE)
EXPOSE_DIRECTIVE = re.compile(r"^\s*EXPOSE\s+\d+", re.IGNORECASE | re.MULTILINE)


@dataclass
class CheckResult:
    name: str
    ok: bool
    detail: str
    blocking: bool = True


@dataclass
class AgentReport:
    timestamp: str
    event: str
    image: str
    passed: bool
    checks: List[CheckResult] = field(default_factory=list)
    bugbot_critical: int = 0
    bugbot_high: int = 0
    review_score: Optional[float] = None
    summary: str = ""


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def run(
    cmd: Sequence[str],
    *,
    cwd: Optional[Path] = None,
    check: bool = False,
    timeout: Optional[int] = None,
) -> subprocess.CompletedProcess:
    print(f"$ {' '.join(cmd)}")
    return subprocess.run(
        list(cmd),
        cwd=str(cwd or REPO_ROOT),
        text=True,
        capture_output=False,
        check=check,
        timeout=timeout,
    )


def capture(
    cmd: Sequence[str],
    *,
    cwd: Optional[Path] = None,
    timeout: Optional[int] = None,
) -> subprocess.CompletedProcess:
    return subprocess.run(
        list(cmd),
        cwd=str(cwd or REPO_ROOT),
        text=True,
        capture_output=True,
        timeout=timeout,
    )


def _final_stage(contents: str) -> str:
    """Body of the last FROM stage so USER root in a builder stage is allowed."""
    parts = re.split(r"(?im)^\s*FROM\s+", contents)
    return parts[-1] if len(parts) > 1 else contents


def validate_dockerfile(contents: str, path: str = "Dockerfile") -> List[CheckResult]:
    """Static Dockerfile contract. Pure function so tests do not need Docker."""
    checks: List[CheckResult] = []
    froms = FROM_DIRECTIVE.findall(contents)
    runner = _final_stage(contents)
    checks.append(
        CheckResult(
            name="dockerfile-from",
            ok=len(froms) >= 1,
            detail=f"{path}: {len(froms)} FROM stage(s)",
        )
    )
    checks.append(
        CheckResult(
            name="dockerfile-multistage",
            ok=len(froms) >= 2,
            detail="production image should be multi-stage (deps/build/runner)",
            blocking=False,
        )
    )
    checks.append(
        CheckResult(
            name="dockerfile-nonroot-user",
            ok=bool(USER_DIRECTIVE.search(runner)) and not ROOT_USER.search(runner),
            detail="final stage must USER a non-root account",
        )
    )
    checks.append(
        CheckResult(
            name="dockerfile-no-secrets",
            ok=not SECRET_ENV.search(contents),
            detail="no ENV/ARG secrets baked into image layers",
        )
    )
    checks.append(
        CheckResult(
            name="dockerfile-expose",
            ok=bool(EXPOSE_DIRECTIVE.search(contents)),
            detail="EXPOSE a listen port",
            blocking=False,
        )
    )
    return checks


def lint_dockerfile(dockerfile: Path) -> List[CheckResult]:
    if not dockerfile.is_file():
        return [
            CheckResult(
                name="dockerfile-exists",
                ok=False,
                detail=f"missing {dockerfile}",
            )
        ]
    checks = [
        CheckResult(
            name="dockerfile-exists",
            ok=True,
            detail=str(dockerfile.relative_to(REPO_ROOT)),
        )
    ]
    checks.extend(validate_dockerfile(dockerfile.read_text(encoding="utf-8")))
    return checks


def build_image(image: str, dockerfile: Path) -> CheckResult:
    cmd = [
        "docker",
        "build",
        "-f",
        str(dockerfile),
        "-t",
        image,
        ".",
    ]
    try:
        result = run(cmd, timeout=900)
    except FileNotFoundError:
        return CheckResult(
            name="docker-build",
            ok=False,
            detail="docker is not installed on this machine",
        )
    except subprocess.TimeoutExpired:
        return CheckResult(name="docker-build", ok=False, detail="docker build timed out")
    if result.returncode != 0:
        return CheckResult(
            name="docker-build",
            ok=False,
            detail=f"docker build exited {result.returncode}",
        )
    return CheckResult(name="docker-build", ok=True, detail=f"built {image}")


def inspect_nonroot(image: str) -> CheckResult:
    try:
        result = capture(
            ["docker", "inspect", "--format", "{{.Config.User}}", image],
            timeout=30,
        )
    except FileNotFoundError:
        return CheckResult(
            name="image-nonroot",
            ok=False,
            detail="docker is not installed on this machine",
        )
    user = (result.stdout or "").strip()
    ok = result.returncode == 0 and user not in ("", "0", "root")
    return CheckResult(
        name="image-nonroot",
        ok=ok,
        detail=f"Config.User={user or '(empty)'}",
    )


def smoke_test(image: str, port: int, timeout_s: int) -> CheckResult:
    name = f"hawkai-ci-{os.getpid()}"
    run_cmd = [
        "docker",
        "run",
        "-d",
        "--rm",
        "--name",
        name,
        "-p",
        f"127.0.0.1:{port}:3000",
        image,
    ]
    started = capture(run_cmd, timeout=60)
    if started.returncode != 0:
        return CheckResult(
            name="smoke-test",
            ok=False,
            detail=(started.stderr or started.stdout or "docker run failed").strip()[:500],
        )

    url = f"http://127.0.0.1:{port}/"
    deadline = time.time() + timeout_s
    last_err = "container did not become ready"
    try:
        while time.time() < deadline:
            curl = capture(["curl", "-sf", "--max-time", "3", url], timeout=10)
            if curl.returncode == 0:
                return CheckResult(
                    name="smoke-test",
                    ok=True,
                    detail=f"GET {url} returned HTTP success",
                )
            last_err = (curl.stderr or curl.stdout or f"curl exit {curl.returncode}").strip()
            logs = capture(["docker", "logs", "--tail", "20", name], timeout=10)
            blob = ((logs.stdout or "") + (logs.stderr or "")).strip()
            if blob:
                last_err = blob[-400:]
            time.sleep(2)
        return CheckResult(name="smoke-test", ok=False, detail=last_err[:500])
    finally:
        capture(["docker", "stop", name], timeout=30)


def run_bugbot(scan_paths: Sequence[str], fail_on: str) -> Tuple[CheckResult, int, int]:
    """Scan app code only — agent scripts trip too many pattern false positives."""
    critical = 0
    high = 0
    details = []
    failed = False
    for path in scan_paths:
        target = REPO_ROOT / path
        if not target.exists():
            details.append(f"{path}: skipped (missing)")
            continue
        cmd = [
            sys.executable,
            str(REPO_ROOT / "agents" / "bug-bot" / "bug_bot.py"),
            str(target),
            "--fail-on",
            fail_on,
        ]
        report_dir = REPO_ROOT / "agents" / "bug-bot" / "reports"
        before = set(report_dir.glob("bug_report_*.json"))
        try:
            result = run(cmd, timeout=180)
        except subprocess.TimeoutExpired:
            details.append(f"{path}: bugbot timed out")
            failed = True
            continue
        if result.returncode != 0:
            failed = True
        new_reports = sorted(set(report_dir.glob("bug_report_*.json")) - before)
        reports = new_reports or sorted(report_dir.glob("bug_report_*.json"))
        if reports:
            try:
                payload = json.loads(reports[-1].read_text(encoding="utf-8"))
                critical += int(payload.get("critical_bugs", 0))
                high += int(payload.get("high_bugs", 0))
                details.append(
                    f"{path}: critical={payload.get('critical_bugs', 0)} "
                    f"high={payload.get('high_bugs', 0)} total={payload.get('total_bugs', 0)}"
                )
            except (OSError, json.JSONDecodeError, ValueError):
                details.append(f"{path}: report unreadable")
        else:
            details.append(f"{path}: no report written")

    ok = not failed
    return CheckResult(
        name="bugbot",
        ok=ok,
        detail="; ".join(details) or "no scan paths",
    ), critical, high


def run_pr_review(pr_number: int) -> Tuple[CheckResult, Optional[float]]:
    script = REPO_ROOT / "agents" / "pr-review-bot" / "review_bot.py"
    try:
        result = run([sys.executable, str(script), str(pr_number)], timeout=180)
    except subprocess.TimeoutExpired:
        return (
            CheckResult(
                name="pr-review-bot",
                ok=False,
                detail=f"PR #{pr_number} timed out",
                blocking=False,
            ),
            None,
        )
    score = None
    reviews = sorted((REPO_ROOT / "agents" / "pr-review-bot" / "reviews").glob("pr_*_review_*.json"))
    if reviews:
        try:
            payload = json.loads(reviews[-1].read_text(encoding="utf-8"))
            score = payload.get("overall_score")
        except (OSError, json.JSONDecodeError, ValueError):
            score = None
    # Review is advisory unless the bot itself crashes.
    ok = result.returncode == 0
    detail = f"PR #{pr_number}"
    if score is not None:
        detail += f" score={score}/10"
    if not ok:
        detail += f" exited {result.returncode}"
    return CheckResult(
        name="pr-review-bot",
        ok=ok,
        detail=detail,
        blocking=False,
    ), score


def render_markdown(report: AgentReport) -> str:
    status = "✅ passed" if report.passed else "❌ failed"
    lines = [
        MARKER,
        f"# Docker CI agent {status}",
        "",
        f"- **When:** {report.timestamp}",
        f"- **Event:** {report.event}",
        f"- **Image:** `{report.image}`",
        f"- **Bug Bot:** critical={report.bugbot_critical} high={report.bugbot_high}",
    ]
    if report.review_score is not None:
        lines.append(f"- **PR Review Bot:** {report.review_score}/10")
    lines.extend(["", "## Checks", ""])
    for check in report.checks:
        icon = "✅" if check.ok else ("❌" if check.blocking else "⚠️")
        gate = "blocking" if check.blocking else "advisory"
        lines.append(f"- {icon} **{check.name}** ({gate}) — {check.detail}")
    lines.extend(["", report.summary, "", "_Generated by `agents/docker-ci/ci_agent.py`._", ""])
    return "\n".join(lines)


def write_report(report: AgentReport) -> Path:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    markdown = render_markdown(report)
    latest = REPORT_DIR / "latest.md"
    latest.write_text(markdown, encoding="utf-8")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    (REPORT_DIR / f"report_{stamp}.md").write_text(markdown, encoding="utf-8")
    payload = asdict(report)
    (REPORT_DIR / "latest.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(markdown)
            handle.write("\n")
    print(f"📄 Report: {latest}")
    return latest


def post_pr_comment(pr_number: int, body_path: Path) -> None:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        print("ℹ️  No GITHUB_TOKEN — skipping PR comment")
        return
    env = os.environ.copy()
    env.setdefault("GH_TOKEN", token)
    listed = subprocess.run(
        ["gh", "api", f"repos/{os.environ.get('GITHUB_REPOSITORY', '')}/issues/{pr_number}/comments"],
        text=True,
        capture_output=True,
        env=env,
    )
    comment_id = None
    if listed.returncode == 0:
        try:
            for comment in json.loads(listed.stdout):
                if MARKER in (comment.get("body") or ""):
                    comment_id = comment.get("id")
                    break
        except json.JSONDecodeError:
            comment_id = None
    body = body_path.read_text(encoding="utf-8")
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if comment_id:
        subprocess.run(
            ["gh", "api", "-X", "PATCH", f"repos/{repo}/issues/comments/{comment_id}", "--input", "-"],
            input=json.dumps({"body": body}),
            text=True,
            check=False,
            env=env,
        )
        print(f"💬 Updated PR comment {comment_id}")
        return
    subprocess.run(
        ["gh", "pr", "comment", str(pr_number), "--body-file", str(body_path)],
        check=False,
        env=env,
    )
    print(f"💬 Posted PR comment on #{pr_number}")


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and validate the HawkAI Dockerfile")
    parser.add_argument("--dockerfile", default="Dockerfile")
    parser.add_argument("--image", default="hawkai:ci")
    parser.add_argument("--skip-build", action="store_true", help="Image already built (CI cache path)")
    parser.add_argument("--skip-smoke", action="store_true")
    parser.add_argument("--skip-bugbot", action="store_true")
    parser.add_argument("--skip-review", action="store_true")
    parser.add_argument("--pr", type=int, default=0, help="PR number for review bot + comment")
    parser.add_argument("--port", type=int, default=3000)
    parser.add_argument("--smoke-timeout", type=int, default=60)
    parser.add_argument(
        "--scan",
        action="append",
        default=None,
        help="Path for Bug Bot (repeatable). Defaults to app, lib, components",
    )
    parser.add_argument("--fail-on", default="critical", choices=["none", "low", "medium", "high", "critical"])
    parser.add_argument("--event", default=os.environ.get("GITHUB_EVENT_NAME", "local"))
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    dockerfile = (REPO_ROOT / args.dockerfile).resolve()
    scan_paths = args.scan or ["app", "lib", "components"]
    pr_number = args.pr or int(os.environ.get("PR_NUMBER") or 0)

    checks: List[CheckResult] = []
    checks.extend(lint_dockerfile(dockerfile))

    if args.skip_build:
        checks.append(
            CheckResult(
                name="docker-build",
                ok=True,
                detail=f"skipped; using pre-built {args.image}",
            )
        )
    else:
        checks.append(build_image(args.image, dockerfile))

    build_ok = all(c.ok for c in checks if c.name in {"dockerfile-exists", "docker-build"})
    if build_ok:
        checks.append(inspect_nonroot(args.image))

    if args.skip_smoke:
        checks.append(CheckResult(name="smoke-test", ok=True, detail="skipped", blocking=False))
    elif build_ok:
        checks.append(smoke_test(args.image, args.port, args.smoke_timeout))
    else:
        checks.append(
            CheckResult(
                name="smoke-test",
                ok=False,
                detail="skipped because docker build failed",
            )
        )

    bugbot_critical = 0
    bugbot_high = 0
    if args.skip_bugbot:
        checks.append(CheckResult(name="bugbot", ok=True, detail="skipped", blocking=False))
    else:
        bug_check, bugbot_critical, bugbot_high = run_bugbot(scan_paths, args.fail_on)
        checks.append(bug_check)

    review_score = None
    if pr_number and not args.skip_review:
        review_check, review_score = run_pr_review(pr_number)
        checks.append(review_check)
    else:
        checks.append(
            CheckResult(
                name="pr-review-bot",
                ok=True,
                detail="skipped (no PR number)" if not pr_number else "skipped",
                blocking=False,
            )
        )

    blocking_failed = [c for c in checks if c.blocking and not c.ok]
    passed = not blocking_failed
    summary = (
        "All blocking Docker CI checks passed."
        if passed
        else "Failed: " + ", ".join(c.name for c in blocking_failed)
    )
    report = AgentReport(
        timestamp=utc_now(),
        event=args.event,
        image=args.image,
        passed=passed,
        checks=checks,
        bugbot_critical=bugbot_critical,
        bugbot_high=bugbot_high,
        review_score=review_score,
        summary=summary,
    )
    latest = write_report(report)
    if pr_number:
        try:
            post_pr_comment(pr_number, latest)
        except OSError as exc:
            print(f"⚠️  Could not comment on PR: {exc}")

    print(f"\n{'=' * 60}\n{summary}\n{'=' * 60}")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
