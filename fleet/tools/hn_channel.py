"""HN Algolia — first reliable channel. X is never the demo centerpiece."""

from __future__ import annotations

from typing import Any

import httpx

from tools.buffer import add_posts, stamp
from tools.permissions import is_enabled

HN = "https://hn.algolia.com/api/v1/search"


def collect_hn(phrase: str, hits: int = 12) -> dict[str, Any]:
    """Fetch existing Hacker News stories for a phrase. Never invent titles or URLs."""
    q = (phrase or "").strip()
    if not is_enabled("collect_hn"):
        return {"status": "disabled", "phrase": q, "channel": "hn", "count": 0, "posts": []}
    if len(q) < 2:
        return {"status": "error", "phrase": q, "posts": [], "error": "phrase too short"}
    try:
        with httpx.Client(timeout=20.0) as client:
            r = client.get(HN, params={"query": q, "tags": "story", "hitsPerPage": hits})
            r.raise_for_status()
            data = r.json()
    except Exception as exc:
        return {"status": "error", "phrase": q, "channel": "hn", "count": 0, "posts": [], "error": str(exc)}
    posts: list[dict[str, Any]] = []
    for h in data.get("hits") or []:
        title = (h.get("title") or "").strip()
        object_id = h.get("objectID")
        url = (h.get("url") or f"https://news.ycombinator.com/item?id={object_id}").strip()
        if not title:
            continue
        posts.append(
            stamp(
                {
                    "platform": "hn",
                    "title": title,
                    "url": url,
                    "score": int(h.get("points") or 0),
                    "createdAt": h.get("created_at") or "",
                },
                "collect_hn",
            )
        )
    add_posts(posts, "collect_hn")
    return {"status": "success", "phrase": q, "channel": "hn", "count": len(posts), "posts": posts}
