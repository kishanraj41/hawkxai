"""
Booster Agent — HawkAI's core intelligence layer.

Captures the current trend hashtags/ QRs/phrases/URLs etc and analyze them
and co-relate them on why they are treanding and collect this information
to create a cool interactive dashboard that gives us most useful information
to all age groups and compititors in the bussiness that will leverage their
campains.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib.parse import urlparse


HASHTAG_RE = re.compile(r"#[A-Za-z0-9_]{2,48}")
CASHTAG_RE = re.compile(r"\$[A-Z]{1,5}\b")
URL_RE = re.compile(r"https?://[^\s<>\"']+")
QR_HINT_RE = re.compile(
    r"(?:utm_medium=qr|qr\.code|qrcode|qrs\.ly|qrco\.de|goqr|scan\s+this\s+qr|scan\s+the\s+qr)",
    re.I,
)
SHORT_LINK_RE = re.compile(
    r"https?://(?:bit\.ly|t\.co|tinyurl\.com|lnkd\.in|qrco\.de|qrs\.ly|goo\.gl|ow\.ly)/\S+",
    re.I,
)
STOP = {
    "the", "and", "for", "with", "this", "that", "from", "into", "about", "your",
    "their", "what", "when", "where", "which", "while", "after", "before", "over",
    "under", "than", "then", "just", "more", "most", "some", "have", "been",
    "will", "would", "could", "should", "they", "them", "were", "was", "are",
    "not", "but", "you", "our", "its", "a", "an", "of", "to", "in", "on", "at",
    "by", "or", "as", "is", "it", "be", "we", "i", "if", "so", "no", "yes",
}
CONTROVERSY = (
    "lawsuit", "ban", "hack", "leak", "crash", "layoff", "war", "scam",
    "outage", "recall", "boycott", "protest", "death", "killed", "abuse",
)
AGE_LENSES = (
    ("kids", "Family"),
    ("gen-z", "18–24"),
    ("millennial", "25–40"),
    ("gen-x", "41–56"),
    ("boomer", "57+"),
)

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_RUNS = os.path.join(HERE, "runs")
IMPROVISATIONS_PATH = os.path.join(HERE, "IMPROVISATIONS.md")
FIXTURE_PATH = os.path.join(HERE, "fixtures", "sample_trends.json")


@dataclass
class Artifact:
    kind: str
    value: str
    mentions: int
    platforms: List[str]


@dataclass
class CampaignMove:
    angle: str
    for_competitors: str
    risk: str
    timing: str
    hook: str


@dataclass
class AgeTranslation:
    lens: str
    label: str
    takeaway: str


@dataclass
class TopicBrief:
    topic_id: str
    label: str
    why_trending: str
    confidence: float
    artifacts: List[Artifact]
    audiences: List[AgeTranslation]
    campaign: CampaignMove


@dataclass
class Improvisation:
    priority: str
    title: str
    why: str
    next: str


@dataclass
class BoosterReport:
    timestamp: str
    source_updated_at: str
    summary: str
    briefs: List[TopicBrief] = field(default_factory=list)
    improvisations: List[Improvisation] = field(default_factory=list)
    captured: Dict[str, int] = field(default_factory=dict)


def _posts(topic: Dict[str, Any]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for slice_ in (topic.get("platforms") or {}).values():
        out.extend(slice_.get("posts") or [])
    return out


def _blob(topic: Dict[str, Any]) -> str:
    parts = [topic.get("label") or ""]
    for post in _posts(topic):
        parts.append(f"{post.get('title', '')} {post.get('url', '')}")
    return " ".join(parts)


def _active_platforms(topic: Dict[str, Any]) -> List[str]:
    plats = []
    for name, slice_ in (topic.get("platforms") or {}).items():
        if (slice_.get("score") or 0) > 0:
            plats.append(name)
    return plats


def _divergence_label(topic: Dict[str, Any]) -> str:
    div = float(topic.get("divergence") or 0)
    if div <= 0.34:
        return "everywhere"
    if div >= 0.66:
        active = _active_platforms(topic)
        if len(active) == 1:
            return f"{active[0]}-only bubble"
        return "single-platform bubble"
    return "spreading"


def _total_score(topic: Dict[str, Any]) -> float:
    plats = topic.get("platforms") or {}
    return sum((plats.get(p) or {}).get("score") or 0 for p in ("x", "reddit", "hn"))


def _domain(url: str) -> Optional[str]:
    try:
        host = urlparse(url).hostname or ""
        return host[4:] if host.startswith("www.") else host or None
    except Exception:
        return None


def _phrases(text: str) -> List[str]:
    cleaned = URL_RE.sub(" ", text.lower())
    words = [w for w in re.sub(r"[^a-z0-9\s]", " ", cleaned).split() if len(w) > 2 and w not in STOP and not w.isdigit()]
    grams: List[str] = []
    for n in (3, 2):
        for i in range(0, max(0, len(words) - n + 1)):
            grams.append(" ".join(words[i : i + n]))
    return grams


def capture_artifacts(topic: Dict[str, Any]) -> List[Artifact]:
    blob = _blob(topic)
    counts: Dict[Tuple[str, str], Artifact] = {}

    def bump(kind: str, value: str, platforms: Sequence[str]) -> None:
        key = (kind, value.lower())
        prev = counts.get(key)
        if prev:
            prev.mentions += 1
            for p in platforms:
                if p not in prev.platforms:
                    prev.platforms.append(p)
            return
        counts[key] = Artifact(kind=kind, value=value, mentions=1, platforms=list(platforms))

    active = _active_platforms(topic)
    for tag in HASHTAG_RE.findall(blob):
        bump("hashtag", tag, active)
    for cash in CASHTAG_RE.findall(blob):
        bump("ticker", cash, active)
    for tk in topic.get("tickers") or []:
        bump("ticker", f"${str(tk.get('symbol', '')).replace('$', '')}", active)

    for raw in URL_RE.findall(blob):
        url = raw.rstrip(").,")
        if QR_HINT_RE.search(url) or SHORT_LINK_RE.search(url):
            bump("qr", url, active)
        else:
            bump("url", url, active)
    if QR_HINT_RE.search(blob) and not any(a.kind == "qr" for a in counts.values()):
        bump("qr", "QR campaign mentioned (no scannable payload yet)", active)

    gram_counts = Counter(_phrases(blob))
    ranked = gram_counts.most_common()
    min_count = 2 if any(n >= 2 for _, n in ranked) else 1
    for phrase, n in ranked:
        if n < min_count:
            continue
        bump("phrase", phrase, active)
        if sum(1 for a in counts.values() if a.kind == "phrase") >= 4:
            break

    return sorted(counts.values(), key=lambda a: a.mentions, reverse=True)[:12]


def why_trending(topic: Dict[str, Any], artifacts: Sequence[Artifact]) -> Tuple[str, float]:
    posts = _posts(topic)
    if not posts:
        return "Signal is thin — label only, no receipt posts. Do not invent a why.", 0.2

    velocity = topic.get("velocity") or "peaking"
    div = _divergence_label(topic)
    parts: List[str] = []
    if velocity == "rising" and float(topic.get("divergence") or 0) >= 0.66:
        parts.append(f"Breaking first as a {div}. Other sources have not caught up — early window.")
    elif velocity == "rising":
        parts.append(f"Rising and {div}. Heat is spread across sources, not a single spike.")
    elif velocity == "peaking":
        parts.append(f"At peak attention ({div}). Cheap to amplify, expensive to originate.")
    else:
        parts.append(f"Cooling ({div}). Better as a recap than a new launch.")

    active = _active_platforms(topic)
    if active:
        parts.append(f"Print on {', '.join(active)}.")
    tags = [a.value for a in artifacts if a.kind == "hashtag"][:3]
    if tags:
        parts.append(f"In play: {' '.join(tags)}.")
    domains = []
    for a in artifacts:
        if a.kind in ("url", "qr"):
            d = _domain(a.value)
            if d and d not in domains:
                domains.append(d)
    if domains:
        parts.append(f"Traffic on {', '.join(domains[:2])}.")
    if topic.get("peakHourCT"):
        parts.append(f"Historical peak hour CT: {topic['peakHourCT']}.")

    score = _total_score(topic)
    confidence = max(0.25, min(0.92, 0.35 + (len(posts) + len(artifacts)) * 0.06 + (0.1 if score > 80 else 0)))
    return " ".join(parts), round(confidence, 2)


def _controversy(topic: Dict[str, Any]) -> bool:
    blob = _blob(topic).lower()
    return any(w in blob for w in CONTROVERSY)


def campaign_move(topic: Dict[str, Any], artifacts: Sequence[Artifact]) -> CampaignMove:
    hot = next((a.value for a in artifacts if a.kind == "hashtag"), topic.get("label") or "this trend")
    label = topic.get("label") or hot
    velocity = topic.get("velocity") or "peaking"
    risky = _controversy(topic)
    div = float(topic.get("divergence") or 0)
    if velocity == "fading":
        return CampaignMove(
            angle="Recap, don't launch",
            for_competitors=f'Use "{hot}" as context in a post-mortem or explainer. Do not drop a new campaign into a cooling wave.',
            risk="high" if risky else "medium",
            timing=velocity,
            hook=f"What {label} actually changed — in one screen.",
        )
    if div >= 0.66:
        return CampaignMove(
            angle="Go native on the bubbling platform",
            for_competitors=f"Don't paste the same ad everywhere. Speak the {_divergence_label(topic)} in its own format, then bridge to your product need — never clone the meme.",
            risk="high" if risky else "low",
            timing=velocity,
            hook=f"{hot} is still local. Be useful there before it goes mainstream.",
        )
    return CampaignMove(
        angle="Ride the need, not the joke",
        for_competitors=f'Competitors should answer the job-to-be-done behind "{label}" (speed, trust, status, safety). Copying the phrase without a new proof point looks late.',
        risk="high" if risky else ("medium" if velocity == "peaking" else "low"),
        timing=velocity,
        hook=f"While {hot} is {velocity}, show the proof your category still owes people.",
    )


def age_translations(topic: Dict[str, Any], _why: str) -> List[AgeTranslation]:
    label = topic.get("label") or "this topic"
    velocity = topic.get("velocity") or "peaking"
    takes = {
        "kids": f'“{label}” is in the news. Don’t scan unknown QR codes or links without a parent.',
        "gen-z": f'“{label}” is moving now. Only jump in if you have a real point of view.',
        "millennial": f'“{label}” is up. Check if it changes a purchase, commute, or bill before spending time on it.',
        "gen-x": f'“{label}” is {velocity}. Look for a product, policy, or outage — skip the noise.',
        "boomer": f'“{label}” is {velocity}. Practical angle: news, money, or family plans.',
    }
    return [AgeTranslation(lens=k, label=lab, takeaway=takes[k]) for k, lab in AGE_LENSES]


def boost_topic(topic: Dict[str, Any]) -> TopicBrief:
    artifacts = capture_artifacts(topic)
    why, confidence = why_trending(topic, artifacts)
    return TopicBrief(
        topic_id=topic.get("id") or "topic",
        label=topic.get("label") or "",
        why_trending=why,
        confidence=confidence,
        artifacts=artifacts,
        audiences=age_translations(topic, why),
        campaign=campaign_move(topic, artifacts),
    )


def improvisations_for(payload: Dict[str, Any], briefs: Sequence[TopicBrief]) -> List[Improvisation]:
    items: List[Improvisation] = []
    degraded = payload.get("degraded") or []
    topics = payload.get("topics") or []
    artifacts = [a for b in briefs for a in b.artifacts]
    hashtags = [a for a in artifacts if a.kind == "hashtag"]
    qrs = [a for a in artifacts if a.kind == "qr"]
    qr_decoded = any(a.value.startswith("decoded:") for a in qrs)
    rising = sum(1 for t in topics if t.get("velocity") == "rising")
    bubbles = sum(1 for t in topics if float(t.get("divergence") or 0) >= 0.66)

    if any("x" in d for d in degraded):
        items.append(Improvisation("P0", "Stabilize X ingest", "Hashtag and QR campaigns mostly start on X. Offline X blinds the booster.", "Keep x_search, add a Google Trends fallback so capture still runs."))
    if any("reddit" in d for d in degraded):
        items.append(Improvisation("P0", "Reddit fallback (OAuth or last-good cache)", "403s wipe phrase capture from the largest long-form platform.", "Authenticated Reddit client + cache last-good posts for 15m."))
    if len(hashtags) < 3:
        items.append(Improvisation("P0", "Ingest TikTok / Reels / Shorts caption text", "Almost no hashtags in HN/Reddit titles. Short-form campaigns are invisible.", "Add a caption scraper (or Grok search for TikTok-named trends) into capture."))
    if not qr_decoded:
        items.append(Improvisation("P0", "QR image decode, not just QR-shaped URLs", "Campaigns hide the payload in images. Text regex cannot see a poster QR.", "Accept image URLs → decode with a QR library → treat payload as a first-class artifact."))
    if bubbles >= 3:
        items.append(Improvisation("P1", "Platform-native campaign studio", f"{bubbles} topics are still single-platform bubbles — the cheapest time to act.", "One-click brief: format + hook + risk for the bubbling network only."))
    if rising >= 2:
        items.append(Improvisation("P1", "Audience toggle on the map", "The same rising cluster reads differently for family, 18–24, and a brand CMO.", "Compose five caption variants from BoosterInsights; filter map labels by lens."))
    if not any((t.get("tickers") or []) for t in topics):
        items.append(Improvisation("P1", "Finance overlay even without explicit tickers", "Competitors still need category peers when $TICKER is absent.", "Map topic labels to a small industry lexicon — never invent symbols."))
    items.append(Improvisation("P2", "News + disaster time-lag correlation", "Why-trending is still social-only. Campaigns miss weather, outages, and filings.", "Join GDELT/NOAA on a 0–24h lag next to velocity."))
    items.append(Improvisation("P2", "Export a one-page competitor brief", "CMOs will not live inside the circle pack. They want a PDF/Slack card.", "From the booster payload, render hook / risk / age takes / three receipts."))
    rank = {"P0": 0, "P1": 1, "P2": 2}
    items.sort(key=lambda i: rank.get(i.priority, 9))
    return items[:8]


def boost_trends(payload: Dict[str, Any]) -> BoosterReport:
    topics = list(payload.get("topics") or [])
    topics.sort(key=_total_score, reverse=True)
    briefs = [boost_topic(t) for t in topics[:16]]
    improvisations = improvisations_for(payload, briefs)
    captured = Counter(a.kind for b in briefs for a in b.artifacts)
    top = briefs[0] if briefs else None
    summary = (
        f"{top.label} · {top.campaign.risk} risk · {top.campaign.hook}"
        if top
        else "No topics on the tape yet."
    )
    return BoosterReport(
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_updated_at=str(payload.get("updatedAt") or ""),
        summary=summary,
        briefs=briefs,
        improvisations=improvisations,
        captured=dict(captured),
    )


def fetch_trends(url: str, timeout: int = 90) -> Dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": "HawkAI-Booster/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def load_payload(path: str) -> Dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def report_to_dict(report: BoosterReport) -> Dict[str, Any]:
    return asdict(report)


def report_markdown(report: BoosterReport) -> str:
    lines = [
        f"# Booster briefing · {report.timestamp}",
        "",
        report.summary,
        "",
        "## Captured artifacts",
        "",
        ", ".join(f"{k}: {v}" for k, v in report.captured.items()) or "none",
        "",
        "## Topics",
        "",
    ]
    for brief in report.briefs:
        lines.append(f"### {brief.label}")
        lines.append("")
        lines.append(f"Confidence {int(brief.confidence * 100)}%. {brief.why_trending}")
        lines.append("")
        if brief.artifacts:
            arts = ", ".join(f"`{a.value}`" if a.kind in ("hashtag", "ticker") else f"{a.kind}: {a.value}" for a in brief.artifacts[:8])
            lines.append(arts)
            lines.append("")
        lines.append(f"**Competitor hook:** {brief.campaign.hook}")
        lines.append("")
        lines.append(brief.campaign.for_competitors)
        lines.append("")
        lines.append(f"Risk: {brief.campaign.risk} · {brief.campaign.angle} · timing {brief.campaign.timing}")
        lines.append("")
        for aud in brief.audiences:
            lines.append(f"- **{aud.label}:** {aud.takeaway}")
        lines.append("")
    lines.append("## Improvisations")
    lines.append("")
    for item in report.improvisations:
        lines.append(f"- **{item.priority} {item.title}** — {item.why} Next: {item.next}")
    lines.append("")
    return "\n".join(lines)


def write_improvisations(report: BoosterReport, path: str = IMPROVISATIONS_PATH) -> None:
    lines = [
        "# Booster improvisations",
        "",
        "Living backlog. Regenerated by the Booster Agent from real gaps in the latest run.",
        "",
        f"Last run: {report.timestamp}",
        "",
    ]
    for item in report.improvisations:
        lines.append(f"## {item.priority} — {item.title}")
        lines.append("")
        lines.append(f"- **Why:** {item.why}")
        lines.append(f"- **Next:** {item.next}")
        lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def save_report(report: BoosterReport, runs_dir: str = DEFAULT_RUNS) -> Tuple[str, str]:
    os.makedirs(runs_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = os.path.join(runs_dir, f"booster_{stamp}.json")
    md_path = os.path.join(runs_dir, f"booster_{stamp}.md")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_to_dict(report), f, indent=2)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(report_markdown(report))
    write_improvisations(report)
    return json_path, md_path


def self_check() -> int:
    payload = load_payload(FIXTURE_PATH)
    report = boost_trends(payload)
    assert report.briefs, "expected briefs from fixture"
    kinds = {a.kind for b in report.briefs for a in b.artifacts}
    assert "hashtag" in kinds, kinds
    assert "qr" in kinds, kinds
    assert "url" in kinds, kinds
    assert report.improvisations, "expected improvisations"
    assert all(len(b.audiences) == 5 for b in report.briefs)
    print("self-check ok")
    print(f"  briefs={len(report.briefs)} captured={report.captured}")
    print(f"  top={report.briefs[0].label}")
    print(f"  next={report.improvisations[0].priority} {report.improvisations[0].title}")
    return 0


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Booster Agent — capture, correlate, campaign, improvise.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 agents/booster-agent/booster_agent.py
  python3 agents/booster-agent/booster_agent.py --file agents/booster-agent/fixtures/sample_trends.json
  python3 agents/booster-agent/booster_agent.py --url http://localhost:3000/api/trends
  python3 agents/booster-agent/booster_agent.py --self-check
        """,
    )
    parser.add_argument("--url", default=os.environ.get("HAWKAI_TRENDS_URL", "http://localhost:3000/api/trends"))
    parser.add_argument("--file", help="Trends JSON file (skips live fetch)")
    parser.add_argument("--runs-dir", default=DEFAULT_RUNS)
    parser.add_argument("--self-check", action="store_true")
    parser.add_argument("--stdout", action="store_true", help="Print JSON instead of saving")
    args = parser.parse_args(argv)

    if args.self_check:
        return self_check()

    try:
        payload = load_payload(args.file) if args.file else fetch_trends(args.url)
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as err:
        print(f"Could not load trends ({err}). Using fixture.", file=sys.stderr)
        payload = load_payload(FIXTURE_PATH)

    report = boost_trends(payload)
    print(report.summary)
    print()
    print("Improvisations:")
    for item in report.improvisations:
        print(f"  {item.priority}  {item.title}")
        print(f"       {item.why}")
        print(f"       → {item.next}")

    if args.stdout:
        json.dump(report_to_dict(report), sys.stdout, indent=2)
        print()
        return 0

    json_path, md_path = save_report(report, args.runs_dir)
    print()
    print(f"Saved {json_path}")
    print(f"Saved {md_path}")
    print(f"Updated {IMPROVISATIONS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
