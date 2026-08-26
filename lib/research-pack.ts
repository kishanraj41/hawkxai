import { tokenHits } from "./phrase-hit";
import type {
  ResearchFinding,
  ResearchPayload,
  ResearchSense,
  ResearchSource,
} from "./types";

const KIND_LABEL: Record<ResearchSource["kind"], string> = {
  wikipedia: "Wikipedia",
  web: "Web",
  hn: "HN",
  reddit: "Reddit",
  x: "X",
  public: "APIs",
  pubmed: "PubMed",
  arxiv: "arXiv",
  uspto: "USPTO",
};

const DATE_RE = /\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/;
const DISPUTE_RE =
  /\b(sues|lawsuit|antitrust|monopoly|accused|complained|backdoor|versus|vs\.?)\b/i;
const COMPANY_RE = /\b(inc|corp|corporation|company|ltd)\.?\b/i;

export function sourceHay(source: ResearchSource): string {
  return `${source.title} ${source.url} ${source.snippet}`;
}

export function sourceHitsQuery(source: ResearchSource, query: string): boolean {
  return tokenHits(sourceHay(source), query);
}

export function splitOnQuery(
  query: string,
  sources: ResearchSource[],
): { kept: ResearchSource[]; dropped: ResearchSource[] } {
  const kept: ResearchSource[] = [];
  const dropped: ResearchSource[] = [];
  for (const s of sources) {
    if (sourceHitsQuery(s, query)) kept.push(s);
    else dropped.push(s);
  }
  return { kept, dropped };
}

export function wikiTitleFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("wikipedia.org")) return null;
    const m = u.pathname.match(/\/wiki\/([^#?]+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]).replace(/_/g, " ");
  } catch {
    return null;
  }
}

function extraTokens(label: string, query: string): string[] {
  const q = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 1),
  );
  return label
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1 && !q.has(t));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isFirstPartyHost(url: string, query: string): boolean {
  const host = hostOf(url).replace(/\./g, " ");
  return Boolean(host) && tokenHits(host, query);
}

function dateOf(source: ResearchSource): string | null {
  if (source.createdAt && /^\d{4}-\d{2}-\d{2}/.test(source.createdAt)) {
    return source.createdAt.slice(0, 10);
  }
  const m = sourceHay(source).match(DATE_RE);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function clusterSenses(query: string, sources: ResearchSource[]): ResearchSense[] {
  const wikiPages = new Map<string, string[]>();
  const rest: ResearchSource[] = [];
  for (const s of sources) {
    const title =
      s.kind === "wikipedia" ? wikiTitleFromUrl(s.url) || s.title : null;
    if (s.kind === "wikipedia" && title) {
      const ids = wikiPages.get(title) ?? [];
      ids.push(s.id);
      wikiPages.set(title, ids);
    } else {
      rest.push(s);
    }
  }

  const buckets = new Map<string, { label: string; ids: string[] }>();
  for (const [title, ids] of wikiPages) {
    buckets.set(`wiki:${title}`, { label: title, ids: [...ids] });
  }

  const wikiSenses = [...wikiPages.keys()].map((title) => ({
    title,
    extra: extraTokens(title, query),
  }));
  const generic = wikiSenses.toSorted((a, b) => a.extra.length - b.extra.length)[0];
  const company = wikiSenses.find((w) => COMPANY_RE.test(w.title));

  for (const s of rest) {
    const text = sourceHay(s);
    let best: { key: string; score: number; extra: number } | null = null;
    for (const w of wikiSenses) {
      let score = 0;
      for (const t of w.extra) {
        if (tokenHits(text, t)) score += 1;
      }
      if (score > 0 && (!best || score > best.score || (score === best.score && w.extra.length > best.extra))) {
        best = { key: `wiki:${w.title}`, score, extra: w.extra.length };
      }
    }
    let key: string;
    let label: string;
    if (best) {
      key = best.key;
      label = key.slice(5);
    } else if ((s.kind === "pubmed" || s.kind === "arxiv") && generic) {
      key = `wiki:${generic.title}`;
      label = generic.title;
    } else if (
      company &&
      (s.kind === "hn" || s.kind === "x" || s.kind === "web" || isFirstPartyHost(s.url, query))
    ) {
      key = `wiki:${company.title}`;
      label = company.title;
    } else if (generic) {
      key = `wiki:${generic.title}`;
      label = generic.title;
    } else {
      key = `kind:${s.kind}`;
      label = KIND_LABEL[s.kind];
    }
    const b = buckets.get(key) ?? { label, ids: [] };
    b.ids.push(s.id);
    buckets.set(key, b);
  }

  return [...buckets.entries()]
    .map(([id, b]) => ({
      id,
      label: b.label,
      count: b.ids.length,
      sourceIds: b.ids,
    }))
    .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function densestSense(senses: ResearchSense[]): ResearchSense | null {
  return senses[0] ?? null;
}

function snippetFindings(sources: ResearchSource[]): ResearchFinding[] {
  return sources.slice(0, 5).map((s) => ({
    claim: (s.snippet.slice(0, 280) || s.title).trim(),
    evidenceIds: [s.id],
    confidence: sources.length >= 6 ? ("medium" as const) : ("thin" as const),
  }));
}

export function anglesFromSources(
  query: string,
  sources: ResearchSource[],
): { angles: string[]; openQuestions: string[] } {
  const dated = sources
    .map((s) => ({ s, day: dateOf(s) }))
    .filter((row): row is { s: ResearchSource; day: string } => Boolean(row.day))
    .toSorted((a, b) => a.day.localeCompare(b.day) || a.s.title.localeCompare(b.s.title));

  const angles: string[] = [];
  if (dated.length >= 2) {
    const uniq: { day: string; title: string }[] = [];
    const seen = new Set<string>();
    for (const row of dated) {
      const key = `${row.day}:${row.s.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push({ day: row.day, title: row.s.title });
    }
    const pick = uniq.length <= 4 ? uniq : [uniq[0], ...uniq.slice(-3)];
    angles.push(
      `Timeline: ${pick.map((p) => `${p.day} ${p.title.slice(0, 42)}`).join(" · ")}`.slice(0, 240),
    );
  }

  const primaryHosts = [
    ...new Set(
      sources
        .filter(
          (s) =>
            s.kind === "wikipedia" ||
            s.kind === "pubmed" ||
            s.kind === "arxiv" ||
            s.kind === "uspto" ||
            isFirstPartyHost(s.url, query),
        )
        .map((s) => hostOf(s.url))
        .filter(Boolean),
    ),
  ].slice(0, 6);
  if (primaryHosts.length) {
    angles.push(`Primary sources: ${primaryHosts.join(", ")}`.slice(0, 240));
  }

  const dispute = sources.filter((s) => DISPUTE_RE.test(s.title));
  const official = sources.filter(
    (s) =>
      s.kind === "wikipedia" ||
      s.kind === "pubmed" ||
      isFirstPartyHost(s.url, query),
  );
  const openQuestions: string[] = [];
  if (dispute.length && official.length) {
    const a = official[0];
    const b = dispute.find((s) => hostOf(s.url) !== hostOf(a.url)) ?? dispute[0];
    if (hostOf(a.url) !== hostOf(b.url)) {
      angles.push(
        `Open disputes: ${hostOf(a.url)} (${a.title.slice(0, 40)}) vs ${hostOf(b.url)} (${b.title.slice(0, 40)})`.slice(
          0,
          240,
        ),
      );
      openQuestions.push(
        `${a.title.slice(0, 80)} vs ${b.title.slice(0, 80)} — both printed; which is primary?`.slice(
          0,
          240,
        ),
      );
    }
  }

  return { angles, openQuestions };
}

export function packSummary(
  query: string,
  keptCount: number,
  droppedCount: number,
  sense: ResearchSense | null,
): string {
  if (keptCount === 0) {
    return `No on-query receipts for “${query}”.${droppedCount ? ` Dropped ${droppedCount} unrelated (no token hit).` : ""} Sources were thin or offline — nothing invented.`;
  }
  const drop = droppedCount ? ` Dropped ${droppedCount} unrelated (no token hit).` : "";
  const also = sense ? ` Copy defaults to “${sense.label}” (${sense.count}).` : "";
  return `Collected ${keptCount} live receipts for “${query}”.${drop}${also} Summary is evidence-only; thin corners stay marked thin.`;
}

export function packResearch(
  query: string,
  sources: ResearchSource[],
): {
  kept: ResearchSource[];
  dropped: { title: string; url: string }[];
  droppedCount: number;
  senses: ResearchSense[];
  defaultSense: ResearchSense | null;
  defaultSources: ResearchSource[];
  angles: string[];
  openQuestions: string[];
  summary: string;
} {
  const { kept, dropped } = splitOnQuery(query, sources);
  const senses = clusterSenses(query, kept);
  const defaultSense = densestSense(senses);
  const focusIds = new Set(defaultSense?.sourceIds ?? kept.map((s) => s.id));
  const defaultSources = kept.filter((s) => focusIds.has(s.id));
  const filled = anglesFromSources(query, defaultSources);
  return {
    kept,
    dropped: dropped.slice(0, 12).map((s) => ({ title: s.title, url: s.url })),
    droppedCount: dropped.length,
    senses,
    defaultSense,
    defaultSources,
    angles: filled.angles,
    openQuestions: filled.openQuestions,
    summary: packSummary(query, kept.length, dropped.length, defaultSense),
  };
}

export function sliceResearchPayload(
  payload: ResearchPayload,
  senseId: string | null,
): ResearchPayload {
  if (!senseId || !payload.senses?.length) return payload;
  const sense = payload.senses.find((s) => s.id === senseId);
  if (!sense) return payload;
  const allow = new Set(sense.sourceIds);
  const sources = payload.sources.filter((s) => allow.has(s.id));
  const findings = payload.findings.filter((f) => f.evidenceIds.some((id) => allow.has(id)));
  const filled = anglesFromSources(payload.query, sources);
  return {
    ...payload,
    sources,
    findings: findings.length ? findings : snippetFindings(sources),
    angles: filled.angles,
    openQuestions: filled.openQuestions,
    summary: `${payload.summary} Sense: “${sense.label}” (${sense.count}).`,
    defaultSenseId: sense.id,
  };
}
