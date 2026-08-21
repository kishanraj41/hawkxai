#!/usr/bin/env python3
"""
SmartSalesGuy — unicorn-founder sales agent for HawkxAI.

Checks out the repo, reads what is actually built, and writes a one-page
venture proposal: core problem, solution, current features, future features.

Does not invent traction, ARR, or a fake WHY. Numbers only if they already
live in the checkout (README, CORE_IDEA, research). Voice: category-defining
founder, receipts over adjectives.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
DEFAULT_RUNS = HERE / "runs"
CANONICAL_ONE_PAGER = REPO_ROOT / "docs" / "presentation" / "VC_ONE_PAGER.md"
CORE_IDEA_RELS = (
    "docs/presentation/CORE_IDEA.md",
    "docs/CORE_IDEA.md",
)
RESEARCH_RELS = (
    "docs/presentation/research/trend_analysis_dashboard_research.md",
    "docs/research/trend_analysis_dashboard_research.md",
)

BANNED = (
    "excited to share",
    "i'd love to connect",
    "game-changer",
    "cutting-edge",
    "revolutionary",
    "in today's rapidly evolving",
    "ai-powered platform",
    "synergy",
    "world-class team",
    "we are profitable",
    "we have 10,000 users",
)

FEATURE_CATALOG: Tuple[Tuple[str, str, str], ...] = (
    ("app/api/trends/route.ts", "Live phrase footprint", "GET /api/trends?topic= looks up a word or phrase across X, Reddit, HN, and public APIs"),
    ("components/desk/PhraseLookup.tsx", "Campaign / phrase lookup", "A marketing team looks up a campaign name; the same desk fills with its internet footprint"),
    ("app/footprint/page.tsx", "Footprint desk", "/footprint is the product surface: plug a campaign name; trending words stay on /"),
    ("components/ChartDesk.tsx", "Phrase modules", "Related prints, causation bars, and occurrence area chart fill from receipts"),
    ("components/TapeWatch.tsx", "Tape watch", "Star a print; on refresh, show measured deltas — never explain the spike"),
    ("components/brief/KeepBrief.tsx", "Desk export", "Copy / Save .md / Print dumps current desk state to Slack — the screenshot, not the SKU"),
    ("app/api/booster/route.ts", "Booster intelligence API", "GET /api/booster returns captured artifacts, evidence-only correlation, and a campaign play with risk"),
    ("components/MindDesk.tsx", "Correlation mind map", "Radial map of a looked-up phrase: related prints, captured artifacts, first print; amber dashes only for shared receipts"),
    ("lib/mindmap.ts", "Mind-map brain", "Hub is the looked-up phrase. Builds evidence-only correlation graphs — never invents a bridge between names"),
    ("app/api/ask/route.ts", "Natural-language Ask", "POST /api/ask answers live questions and zooms the matching topics"),
    ("lib/desk.ts", "Category desk brain", "Classifies topics, graphs measured causation drivers, bins occurrence timeseries"),
    ("components/TrendMap.tsx", "Interactive D3 circle-pack map", "Full-viewport topic map; rising topics glow; click zooms to receipts"),
    ("components/BoosterInsights.tsx", "Per-topic campaign intelligence", "Hashtags, QRs, phrases, URLs, competitor hook, risk — from receipts, not a generated story"),
    ("lib/booster.ts", "Capture → correlate → campaign loop", "Evidence-only WHY. Never invents posts or a fake cause."),
    ("components/desk/Desk.tsx", "Compound desk modules", "Composable Header / Mind / Timeseries / Sentiment / Trends — same parts in the rail"),
    ("components/research/ResearchDesk.tsx", "Research desk", "Topic dig across Wikipedia, web, HN, Reddit, and X — additive, not the company"),
    ("lib/research.ts", "Research gather + brief", "Parallel source collect + evidence-only synthesis; never invents a citation"),
    ("lib/research-brief.ts", "Research markdown export", "Copy / Save .md / Print pack of findings and source URLs"),
    ("app/api/research/route.ts", "Research API", "GET /api/research?q= returns sources, findings, open questions"),
    ("components/TopicDetailPanel.tsx", "Receipt panel", "Velocity, divergence, occurrence chart, causation drivers, source posts"),
    ("lib/cluster.ts", "Phrase plug from live posts", "Builds a desk-ready topic from any query + live posts; nearest receipts if the exact print is thin"),
    ("agents/booster-agent/booster_agent.py", "Booster Agent (CLI brain)", "Offline/live capture of hashtags, QRs, phrases, URLs; improvises the backlog"),
    ("agents/pr-review-bot/review_bot.py", "PR Review Bot", "AI code review with 0-10 scoring and JSON/Markdown reports"),
    ("agents/bug-bot/bug_bot.py", "Bug Bot", "Security and logic scan as a merge gate"),
    ("agents/docker-ci/ci_agent.py", "Production CI gate", "Dockerfile build, smoke test, Bug Bot on every PR and every merge to main"),
    ("agents/smartsalesguy/smartsalesguy.py", "SmartSalesGuy", "Checks out this repo and writes the VC one-pager from evidence only"),
)

PRODUCT_REFS = (
    "HEAD",
    "feat/booster-agent",
    "origin/feat/booster-agent",
    "main",
    "origin/main",
)

REQUIRED_SECTIONS = (
    "The problem",
    "The solution",
    "What's live",
    "What's next",
    "The proposal",
)


@dataclass
class GitCheckout:
    root: str
    branch: str
    commit: str
    remote: str
    dirty: bool


@dataclass
class Feature:
    name: str
    evidence: str
    detail: str
    status: str  # live | next


@dataclass
class MarketSlice:
    label: str
    value: str
    source: str


@dataclass
class PitchScore:
    total: int
    notes: List[str]
    passed: bool


@dataclass
class Dossier:
    product: str
    one_liner: str
    problem: str
    solution: str
    why_now: str
    wedge: str
    stage: str
    current: List[Feature] = field(default_factory=list)
    future: List[Feature] = field(default_factory=list)
    market: List[MarketSlice] = field(default_factory=list)
    stack: List[str] = field(default_factory=list)
    git: Optional[GitCheckout] = None
    sources: List[str] = field(default_factory=list)
    agents: List[Feature] = field(default_factory=list)


@dataclass
class Proposal:
    timestamp: str
    dossier: Dossier
    one_pager: str
    word_count: int
    score: PitchScore
    canonical_path: str
    run_paths: List[str] = field(default_factory=list)


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _git(args: Sequence[str], cwd: Path) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        text=True,
        capture_output=True,
        timeout=15,
    )
    if result.returncode != 0:
        return ""
    return (result.stdout or "").strip()


def checkout_project(root: Path = REPO_ROOT) -> GitCheckout:
    """Inspect the working tree. This is the 'checkout' — facts from git, not vibes."""
    root = Path(root).resolve()
    branch = _git(["rev-parse", "--abbrev-ref", "HEAD"], root) or "unknown"
    commit = _git(["rev-parse", "--short", "HEAD"], root) or "unknown"
    remote = _git(["remote", "get-url", "origin"], root) or ""
    remote = re.sub(r"https://[^/@]+@", "https://", remote)
    remote = re.sub(r"^git@github\.com:", "https://github.com/", remote)
    status = _git(["status", "--porcelain"], root)
    return GitCheckout(
        root=str(root),
        branch=branch,
        commit=commit,
        remote=remote,
        dirty=bool(status),
    )


def _read(path: Path, limit: int = 80_000) -> str:
    try:
        return path.read_text(encoding="utf-8")[:limit]
    except OSError:
        return ""


def _git_show(root: Path, rel: str, refs: Sequence[str] = PRODUCT_REFS) -> Tuple[str, str]:
    """Working tree first; if a product file is missing on this branch, steal it from the product ref."""
    path = Path(root) / rel
    if path.is_file():
        return _read(path), rel
    for ref in refs:
        blob = _git(["show", f"{ref}:{rel}"], Path(root))
        if blob:
            return blob[:80_000], f"{rel} @{ref}"
    return "", rel


def _git_show_first(root: Path, rels: Sequence[str], refs: Sequence[str] = PRODUCT_REFS) -> Tuple[str, str]:
    """Prefer the current presentation path; fall back to pre-move locations on older refs."""
    last = rels[0] if rels else ""
    for rel in rels:
        text, ev = _git_show(root, rel, refs)
        if text and not text.lstrip().startswith("Moved to"):
            return text, ev
        last = rel
    return "", last


def _file_exists(root: Path, rel: str) -> bool:
    if (Path(root) / rel).is_file():
        return True
    text, _ = _git_show(root, rel)
    return bool(text)


def _first_paragraphs(text: str, n: int = 2) -> str:
    chunks = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip() and not p.strip().startswith("#")]
    keep = [c for c in chunks if not c.startswith("|") and not c.startswith("```")]
    return " ".join(keep[:n]).replace("\n", " ").strip()


def _heading_items(text: str, heading_re: str) -> List[str]:
    items: List[str] = []
    for match in re.finditer(heading_re, text, re.I | re.M):
        items.append(re.sub(r"\s+", " ", match.group(1)).strip(" -"))
    return items


def _package_stack(root: Path) -> List[str]:
    raw, _ = _git_show(root, "package.json")
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    names = []
    for key in ("next", "react", "d3", "zod", "motion", "typescript", "tailwindcss"):
        if key in deps:
            names.append(f"{key} {deps[key]}")
    return names


AGENT_ORDER = (
    "booster-agent",
    "pr-review-bot",
    "bug-bot",
    "docker-ci",
    "smartsalesguy",
)

AGENT_COPY: Dict[str, Tuple[str, str]] = {
    "booster-agent": (
        "Booster Agent",
        "Capture artifacts, correlate why from receipts only, campaign play with risk.",
    ),
    "pr-review-bot": (
        "PR Review Bot",
        "AI code review with 0-10 scoring and JSON/Markdown reports.",
    ),
    "bug-bot": (
        "Bug Bot",
        "Security and logic scan used as a merge gate.",
    ),
    "docker-ci": (
        "Docker CI Agent",
        "Production image build, smoke test, and Bug Bot on every PR and every merge to main.",
    ),
    "smartsalesguy": (
        "SmartSalesGuy",
        "Checks out this repo and writes the VC one-pager from evidence only.",
    ),
}

_AGENT_SKIP = frozenset({"__pycache__", "runs", "reports", "fixtures", "tests"})


def _discover_agents(root: Path) -> List[Feature]:
    """Roster from directories under agents/, not a hardcoded README that drifts."""
    agents_dir = Path(root) / "agents"
    if not agents_dir.is_dir():
        return []
    slugs: List[str] = []
    for path in agents_dir.iterdir():
        if not path.is_dir() or path.name.startswith(".") or path.name in _AGENT_SKIP:
            continue
        if not (path / "README.md").is_file() and not any(path.glob("*.py")):
            continue
        slugs.append(path.name)
    ordered = [slug for slug in AGENT_ORDER if slug in slugs]
    ordered.extend(sorted(slug for slug in slugs if slug not in AGENT_ORDER))
    found: List[Feature] = []
    for slug in ordered:
        rel = f"agents/{slug}/README.md"
        text, evidence = _git_show(root, rel)
        copied = AGENT_COPY.get(slug)
        if copied:
            name, detail = copied
        else:
            name = slug
            for line in text.splitlines():
                if line.startswith("# "):
                    name = re.sub(r"[#*_`]+", "", line).strip()
                    name = re.sub(r"[\U0001F300-\U0001FAFF]", "", name).strip()
                    break
            detail = _first_paragraphs(text, 1)[:180] or f"Agent at agents/{slug}"
        found.append(
            Feature(
                name=name,
                evidence=evidence if text else f"agents/{slug}",
                detail=detail,
                status="live",
            )
        )
    return found


def _live_features(root: Path) -> List[Feature]:
    found: List[Feature] = []
    for rel, name, detail in FEATURE_CATALOG:
        if _file_exists(root, rel):
            found.append(Feature(name=name, evidence=rel, detail=detail, status="live"))
    api_dir = root / "app" / "api"
    if api_dir.is_dir():
        known = {item[0] for item in FEATURE_CATALOG}
        for route in sorted(api_dir.rglob("route.ts")):
            rel = str(route.relative_to(root)).replace("\\", "/")
            if rel in known:
                continue
            slug = "/".join(route.relative_to(api_dir).parts[:-1])
            found.append(
                Feature(
                    name=f"API /{slug}",
                    evidence=rel,
                    detail=f"Route handler at app/api/{slug}",
                    status="live",
                )
            )
    return found


def _future_features(root: Path) -> List[Feature]:
    future: List[Feature] = []
    improv, improv_ev = _git_show(root, "agents/booster-agent/IMPROVISATIONS.md")
    current_title = ""
    current_priority = ""
    current_why = ""
    for line in improv.splitlines():
        heading = re.match(r"^##\s+(P[012])\s+[—-]\s+(.+)$", line)
        if heading:
            if current_title:
                future.append(
                    Feature(
                        name=current_title,
                        evidence=improv_ev,
                        detail=current_why or current_priority,
                        status="next",
                    )
                )
            current_priority = heading.group(1)
            current_title = heading.group(2).strip()
            current_why = ""
            continue
        why_line = re.match(r"^-\s+\*\*Why:\*\*\s+(.+)$", line)
        if why_line and current_title:
            current_why = why_line.group(1).strip()
    if current_title:
        future.append(
            Feature(
                name=current_title,
                evidence=improv_ev,
                detail=current_why or current_priority,
                status="next",
            )
        )
    core, core_ev = _git_show_first(root, CORE_IDEA_RELS)
    wave = core.split("## Next-wave improvisations", 1)[-1] if "Next-wave improvisations" in core else ""
    skip_stems = ("capture", "analyze", "correlate", "translate", "arm competitor", "improvise")
    existing = {f.name.lower() for f in future}
    for item in _heading_items(wave, r"^\d+\.\s+(.+)$"):
        clean = re.sub(r"[*_`]+", "", item).strip()
        stem = clean.lower()
        if len(clean) < 12:
            continue
        if any(stem.startswith(s) for s in skip_stems):
            continue
        if any(stem[:24] in name or name[:24] in stem for name in existing):
            continue
        future.append(
            Feature(
                name=clean,
                evidence=core_ev,
                detail="North-star improvisation from the core idea.",
                status="next",
            )
        )
        existing.add(stem)
    # de-dupe by distinctive tokens so TikTok/QR/GDELT do not appear twice
    uniq: List[Feature] = []
    seen_token_sets: List[set] = []
    for feat in future:
        tokens = {w for w in re.findall(r"[a-z0-9]{4,}", feat.name.lower()) if w not in {"from", "with", "just", "only", "that", "this", "north", "star"}}
        if any(len(tokens & prev) >= 2 for prev in seen_token_sets):
            continue
        seen_token_sets.append(tokens)
        uniq.append(feat)
    return uniq[:6]


def _market(root: Path) -> List[MarketSlice]:
    text, source = _git_show_first(root, RESEARCH_RELS)
    slices: List[MarketSlice] = []
    patterns = (
        (r"\*\*Your intersection:\*\*\s*(~?\$[^\n]+)", "TAM (intersection)"),
        (r"Companies needing cross-source correlation:\s*(~?\$[^\n]+)", "SAM"),
        (r"Realistic 3-year capture:\s*(\$[^\n]+)", "SOM (3-year)"),
        (r"Recommended Initial Investment:\*\*\s*(\$[^\n]+)", "Seed working capital (research)"),
    )
    for pattern, label in patterns:
        match = re.search(pattern, text)
        if match:
            slices.append(MarketSlice(label=label, value=match.group(1).strip(), source=source))
    return slices


def _core_copy(root: Path) -> Tuple[str, str, str]:
    core, _ = _git_show_first(root, CORE_IDEA_RELS)
    readme, _ = _git_show(root, "README.md")
    idea = _first_paragraphs(core, 1)
    product_para = ""
    match = re.search(r"## What this means in product terms\n\n(.+?)(?:\n\n|\Z)", core, re.S)
    if match:
        product_para = re.sub(r"\s+", " ", match.group(1)).strip()
    readme_line = ""
    for line in readme.splitlines():
        if line.startswith("Live trend map") or "Booster Agent is that layer" in line:
            readme_line = line.strip()
            break
    return idea, product_para, readme_line


def build_dossier(root: Path = REPO_ROOT) -> Dossier:
    root = Path(root)
    git = checkout_project(root)
    idea, product_para, _readme_line = _core_copy(root)
    current = _live_features(root)
    future = _future_features(root)
    agents = _discover_agents(root)
    market = _market(root)
    stack = _package_stack(root)
    _, core_src = _git_show_first(root, CORE_IDEA_RELS)
    _, research_src = _git_show_first(root, RESEARCH_RELS)
    sources = [
        "README.md",
        core_src.split(" @", 1)[0] or CORE_IDEA_RELS[0],
        research_src.split(" @", 1)[0] or RESEARCH_RELS[0],
        "agents/README.md",
        "agents/booster-agent/IMPROVISATIONS.md",
        "package.json",
    ]
    problem = (
        "A junior on a brand or at an agency can ship a campaign name and still not "
        "see where *ours* printed overnight. Brandwatch and Meltwater answer that job "
        "for a ~$50k listening seat and a six-week onboard. Google Alerts is noise. "
        "ChatGPT invents a cause. By the time someone googles the tag, the footprint "
        "has already moved."
    )
    solution = (
        "HawkxAI is a live phrase desk. Plug a name the team already owns — Camry, "
        "#HeatWaveFit, Just Do It — and the same modules fill from live evidence: "
        "where it printed, when, title tone counted not narrated, a mind map whose "
        "amber dashes exist only for shared artifacts, and a play that includes risk. "
        "Never an invented WHY. Star the phrase. Come back in the morning. That delta "
        "is the product."
    )
    if idea:
        # keep founder copy, but pin the north star in the dossier
        pass
    why_now = (
        "Attention splits across Shorts, Reels, and X faster than a listening team "
        "can staff. Models made a fake 'why it's trending' free. The scarce thing is "
        "evidence. HawkAI refuses to invent posts or a cause. If the tape is thin, "
        "confidence drops. If a source is down, the pill says so and the rest still "
        "renders."
    )
    wedge = (
        "We do not out-listen Brandwatch. We sell the footprint of a phrase a team "
        "already owns, overnight, for the person who will never get that login. "
        "Incumbents sell coverage. We sell owned-phrase history plus honesty about "
        "thin tape. Copy / Save / Print dumps today's desk into Slack — the "
        "screenshot, not the SKU."
    )
    stage = (
        "Working product. Honest stage: live desk, live APIs, no billed seats, "
        "15-minute in-memory cache, tape-watch in localStorage. Proof is a checkout "
        "you can run. The next eight weeks are time, one campaign channel, and "
        "overnight return — or the thesis dies."
    )
    one_liner = (
        "HawkxAI is the live footprint desk for a campaign name a team already owns. "
        "Paste the phrase. See where it printed since yesterday, with receipts. "
        "No invented why."
    )
    if product_para:
        sources.append(f"{(core_src.split(' @', 1)[0] or CORE_IDEA_RELS[0])}#product")
    return Dossier(
        product="HawkxAI",
        one_liner=one_liner,
        problem=problem,
        solution=solution,
        why_now=why_now,
        wedge=wedge,
        stage=stage,
        current=current,
        future=future,
        market=market,
        stack=stack,
        git=git,
        sources=sources,
        agents=agents,
    )


def _bullets(features: Iterable[Feature], limit: int) -> str:
    lines = []
    for feat in list(features)[:limit]:
        extra = f" — {feat.detail}" if feat.detail else ""
        lines.append(f"- **{feat.name}**{extra}")
    return "\n".join(lines)


def compose_one_pager(dossier: Dossier) -> str:
    git = dossier.git
    git_line = ""
    if git and git.remote:
        git_line = f"Repo: {git.remote} · `{git.branch}` @ `{git.commit}`"
    elif git:
        git_line = f"`{git.branch}` @ `{git.commit}`"

    market_block = (
        "Social listening is occupied (Brandwatch, Meltwater, Talkwalker, Sprinklr). "
        "We do not raise on TAM/SAM/SOM in the research file — that page is not "
        "diligence. Brandwatch's ~$50k median seat is the comparable. The buyer is "
        "the junior who cannot get that login. The job is owned-phrase footprint "
        "plus evidence-only correlation, not a cheaper firehose."
    )

    stack = ", ".join(dossier.stack) if dossier.stack else "Next.js, TypeScript, D3, Gemini"

    agents_block = ""
    if dossier.agents:
        agents_block = (
            "\n## Agents\n\n"
            f"{_bullets(dossier.agents, 5)}\n"
        )

    return f"""# HawkxAI
**Confidential · one-page venture proposal**

{dossier.one_liner}

{git_line}

## The problem

{dossier.problem}

## The solution

{dossier.solution}

{dossier.wedge}

## Why now

{dossier.why_now}

## What's live

{_bullets(dossier.current, 6)}

Stack in the checkout: {stack}.
{agents_block}
## What's next

{_bullets(dossier.future, 5)}

The backlog is not a brainstorm. Booster re-ranks it from real capture gaps after every run.

## Market

{market_block}

## What it is not

Not Brandwatch — they win on coverage and archive. Not a campaign PDF — ChatGPT writes those. Not Research-as-Perplexity, age Mad Libs, or disaster + stock mashup. `/` attracts. `/footprint` is the product.

## The proposal

{dossier.stage}

We are locking a wedge: one owned phrase, overnight, receipts only. Ten people come back the next morning, or the company thesis is dead and the repo stays a hackathon.

**Use of funds**
1. Persist hourly snapshots so occurrence is a time series, not a 15-minute screenshot.
2. Ingest a channel campaigns actually live on (YouTube Data API; TikTok only with an official grant).
3. Persist tape-watch off localStorage so the morning delta survives a cold start.

We will not pitch fake users. The proof is the product: a live footprint desk, a live booster loop, and a checkout you can run.

— Founder, HawkxAI
""".strip() + "\n"


def word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text))


def score_pitch(one_pager: str, dossier: Dossier) -> PitchScore:
    notes: List[str] = []
    points = 0
    lower = one_pager.lower()

    for section in REQUIRED_SECTIONS:
        if section.lower() in lower:
            points += 12
        else:
            notes.append(f"missing section: {section}")

    wc = word_count(one_pager)
    if 380 <= wc <= 900:
        points += 12
    else:
        notes.append(f"word count {wc} is outside the one-pager band (380–900)")

    if dossier.current and len(dossier.current) >= 4:
        points += 10
    else:
        notes.append("too few live features from checkout")

    if dossier.future and len(dossier.future) >= 3:
        points += 8
    else:
        notes.append("too few next features from backlog")

    banned_hits = [phrase for phrase in BANNED if phrase in lower]
    if banned_hits:
        notes.append("banned hype: " + ", ".join(banned_hits))
    else:
        points += 12

    fake_traction = re.search(r"\$\d+\s*(arr|mrr)|10,?000 users|we are profitable", lower)
    if fake_traction:
        notes.append("invented traction language")
    else:
        points += 10

    if "never invent" in lower or "evidence" in lower:
        points += 8
    if dossier.git and dossier.git.remote:
        points += 4

    passed = points >= 70 and not banned_hits and fake_traction is None
    if passed:
        notes.append("partner-meeting ready: problem, solution, live/next, honest ask")
    return PitchScore(total=min(points, 100), notes=notes, passed=passed)


def proposal_to_dict(proposal: Proposal) -> Dict[str, Any]:
    payload = asdict(proposal)
    return payload


def save_proposal(proposal: Proposal, runs_dir: Path = DEFAULT_RUNS, publish: bool = True) -> Proposal:
    runs_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = runs_dir / f"sales_{stamp}.json"
    md_path = runs_dir / f"sales_{stamp}.md"
    json_path.write_text(json.dumps(proposal_to_dict(proposal), indent=2), encoding="utf-8")
    md_path.write_text(proposal.one_pager, encoding="utf-8")
    proposal.run_paths = [str(json_path), str(md_path)]
    if publish:
        CANONICAL_ONE_PAGER.parent.mkdir(parents=True, exist_ok=True)
        header = (
            f"<!-- generated by agents/smartsalesguy @ {proposal.timestamp} "
            f"score={proposal.score.total} words={proposal.word_count} -->\n\n"
        )
        CANONICAL_ONE_PAGER.write_text(header + proposal.one_pager, encoding="utf-8")
        proposal.canonical_path = str(CANONICAL_ONE_PAGER)
    return proposal


def run_sales(root: Path = REPO_ROOT) -> Proposal:
    root = Path(root)
    dossier = build_dossier(root)
    one_pager = compose_one_pager(dossier)
    score = score_pitch(one_pager, dossier)
    return Proposal(
        timestamp=utc_now(),
        dossier=dossier,
        one_pager=one_pager,
        word_count=word_count(one_pager),
        score=score,
        canonical_path=str(CANONICAL_ONE_PAGER),
    )


def self_check(root: Path = REPO_ROOT) -> int:
    root = Path(root)
    proposal = run_sales(root)
    assert proposal.dossier.product == "HawkxAI"
    assert proposal.dossier.git is not None
    assert proposal.dossier.current, "checkout found no live features"
    names = " ".join(f.name.lower() for f in proposal.dossier.current)
    assert "trend" in names or "booster" in names, names
    assert proposal.dossier.future, "checkout found no next features"
    lower = proposal.one_pager.lower()
    for section in REQUIRED_SECTIONS:
        assert section.lower() in lower, section
    assert proposal.score.passed, proposal.score.notes
    assert 380 <= proposal.word_count <= 900, proposal.word_count
    print("self-check ok")
    print(f"  product={proposal.dossier.product}")
    print(f"  live={len(proposal.dossier.current)} next={len(proposal.dossier.future)}")
    print(f"  words={proposal.word_count} score={proposal.score.total}")
    print(f"  git={proposal.dossier.git.branch}@{proposal.dossier.git.commit}")
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="SmartSalesGuy — checkout HawkxAI and write a VC one-pager.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 agents/smartsalesguy/smartsalesguy.py
  python3 agents/smartsalesguy/smartsalesguy.py --self-check
  python3 agents/smartsalesguy/smartsalesguy.py --stdout
        """,
    )
    parser.add_argument("--root", default=str(REPO_ROOT), help="Project root to checkout")
    parser.add_argument("--runs-dir", default=str(DEFAULT_RUNS))
    parser.add_argument("--self-check", action="store_true")
    parser.add_argument("--stdout", action="store_true", help="Print the one-pager only")
    parser.add_argument("--no-publish", action="store_true", help="Do not write docs/presentation/VC_ONE_PAGER.md")
    args = parser.parse_args(argv)

    root = Path(args.root)
    if args.self_check:
        return self_check(root)

    proposal = run_sales(root)
    print(proposal.one_pager)
    print()
    print(f"score={proposal.score.total} passed={proposal.score.passed} words={proposal.word_count}")
    for note in proposal.score.notes:
        print(f"  · {note}")

    if args.stdout:
        return 0 if proposal.score.passed else 1

    saved = save_proposal(proposal, Path(args.runs_dir), publish=not args.no_publish)
    print()
    for path in saved.run_paths:
        print(f"Saved {path}")
    if not args.no_publish:
        print(f"Published {saved.canonical_path}")
    return 0 if proposal.score.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
