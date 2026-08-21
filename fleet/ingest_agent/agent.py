"""ADK root agent for HawkxAI ingest. Contest-window work. Never invents receipts."""

from __future__ import annotations

import os

from google.adk.agents.llm_agent import Agent

from tools.hn_channel import collect_hn
from tools.permissions import is_enabled
from tools.public_apis import collect_public_apis
from tools.score import score_and_dedup

TOOLS = []
if is_enabled("collect_hn"):
    TOOLS.append(collect_hn)
if is_enabled("collect_public_apis"):
    TOOLS.append(collect_public_apis)
if is_enabled("score_and_dedup"):
    TOOLS.append(score_and_dedup)

root_agent = Agent(
    model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
    name="hawkxai_ingest",
    description=(
        "Collects real public receipts for a plugged campaign phrase. "
        "Uses Hacker News and a small public-API set. Never invents posts or a WHY."
    ),
    instruction=(
        "You are the HawkxAI ingest agent. A marketer plugs a campaign phrase. "
        "Call collect_hn with that exact phrase. "
        "Call collect_public_apis with that exact phrase. "
        "Then call score_and_dedup with the phrase. You may pass posts_json as the "
        "JSON array of posts the earlier tools returned, or omit it so the buffer is used. "
        "Reply with only the titles and URLs the tools returned, plus counts. "
        "Never invent a post, URL, hashtag, or WHY. "
        "If the tools return nothing, say evidence is thin and lower confidence. "
        "X is not in your toolset — do not claim X receipts."
    ),
    tools=TOOLS,
)
