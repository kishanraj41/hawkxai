"""Dedup existing receipts, then Gemini-rank survivors. Never add titles or URLs."""

from __future__ import annotations

import json
import os
import re
from typing import Any
from urllib.parse import urlparse

from tools.buffer import add_posts, get_posts, set_posts
from tools.permissions import is_enabled


def _client():
    vertex = (os.getenv("GOOGLE_GENAI_USE_VERTEXAI") or "").strip().lower() in {"1", "true", "yes"}
    from google import genai

    if vertex:
        return genai.Client(
            vertexai=True,
            project=os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCLOUD_PROJECT"),
            location=os.getenv("GOOGLE_CLOUD_LOCATION") or os.getenv("GOOGLE_CLOUD_REGION") or "us-central1",
        )
    key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    return genai.Client(api_key=key)


def _norm_url(url: str) -> str:
    u = (url or "").strip().lower().rstrip("/")
    try:
        p = urlparse(u)
        return f"{p.netloc}{p.path}"
    except Exception:
        return u


def _norm_title(title: str) -> str:
    return re.sub(r"\s+", " ", (title or "").strip().lower())


def dedup_posts(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen_url: set[str] = set()
    seen_title: set[str] = set()
    out: list[dict[str, Any]] = []
    for p in posts:
        url_key = _norm_url(str(p.get("url") or ""))
        title_key = _norm_title(str(p.get("title") or ""))
        if url_key and url_key in seen_url:
            continue
        if title_key and title_key in seen_title:
            continue
        if url_key:
            seen_url.add(url_key)
        if title_key:
            seen_title.add(title_key)
        out.append(p)
    return out


def rank_posts(phrase: str, posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not posts:
        return []
    client = _client()
    if not client:
        return posts
    payload = json.dumps([{"i": i, "title": p.get("title")} for i, p in enumerate(posts)])
    prompt = (
        f"Phrase: {phrase}\n"
        "Rank these EXISTING titles 0-100 for relevance to the phrase. "
        "Return JSON array [{i, relevance}]. Do not invent titles.\n"
        f"{payload}"
    )
    try:
        res = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
            contents=prompt,
        )
        text = (res.text or "").strip()
        start, end = text.find("["), text.rfind("]")
        rows = json.loads(text[start : end + 1]) if start >= 0 else []
    except Exception:
        return posts
    by_i = {int(r["i"]): int(r.get("relevance") or 0) for r in rows if "i" in r}
    ranked = [{**p, "relevance": by_i.get(i, 0)} for i, p in enumerate(posts)]
    ranked.sort(key=lambda p: p.get("relevance", 0), reverse=True)
    return ranked


def score_snapshot(phrase: str, posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return rank_posts(phrase, dedup_posts(posts))


def score_and_dedup(phrase: str, posts_json: str = "") -> dict[str, Any]:
    """Dedup existing posts by URL/title, then rank survivors 0-100. Do not invent posts."""
    q = (phrase or "").strip()
    if not is_enabled("score_and_dedup"):
        posts = get_posts()
        return {"status": "disabled", "phrase": q, "count": len(posts), "posts": posts}
    raw: list[dict[str, Any]] = []
    if (posts_json or "").strip():
        try:
            parsed = json.loads(posts_json)
            if isinstance(parsed, list):
                raw = [p for p in parsed if isinstance(p, dict)]
        except Exception:
            raw = []
    if not raw:
        raw = get_posts()
    scored = score_snapshot(q, raw)
    add_posts([], "score_and_dedup")
    set_posts(scored)
    return {"status": "success", "phrase": q, "count": len(scored), "posts": scored}
