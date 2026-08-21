"""Run the ADK ingest agent, then persist the tool receipts. Not a FastAPI shortcut."""

from __future__ import annotations

import json
import os
import uuid
from typing import Any

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from ingest_agent.agent import root_agent
from tools.buffer import get_posts, get_tools, reset
from tools.score import score_snapshot
from tools.snapshot import write_snapshot

APP_NAME = "hawkxai_ingest"


def _fn_responses(event: Any) -> list[tuple[str, Any]]:
    out: list[tuple[str, Any]] = []
    getter = getattr(event, "get_function_responses", None)
    if callable(getter):
        for fr in getter() or []:
            out.append((str(getattr(fr, "name", "") or ""), getattr(fr, "response", None)))
    content = getattr(event, "content", None)
    for part in getattr(content, "parts", None) or []:
        fr = getattr(part, "function_response", None)
        if fr is None:
            continue
        out.append((str(getattr(fr, "name", "") or ""), getattr(fr, "response", None)))
    return out


def _unwrap(response: Any) -> Any:
    if isinstance(response, dict) and "result" in response and len(response) <= 2:
        return response.get("result")
    return response


def _posts_from_response(response: Any) -> list[dict[str, Any]]:
    data = _unwrap(response)
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            return []
    if isinstance(data, dict):
        rows = data.get("posts")
        if isinstance(rows, list):
            return [p for p in rows if isinstance(p, dict)]
    if isinstance(data, list):
        return [p for p in data if isinstance(p, dict)]
    return []


async def run_ingest(phrase: str) -> dict[str, Any]:
    q = phrase.strip()
    reset()
    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name=APP_NAME,
        user_id="fleet",
        session_id=str(uuid.uuid4()),
    )
    runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)
    prompt = (
        f"Ingest real public receipts for this campaign phrase: {q}. "
        "Call collect_hn, then collect_public_apis, then score_and_dedup. "
        "Never invent titles, URLs, or a WHY. X is not available."
    )
    try:
        part = types.Part.from_text(text=prompt)
    except Exception:
        part = types.Part(text=prompt)
    content = types.Content(role="user", parts=[part])
    tools_called: list[str] = []
    collected: list[dict[str, Any]] = []
    scored: list[dict[str, Any]] | None = None
    agent_text = ""
    async for event in runner.run_async(
        user_id="fleet",
        session_id=session.id,
        new_message=content,
    ):
        for name, response in _fn_responses(event):
            if name and name not in tools_called:
                tools_called.append(name)
            posts = _posts_from_response(response)
            if name == "score_and_dedup" and posts:
                scored = posts
            elif posts:
                collected.extend(posts)
        final = getattr(event, "is_final_response", None)
        if callable(final) and final():
            parts = getattr(getattr(event, "content", None), "parts", None) or []
            agent_text = " ".join(
                str(getattr(p, "text", "") or "") for p in parts
            ).strip()

    if not tools_called:
        raise RuntimeError(
            "ADK agent returned no tool calls. Ingest refuses to bypass the agent. "
            + (agent_text[:400] or "empty reply")
        )

    posts = scored if scored is not None else score_snapshot(q, collected or get_posts())
    snapshot = {
        "phrase": q,
        "channels": sorted({str(p.get("platform") or "") for p in posts if p.get("platform")}),
        "tools": tools_called or get_tools(),
        "count": len(posts),
        "model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
        "agent": APP_NAME,
        "posts": posts,
        "note": "Receipts from ADK tools only. No invented WHY. X is not in the toolset.",
        "agentText": agent_text[:800],
    }
    snapshot["uri"] = write_snapshot(snapshot)
    return snapshot
