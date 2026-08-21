"""Cloud Run + ADK entry. Phrase in → agent tools → snapshot out. Never invent posts."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from google.adk.cli.fast_api import get_fast_api_app
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv

    _here = Path(__file__).resolve().parent
    load_dotenv(_here / ".env")
    load_dotenv(_here.parent / ".env.local")
except Exception:
    pass

from ingest_agent.runner import run_ingest

AGENT_DIR = str(Path(__file__).parent.resolve())

app = get_fast_api_app(
    agents_dir=AGENT_DIR,
    session_service_uri=None,
    allow_origins=["*"],
    web=True,
)


class IngestIn(BaseModel):
    phrase: str = Field(min_length=2)


class IngestOut(BaseModel):
    phrase: str
    channels: list[str]
    tools: list[str]
    count: int
    model: str
    agent: str
    posts: list[dict[str, Any]]
    uri: str = ""
    note: str = ""
    agentText: str = ""


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "ok": "true",
        "service": "hawkxai-fleet",
        "agent": "ingest_agent",
        "gcs": os.getenv("GCS_BUCKET") or "",
    }


async def _ingest(phrase: str) -> IngestOut:
    q = phrase.strip()
    if len(q) < 2:
        raise HTTPException(400, "phrase too short")
    try:
        snap = await run_ingest(q)
    except Exception as exc:
        raise HTTPException(502, f"adk ingest failed: {exc}") from exc
    return IngestOut(
        phrase=str(snap.get("phrase") or q),
        channels=list(snap.get("channels") or []),
        tools=list(snap.get("tools") or []),
        count=int(snap.get("count") or 0),
        model=str(snap.get("model") or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")),
        agent=str(snap.get("agent") or "hawkxai_ingest"),
        posts=list(snap.get("posts") or []),
        uri=str(snap.get("uri") or ""),
        note=str(snap.get("note") or ""),
        agentText=str(snap.get("agentText") or ""),
    )


@app.get("/v1/ingest", response_model=IngestOut)
async def ingest_get(phrase: str) -> IngestOut:
    return await _ingest(phrase)


@app.post("/v1/ingest", response_model=IngestOut)
async def ingest_post(body: IngestIn) -> IngestOut:
    return await _ingest(body.phrase)
