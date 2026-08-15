"use client";

import { totalScore } from "@/lib/metrics";
import type { Topic, TrendsPayload } from "@/lib/types";

function RingGauge({
  value,
  max,
  caption,
  color,
}: {
  value: number;
  max: number;
  caption: string;
  color: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1c2333" strokeWidth="7" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform="rotate(-90 48 48)"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text
          x="48"
          y="46"
          textAnchor="middle"
          fill="#f4f1ea"
          fontSize="16"
          fontWeight="600"
        >
          {value}
        </text>
        <text x="48" y="62" textAnchor="middle" fill="#7c8598" fontSize="9">
          / {max}
        </text>
      </svg>
      <p className="signal-label text-center">{caption}</p>
    </div>
  );
}

function EffortBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(4, Math.min(100, value));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="signal-label">{label}</span>
        <span className="signal-label tabular-nums text-[#f4f1ea]">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#1c2333]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

interface OverviewRailProps {
  payload: TrendsPayload | null;
  topics: Topic[];
  selectedId: string | null;
  onSelect: (topic: Topic) => void;
}

export default function OverviewRail({
  payload,
  topics,
  selectedId,
  onSelect,
}: OverviewRailProps) {
  const rising = topics.filter((t) => t.velocity === "rising").length;
  const sourcesOn = payload
    ? Number(payload.sources.x) + Number(payload.sources.reddit) + Number(payload.sources.hn)
    : 0;
  const xAvg =
    topics.length === 0
      ? 0
      : topics.reduce((s, t) => s + t.platforms.x.score, 0) / topics.length;
  const redditAvg =
    topics.length === 0
      ? 0
      : topics.reduce((s, t) => s + t.platforms.reddit.score, 0) / topics.length;
  const hnAvg =
    topics.length === 0
      ? 0
      : topics.reduce((s, t) => s + t.platforms.hn.score, 0) / topics.length;
  const ranked = [...topics].sort((a, b) => totalScore(b) - totalScore(a)).slice(0, 7);

  return (
    <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-4">
      <p className="text-[15px] font-medium tracking-tight text-[#f4f1ea]">
        Signal overview
      </p>
      <p className="mt-1 text-xs text-[#7c8598]">
        Monitoring {topics.length || "—"} live topics across X, Reddit, HN.
      </p>

      <div className="mt-5 flex justify-around">
        <RingGauge
          value={rising}
          max={Math.max(topics.length, 1)}
          caption="rising"
          color="#ffb24d"
        />
        <RingGauge
          value={sourcesOn}
          max={3}
          caption="sources synced"
          color="#38bdf8"
        />
      </div>

      <div className="mt-6 space-y-3">
        <p className="signal-label">Platform heat</p>
        <EffortBar label="X" value={xAvg} color="#f4f1ea" />
        <EffortBar label="Reddit" value={redditAvg} color="#ff7a18" />
        <EffortBar label="HN" value={hnAvg} color="#ffb24d" />
      </div>

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <p className="signal-label mb-3">Hottest clusters</p>
        <ul className="space-y-1">
          {ranked.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm leading-snug transition-colors ${
                  selectedId === t.id
                    ? "bg-[#ffb24d]/10 text-[#f4f1ea]"
                    : "text-[#c5c9d4] hover:bg-white/[0.04]"
                }`}
              >
                <span className="line-clamp-2">{t.label}</span>
                <span className="signal-label mt-1 block tabular-nums">
                  {t.velocity} · {totalScore(t)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
