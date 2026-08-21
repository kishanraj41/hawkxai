"""Persist ingest snapshots to GCS (or local disk if GCS_BUCKET is unset)."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
LOCAL_DIR = ROOT / "snapshots"


def _slug(phrase: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (phrase or "").lower()).strip("-")
    return (s[:80] or "phrase")


def _object_name(phrase: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"ingest/{_slug(phrase)}/{ts}.json"


def write_snapshot(snapshot: dict[str, Any]) -> str:
    """Write snapshot JSON. Returns gs:// URI or file:// URI. Never invents receipts."""
    name = _object_name(str(snapshot.get("phrase") or "phrase"))
    bucket = (os.getenv("GCS_BUCKET") or "").strip()
    if bucket:
        uri = f"gs://{bucket}/{name}"
        snapshot["uri"] = uri
        from google.cloud import storage

        client = storage.Client()
        client.bucket(bucket).blob(name).upload_from_string(
            json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8"),
            content_type="application/json",
        )
        return uri
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    path = LOCAL_DIR / name.replace("/", "__")
    snapshot["uri"] = path.resolve().as_uri()
    path.write_bytes(json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8"))
    return str(snapshot["uri"])
