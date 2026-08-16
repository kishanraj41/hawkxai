import { PLATFORMS, type CapturedArtifact, type CategoryId, type CausationDriver, type CausationReport, type DeskCategory, type Platform, type Post, type TimeBucket, type Topic } from "./types";
import { totalScore } from "./metrics";

export const CATEGORY_LABEL: Record<DeskCategory, string> = {
  all: "All",
  markets: "Markets",
  news: "News",
  weather: "Weather",
  tech: "Tech",
  sports: "Sports",
  health: "Health",
  security: "Security",
  campaigns: "Campaigns",
  culture: "Culture",
};

const SOURCE_CATEGORY: Record<string, CategoryId> = {
  gdelt: "news",
  wikipedia: "culture",
  coingecko: "markets",
  usgs: "weather",
  "nasa eonet": "weather",
  "national weather service": "weather",
  "open-meteo": "weather",
  tvmaze: "culture",
  "open library": "culture",
  "dev.to": "tech",
  github: "tech",
  "spaceflight news": "tech",
  "fbi wanted": "security",
  "disease.sh": "health",
  thesportsdb: "sports",
  espn: "sports",
  spacex: "tech",
  frankfurter: "markets",
  cheapshark: "markets",
  jikan: "culture",
  "carbon intensity": "weather",
  itunes: "culture",
  mastodon: "culture",
  lobsters: "tech",
  "open food facts": "health",
  "nager.date": "culture",
  cisa: "security",
  "google news": "news",
  bbc: "news",
  guardian: "news",
  nyt: "news",
  npr: "news",
  techcrunch: "tech",
  arxiv: "tech",
  reliefweb: "news",
  "fear & greed": "markets",
  duckduckgo: "news",
  "stack overflow": "tech",
  openalex: "tech",
  coincap: "markets",
  cryptocompare: "markets",
  bluesky: "culture",
  "federal register": "news",
  nhtsa: "markets",
  youtube: "culture",
};

const KEYWORDS: Record<CategoryId, string[]> = {
  markets: [
    "bitcoin", "crypto", "nasdaq", "earnings", "inflation", "etf", "ipo", "stock", "forex", "coingecko",
    "camry", "civic", "tesla", "mustang", "f-150", "f150", "dealer", "msrp", "ev", "toyota", "honda", "ford",
  ],
  news: ["election", "congress", "sanctions", "treaty", "breaking"],
  weather: ["hurricane", "earthquake", "wildfire", "tornado", "flood", "storm", "heatwave", "forecast"],
  tech: ["github", "openai", "chatgpt", "kernel", "gpu", "spacex", "llm"],
  sports: ["nba", "nfl", "mlb", "nhl", "playoff", "soccer", "espn"],
  health: ["vaccine", "outbreak", "fda", "covid", "hospital"],
  security: ["ransomware", "cve", "breach", "exploit", "hacked", "vulnerability"],
  campaigns: ["utm_medium=qr", "qrco.de", "scan this qr", "launch event", "test drive", "drop"],
  culture: ["wikipedia", "album", "anime", "tvmaze"],
};

const CONTROVERSY = [
  "lawsuit", "ban", "hack", "leak", "crash", "layoff", "war", "scam",
  "outage", "recall", "boycott", "protest", "death", "killed", "abuse",
];

function postsOf(topic: Topic): Post[] {
  return PLATFORMS.flatMap((p) => topic.platforms[p]?.posts ?? []);
}

function blobOf(topic: Topic): string {
  return [topic.label, ...postsOf(topic).map((p) => `${p.title} ${p.url} ${p.sourceApi ?? ""}`)].join(" ");
}

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
}

function categoryFromSource(sourceApi?: string): CategoryId | null {
  if (!sourceApi) return null;
  const key = sourceApi.toLowerCase();
  if (SOURCE_CATEGORY[key]) return SOURCE_CATEGORY[key];
  for (const [name, cat] of Object.entries(SOURCE_CATEGORY)) {
    if (key.includes(name)) return cat;
  }
  return null;
}

export function classifyTopic(topic: Topic, artifacts: CapturedArtifact[] = []): CategoryId {
  if (topic.tickers.length > 0) return "markets";

  const tags = artifacts.filter((a) => a.kind === "hashtag").length;
  const qrs = artifacts.filter((a) => a.kind === "qr").length;
  if (qrs > 0 || tags >= 2) return "campaigns";
  if (/#[\p{L}\p{N}_]{2,}/u.test(topic.label) && /qr|utm_medium=qr/i.test(blobOf(topic))) {
    return "campaigns";
  }

  const votes = new Map<CategoryId, number>();
  const bump = (cat: CategoryId, n = 1) => votes.set(cat, (votes.get(cat) ?? 0) + n);

  for (const post of postsOf(topic)) {
    const cat = categoryFromSource(post.sourceApi);
    if (cat) bump(cat, 2);
  }

  const blob = blobOf(topic);
  for (const [cat, words] of Object.entries(KEYWORDS) as [CategoryId, string[]][]) {
    if (words.some((w) => hasWord(blob, w))) bump(cat, 1);
  }

  if (/#[\p{L}\p{N}_]{2,}/u.test(blob)) bump("campaigns", 1);

  const ranked = [...votes.entries()].toSorted((a, b) => b[1] - a[1]);
  if (ranked[0] && ranked[0][1] > 0) return ranked[0][0];

  if ((topic.platforms.hn?.score ?? 0) > 20 && (topic.platforms.hn?.score ?? 0) >= (topic.platforms.x?.score ?? 0)) {
    return "tech";
  }
  if ((topic.platforms.public?.score ?? 0) > 0) return "news";
  return "culture";
}

export function categoryCounts(topics: Topic[], artifactsById?: Map<string, CapturedArtifact[]>): Record<DeskCategory, number> {
  const counts = { all: topics.length } as Record<DeskCategory, number>;
  for (const id of Object.keys(CATEGORY_LABEL) as DeskCategory[]) {
    if (id !== "all") counts[id] = 0;
  }
  for (const topic of topics) {
    const cat = classifyTopic(topic, artifactsById?.get(topic.id) ?? []);
    counts[cat] += 1;
  }
  return counts;
}

function validTime(iso: string): number | null {
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : null;
}

function formatBucketLabel(iso: string, stepMs: number): string {
  const opts: Intl.DateTimeFormatOptions =
    stepMs >= 6 * 3600_000
      ? { month: "short", day: "numeric", hour: "numeric", timeZone: "America/Chicago" }
      : { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" };
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(iso));
}

function floorToStep(ms: number, stepMs: number): number {
  return Math.floor(ms / stepMs) * stepMs;
}

export function buildTimeseries(topics: Topic[]): TimeBucket[] {
  const posts = topics.flatMap(postsOf);
  const times = posts
    .map((p) => validTime(p.createdAt))
    .filter((n): n is number => n !== null);
  if (times.length === 0) return [];

  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1);
  const stepMs = span <= 4 * 3600_000 ? 15 * 60_000 : span <= 48 * 3600_000 ? 3600_000 : 6 * 3600_000;
  const start = floorToStep(min, stepMs);
  const end = floorToStep(max, stepMs);

  const buckets = new Map<number, TimeBucket>();
  for (let t = start; t <= end; t += stepMs) {
    const iso = new Date(t).toISOString();
    buckets.set(t, { t: iso, label: formatBucketLabel(iso, stepMs), x: 0, reddit: 0, hn: 0, public: 0, total: 0 });
  }

  for (const post of posts) {
    const ms = validTime(post.createdAt);
    if (ms === null) continue;
    const key = floorToStep(ms, stepMs);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket[post.platform] += 1;
    bucket.total += 1;
  }

  return [...buckets.values()];
}

function firstPrint(posts: Post[]): Post | null {
  const dated = posts
    .map((p) => ({ p, t: validTime(p.createdAt) }))
    .filter((x): x is { p: Post; t: number } => x.t !== null)
    .toSorted((a, b) => a.t - b.t);
  return dated[0]?.p ?? null;
}

function lagHours(posts: Post[]): number | null {
  const firstByPlat = new Map<Platform, number>();
  for (const post of posts) {
    const t = validTime(post.createdAt);
    if (t === null) continue;
    const prev = firstByPlat.get(post.platform);
    if (prev === undefined || t < prev) firstByPlat.set(post.platform, t);
  }
  if (firstByPlat.size < 2) return null;
  const times = [...firstByPlat.values()].toSorted((a, b) => a - b);
  return Number(((times[1] - times[0]) / 3600_000).toFixed(1));
}

function peakAt(posts: Post[]): string | null {
  const dated = posts
    .map((p) => ({ p, t: validTime(p.createdAt) }))
    .filter((x): x is { p: Post; t: number } => x.t !== null);
  if (!dated.length) return null;
  let best = dated[0];
  for (const row of dated) {
    if (row.p.score > best.p.score) best = row;
  }
  return best.p.createdAt;
}

export function buildCausation(topic: Topic, artifacts: CapturedArtifact[] = []): CausationReport {
  const posts = postsOf(topic);
  const first = firstPrint(posts);
  const lag = lagHours(posts);
  const drivers: CausationDriver[] = [];

  for (const p of PLATFORMS) {
    const slice = topic.platforms[p];
    if (!slice || slice.score <= 0) continue;
    drivers.push({
      id: `heat-${p}`,
      label: `${p} heat`,
      weight: slice.score,
      evidence: `${slice.posts.length} receipt${slice.posts.length === 1 ? "" : "s"} · score ${Math.round(slice.score)}`,
    });
  }

  if (first) {
    drivers.push({
      id: "first-print",
      label: `First print · ${first.platform}`,
      weight: topic.divergence >= 0.66 ? 36 : 22,
      evidence: `${first.title.slice(0, 80)} · ${formatBucketLabel(first.createdAt, 3600_000)} CT`,
    });
  }

  if (topic.velocity === "rising") {
    drivers.push({
      id: "velocity",
      label: "Rising velocity",
      weight: 24,
      evidence: `Score ${Math.round(totalScore(topic))} vs last ingest — still accelerating.`,
    });
  } else if (topic.velocity === "peaking") {
    drivers.push({
      id: "velocity",
      label: "At peak",
      weight: 14,
      evidence: "Heat is high but no longer accelerating.",
    });
  } else {
    drivers.push({
      id: "velocity",
      label: "Cooling",
      weight: 8,
      evidence: "Better as a recap than a new launch.",
    });
  }

  if (lag !== null) {
    drivers.push({
      id: "lag",
      label: lag < 2 ? "Cross-source in <2h" : `Second source +${lag}h`,
      weight: lag < 2 ? 22 : 12,
      evidence: "Hours between the first two platforms that printed.",
    });
  }

  const tags = artifacts.filter((a) => a.kind === "hashtag");
  const qrs = artifacts.filter((a) => a.kind === "qr");
  const tickers = artifacts.filter((a) => a.kind === "ticker");
  if (tags.length) {
    drivers.push({
      id: "hashtags",
      label: "Hashtag load",
      weight: Math.min(28, 8 + tags.length * 6),
      evidence: tags.slice(0, 3).map((a) => a.value).join(" "),
    });
  }
  if (qrs.length) {
    drivers.push({
      id: "qr",
      label: "QR / short-link campaign",
      weight: 26,
      evidence: qrs[0].value.slice(0, 80),
    });
  }
  if (tickers.length) {
    drivers.push({
      id: "tickers",
      label: "Ticker overlay",
      weight: 18,
      evidence: tickers.map((a) => a.value).join(" "),
    });
  }

  const blob = blobOf(topic).toLowerCase();
  const hit = CONTROVERSY.find((w) => blob.includes(w));
  if (hit) {
    drivers.push({
      id: "risk",
      label: `Risk word · ${hit}`,
      weight: 16,
      evidence: "Present in receipts — treat as a risk driver, not a slogan.",
    });
  }

  const max = Math.max(...drivers.map((d) => d.weight), 1);
  const scaled = drivers
    .map((d) => ({ ...d, weight: Math.max(4, Math.round((d.weight / max) * 100)) }))
    .toSorted((a, b) => b.weight - a.weight)
    .slice(0, 8);

  return {
    topicId: topic.id,
    firstAt: first?.createdAt ?? null,
    firstPlatform: first?.platform ?? null,
    lagHours: lag,
    peakAt: peakAt(posts),
    drivers: scaled,
    thin: posts.length < 2,
  };
}

export function filterByCategory(
  topics: Topic[],
  category: DeskCategory,
  artifactsById?: Map<string, CapturedArtifact[]>,
): Topic[] {
  if (category === "all") return topics;
  return topics.filter((t) => classifyTopic(t, artifactsById?.get(t.id) ?? []) === category);
}
