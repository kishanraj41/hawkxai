import type { Post, ResearchSource } from "./types";

export interface LineageRow {
  title: string;
  url: string;
  tool?: string;
  collectedAt?: string;
  channel?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function stampPost(post: Post, tool: string): Post {
  return {
    ...post,
    tool: post.tool ?? tool,
    collectedAt: post.collectedAt ?? nowIso(),
  };
}

export function stampPosts(posts: Post[], tool: string): Post[] {
  return posts.map((p) => stampPost(p, tool));
}

export function stampSource(source: ResearchSource, tool?: string): ResearchSource {
  return {
    ...source,
    tool: source.tool ?? tool ?? `research_${source.kind}`,
    collectedAt: source.collectedAt ?? nowIso(),
  };
}

export function stampSources(sources: ResearchSource[]): ResearchSource[] {
  return sources.map((s) => stampSource(s));
}

export function formatCollectedAt(iso?: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return `${new Date(ms).toISOString().replace("T", " ").slice(0, 16)}Z`;
}

/** One-line AutoLineage credit for a receipt. Empty if nothing was stamped. */
export function lineageLine(item: {
  tool?: string;
  collectedAt?: string;
  sourceApi?: string;
}): string {
  const parts = [item.tool, item.sourceApi, formatCollectedAt(item.collectedAt)].filter(Boolean);
  return parts.join(" · ");
}

export function formatLineageSection(rows: LineageRow[]): string[] {
  const lines = [
    "## Lineage",
    "",
    "RudriQ extracted these receipts. AutoLineage recorded which collect step produced each one.",
    "",
  ];
  if (!rows.length) {
    lines.push("No receipts to lineage.");
    lines.push("");
    return lines;
  }
  rows.forEach((row, i) => {
    const who = [row.tool, row.channel, formatCollectedAt(row.collectedAt)].filter(Boolean).join(" · ");
    lines.push(`${i + 1}. ${row.title}`);
    if (who) lines.push(`   ${who}`);
    lines.push(`   ${row.url}`);
  });
  lines.push("");
  return lines;
}

export function buildDataLineage(params: {
  publicSources: any[];
  poiData: any;
  analysisResults: any;
}): any {
  const { publicSources, poiData, analysisResults } = params;
  
  const steps = publicSources.map((source, index) => ({
    id: `step-${index}`,
    source: source.name,
    platform: source.platform,
    collectedAt: source.lastUpdated,
    tool: `collect_${source.platform}`,
    method: "api" as const,
    confidence: source.reliability,
    verified: source.reliability > 0.8,
  }));
  
  const organicSteps = steps.filter(s => s.verified);
  const organicScore = organicSteps.length / Math.max(1, steps.length);
  
  return {
    originId: `origin-${poiData.id}`,
    steps,
    isOrganic: organicScore > 0.6,
    organicScore,
    traceDepth: steps.length,
  };
}
