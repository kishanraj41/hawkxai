import type { BoosterTopicBrief, SentimentLean, Topic } from "./types";

export const TAPE_WATCH_KEY = "hawkai:tape-watch:v1";

export interface TapeSnapshot {
  topicId: string;
  label: string;
  velocity: Topic["velocity"];
  lean: SentimentLean;
  pos: number;
  neg: number;
  receiptCount: number;
  firstAt: string | null;
  at: string;
}

export interface TapeDelta {
  topicId: string;
  label: string;
  lines: string[];
}

export interface TapeWatchStore {
  ids: string[];
  snaps: Record<string, TapeSnapshot>;
}

export function emptyWatchStore(): TapeWatchStore {
  return { ids: [], snaps: {} };
}

export function receiptCount(topic: Topic): number {
  return Object.values(topic.platforms).reduce((n, slice) => n + slice.posts.length, 0);
}

export function snapshotOf(
  topic: Topic,
  brief: BoosterTopicBrief | undefined,
  at: string,
): TapeSnapshot {
  const mix = brief?.sentiment.overall;
  return {
    topicId: topic.id,
    label: topic.label,
    velocity: topic.velocity,
    lean: brief?.sentiment.lean ?? "thin",
    pos: mix?.pos ?? 0,
    neg: mix?.neg ?? 0,
    receiptCount: receiptCount(topic),
    firstAt: brief?.causation.firstAt ?? null,
    at,
  };
}

/** Measured deltas only. Never explains why the tape moved. */
export function diffSnapshots(prev: TapeSnapshot, next: TapeSnapshot): string[] {
  const lines: string[] = [];
  if (prev.velocity !== next.velocity) {
    lines.push(`${prev.velocity} → ${next.velocity}`);
  }
  if (prev.lean !== next.lean) {
    lines.push(
      `titles ${prev.lean} → ${next.lean} (${next.pos} pos / ${next.neg} neg)`,
    );
  } else if (prev.pos !== next.pos || prev.neg !== next.neg) {
    lines.push(`titles ${next.pos} pos / ${next.neg} neg (was ${prev.pos}/${prev.neg})`);
  }
  if (prev.receiptCount !== next.receiptCount) {
    const d = next.receiptCount - prev.receiptCount;
    lines.push(
      `receipts ${prev.receiptCount} → ${next.receiptCount} (${d > 0 ? "+" : ""}${d})`,
    );
  }
  if (!prev.firstAt && next.firstAt) {
    lines.push(`first print ${next.firstAt}`);
  }
  return lines;
}

export function parseWatchStore(raw: string | null): TapeWatchStore {
  if (!raw) return emptyWatchStore();
  try {
    const parsed = JSON.parse(raw) as Partial<TapeWatchStore>;
    const ids = Array.isArray(parsed.ids)
      ? parsed.ids.filter((id): id is string => typeof id === "string")
      : [];
    const snaps =
      parsed.snaps && typeof parsed.snaps === "object" ? parsed.snaps : {};
    return { ids, snaps };
  } catch {
    return emptyWatchStore();
  }
}

export function toggleWatch(store: TapeWatchStore, topicId: string): TapeWatchStore {
  const has = store.ids.includes(topicId);
  return {
    ...store,
    ids: has ? store.ids.filter((id) => id !== topicId) : [...store.ids, topicId],
  };
}

export function ingestTape(
  store: TapeWatchStore,
  topics: Topic[],
  briefs: BoosterTopicBrief[],
  at: string,
  autoWatchId?: string | null,
): { store: TapeWatchStore; deltas: TapeDelta[] } {
  const briefById = new Map(briefs.map((b) => [b.topicId, b]));
  const topicById = new Map(topics.map((t) => [t.id, t]));
  let ids = store.ids.filter((id) => topicById.has(id));
  if (autoWatchId && topicById.has(autoWatchId) && !ids.includes(autoWatchId)) {
    ids = [...ids, autoWatchId];
  }
  const snaps: Record<string, TapeSnapshot> = { ...store.snaps };
  const deltas: TapeDelta[] = [];

  for (const id of ids) {
    const topic = topicById.get(id);
    if (!topic) continue;
    const next = snapshotOf(topic, briefById.get(id), at);
    const prev = store.snaps[id];
    if (prev) {
      const lines = diffSnapshots(prev, next);
      if (lines.length) deltas.push({ topicId: id, label: topic.label, lines });
    }
    snaps[id] = next;
  }

  return { store: { ids, snaps }, deltas };
}
