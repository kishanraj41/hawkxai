"""Small public-API channel. Wikipedia, Google News RSS, NHTSA. Never invent titles."""

from __future__ import annotations

import email.utils
import re
import xml.etree.ElementTree as ET
from typing import Any
from urllib.parse import quote

import httpx

from tools.buffer import add_posts, now_iso, stamp
from tools.permissions import is_enabled

UA = "HawkxAI-fleet/1.0 (+https://github.com/kishanraj41/hawkxai)"
MODEL_MAKE = {
    "camry": ("toyota", "camry"),
    "corolla": ("toyota", "corolla"),
    "civic": ("honda", "civic"),
    "accord": ("honda", "accord"),
    "mustang": ("ford", "mustang"),
    "f-150": ("ford", "f-150"),
    "f150": ("ford", "f-150"),
    "tesla": ("tesla", "model 3"),
}


def _vehicle(phrase: str) -> tuple[str, str, str] | None:
    raw = re.sub(r"[^a-z0-9 -]", " ", (phrase or "").lower())
    found = re.search(r"\b(20\d{2})\b", raw)
    year = found.group(1) if found else "2024"
    for alias, (make, model) in MODEL_MAKE.items():
        if alias in raw:
            return make, model, year
    return None


def _get(client: httpx.Client, url: str, **kwargs: Any) -> httpx.Response:
    return client.get(url, headers={"User-Agent": UA}, timeout=18.0, **kwargs)


def _wikipedia(client: httpx.Client, phrase: str) -> list[dict[str, Any]]:
    r = _get(
        client,
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "opensearch",
            "search": phrase,
            "limit": 8,
            "namespace": 0,
            "format": "json",
        },
    )
    r.raise_for_status()
    data = r.json()
    titles = data[1] if isinstance(data, list) and len(data) > 1 else []
    urls = data[3] if isinstance(data, list) and len(data) > 3 else []
    posts: list[dict[str, Any]] = []
    for title, url in zip(titles, urls):
        t = str(title or "").strip()
        u = str(url or "").strip()
        if not t or not u:
            continue
        posts.append(
            stamp(
                {
                    "platform": "public",
                    "title": t,
                    "url": u,
                    "score": 55,
                    "createdAt": now_iso(),
                    "sourceApi": "Wikipedia",
                },
                "collect_public_apis",
            )
        )
    return posts


def _news_rss(client: httpx.Client, phrase: str) -> list[dict[str, Any]]:
    url = (
        "https://news.google.com/rss/search?q="
        + quote(phrase)
        + "&hl=en&gl=US&ceid=US:en"
    )
    r = _get(client, url)
    r.raise_for_status()
    root = ET.fromstring(r.text)
    posts: list[dict[str, Any]] = []
    for item in root.findall(".//item")[:8]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        created = ""
        if pub:
            try:
                created = email.utils.parsedate_to_datetime(pub).isoformat()
            except Exception:
                created = pub
        if not title or not link:
            continue
        posts.append(
            stamp(
                {
                    "platform": "public",
                    "title": title,
                    "url": link,
                    "score": 60,
                    "createdAt": created,
                    "sourceApi": "Google News",
                },
                "collect_public_apis",
            )
        )
    return posts


def _nhtsa(client: httpx.Client, phrase: str) -> list[dict[str, Any]]:
    v = _vehicle(phrase)
    if not v:
        return []
    make, model, year = v
    r = _get(
        client,
        "https://api.nhtsa.gov/recalls/recallsByVehicle",
        params={"make": make, "model": model, "modelYear": year},
    )
    r.raise_for_status()
    data = r.json() if r.content else {}
    posts: list[dict[str, Any]] = []
    for row in (data.get("results") or [])[:8]:
        cid = str(row.get("NHTSACampaignNumber") or "").strip()
        component = str(row.get("Component") or "").strip()
        mfr = str(row.get("Manufacturer") or "").strip()
        title = " · ".join(p for p in ([f"Recall {cid}" if cid else "", component, mfr]) if p)
        if not title:
            continue
        url = (
            f"https://www.nhtsa.gov/recalls?nhtsaId={quote(cid)}"
            if cid
            else "https://www.nhtsa.gov/recalls"
        )
        posts.append(
            stamp(
                {
                    "platform": "public",
                    "title": title,
                    "url": url,
                    "score": 70,
                    "createdAt": str(row.get("ReportReceivedDate") or ""),
                    "sourceApi": "NHTSA",
                },
                "collect_public_apis",
            )
        )
    return posts


def collect_public_apis(phrase: str) -> dict[str, Any]:
    """Fetch existing Wikipedia, Google News, and NHTSA receipts. Never invent titles or URLs."""
    q = (phrase or "").strip()
    if not is_enabled("collect_public_apis"):
        return {"status": "disabled", "phrase": q, "channel": "public", "count": 0, "posts": []}
    if len(q) < 2:
        return {"status": "error", "phrase": q, "posts": [], "error": "phrase too short"}
    posts: list[dict[str, Any]] = []
    errors: list[str] = []
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        for name, fn in (("wikipedia", _wikipedia), ("news", _news_rss), ("nhtsa", _nhtsa)):
            try:
                posts.extend(fn(client, q))
            except Exception as exc:
                errors.append(f"{name}: {exc}")
    add_posts(posts, "collect_public_apis")
    return {
        "status": "success" if posts or not errors else "error",
        "phrase": q,
        "channel": "public",
        "count": len(posts),
        "posts": posts,
        "errors": errors,
    }
