"""Render fleet handbook + architecture diagram from repo files. Facts only."""

from __future__ import annotations

import json
from pathlib import Path

from tools.permissions import PATH as PERMS_PATH, load_permissions

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "handbook" / "out"
REPO = ROOT.parent
DIAGRAM_REPO = REPO / "docs" / "hackathon" / "ARCHITECTURE.md"
PREV = OUT / "permissions.prev.json"


def _read(rel: str, limit: int = 4000) -> str:
    p = REPO / rel
    if not p.exists():
        return f"(missing: {rel})"
    return p.read_text(encoding="utf-8")[:limit]


def _permissions_md() -> list[str]:
    perms = load_permissions()
    tools = perms.get("tools") or {}
    lines = [
        "## Tool permissions",
        "",
        "Source: `fleet/permissions.json`. Flip `enabled` and re-render to diff.",
        "",
        "| Tool | Enabled | Channel | Note |",
        "|---|---|---|---|",
    ]
    for name, cfg in tools.items():
        row = cfg or {}
        lines.append(
            f"| `{name}` | {bool(row.get('enabled'))} | {row.get('channel', '')} | {row.get('note', '')} |"
        )
    prev = {}
    if PREV.exists():
        try:
            prev = json.loads(PREV.read_text(encoding="utf-8"))
        except Exception:
            prev = {}
    current = json.dumps(perms, indent=2, sort_keys=True)
    old = json.dumps(prev, indent=2, sort_keys=True) if prev else ""
    lines += ["", "## Permission diff", ""]
    if not prev:
        lines.append("No previous render. This pass is the baseline.")
    elif old == current:
        lines.append("No change since last handbook render.")
    else:
        lines.append("```diff")
        lines.append("--- previous")
        lines.append("+++ current")
        for left, right in zip(old.splitlines(), current.splitlines()):
            if left != right:
                lines.append(f"- {left}")
                lines.append(f"+ {right}")
        if len(old.splitlines()) != len(current.splitlines()):
            lines.append("(length changed — see permissions.json)")
        lines.append("```")
    OUT.mkdir(parents=True, exist_ok=True)
    PREV.write_text(current, encoding="utf-8")
    return lines


def _architecture_md() -> str:
    perms = load_permissions().get("tools") or {}
    hn = "on" if (perms.get("collect_hn") or {}).get("enabled") else "off"
    pub = "on" if (perms.get("collect_public_apis") or {}).get("enabled") else "off"
    score = "on" if (perms.get("score_and_dedup") or {}).get("enabled") else "off"
    return "\n".join(
        [
            "# HawkxAI ingest fleet — architecture",
            "",
            "Generated from `fleet/` files and `fleet/permissions.json`. Not an invented diagram.",
            "",
            "```mermaid",
            "flowchart LR",
            '  marketer[Marketer] --> footprint["Vercel Footprint /footprint"]',
            '  footprint -->|"POST /api/fleet"| vercelApi["Next.js POST /api/fleet"]',
            '  trendsTab["Trends GET /api/trends"] --> deskCollectors["Vercel collectors"]',
            '  vercelApi --> cloudRun["Cloud Run hawkxai-fleet"]',
            '  cloudRun --> adk["ADK ingest_agent Gemini 3.5"]',
            f'  adk --> hnTool["collect_hn {hn}"]',
            f'  adk --> apiTool["collect_public_apis {pub}"]',
            f'  adk --> scoreTool["score_and_dedup {score}"]',
            '  hnTool --> gcs["GCS snapshot JSON"]',
            "  apiTool --> gcs",
            "  scoreTool --> gcs",
            "  gcs --> vercelApi",
            "  vercelApi --> footprint",
            "```",
            "",
            "Lineage (AutoLineage, credited only): each receipt keeps `tool` + `collectedAt` from the collect step that produced it.",
            "",
            "## Files",
            "",
            "- `fleet/ingest_agent/agent.py` — ADK root_agent",
            "- `fleet/ingest_agent/runner.py` — Runner.run_async then persist",
            "- `fleet/tools/hn_channel.py` — HN Algolia",
            "- `fleet/tools/public_apis.py` — Wikipedia, Google News RSS, NHTSA",
            "- `fleet/tools/score.py` — dedup + Gemini rank of existing titles",
            "- `fleet/tools/snapshot.py` — GCS or local JSON",
            "- `app/api/fleet/route.ts` — desk merge (does not touch GET /api/trends)",
            "",
        ]
    )


def render() -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    diagram = _architecture_md()
    dest = OUT / "HANDBOOK.md"
    dest.write_text(
        "\n".join(
            [
                "# HawkxAI ingest fleet — handbook",
                "",
                "Generated from repo files. Not a slide. Not an invented WHY.",
                "",
                "## Product",
                "HawkxAI live desk (pre-existing): Trends / Footprint / Research on Vercel.",
                "New contest work: this Cloud Run fleet (ADK + Gemini 3.5 + HN + public APIs + GCS snapshots).",
                "",
                * _permissions_md(),
                "",
                diagram,
                "",
                "## Cloud Run",
                "```",
                _read("fleet/Dockerfile"),
                "```",
                "",
                "## Desk merge (new, additive)",
                "```",
                _read("app/api/fleet/route.ts")[:2000],
                "```",
                "",
                "## Desk API (pre-existing, do not break)",
                "```",
                _read("app/api/trends/route.ts")[:1200],
                "```",
                "",
                "## ADK agent",
                "```",
                _read("fleet/ingest_agent/agent.py"),
                "```",
                "",
                "## Lineage",
                "Each post may include `tool` and `collectedAt`. Credit AutoLineage as the extraction-and-facts layer inside this handbook. Do not demo it as a second product.",
                "",
            ]
        ),
        encoding="utf-8",
    )
    (OUT / "ARCHITECTURE.md").write_text(diagram, encoding="utf-8")
    DIAGRAM_REPO.parent.mkdir(parents=True, exist_ok=True)
    DIAGRAM_REPO.write_text(diagram, encoding="utf-8")
    return dest


if __name__ == "__main__":
    path = render()
    print(path)
    print(DIAGRAM_REPO)
