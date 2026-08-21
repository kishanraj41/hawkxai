"""Load fleet tool permissions from repo config. Facts only."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "permissions.json"


def load_permissions() -> dict[str, Any]:
    if not PATH.exists():
        return {"tools": {}}
    return json.loads(PATH.read_text(encoding="utf-8"))


def enabled_tools() -> dict[str, bool]:
    tools = load_permissions().get("tools") or {}
    return {name: bool((cfg or {}).get("enabled")) for name, cfg in tools.items()}


def is_enabled(name: str) -> bool:
    return enabled_tools().get(name, False)
