"""Per-request receipt buffer so ADK tools share posts without inventing any."""

from __future__ import annotations

from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any

_posts: ContextVar[list[dict[str, Any]] | None] = ContextVar("ingest_posts", default=None)
_tools: ContextVar[list[str] | None] = ContextVar("ingest_tools", default=None)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def reset() -> None:
    _posts.set([])
    _tools.set([])


def add_posts(posts: list[dict[str, Any]], tool: str) -> None:
    if posts:
        cur = list(_posts.get() or [])
        cur.extend(posts)
        _posts.set(cur)
    used = list(_tools.get() or [])
    if tool not in used:
        used.append(tool)
        _tools.set(used)


def get_posts() -> list[dict[str, Any]]:
    return list(_posts.get() or [])


def set_posts(posts: list[dict[str, Any]]) -> None:
    _posts.set(list(posts))


def get_tools() -> list[str]:
    return list(_tools.get() or [])


def stamp(post: dict[str, Any], tool: str) -> dict[str, Any]:
    out = dict(post)
    out.setdefault("tool", tool)
    out.setdefault("collectedAt", now_iso())
    return out
