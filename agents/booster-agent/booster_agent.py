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

CATEGORIES = (
    "markets", "news", "weather", "tech", "sports", "health", "security", "campaigns", "culture",
)
CATEGORY_LABEL = {
    "all": "All",
    "markets": "Markets",
    "news": "News",
    "weather": "Weather",
    "tech": "Tech",
    "sports": "Sports",
    "health": "Health",
    "security": "Security",
    "campaigns": "Campaigns",
    "culture": "Culture",
}
MAX_MIND_TOPICS = 12
MAX_MIND_LEAVES = 4
SOURCE_CATEGORY = {
    "gdelt": "news",
    "wikipedia": "culture",
    "coingecko": "markets",
    "usgs": "weather",
    "nasa eonet": "weather",
    "national weather service": "weather",
    "open-meteo": "weather",
    "tvmaze": "culture",
    "open library": "culture",
    "dev.to": "tech",
    "github": "tech",
    "spaceflight news": "tech",
    "fbi wanted": "security",
    "disease.sh": "health",
    "thesportsdb": "sports",
    "espn": "sports",
    "spacex": "tech",
    "frankfurter": "markets",
    "cheapshark": "markets",
    "jikan": "culture",
    "carbon intensity": "weather",
    "itunes": "culture",
    "mastodon": "culture",
    "lobsters": "tech",
    "open food facts": "health",
    "nager.date": "culture",
    "cisa": "security",
}
KEYWORDS = {
    "markets": ("bitcoin", "crypto", "nasdaq", "earnings", "inflation", "etf", "ipo", "stock", "camry", "civic", "tesla", "mustang", "f-150", "toyota", "honda", "ford"),
    "news": ("election", "congress", "sanctions", "treaty", "breaking"),
    "weather": ("hurricane", "earthquake", "wildfire", "tornado", "flood", "storm", "heatwave", "forecast"),
    "tech": ("github", "openai", "chatgpt", "kernel", "gpu", "spacex", "llm"),
    "sports": ("nba", "nfl", "mlb", "nhl", "playoff", "soccer", "espn"),
    "health": ("vaccine", "outbreak", "fda", "covid", "hospital"),
    "security": ("ransomware", "cve", "breach", "exploit", "hacked", "vulnerability"),
    "campaigns": ("utm_medium=qr", "qrco.de", "launch event", "test drive", "drop"),
    "culture": ("wikipedia", "album", "anime", "tvmaze"),
}
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
class CausationDriver:
    id: str
    label: str
    weight: int
    evidence: str


@dataclass
class CausationReport:
    topic_id: str
    first_at: Optional[str]
    first_platform: Optional[str]
    lag_hours: Optional[float]
    peak_at: Optional[str]
    drivers: List[CausationDriver]
    thin: bool


@dataclass
class SentimentMix:
    pos: int
    neg: int
    risk: int
    n: int


@dataclass
class SentimentReport:
    topic_id: str
    lean: str
    overall: SentimentMix
    drivers: List[CausationDriver]
    quotes: List[str]
    thin: bool


@dataclass
class TopicBrief:
    topic_id: str
    label: str
    why_trending: str
    confidence: float
    category: str
    artifacts: List[Artifact]
    audiences: List[AgeTranslation]
    campaign: CampaignMove
    causation: CausationReport
    sentiment: SentimentReport


@dataclass
class Improvisation:
    priority: str
    title: str
    why: str
    next: str


@dataclass
class MindNode:
    id: str
    kind: str
    label: str
    weight: float
    topic_id: Optional[str] = None
    detail: Optional[str] = None


@dataclass
class MindLink:
    source: str
    target: str
    kind: str
    label: Optional[str] = None


@dataclass
class MindGraph:
    hub_id: str
    nodes: List[MindNode] = field(default_factory=list)
    links: List[MindLink] = field(default_factory=list)
    bridges: int = 0


@dataclass
class BoosterReport:
    timestamp: str
    source_updated_at: str
    summary: str
    briefs: List[TopicBrief] = field(default_factory=list)
    improvisations: List[Improvisation] = field(default_factory=list)
    captured: Dict[str, int] = field(default_factory=dict)
    mind: Optional[MindGraph] = None


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
    return sum((slice or {}).get("score") or 0 for slice in plats.values())


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


def _valid_ts(iso: str) -> Optional[datetime]:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


def classify_topic(topic: Dict[str, Any], artifacts: Optional[Sequence[Artifact]] = None) -> str:
    arts = list(artifacts or [])
    if topic.get("tickers"):
        return "markets"
    tags = [a for a in arts if a.kind == "hashtag"]
    qrs = [a for a in arts if a.kind == "qr"]
    if qrs or len(tags) >= 2:
        return "campaigns"

    votes: Dict[str, int] = {}

    def bump(cat: str, n: int = 1) -> None:
        votes[cat] = votes.get(cat, 0) + n

    for post in _posts(topic):
        src = str(post.get("sourceApi") or "").lower()
        if not src:
            continue
        if src in SOURCE_CATEGORY:
            bump(SOURCE_CATEGORY[src], 2)
            continue
        for name, cat in SOURCE_CATEGORY.items():
            if name in src:
                bump(cat, 2)
                break

    blob = _blob(topic).lower()
    for cat, words in KEYWORDS.items():
        if any(w in blob for w in words):
            bump(cat, 1)
    if HASHTAG_RE.search(_blob(topic)):
        bump("campaigns", 1)

    if votes:
        return max(votes.items(), key=lambda kv: kv[1])[0]
    plats = topic.get("platforms") or {}
    hn = (plats.get("hn") or {}).get("score") or 0
    x = (plats.get("x") or {}).get("score") or 0
    if hn > 20 and hn >= x:
        return "tech"
    if (plats.get("public") or {}).get("score"):
        return "news"
    return "culture"


def build_causation(topic: Dict[str, Any], artifacts: Sequence[Artifact]) -> CausationReport:
    posts = _posts(topic)
    dated = []
    for post in posts:
        ts = _valid_ts(str(post.get("createdAt") or ""))
        if ts:
            dated.append((ts, post))
    dated.sort(key=lambda row: row[0])
    first = dated[0][1] if dated else None
    first_at = dated[0][0].isoformat() if dated else None

    first_by_plat: Dict[str, datetime] = {}
    for ts, post in dated:
        plat = str(post.get("platform") or "")
        if plat and plat not in first_by_plat:
            first_by_plat[plat] = ts
    lag: Optional[float] = None
    if len(first_by_plat) >= 2:
        times = sorted(first_by_plat.values())
        lag = round((times[1] - times[0]).total_seconds() / 3600, 1)

    peak_at = None
    if dated:
        best = max(dated, key=lambda row: float(row[1].get("score") or 0))
        peak_at = best[0].isoformat()

    drivers: List[CausationDriver] = []
    plats = topic.get("platforms") or {}
    for name, slice_ in plats.items():
        score = float((slice_ or {}).get("score") or 0)
        if score <= 0:
            continue
        n = len((slice_ or {}).get("posts") or [])
        drivers.append(CausationDriver(f"heat-{name}", f"{name} heat", int(score), f"{n} receipts · score {int(score)}"))

    if first:
        div = float(topic.get("divergence") or 0)
        drivers.append(
            CausationDriver(
                "first-print",
                f"First print · {first.get('platform')}",
                36 if div >= 0.66 else 22,
                f"{str(first.get('title') or '')[:80]}",
            )
        )

    velocity = topic.get("velocity") or "peaking"
    if velocity == "rising":
        drivers.append(CausationDriver("velocity", "Rising velocity", 24, "Still accelerating vs last ingest."))
    elif velocity == "peaking":
        drivers.append(CausationDriver("velocity", "At peak", 14, "Heat is high but no longer accelerating."))
    else:
        drivers.append(CausationDriver("velocity", "Cooling", 8, "Better as a recap than a new launch."))

    if lag is not None:
        drivers.append(
            CausationDriver(
                "lag",
                "Cross-source in <2h" if lag < 2 else f"Second source +{lag}h",
                22 if lag < 2 else 12,
                "Hours between the first two platforms that printed.",
            )
        )

    tags = [a for a in artifacts if a.kind == "hashtag"]
    qrs = [a for a in artifacts if a.kind == "qr"]
    tickers = [a for a in artifacts if a.kind == "ticker"]
    if tags:
        drivers.append(CausationDriver("hashtags", "Hashtag load", min(28, 8 + len(tags) * 6), " ".join(a.value for a in tags[:3])))
    if qrs:
        drivers.append(CausationDriver("qr", "QR / short-link campaign", 26, qrs[0].value[:80]))
    if tickers:
        drivers.append(CausationDriver("tickers", "Ticker overlay", 18, " ".join(a.value for a in tickers)))

    blob = _blob(topic).lower()
    hit = next((w for w in CONTROVERSY if w in blob), None)
    if hit:
        drivers.append(CausationDriver("risk", f"Risk word · {hit}", 16, "Present in receipts — treat as a risk driver, not a slogan."))

    max_w = max((d.weight for d in drivers), default=1)
    scaled = [
        CausationDriver(d.id, d.label, max(4, round(d.weight / max_w * 100)), d.evidence)
        for d in drivers
    ]
    scaled.sort(key=lambda d: d.weight, reverse=True)
    return CausationReport(
        topic_id=str(topic.get("id") or "topic"),
        first_at=first_at,
        first_platform=str(first.get("platform")) if first else None,
        lag_hours=lag,
        peak_at=peak_at,
        drivers=scaled[:8],
        thin=len(posts) < 2,
    )


POS_WORDS = (
    "love", "great", "win", "wins", "record", "beat", "beats", "upgrade", "award",
    "best", "demand", "waitlist", "sold", "launch", "reliable", "safe", "smooth",
)
NEG_WORDS = (
    "fail", "fails", "failed", "outage", "crash", "crashes", "lawsuit", "recall",
    "boycott", "scam", "delay", "delayed", "overpriced", "defect", "hate", "worst", "broken",
)
PRODUCT_ALIASES = {
    "camry": ("toyota camry", "camry"),
    "civic": ("honda civic", "civic"),
    "tesla": ("tesla", "tsla", "model y"),
    "cybertruck": ("tesla cybertruck",),
    "f-150": ("ford f-150", "f150"),
    "f150": ("ford f-150", "f-150"),
    "mustang": ("ford mustang",),
}


def infer_query_intent(raw: str) -> Dict[str, Any]:
    q = (raw or "").strip()
    lower = q.lower()
    kind, category, aliases = "generic", "culture", []
    if re.search(r"\$[A-Z]{1,5}\b", q):
        kind, category = "ticker", "markets"
    elif re.search(r"utm_medium=qr|qrco\.de|scan this qr", q, re.I):
        kind, category = "campaign", "campaigns"
    elif HASHTAG_RE.search(q):
        kind, category = "hashtag", "campaigns"
        tag = HASHTAG_RE.search(q).group(0)
        aliases = [tag, tag[1:]]
    elif any(w in lower for w in ("launch", "recall", "earnings", "keynote", "ces", "drop")):
        kind = "event"
        category = "news" if "recall" in lower else "campaigns"
    else:
        for key, al in PRODUCT_ALIASES.items():
            if key in lower:
                kind, category, aliases = "product", "markets", list(al)
                break
    return {"raw": q, "kind": kind, "category": category, "aliases": aliases}


def build_sentiment(topic: Dict[str, Any]) -> SentimentReport:
    posts = _posts(topic)
    pos = neg = risk = 0
    quotes: List[str] = []
    for post in posts:
        title = str(post.get("title") or "")
        blob = title.lower()
        p = sum(1 for w in POS_WORDS if w in blob)
        n = sum(1 for w in NEG_WORDS if w in blob)
        r = sum(1 for w in CONTROVERSY if w in blob)
        pos += p
        neg += n
        risk += r
        if p + n + r:
            quotes.append(title[:90])
    n = len(posts)
    if n < 2:
        lean = "thin"
    elif pos >= neg * 1.4 and pos > 0:
        lean = "pos"
    elif neg >= pos * 1.4 and neg > 0:
        lean = "neg"
    else:
        lean = "mixed"
    drivers: List[CausationDriver] = []
    denom = max(pos + neg, 1)
    if pos:
        drivers.append(CausationDriver("sent-pos", "Positive titles", round(pos / denom * 100), f"{pos} positive word hits in {n} receipts"))
    if neg:
        drivers.append(CausationDriver("sent-neg", "Negative titles", round(neg / denom * 100), f"{neg} negative word hits in {n} receipts"))
    if risk:
        drivers.append(CausationDriver("sent-risk", "Risk words", min(100, 20 + risk * 12), f"{risk} controversy hits — treat as a floor risk, not a slogan"))
    if not drivers:
        drivers.append(CausationDriver("sent-thin", "No tone words in titles", 8, "Will not invent a mood."))
    max_w = max((d.weight for d in drivers), default=1)
    scaled = [
        CausationDriver(d.id, d.label, max(6, round(d.weight / max_w * 100)), d.evidence)
        for d in drivers
    ]
    scaled.sort(key=lambda d: d.weight, reverse=True)
    return SentimentReport(
        topic_id=str(topic.get("id") or "topic"),
        lean=lean,
        overall=SentimentMix(pos=pos, neg=neg, risk=risk, n=n),
        drivers=scaled[:8],
        quotes=quotes[:3],
        thin=n < 2,
    )


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


def age_translations(topic: Dict[str, Any]) -> List[AgeTranslation]:
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
    sentiment = build_sentiment(topic)
    if sentiment.lean == "pos":
        why += f" Titles lean positive ({sentiment.overall.pos}/{sentiment.overall.n})."
    elif sentiment.lean == "neg":
        why += f" Titles lean negative ({sentiment.overall.neg}/{sentiment.overall.n})."
    elif not sentiment.thin:
        why += f" Titles are split ({sentiment.overall.pos} pos / {sentiment.overall.neg} neg)."
    return TopicBrief(
        topic_id=topic.get("id") or "topic",
        label=topic.get("label") or "",
        why_trending=why,
        confidence=confidence,
        category=classify_topic(topic, artifacts),
        artifacts=artifacts,
        audiences=age_translations(topic),
        campaign=campaign_move(topic, artifacts),
        causation=build_causation(topic, artifacts),
        sentiment=sentiment,
    )


def build_mind_map(
    topics: Sequence[Dict[str, Any]],
    briefs: Sequence[TopicBrief],
    category: str = "all",
) -> MindGraph:
    """Hub = category plug. Branches = receipts. Shared links only when the same artifact key lands on 2+ topics."""
    brief_by_id = {b.topic_id: b for b in briefs}
    scoped = list(topics)
    if category != "all":
        scoped = [
            t
            for t in topics
            if (
                brief_by_id[t.get("id")].category
                if t.get("id") in brief_by_id
                else classify_topic(t, [])
            )
            == category
        ]
    ranked = sorted(scoped, key=_total_score, reverse=True)[:MAX_MIND_TOPICS]
    hub_id = f"hub:{category}"
    nodes: List[MindNode] = [
        MindNode(
            id=hub_id,
            kind="hub",
            label=CATEGORY_LABEL.get(category, category.title()),
            weight=float(len(ranked)),
            detail=f"{len(ranked)} names in this plug",
        )
    ]
    links: List[MindLink] = []
    artifact_index: Dict[str, List[str]] = {}

    for topic in ranked:
        tid = str(topic.get("id") or "topic")
        topic_id = f"topic:{tid}"
        brief = brief_by_id.get(tid)
        cat = brief.category if brief else classify_topic(topic, [])
        nodes.append(
            MindNode(
                id=topic_id,
                kind="topic",
                label=(topic.get("label") or tid)[:42],
                topic_id=tid,
                weight=max(8.0, _total_score(topic)),
                detail=f"{topic.get('velocity') or '—'} · {cat}",
            )
        )
        links.append(MindLink(source=hub_id, target=topic_id, kind="branch"))

        leaves: List[MindNode] = []
        artifacts = list((brief.artifacts if brief else [])[:3])
        for art in artifacts:
            key = f"{art.kind}:{art.value.lower()}"
            artifact_index.setdefault(key, []).append(tid)
            leaves.append(
                MindNode(
                    id=f"{topic_id}:art:{key}",
                    kind="artifact",
                    label=art.value[:28],
                    topic_id=tid,
                    weight=float(art.mentions),
                    detail=f"{art.kind} · {art.mentions} mention{'s' if art.mentions != 1 else ''}",
                )
            )

        first = brief.causation.first_platform if brief else None
        if first:
            leaves.append(
                MindNode(
                    id=f"{topic_id}:src:{first}",
                    kind="source",
                    label=f"first {first}",
                    topic_id=tid,
                    weight=10.0,
                    detail=brief.causation.first_at if brief else "first print",
                )
            )

        driver = brief.causation.drivers[0] if brief and brief.causation.drivers else None
        if driver and len(leaves) < MAX_MIND_LEAVES:
            leaves.append(
                MindNode(
                    id=f"{topic_id}:drv:{driver.id}",
                    kind="driver",
                    label=driver.label[:28],
                    topic_id=tid,
                    weight=float(driver.weight),
                    detail=driver.evidence,
                )
            )

        for leaf in leaves[:MAX_MIND_LEAVES]:
            nodes.append(leaf)
            links.append(MindLink(source=topic_id, target=leaf.id, kind="branch"))

    bridges = 0
    for key, topic_ids in artifact_index.items():
        unique = list(dict.fromkeys(topic_ids))
        if len(unique) < 2:
            continue
        label = ":".join(key.split(":")[1:]) or key
        for i, left in enumerate(unique):
            for right in unique[i + 1 :]:
                links.append(
                    MindLink(
                        source=f"topic:{left}",
                        target=f"topic:{right}",
                        kind="shared",
                        label=label,
                    )
                )
                bridges += 1

    return MindGraph(hub_id=hub_id, nodes=nodes, links=links, bridges=bridges)


def _mermaid_label(text: str) -> str:
    cleaned = re.sub(r"[\[\](){}#]", "", text).replace('"', "'").strip() or "node"
    return f'"{cleaned[:32]}"'


def mindmap_mermaid(graph: MindGraph) -> str:
    by_id = {n.id: n for n in graph.nodes}
    kids: Dict[str, List[str]] = {}
    for link in graph.links:
        if link.kind != "branch":
            continue
        kids.setdefault(link.source, []).append(link.target)
    lines = ["mindmap"]
    hub = by_id.get(graph.hub_id)
    if not hub:
        return "mindmap\n  root((empty))"
    lines.append(f"  root(({_mermaid_label(hub.label)}))")
    for tid in kids.get(graph.hub_id, []):
        topic = by_id.get(tid)
        if not topic:
            continue
        lines.append(f"    {_mermaid_label(topic.label)}")
        for lid in kids.get(tid, []):
            leaf = by_id.get(lid)
            if leaf:
                lines.append(f"      {_mermaid_label(leaf.label)}")
    return "\n".join(lines)


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
    if not payload.get("sources", {}).get("public"):
        items.append(Improvisation("P0", "Public-API ingest is offline", "News, weather, crypto, and sports receipts come from the public-apis catalog. Without them WHY stays social-only.", "Retry GDELT/NWS/CoinGecko feeds; keep catalog cache so the allowlist still configures the desk."))
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
    thin = sum(1 for b in briefs if b.causation.thin)
    if thin >= 3:
        items.append(Improvisation("P1", "Persist ingest snapshots for multi-day occurrence charts", f"{thin} topics have fewer than two dated receipts — the timeseries cannot show a peak, only a point.", "Write hourly topic-score snapshots and join them on the area chart next to live posts."))
    mind = build_mind_map(topics, briefs)
    if mind.bridges == 0:
        items.append(Improvisation("P1", "Shared-artifact bridges on the mind map", "The mind map only draws amber dashes when the same hashtag, QR, URL, or ticker prints on two names. Zero bridges means correlation is still a star, not a graph.", "Keep capturing overlapping campaign codes across topics — never invent a bridge to fill the map."))
    items.append(Improvisation("P2", "News + disaster markers on the same timeseries", "GDELT and NWS land as receipts, but they are not lagged as event ticks against social velocity.", "Overlay public-api events on the occurrence chart with a 0–24h lag, never as an invented WHY."))
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
    mind = build_mind_map(topics[:16], briefs)
    top = briefs[0] if briefs else None
    summary = (
        f"{top.label} · {top.campaign.risk} risk · {top.campaign.hook}"
        if top
        else "Nearest receipts are still loading."
    )
    return BoosterReport(
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_updated_at=str(payload.get("updatedAt") or ""),
        summary=summary,
        briefs=briefs,
        improvisations=improvisations,
        captured=dict(captured),
        mind=mind,
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
        lines.append(f"Category `{brief.category}`. Confidence {int(brief.confidence * 100)}%. {brief.why_trending}")
        lines.append("")
        if brief.causation.drivers:
            top_d = brief.causation.drivers[0]
            lines.append(f"Lead driver: {top_d.label} ({top_d.weight}). {top_d.evidence}")
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
    if report.mind:
        lines.append("## Mind map")
        lines.append("")
        lines.append("Hub is the plug. Branches are receipts. Amber dashes are shared artifacts — never an invented link.")
        lines.append("")
        lines.append("```mermaid")
        lines.append(mindmap_mermaid(report.mind))
        lines.append("```")
        lines.append("")
        shared = [l for l in report.mind.links if l.kind == "shared"]
        if shared:
            lines.append(f"{report.mind.bridges} shared-artifact bridge{'s' if report.mind.bridges != 1 else ''}:")
            lines.append("")
            for link in shared:
                lines.append(f"- `{link.label}` between `{link.source}` and `{link.target}`")
            lines.append("")
        else:
            lines.append("No shared artifacts in this ingest — no invented bridges.")
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
    assert all(b.category in CATEGORIES for b in report.briefs)
    assert all(b.causation.drivers for b in report.briefs)
    assert report.mind is not None
    assert any(n.kind == "hub" for n in report.mind.nodes)
    captured_values = {a.value.lower()[:28] for b in report.briefs for a in b.artifacts}
    for node in report.mind.nodes:
        if node.kind == "artifact":
            assert node.label.lower() in captured_values, node.label
    shared_keys = {(a.kind, a.value.lower()) for b in report.briefs for a in b.artifacts}
    for link in report.mind.links:
        if link.kind != "shared":
            continue
        assert any(link.label and link.label.lower() == value for _, value in shared_keys), link.label
    print("self-check ok")
    print(f"  briefs={len(report.briefs)} captured={report.captured}")
    print(f"  mind nodes={len(report.mind.nodes)} bridges={report.mind.bridges}")
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
