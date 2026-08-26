import type { ResearchPayload, ResearchSource } from "./types";
import { formatLineageSection } from "./lineage";

export function researchBriefFilename(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `hawkxai-research-${slug || "topic"}.md`;
}

/** Markdown pack of findings + URLs. Evidence only — never invents. */
export function formatResearchBrief(payload: ResearchPayload): string {
  const byId = new Map(payload.sources.map((s) => [s.id, s]));
  const lines = [
    `# HawkxAI research · ${payload.query}`,
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

  const droppedCount = payload.droppedCount ?? 0;
  if (droppedCount) {
    lines.push(`Dropped: ${droppedCount} unrelated (no token hit).`);
    lines.push("");
    for (const d of payload.dropped ?? []) {
      lines.push(`- ${d.title}`);
      lines.push(`  ${d.url}`);
    }
    lines.push("");
  }

  if ((payload.senses?.length ?? 0) > 1) {
    lines.push("## Senses");
    lines.push("");
    for (const s of payload.senses ?? []) {
      const mark = s.id === payload.defaultSenseId ? " · this copy" : "";
      lines.push(`- ${s.label} · ${s.count} receipts${mark}`);
    }
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
  lines.push(
    ...formatLineageSection(
      payload.sources.map((s) => ({
        title: s.title,
        url: s.url,
        tool: s.tool,
        collectedAt: s.collectedAt,
        channel: s.kind,
      })),
    ),
  );
  lines.push("_Evidence only. Nothing here is an invented citation._");
  lines.push("");
  return lines.join("\n");
}
