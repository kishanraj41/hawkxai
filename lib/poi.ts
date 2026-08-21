import { slug } from "./metrics";
import { confidenceOf, outlookFromScores } from "./predict";
import type { ForecastOutlook, Occupier, PoiInsight, PoiTag, WatchlistEntity } from "./types";

export interface PoiReceipt {
  snapshotId: string;
  url: string;
  title: string;
  platform: string;
  score: number;
  createdAt: string | null;
  sourceApi?: string;
  tool?: string;
  collectedAt?: string;
}

export interface PoiOverlapRow {
  entityId: string;
  snapshotId: string;
  url: string;
  title: string;
  host: string;
  official: boolean;
  collectedAt: string | null;
}

const OFFICIAL_HOSTS = [
  "wikipedia.org",
  "nhtsa.gov",
  "nih.gov",
  "arxiv.org",
  "uspto.gov",
  "federalregister.gov",
];

export function normalizeAliases(label: string, extra: string[] = []): string[] {
  const raw = [label, ...extra]
    .flatMap((s) => s.split(","))
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of raw) {
    const key = a.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function receiptHitsAlias(receipt: Pick<PoiReceipt, "title" | "url">, aliases: string[]): boolean {
  const hay = `${receipt.title} ${receipt.url}`;
  return aliases.some((alias) => {
    if (alias.startsWith("#") || alias.startsWith("$")) {
      return hay.toLowerCase().includes(alias.toLowerCase());
    }
    return new RegExp(`\\b${escapeRe(alias)}\\b`, "i").test(hay);
  });
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isOfficial(url: string, label: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  const token = slug(label).split("-")[0];
  if (token.length >= 4 && host.includes(token)) return true;
  return false;
}

function countsBySnap(receipts: PoiReceipt[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of receipts) {
    if (!r.snapshotId) continue;
    map.set(r.snapshotId, (map.get(r.snapshotId) ?? 0) + 1);
  }
  return map;
}

/**
 * L2 next-window from the last four overlap counts plus category share.
 * Same family as a shallow GBDT: ratio stumps + slope + baseline. Abstain when
 * fewer than two snapshots. Swap for HistGB when 200 Camry rows are labeled.
 */
export function nextWindowFromSeries(
  entityCounts: number[],
  baselineLast: number,
  baselinePrev: number,
): ForecastOutlook {
  if (entityCounts.length < 2) return "thin";
  const last4 = entityCounts.slice(-4);
  const last = last4.at(-1) ?? 0;
  const prev = last4.at(-2) ?? 0;
  const fromRatio = outlookFromScores(prev, last, "topic");
  const slope = last4.length >= 3 ? last - last4[0] : last - prev;
  if (baselineLast > baselinePrev * 1.08 && fromRatio === "fading") return "peaking";
  if (slope > 0 && fromRatio === "fading") return "peaking";
  if (slope < 0 && fromRatio === "rising") return "peaking";
  return fromRatio;
}

export function overlapRows(entity: WatchlistEntity, receipts: PoiReceipt[]): PoiOverlapRow[] {
  return receipts
    .filter((r) => r.url && receiptHitsAlias(r, entity.aliases))
    .map((r) => ({
      entityId: entity.id,
      snapshotId: r.snapshotId,
      url: r.url,
      title: r.title,
      host: hostOf(r.url) || r.platform,
      official: isOfficial(r.url, entity.label),
      collectedAt: r.collectedAt ?? r.createdAt,
    }));
}

/** L1 organic vs occupancy from official vs other hosts. Abstain when n < 4. */
export function scorePoi(
  entity: WatchlistEntity,
  receipts: PoiReceipt[],
  opts?: { labels?: Map<string, PoiTag>; qr?: Map<string, string> },
): PoiInsight {
  const labels = opts?.labels ?? new Map<string, PoiTag>();
  const qr = opts?.qr ?? new Map<string, string>();
  const hits = receipts.filter((r) => {
    if (!receiptHitsAlias(r, entity.aliases)) return false;
    return labels.get(r.url) !== "ignore";
  });
  const official = hits.filter((r) => {
    const tag = labels.get(r.url);
    if (tag === "official") return true;
    if (tag === "occupied") return false;
    return isOfficial(r.url, entity.label);
  });
  const occupied = hits.filter((r) => !official.includes(r));
  const n = hits.length;
  const thin = n < 4;
  const organic = n === 0 ? 0 : official.length / n;
  const occupancy = n === 0 ? 0 : occupied.length / n;

  const entityBySnap = countsBySnap(hits);
  const tapeBySnap = countsBySnap(receipts);
  const series = [...entityBySnap.entries()]
    .map(([id, count]) => ({
      id,
      count,
      baseline: count / Math.max(tapeBySnap.get(id) ?? 1, 1),
    }))
    .toSorted((a, b) => a.id.localeCompare(b.id));
  const last = series.at(-1);
  const prev = series.at(-2);
  const delta = (last?.count ?? 0) - (prev?.count ?? 0);
  const baselineRatio = last?.baseline ?? 0;
  const outlook = nextWindowFromSeries(
    series.map((s) => s.count),
    last?.baseline ?? 0,
    prev?.baseline ?? 0,
  );
  const confidence = confidenceOf(Math.max(series.length, n > 0 ? 1 : 0), thin);
  const rankScore = Math.round(Math.abs(delta) * (thin ? 0.1 : 0.25 + occupancy) * 100) / 100;

  const occupiers: Occupier[] = occupied.slice(0, 12).map((r) => ({
    title: r.title,
    url: r.url,
    host: hostOf(r.url) || r.platform,
    tag: labels.get(r.url),
    qrPayload: qr.get(r.url),
  }));

  const analysis = thin
    ? n === 0
      ? `No public receipts matched “${entity.label}” yet. Thin — no next-window.`
      : `${n} overlap receipt${n === 1 ? "" : "s"} — need 4 before organic/occupancy is a call.`
    : `Public × POI: ${n} receipts · ${official.length} official · ${occupied.length} occupied · organic ${Math.round(organic * 100)}% · share ${Math.round(baselineRatio * 1000) / 10}% of tape`;

  return {
    entity,
    receiptCount: n,
    officialCount: official.length,
    occupiedCount: occupied.length,
    organic: Math.round(organic * 100) / 100,
    occupancy: Math.round(occupancy * 100) / 100,
    outlook,
    confidence,
    thin,
    analysis,
    occupiers,
    snapshotCount: series.length,
    delta,
    baselineRatio: Math.round(baselineRatio * 1000) / 1000,
    rankScore,
    window: series.map((s) => s.count).slice(-4),
  };
}
