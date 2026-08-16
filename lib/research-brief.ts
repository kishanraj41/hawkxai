import type { ResearchPayload, ResearchSource } from "./types";

export function researchBriefFilename(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `hawkai-research-${slug || "topic"}.md`;
}

/** Markdown pack of findings + URLs. Evidence only — never invents. */
export function formatResearchBrief(payload: ResearchPayload): string {
  const byId = new Map(payload.sources.map((s) => [s.id, s]));
  const lines = [
    `# HawkAI research · ${payload.query}`,
    "",
    payload.summary,
    "",
    `Updated: ${payload.updatedAt}${payload.thin ? " · thin evidence" : ""}`,
    "",
  ];

  if (payload.degraded.length) {
    lines.push(`Degraded: ${payload.degraded.join(", ")}`);
    lines.push("");
  }

  lines.push("## Findings");
  lines.push("");
  if (!payload.findings.length) {
    lines.push("No grounded findings yet.");
    lines.push("");
  } else {
    for (const f of payload.findings) {
      lines.push(`- **[${f.confidence}]** ${f.claim}`);
      const cites = f.evidenceIds
        .map((id) => byId.get(id))
        .filter((s): s is ResearchSource => Boolean(s));
      for (const s of cites) {
        lines.push(`  - ${s.kind}: ${s.title} — ${s.url}`);
      }
    }
    lines.push("");
  }

  if (payload.angles.length) {
    lines.push("## Angles");
    lines.push("");
    for (const a of payload.angles) lines.push(`- ${a}`);
    lines.push("");
  }

  if (payload.openQuestions.length) {
    lines.push("## Open questions");
    lines.push("");
    for (const q of payload.openQuestions) lines.push(`- ${q}`);
    lines.push("");
  }

  lines.push("## Sources");
  lines.push("");
  if (!payload.sources.length) {
    lines.push("No sources attached.");
  } else {
    payload.sources.forEach((s, i) => {
      lines.push(`${i + 1}. [${s.kind}] ${s.title}`);
      lines.push(`   ${s.url}`);
      if (s.snippet) lines.push(`   ${s.snippet.slice(0, 240)}`);
    });
  }
  lines.push("");
  lines.push("_Evidence only. Nothing here is an invented citation._");
  lines.push("");
  return lines.join("\n");
}
