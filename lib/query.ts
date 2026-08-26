import { geminiChat, hasGoogleKey } from "./gemini";
import { PLACE_NEEDLES } from "./geo";
import { tokenHits } from "./phrase-hit";
import { CATEGORIES, type CategoryId, type QueryInsight, type QueryKind, type SentimentReport, type Topic } from "./types";

export interface QueryIntent {
  raw: string;
  kind: QueryKind;
  category: CategoryId;
  aliases: string[];
  search: string;
}

const KIND_LABEL: Record<QueryKind, string> = {
  ticker: "ticker",
  hashtag: "hashtag",
  campaign: "campaign",
  event: "event",
  product: "product",
  place: "place",
  generic: "topic",
};

const PRODUCT: Record<string, { aliases: string[]; category: CategoryId }> = {
  camry: { aliases: ["toyota camry", "camry"], category: "markets" },
  civic: { aliases: ["honda civic", "civic"], category: "markets" },
  accord: { aliases: ["honda accord"], category: "markets" },
  corolla: { aliases: ["toyota corolla"], category: "markets" },
  rav4: { aliases: ["toyota rav4"], category: "markets" },
  mustang: { aliases: ["ford mustang"], category: "markets" },
  "f-150": { aliases: ["ford f-150", "f150", "ford f150"], category: "markets" },
  f150: { aliases: ["ford f-150", "f-150"], category: "markets" },
  silverado: { aliases: ["chevy silverado"], category: "markets" },
  tesla: { aliases: ["tesla", "tsla", "model y", "model 3"], category: "markets" },
  cybertruck: { aliases: ["tesla cybertruck"], category: "tech" },
  "model y": { aliases: ["tesla model y", "model y"], category: "markets" },
  "model 3": { aliases: ["tesla model 3"], category: "markets" },
  rivian: { aliases: ["rivian r1t", "rivian"], category: "markets" },
  lucid: { aliases: ["lucid air"], category: "markets" },
  bmw: { aliases: ["bmw"], category: "markets" },
  honda: { aliases: ["honda"], category: "markets" },
  toyota: { aliases: ["toyota"], category: "markets" },
  ford: { aliases: ["ford"], category: "markets" },
};

const EVENT_WORDS = [
  "launch", "recall", "earnings", "keynote", "ces", "wwdc",
  "super bowl", "world cup", "f1", "grand opening", "test drive",
  "campaign", "drop", "premiere",
];

const STOP = new Set(["the", "and", "for", "with", "this", "that", "a", "an", "of", "to"]);

function uniq(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const n = v.trim().replace(/\s+/g, " ");
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9$#+-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function needlesOf(intent: Pick<QueryIntent, "raw" | "aliases">): string[] {
  return uniq([intent.raw, ...intent.aliases]).map((s) => s.replace(/^[# $]+/, "").toLowerCase());
}

export function titleScore(title: string, needles: string[]): number {
  let s = 0;
  for (const n of needles) {
    if (!n) continue;
    if (tokenHits(title, n)) s += n.length >= 5 ? 3 : 2;
  }
  const tTok = new Set(tokens(title));
  const qTok = new Set(needles.flatMap(tokens));
  if (tTok.size && qTok.size) {
    let hit = 0;
    for (const w of qTok) if (tTok.has(w)) hit += 1;
    s += (hit / Math.min(tTok.size, qTok.size)) * 4;
  }
  return s;
}

export function titleHits(title: string, needles: string[]): boolean {
  return titleScore(title, needles) >= 1.6;
}

export function searchQuery(intent: Pick<QueryIntent, "raw" | "aliases">): string {
  const parts = uniq([intent.raw.replace(/^#/, "").replace(/^\$/, ""), ...intent.aliases]).slice(0, 4);
  if (parts.length <= 1) return parts[0] || intent.raw;
  return parts.map((p) => (p.includes(" ") ? `"${p}"` : p)).join(" OR ");
}

function productHit(raw: string): { aliases: string[]; category: CategoryId } | null {
  const lower = raw.toLowerCase();
  if (PRODUCT[lower]) return PRODUCT[lower];
  for (const [key, spec] of Object.entries(PRODUCT)) {
    if (lower.includes(key)) return spec;
  }
  return null;
}

export function inferQueryIntent(raw: string): QueryIntent {
  const q = raw.trim();
  const aliases: string[] = [];
  let kind: QueryKind = "generic";
  let category: CategoryId = "culture";

  const tag = q.match(/#[\p{L}\p{N}_]{2,48}/u);
  const ticker = q.match(/\$[A-Z]{1,5}\b/);
  const product = productHit(q);

  if (ticker) {
    kind = "ticker";
    category = "markets";
    aliases.push(ticker[0], ticker[0].slice(1));
  } else if (/utm_medium=qr|qrco\.de|scan this qr|qrs\.ly/i.test(q)) {
    kind = "campaign";
    category = "campaigns";
  } else if (tag) {
    kind = "hashtag";
    category = "campaigns";
    aliases.push(tag[0], tag[0].slice(1));
  } else if (EVENT_WORDS.some((w) => q.toLowerCase().includes(w))) {
    kind = "event";
    category = /recall|lawsuit|ban/.test(q.toLowerCase()) ? "news" : "campaigns";
    aliases.push(...EVENT_WORDS.filter((w) => q.toLowerCase().includes(w)));
  } else if (product) {
    kind = "product";
    category = product.category;
    aliases.push(...product.aliases);
  } else if (PLACE_NEEDLES.some((w) => q.toLowerCase().includes(w))) {
    kind = "place";
    category = "news";
  }

  const intent: QueryIntent = {
    raw: q,
    kind,
    category,
    aliases: uniq(aliases).filter((a) => a.toLowerCase() !== q.toLowerCase()),
    search: q,
  };
  intent.search = searchQuery(intent);
  return intent;
}

const KIND_SET = new Set<QueryKind>(["ticker", "hashtag", "campaign", "event", "product", "place", "generic"]);
const CAT_SET = new Set<string>(CATEGORIES);

/** Calculated guess for unknown words. Synonyms only — never invent a headline. */
export async function enrichQueryIntent(local: QueryIntent): Promise<QueryIntent> {
  if (!hasGoogleKey()) return local;
  if (local.kind !== "generic" && local.aliases.length >= 2) return local;
  try {
    const raw = await geminiChat(
      `Classify this live-trends search. Synonyms only — no headlines, no invented news.
Query: ${JSON.stringify(local.raw)}
Return JSON: {"kind":"ticker|hashtag|campaign|event|product|place|generic","category":"markets|news|weather|tech|sports|health|security|campaigns|culture","aliases":["synonym"]}`,
      4000,
    );
    const parsed = JSON.parse(raw) as { kind?: string; category?: string; aliases?: unknown };
    const kind = KIND_SET.has(parsed.kind as QueryKind) ? (parsed.kind as QueryKind) : local.kind;
    const category = CAT_SET.has(parsed.category ?? "") ? (parsed.category as CategoryId) : local.category;
    const extra = Array.isArray(parsed.aliases)
      ? parsed.aliases
          .filter((a): a is string => typeof a === "string" && a.length >= 2 && a.length <= 40)
          .filter((a) => !/[.!?]/.test(a))
          .slice(0, 4)
      : [];
    const merged: QueryIntent = {
      raw: local.raw,
      kind: local.kind === "generic" ? kind : local.kind,
      category: local.kind === "generic" ? category : local.category,
      aliases: uniq([...local.aliases, ...extra]),
      search: local.search,
    };
    merged.search = searchQuery(merged);
    return merged;
  } catch {
    return local;
  }
}

export function floorLine(intent: QueryIntent, sentiment: SentimentReport | null, hitCount: number, match: QueryInsight["match"]): string {
  const kind = KIND_LABEL[intent.kind];
  const cat = intent.category;
  if (hitCount === 0) {
    return `No exact print for “${intent.raw}”. Showing nearest ${kind} receipts on the internet — pitch only what is on the tape.`;
  }
  if (match !== "exact") {
    return `Nearest ${kind} footprint (${hitCount} receipts). Not an exact match — do not claim the campaign is everywhere.`;
  }
  if (!sentiment || sentiment.thin) {
    return `${kind} · ${cat}. Live footprint is thin — name the source, not a story.`;
  }
  const { pos, neg, n } = sentiment.overall;
  if (sentiment.lean === "pos") {
    return `${kind} lean is positive in titles (${pos}/${n}). Quote a receipt, not a slogan.`;
  }
  if (sentiment.lean === "neg") {
    return `${kind} lean is negative in titles (${neg}/${n}). Name the risk on the floor.`;
  }
  return `“${intent.raw}” footprint: ${pos} pos / ${neg} neg in ${n} titles. Lead with the fact.`;
}

export function toQueryInsight(
  intent: QueryIntent,
  topics: Topic[],
  sentiment: SentimentReport | null,
): QueryInsight {
  const primary = topics[0];
  const hitCount = primary
    ? Object.values(primary.platforms).reduce((n, s) => n + s.posts.length, 0)
    : 0;
  const match = primary?.match ?? (hitCount > 0 ? "exact" : "neighbor");
  return {
    raw: intent.raw,
    kind: intent.kind,
    category: intent.category,
    aliases: intent.aliases,
    search: intent.search,
    match,
    hitCount,
    floor: floorLine(intent, sentiment, hitCount, match),
  };
}
