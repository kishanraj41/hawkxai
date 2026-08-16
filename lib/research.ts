import { z } from "zod";
import { grokChat, grokDeepResearch } from "./grok";
import { searchHn } from "./hn";
import { searchReddit } from "./reddit";
import { fetchX } from "./signals";
import type {
  ResearchFinding,
  ResearchPayload,
  ResearchSource,
  ResearchSourceKind,
} from "./types";

const UA = "HawkAI/1.0 (+https://github.com/snagaram3/grokhackx)";

const briefSchema = z.object({
  summary: z.string().min(1).transform((s) => s.slice(0, 1200)),
  findings: z
    .array(
      z.object({
        claim: z.string().min(1).transform((s) => s.slice(0, 400)),
        evidenceIds: z.array(z.string()).max(8),
        confidence: z.enum(["high", "medium", "thin"]),
      }),
    )
    .max(12),
  openQuestions: z.array(z.string().transform((s) => s.slice(0, 240))).max(8),
  angles: z.array(z.string().transform((s) => s.slice(0, 160))).max(8),
});

function parseJsonObject(raw: string): unknown {
  const t = raw.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("no json object");
  }
}

function sourceId(kind: ResearchSourceKind, n: number): string {
  return `${kind}-${n}`;
}

async function duckDuckGo(query: string): Promise<ResearchSource[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`duckduckgo ${res.status}`);
  const data = (await res.json()) as {
    Heading?: string;
    Abstract?: string;
    AbstractURL?: string;
    RelatedTopics?: { Text?: string; FirstURL?: string; Topics?: unknown[] }[];
  };
  const out: ResearchSource[] = [];
  let n = 0;
  if (data.Abstract && data.AbstractURL) {
    out.push({
      id: sourceId("web", ++n),
      kind: "web",
      title: (data.Heading || query).slice(0, 160),
      url: data.AbstractURL,
      snippet: data.Abstract.slice(0, 480),
    });
  }
  for (const topic of data.RelatedTopics ?? []) {
    if (out.length >= 8) break;
    if (topic.Text && topic.FirstURL) {
      out.push({
        id: sourceId("web", ++n),
        kind: "web",
        title: topic.Text.slice(0, 100),
        url: topic.FirstURL,
        snippet: topic.Text.slice(0, 480),
      });
    }
  }
  return out;
}

async function wikipedia(query: string): Promise<ResearchSource[]> {
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}` +
    `&limit=5&namespace=0&format=json&origin=*`;
  const searchRes = await fetch(searchUrl, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });
  if (!searchRes.ok) throw new Error(`wikipedia search ${searchRes.status}`);
  const searched = (await searchRes.json()) as [string, string[], string[], string[]];
  const titles = searched[1] ?? [];
  const urls = searched[3] ?? [];
  if (!titles.length) return [];

  const title = titles[0];
  const pageUrl = urls[0] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  const summaryRes = await fetch(summaryUrl, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });
  const out: ResearchSource[] = [];
  if (summaryRes.ok) {
    const page = (await summaryRes.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    out.push({
      id: sourceId("wikipedia", 1),
      kind: "wikipedia",
      title: page.title || title,
      url: page.content_urls?.desktop?.page || pageUrl,
      snippet: (page.extract || "").slice(0, 600),
    });
  }
  for (let i = 1; i < Math.min(titles.length, 4); i++) {
    out.push({
      id: sourceId("wikipedia", i + 1),
      kind: "wikipedia",
      title: titles[i],
      url: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(titles[i].replace(/ /g, "_"))}`,
      snippet: `Wikipedia page: ${titles[i]}`,
    });
  }
  return out;
}

function postsToSources(
  kind: Extract<ResearchSourceKind, "hn" | "reddit" | "x">,
  posts: { title: string; url: string; score: number; createdAt: string }[],
  limit: number,
): ResearchSource[] {
  return posts.slice(0, limit).map((p, i) => ({
    id: sourceId(kind, i + 1),
    kind,
    title: p.title.slice(0, 200),
    url: p.url,
    snippet: p.title.slice(0, 400),
    score: p.score,
    createdAt: p.createdAt,
  }));
}

async function settle<T>(label: string, run: () => Promise<T>, degraded: string[]): Promise<T | null> {
  try {
    return await run();
  } catch (err) {
    console.warn(`[research] ${label}`, err instanceof Error ? err.message : err);
    degraded.push(`${label} offline`);
    return null;
  }
}

function thinBrief(query: string, sources: ResearchSource[]): {
  summary: string;
  findings: ResearchFinding[];
  openQuestions: string[];
  angles: string[];
} {
  const top = sources.slice(0, 5);
  const findings: ResearchFinding[] = top.map((s) => ({
    claim: s.snippet.slice(0, 280) || s.title,
    evidenceIds: [s.id],
    confidence: sources.length >= 6 ? ("medium" as const) : ("thin" as const),
  }));
  return {
    summary:
      sources.length === 0
        ? `No live receipts yet for “${query}”. Sources were thin or offline — nothing invented.`
        : `Collected ${sources.length} live receipts for “${query}”. Summary is evidence-only; thin corners stay marked thin.`,
    findings,
    openQuestions: [
      "Which primary sources contradict each other?",
      "What changed in the last 30 days vs older references?",
    ],
    angles: ["Timeline", "Primary sources", "Open disputes"],
  };
}

async function synthesize(
  query: string,
  sources: ResearchSource[],
): Promise<{
  summary: string;
  findings: ResearchFinding[];
  openQuestions: string[];
  angles: string[];
}> {
  if (!process.env.XAI_API_KEY || sources.length === 0) {
    return thinBrief(query, sources);
  }

  const compact = sources.slice(0, 28).map((s) => ({
    id: s.id,
    kind: s.kind,
    title: s.title,
    url: s.url,
    snippet: s.snippet.slice(0, 280),
  }));

  const prompt = `You are HawkAI Research. Topic: ${JSON.stringify(query)}
Use ONLY the evidence list below. Never invent a fact, URL, or citation.
If evidence is thin, say so and set confidence to "thin".
Every finding.claim must be grounded in at least one evidenceIds id from the list.
Return JSON only:
{"summary":"2-5 sentences","findings":[{"claim":"","evidenceIds":["id"],"confidence":"high|medium|thin"}],"openQuestions":[""],"angles":[""]}
Evidence: ${JSON.stringify(compact)}`;

  try {
    const raw = await grokChat(prompt, 45_000);
    const parsed = briefSchema.parse(parseJsonObject(raw));
    const known = new Set(sources.map((s) => s.id));
    const findings = parsed.findings
      .map((f) => ({
        ...f,
        evidenceIds: f.evidenceIds.filter((id) => known.has(id)),
      }))
      .filter((f) => f.evidenceIds.length > 0);
    return {
      summary: parsed.summary,
      findings: findings.length ? findings : thinBrief(query, sources).findings,
      openQuestions: parsed.openQuestions,
      angles: parsed.angles,
    };
  } catch (err) {
    console.warn("[research] synthesize", err instanceof Error ? err.message : err);
    return thinBrief(query, sources);
  }
}

async function deepCornerNotes(
  query: string,
): Promise<{ notes: string; degraded: string[] }> {
  if (!process.env.XAI_API_KEY) {
    return { notes: "", degraded: ["grok deep research offline"] };
  }
  try {
    const raw = await grokDeepResearch(
      `Research topic: ${JSON.stringify(query)}
Find lesser-known but real public sources: papers, agency reports, niche forums, archival news, primary docs.
Return plain text notes only. Each bullet must name a real source or URL you retrieved.
If you cannot verify something, omit it. Never invent.`,
      90_000,
    );
    return { notes: raw.slice(0, 6000), degraded: [] };
  } catch (err) {
    console.warn("[research] deep", err instanceof Error ? err.message : err);
    return { notes: "", degraded: ["grok deep research offline"] };
  }
}

/** Parallel gather + evidence-only brief for the Research desk. */
export async function researchTopic(rawQuery: string): Promise<ResearchPayload> {
  const query = rawQuery.trim().slice(0, 200);
  if (!query) {
    return {
      query: "",
      updatedAt: new Date().toISOString(),
      summary: "",
      findings: [],
      openQuestions: [],
      angles: [],
      sources: [],
      degraded: [],
      thin: true,
    };
  }

  const degraded: string[] = [];
  const [wiki, ddg, hn, reddit, x, deep] = await Promise.all([
    settle("wikipedia", () => wikipedia(query), degraded),
    settle("web", () => duckDuckGo(query), degraded),
    settle("hn", () => searchHn(query, 12), degraded),
    settle("reddit", () => searchReddit(query), degraded),
    settle("x", () => fetchX(undefined, query), degraded),
    deepCornerNotes(query),
  ]);

  degraded.push(...deep.degraded);

  const sources: ResearchSource[] = [
    ...(wiki ?? []),
    ...(ddg ?? []),
    ...postsToSources("hn", hn ?? [], 10),
    ...postsToSources("reddit", reddit ?? [], 10),
    ...postsToSources("x", x ?? [], 8),
  ];

  if (deep.notes) {
    sources.push({
      id: sourceId("web", 90),
      kind: "web",
      title: `Deep pass notes · ${query}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: deep.notes.slice(0, 900),
    });
  }

  const seen = new Set<string>();
  const deduped = sources.filter((s) => {
    const key = s.url || `${s.kind}:${s.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(s.title);
  });

  const brief = await synthesize(query, deduped);
  const thin =
    deduped.length < 4 ||
    brief.findings.every((f) => f.confidence === "thin") ||
    Boolean(deep.degraded.length && deduped.length < 6);

  return {
    query,
    updatedAt: new Date().toISOString(),
    summary: brief.summary,
    findings: brief.findings,
    openQuestions: brief.openQuestions,
    angles: brief.angles,
    sources: deduped,
    degraded: [...new Set(degraded)],
    thin,
  };
}
