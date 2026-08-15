"use client";

import { topicRisk } from "@/lib/booster";
import { totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import type { Platform, Topic, TrendsPayload } from "@/lib/types";

type SortKey = "score" | Platform | "risk";

const RISK_RANK = { high: 3, medium: 2, low: 1 };

function HeatBar({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <button type="button" onClick={onClick} className="w-full space-y-1 text-left">
      <div className="flex items-center justify-between">
        <span className={`signal-label ${active ? "text-white" : ""}`}>{label}</span>
        <span className="font-mono text-[10px] tabular-nums text-white/70">{Math.round(value)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/70"
          style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, opacity: active ? 1 : 0.55 }}
        />
      </div>
    </button>
  );
}

interface OverviewRailProps {
  payload: TrendsPayload | null;
  topics: Topic[];
  selectedId: string | null;
  hoverId: string | null;
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  onSelect: (topic: Topic) => void;
  onHover: (id: string | null) => void;
}

export default function OverviewRail({
  payload,
  topics,
  selectedId,
  hoverId,
  sortKey,
  onSort,
  onSelect,
  onHover,
}: OverviewRailProps) {
  const xAvg =
    topics.length === 0 ? 0 : topics.reduce((s, t) => s + t.platforms.x.score, 0) / topics.length;
  const redditAvg =
    topics.length === 0
      ? 0
      : topics.reduce((s, t) => s + t.platforms.reddit.score, 0) / topics.length;
  const hnAvg =
    topics.length === 0 ? 0 : topics.reduce((s, t) => s + t.platforms.hn.score, 0) / topics.length;

  const ranked = [...topics].toSorted((a, b) => {
    const av =
      sortKey === "score"
        ? totalScore(a)
        : sortKey === "risk"
          ? RISK_RANK[topicRisk(a)]
          : a.platforms[sortKey].score;
    const bv =
      sortKey === "score"
        ? totalScore(b)
        : sortKey === "risk"
          ? RISK_RANK[topicRisk(b)]
          : b.platforms[sortKey].score;
    return bv - av;
  });

  return (
    <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium tracking-tight">Watchlist</p>
        <span className="font-mono text-[10px] tabular-nums text-white/45">
          {topics.length} names
        </span>
      </div>
      <p className="mt-1 text-xs text-white/45">
        {payload?.sources.x ? "X" : "X off"} · {payload?.sources.reddit ? "Reddit" : "Reddit off"} ·{" "}
        {payload?.sources.hn ? "HN" : "HN off"}
      </p>

      <div className="mt-4 space-y-2.5">
        <HeatBar label="X" value={xAvg} active={sortKey === "x"} onClick={() => onSort("x")} />
        <HeatBar
          label="Reddit"
          value={redditAvg}
          active={sortKey === "reddit"}
          onClick={() => onSort("reddit")}
        />
        <HeatBar label="HN" value={hnAvg} active={sortKey === "hn"} onClick={() => onSort("hn")} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onSort("score")}
          className={`signal-label ${sortKey === "score" ? "text-white" : ""}`}
        >
          Score
        </button>
        <button
          type="button"
          onClick={() => onSort("risk")}
          className={`signal-label ${sortKey === "risk" ? "text-white" : ""}`}
        >
          Risk
        </button>
      </div>

      <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {ranked.map((t) => {
          const active = selectedId === t.id || hoverId === t.id;
          const risk = topicRisk(t);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                onMouseEnter={() => onHover(t.id)}
                onMouseLeave={() => onHover(null)}
                className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ${
                  active ? "bg-white/8" : "hover:bg-white/[0.04]"
                }`}
              >
                <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums">
                  {Math.round(totalScore(t))}
                </span>
                <span
                  className={`w-3 shrink-0 text-center text-[10px] ${
                    t.velocity === "rising"
                      ? "text-emerald-400"
                      : t.velocity === "fading"
                        ? "text-red-400"
                        : "text-white/35"
                  }`}
                >
                  {VELOCITY_MARK[t.velocity]}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] leading-tight">{t.label}</span>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    risk === "high"
                      ? "bg-red-400"
                      : risk === "medium"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
