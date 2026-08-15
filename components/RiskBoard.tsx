"use client";

import { topicRisk } from "@/lib/booster";
import { totalScore } from "@/lib/ui-helpers";
import type { Topic } from "@/lib/types";

const RISK_FILL = {
  low: "#34d399",
  medium: "#e8a23a",
  high: "#f87171",
};

interface RiskBoardProps {
  topics: Topic[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (topic: Topic) => void;
  onHover: (id: string | null) => void;
}

export default function RiskBoard({
  topics,
  selectedId,
  hoverId,
  onSelect,
  onHover,
}: RiskBoardProps) {
  const max = Math.max(...topics.map((t) => totalScore(t)), 1);
  const w = 280;
  const h = 140;
  const pad = 18;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="signal-label">Risk vs heat</p>
        <p className="signal-label">x concentration · y score</p>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Risk versus heat scatter"
      >
        <line x1={pad} y1={h - pad} x2={w - 8} y2={h - pad} stroke="rgba(255,255,255,0.12)" />
        <line x1={pad} y1={8} x2={pad} y2={h - pad} stroke="rgba(255,255,255,0.12)" />
        {topics.map((t) => {
          const x = pad + t.divergence * (w - pad - 12);
          const y = h - pad - (totalScore(t) / max) * (h - pad - 12);
          const active = t.id === selectedId || t.id === hoverId;
          const r = t.velocity === "rising" ? 5.5 : 4;
          return (
            <circle
              key={t.id}
              cx={x}
              cy={y}
              r={active ? r + 1.5 : r}
              fill={RISK_FILL[topicRisk(t)]}
              fillOpacity={active ? 1 : 0.75}
              stroke={active ? "#fff" : "transparent"}
              strokeWidth={1}
              className="cursor-pointer"
              onMouseEnter={() => onHover(t.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(t)}
            >
              <title>
                {t.label} · {topicRisk(t)} risk · {Math.round(totalScore(t))}
              </title>
            </circle>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-3">
        <span className="signal-label text-emerald-400">Low</span>
        <span className="signal-label text-amber-400">Medium</span>
        <span className="signal-label text-red-400">High</span>
      </div>
    </div>
  );
}
