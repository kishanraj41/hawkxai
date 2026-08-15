import { divergenceLabel } from "./ui-helpers";
import { totalScore } from "./metrics";
import type {
  AgeLens,
  AgeTranslation,
  BoosterPayload,
  BoosterTopicBrief,
  CampaignMove,
  CapturedArtifact,
  Improvisation,
  Platform,
  Topic,
  TrendsPayload,
} from "./types";

const HASHTAG_RE = /#[\p{L}\p{N}_]{2,48}/gu;
const CASHTAG_RE = /\$[A-Z]{1,5}\b/g;
const URL_RE = /https?:\/\/[^\s<>"']+/gi;
const QR_HINT_RE =
  /(?:utm_medium=qr|qr\.code|qrcode|qrs\.ly|qrco\.de|goqr|scan\s+this\s+qr|scan\s+the\s+qr)/i;
const SHORT_LINK_RE =
  /https?:\/\/(?:bit\.ly|t\.co|tinyurl\.com|lnkd\.in|qrco\.de|qrs\.ly|goo\.gl|ow\.ly)\/[^\s<>"']+/i;

const STOP = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "about", "your",
  "their", "what", "when", "where", "which", "while", "after", "before", "over",
  "under", "than", "then", "just", "more", "most", "some", "have", "been",
  "will", "would", "could", "should", "they", "them", "were", "was", "are",
  "not", "but", "you", "our", "its", "a", "an", "of", "to", "in", "on", "at",
  "by", "or", "as", "is", "it", "be", "we", "i", "if", "so", "no", "yes",
]);

const CONTROVERSY = [
  "lawsuit", "ban", "hack", "leak", "crash", "layoff", "war", "scam",
  "outage", "recall", "boycott", "protest", "death", "killed", "abuse",
];

const AGE_META: Record<AgeLens, { label: string }> = {
  kids: { label: "Kids" },
  "gen-z": { label: "Gen Z" },
  millennial: { label: "Millennial" },
  "gen-x": { label: "Gen X" },
  boomer: { label: "Boomer" },
};

function allMatches(re: RegExp, text: string): string[] {
  const copy = new RegExp(re.source, re.flags);
  return [...text.matchAll(copy)].map((m) => m[0]);
}

function blobOf(topic: Topic): string {
  const posts = Object.values(topic.platforms).flatMap((s) => s.posts);
  return [topic.label, ...posts.map((p) => `${p.title} ${p.url}`)].join(" ");
}

function postsOf(topic: Topic) {
  return Object.values(topic.platforms).flatMap((s) => s.posts);
}

function platformsFor(topic: Topic, test: (text: string) => boolean): Platform[] {
  const hit: Platform[] = [];
  for (const p of ["x", "reddit", "hn"] as Platform[]) {
    const slice = topic.platforms[p];
    const text = [topic.label, ...slice.posts.map((x) => `${x.title} ${x.url}`)].join(" ");
    if (slice.score > 0 && test(text)) hit.push(p);
  }
  return hit;
}

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function phrasesFrom(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  const grams: string[] = [];
  for (let n = 3; n >= 2; n--) {
    for (let i = 0; i <= words.length - n; i++) {
      grams.push(words.slice(i, i + n).join(" "));
    }
  }
  return grams;
}

export function captureArtifacts(topic: Topic): CapturedArtifact[] {
  const blob = blobOf(topic);
  const counts = new Map<string, CapturedArtifact>();

  const bump = (
    kind: CapturedArtifact["kind"],
    value: string,
    platforms: Platform[],
  ) => {
    const key = `${kind}:${value.toLowerCase()}`;
    const prev = counts.get(key);
    if (prev) {
      prev.mentions += 1;
      for (const p of platforms) {
        if (!prev.platforms.includes(p)) prev.platforms.push(p);
      }
      return;
    }
    counts.set(key, { kind, value, mentions: 1, platforms: [...platforms] });
  };

  for (const tag of allMatches(HASHTAG_RE, blob)) {
    bump("hashtag", tag, platformsFor(topic, (t) => t.toLowerCase().includes(tag.toLowerCase())));
  }
  for (const cash of allMatches(CASHTAG_RE, blob)) {
    bump("ticker", cash, platformsFor(topic, (t) => t.includes(cash)));
  }
  for (const tk of topic.tickers) {
    bump("ticker", `$${tk.symbol.replace("$", "")}`, platformsFor(topic, () => true));
  }

  const urls = allMatches(URL_RE, blob);
  for (const raw of urls) {
    const url = raw.replace(/[).,]+$/, "");
    const plats = platformsFor(topic, (t) => t.includes(url));
    if (QR_HINT_RE.test(url) || SHORT_LINK_RE.test(url) || /utm_medium=qr/i.test(url)) {
      bump("qr", url, plats);
    } else {
      bump("url", url, plats);
    }
  }
  if (QR_HINT_RE.test(blob) && ![...counts.values()].some((a) => a.kind === "qr")) {
    bump("qr", "QR campaign mentioned (no scannable payload yet)", platformsFor(topic, (t) => QR_HINT_RE.test(t)));
  }

  const gramCounts = new Map<string, number>();
  for (const g of phrasesFrom(blob)) {
    gramCounts.set(g, (gramCounts.get(g) ?? 0) + 1);
  }
  const rankedPhrases = [...gramCounts.entries()].toSorted(
    (a, b) => b[1] - a[1] || b[0].length - a[0].length,
  );
  const minCount = rankedPhrases.some(([, n]) => n >= 2) ? 2 : 1;
  for (const [phrase] of rankedPhrases.filter(([, n]) => n >= minCount).slice(0, 4)) {
    bump("phrase", phrase, platformsFor(topic, (t) => t.toLowerCase().includes(phrase)));
  }

  return [...counts.values()]
    .toSorted((a, b) => b.mentions - a.mentions)
    .slice(0, 12);
}

export function whyTrending(topic: Topic, artifacts: CapturedArtifact[]): { why: string; confidence: number } {
  const div = divergenceLabel(topic);
  const score = totalScore(topic);
  const active = (["x", "reddit", "hn"] as Platform[]).filter((p) => topic.platforms[p].score > 0);
  const tags = artifacts.filter((a) => a.kind === "hashtag").slice(0, 3).map((a) => a.value);
  const domains = artifacts
    .filter((a) => a.kind === "url" || a.kind === "qr")
    .map((a) => domainOf(a.value))
    .filter((d): d is string => Boolean(d));
  const uniqueDomains = [...new Set(domains)].slice(0, 2);

  const parts: string[] = [];
  if (topic.velocity === "rising" && topic.divergence >= 0.66) {
    parts.push(`Exploding first as a ${div}. Other networks have not caught up — early window.`);
  } else if (topic.velocity === "rising") {
    parts.push(`Rising and ${div}. Cross-platform heat is the story, not a one-app meme.`);
  } else if (topic.velocity === "peaking") {
    parts.push(`At peak attention (${div}). Good for amplification; expensive to originate.`);
  } else {
    parts.push(`Cooling (${div}). Better for recap and explanation than a new campaign drop.`);
  }

  if (active.length) parts.push(`Receipts on ${active.join(", ")}.`);
  if (tags.length) parts.push(`Artifacts in play: ${tags.join(" ")}.`);
  if (uniqueDomains.length) parts.push(`Link gravity: ${uniqueDomains.join(", ")}.`);
  if (topic.peakHourCT) parts.push(`Historical peak hour CT: ${topic.peakHourCT}.`);

  const evidence = postsOf(topic).length + artifacts.length;
  const confidence = Math.max(0.25, Math.min(0.92, 0.35 + evidence * 0.06 + (score > 80 ? 0.1 : 0)));
  if (postsOf(topic).length === 0) {
    return {
      why: "Signal is thin — label only, no receipt posts. Do not invent a why.",
      confidence: 0.2,
    };
  }
  return { why: parts.join(" "), confidence: Number(confidence.toFixed(2)) };
}

function controversyHit(topic: Topic): boolean {
  const blob = blobOf(topic).toLowerCase();
  return CONTROVERSY.some((w) => blob.includes(w));
}

export function campaignMove(topic: Topic, artifacts: CapturedArtifact[]): CampaignMove {
  const hot = artifacts.find((a) => a.kind === "hashtag")?.value ?? topic.label;
  const risky = controversyHit(topic);
  if (topic.velocity === "fading") {
    return {
      angle: "Recap, don't launch",
      forCompetitors: `Use "${hot}" as context in a post-mortem or explainer. Do not drop a new campaign into a cooling wave.`,
      risk: risky ? "high" : "medium",
      timing: "fading",
      hook: `What ${topic.label} actually changed — in one screen.`,
    };
  }
  if (topic.divergence >= 0.66) {
    return {
      angle: "Go native on the bubbling platform",
      forCompetitors: `Don't paste the same ad everywhere. Speak the ${divergenceLabel(topic)} in its own format, then bridge to your product need — never clone the meme.`,
      risk: risky ? "high" : "low",
      timing: topic.velocity,
      hook: `${hot} is still local. Be useful there before it goes mainstream.`,
    };
  }
  return {
    angle: "Ride the need, not the joke",
    forCompetitors: `Competitors should answer the job-to-be-done behind "${topic.label}" (speed, trust, status, safety). Copying the phrase without a new proof point looks late.`,
    risk: risky ? "high" : topic.velocity === "peaking" ? "medium" : "low",
    timing: topic.velocity,
    hook: `While ${hot} is ${topic.velocity}, show the proof your category still owes people.`,
  };
}

export function ageTranslations(topic: Topic, why: string): AgeTranslation[] {
  const label = topic.label;
  return (Object.keys(AGE_META) as AgeLens[]).map((lens) => {
    const meta = AGE_META[lens];
    const takeaway =
      lens === "kids"
        ? `People are talking about “${label}”. If you see a QR or link, ask a grown-up before scanning. ${why}`
        : lens === "gen-z"
          ? `This is live social weather around “${label}”. Remix only if you add a real take — brands that just #spam it get ratioed.`
          : lens === "millennial"
            ? `“${label}” is spiking. Worth 30 seconds if it changes a purchase, commute, or bill — skip if it's just dunking.`
            : lens === "gen-x"
              ? `Signal: “${label}” is ${topic.velocity}. Ignore the slang; check whether a product, policy, or outage actually moved.`
              : `Plain version: “${label}” is trending (${topic.velocity}). Here’s why it might affect news, money, or family plans — no jargon.`;
    return { lens, label: meta.label, takeaway };
  });
}

export function boostTopic(topic: Topic): BoosterTopicBrief {
  const artifacts = captureArtifacts(topic);
  const { why, confidence } = whyTrending(topic, artifacts);
  return {
    topicId: topic.id,
    whyTrending: why,
    confidence,
    artifacts,
    audiences: ageTranslations(topic, why),
    campaign: campaignMove(topic, artifacts),
  };
}

export function improvisationsFor(payload: TrendsPayload, briefs: BoosterTopicBrief[]): Improvisation[] {
  const items: Improvisation[] = [];
  const allArtifacts = briefs.flatMap((b) => b.artifacts);
  const hashtags = allArtifacts.filter((a) => a.kind === "hashtag");
  const qrs = allArtifacts.filter((a) => a.kind === "qr");
  const qrDecoded = qrs.some((a) => a.value.startsWith("decoded:"));
  const rising = payload.topics.filter((t) => t.velocity === "rising").length;
  const bubbles = payload.topics.filter((t) => t.divergence >= 0.66).length;

  if (payload.degraded.some((d) => d.includes("x"))) {
    items.push({
      priority: "P0",
      title: "Stabilize X ingest",
      why: "Hashtag and QR campaigns mostly start on X. Offline X blinds the booster.",
      next: "Keep x_search, add a Google Trends fallback so capture still runs.",
    });
  }
  if (payload.degraded.some((d) => d.includes("reddit"))) {
    items.push({
      priority: "P0",
      title: "Reddit fallback (OAuth or Pushshift-style)",
      why: "403s wipe phrase capture from the largest long-form platform.",
      next: "Authenticated Reddit client + cache last-good posts for 15m.",
    });
  }
  if (hashtags.length < 3) {
    items.push({
      priority: "P0",
      title: "Ingest TikTok / Reels / Shorts caption text",
      why: "Almost no hashtags in HN/Reddit titles. Gen Z campaigns are invisible.",
      next: "Add a caption scraper (or Grok x_search for TikTok-named trends) into capture.",
    });
  }
  if (!qrDecoded) {
    items.push({
      priority: "P0",
      title: "QR image decode, not just QR-shaped URLs",
      why: "Campaigns hide the payload in images. Text regex cannot see a poster QR.",
      next: "Accept image URLs → decode with a QR library → treat payload as a first-class artifact.",
    });
  }
  if (bubbles >= 3) {
    items.push({
      priority: "P1",
      title: "Platform-native campaign studio",
      why: `${bubbles} topics are still single-platform bubbles — the cheapest time to act.`,
      next: "One-click brief: format + hook + risk for the bubbling network only.",
    });
  }
  if (rising >= 2) {
    items.push({
      priority: "P1",
      title: "Age-group toggle on the map",
      why: "Same rising cluster means different things to kids vs boomers vs a brand CMO.",
      next: "Compose five caption variants from BoosterInsights; filter map labels by lens.",
    });
  }
  if (!payload.topics.some((t) => t.tickers.length > 0)) {
    items.push({
      priority: "P1",
      title: "Finance overlay even without explicit tickers",
      why: "Competitors still need category ETFs / peers when $TICKER is absent.",
      next: "Map topic labels to a small industry lexicon (retail, AI, airlines) — never invent symbols.",
    });
  }
  items.push({
    priority: "P2",
    title: "News + disaster time-lag correlation",
    why: "Why-trending is still social-only. Campaigns miss weather, outages, and filings.",
    next: "Join GDELT/NOAA on a 0–24h lag next to velocity.",
  });
  items.push({
    priority: "P2",
    title: "Export a one-page competitor brief",
    why: "CMOs will not live inside the circle pack. They want a PDF/Slack card.",
    next: "From BoosterPayload, render hook / risk / age takes / three receipts.",
  });

  const rank = { P0: 0, P1: 1, P2: 2 };
  return items.toSorted((a, b) => rank[a.priority] - rank[b.priority]).slice(0, 8);
}

export function boostTrends(payload: TrendsPayload): BoosterPayload {
  const ranked = [...payload.topics].toSorted((a, b) => totalScore(b) - totalScore(a));
  const briefs = ranked.slice(0, 16).map(boostTopic);
  const improvisations = improvisationsFor(payload, briefs);
  const top = briefs[0];
  const summary = top
    ? `Hottest: “${payload.topics.find((t) => t.id === top.topicId)?.label}” — ${top.whyTrending} Campaign: ${top.campaign.hook}`
    : "No topics to boost yet. Hit /api/trends first.";
  return {
    updatedAt: new Date().toISOString(),
    sourceUpdatedAt: payload.updatedAt,
    summary,
    briefs,
    improvisations,
  };
}
