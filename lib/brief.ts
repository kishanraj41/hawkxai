import { topPosts } from "./ui-helpers";
import type {
  AgeLens,
  AgeTranslation,
  BoosterTopicBrief,
  QueryInsight,
  Topic,
} from "./types";

export interface KeepBriefInput {
  topic: Topic;
  brief: BoosterTopicBrief;
  query?: QueryInsight | null;
  lens?: AgeLens | "all";
  since?: string[];
}

export function takeawayFor(
  brief: BoosterTopicBrief,
  lens: AgeLens | "all",
): AgeTranslation | undefined {
  if (lens === "all") return undefined;
  return brief.audiences.find((a) => a.lens === lens) ?? brief.audiences[0];
}

export function lensCaption(
  brief: BoosterTopicBrief | undefined,
  lens: AgeLens | "all",
): string | undefined {
  if (!brief) return undefined;
  if (lens === "all") return brief.campaign.hook;
  return takeawayFor(brief, lens)?.takeaway;
}

export function briefFilename(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `hawkai-brief-${slug || "topic"}.md`;
}

/** One-page brief from live receipts only. Never invents a WHY. */
export function formatKeepBrief(input: KeepBriefInput): string {
  const { topic, brief, query, lens = "all", since = [] } = input;
  const audience = takeawayFor(brief, lens);
  const receipts = topPosts(topic, 3);
  const mix = brief.sentiment.overall;
  const first = brief.causation.firstAt
    ? `${brief.causation.firstPlatform ?? "tape"} · ${brief.causation.firstAt}`
    : "No dated receipt yet";
  const thin =
    brief.sentiment.thin || brief.causation.thin
      ? "Receipts are thin — do not treat this as a cause."
      : null;

  const lines = [
    `# HawkAI brief · ${topic.label}`,
    "",
    query?.floor ?? brief.whyTrending,
    "",
  ];

  if (query) {
    lines.push(`Kind: ${query.kind} · ${query.category} · ${query.match} · ${query.hitCount} hits`);
    lines.push("");
  }

  if (since.length) {
    lines.push("## Since last look");
    lines.push("");
    for (const line of since) lines.push(`- ${line}`);
    lines.push("");
  }

  lines.push("## Why (from receipts)");
  lines.push("");
  lines.push(brief.whyTrending);
  lines.push("");
  lines.push(`Evidence ${Math.round(brief.confidence * 100)}% · ${brief.category}`);
  lines.push("");

  lines.push("## Play");
  lines.push("");
  lines.push(brief.campaign.hook);
  lines.push("");
  lines.push(brief.campaign.forCompetitors);
  lines.push("");
  lines.push(
    `Risk: ${brief.campaign.risk} · ${brief.campaign.angle} · timing ${brief.campaign.timing}`,
  );
  lines.push("");

  if (audience) {
    lines.push(`## Audience · ${audience.label}`);
    lines.push("");
    lines.push(audience.takeaway);
    lines.push("");
  } else {
    lines.push("## Audiences");
    lines.push("");
    for (const a of brief.audiences) {
      lines.push(`- **${a.label}:** ${a.takeaway}`);
    }
    lines.push("");
  }

  lines.push("## Title sentiment");
  lines.push("");
  lines.push(
    brief.sentiment.thin
      ? "Thin — not enough titled receipts to lean."
      : `Lean ${brief.sentiment.lean} · ${mix.pos} pos / ${mix.neg} neg / ${mix.risk} risk · n=${mix.n}`,
  );
  for (const q of brief.sentiment.quotes.slice(0, 3)) {
    lines.push(`- “${q}”`);
  }
  lines.push("");

  lines.push("## First print");
  lines.push("");
  lines.push(first);
  lines.push("");

  if (brief.artifacts.length) {
    lines.push("## Artifacts");
    lines.push("");
    lines.push(
      brief.artifacts
        .slice(0, 8)
        .map((a) => (a.kind === "hashtag" || a.kind === "ticker" ? a.value : `${a.kind}: ${a.value}`))
        .join(", "),
    );
    lines.push("");
  }

  lines.push("## Receipts");
  lines.push("");
  if (!receipts.length) {
    lines.push("No posts attached.");
  } else {
    receipts.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.title}`);
      lines.push(`   ${p.url}`);
    });
  }
  lines.push("");
  if (thin) {
    lines.push(thin);
    lines.push("");
  }
  lines.push("_Evidence only. Nothing here is an invented cause._");
  lines.push("");
  return lines.join("\n");
}
