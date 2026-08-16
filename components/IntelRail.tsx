"use client";

import type { AgeLens, BoosterPayload, Topic } from "@/lib/types";
import { lensCaption } from "@/lib/brief";
import RiskBoard from "@/components/RiskBoard";
import TopicDetailPanel from "@/components/TopicDetailPanel";

interface IntelRailProps {
  selected: Topic | null;
  booster: BoosterPayload | null;
  topics: Topic[];
  hoverId: string | null;
  lens: AgeLens | "all";
  onSelect: (topic: Topic | null) => void;
  onPickId: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function IntelRail({
  selected,
  booster,
  topics,
  hoverId,
  lens,
  onSelect,
  onPickId,
  onHover,
}: IntelRailProps) {
  if (selected) {
    return (
      <aside className="signal-glass relative min-h-0 overflow-hidden">
        <TopicDetailPanel
          topic={selected}
          brief={booster?.briefs.find((b) => b.topicId === selected.id)}
          lens={lens}
          onClose={() => onSelect(null)}
        />
      </aside>
    );
  }

  const briefs = booster?.briefs.slice(0, 4) ?? [];
  const topicById = new Map(topics.map((t) => [t.id, t]));

  return (
    <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-4">
      <p className="text-sm font-medium tracking-tight">Desk</p>
      <p className="mt-2 line-clamp-3 text-pretty text-xs leading-relaxed text-white/50">
        {booster?.summary ?? "Waiting on live sources."}
      </p>

      <div className="mt-4">
        <RiskBoard
          topics={topics}
          selectedId={null}
          hoverId={hoverId}
          onSelect={onSelect}
          onHover={onHover}
        />
      </div>

      <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {briefs.map((b) => {
          const topic = topicById.get(b.topicId);
          return (
            <li key={b.topicId}>
              <button
                type="button"
                onClick={() => onPickId(b.topicId)}
                onMouseEnter={() => onHover(b.topicId)}
                onMouseLeave={() => onHover(null)}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${
                  hoverId === b.topicId
                    ? "border-white/25 bg-white/[0.04]"
                    : "border-white/8 hover:border-white/16"
                }`}
              >
                <p className="line-clamp-2 text-[13px] leading-snug text-white">
                  {topic?.label ?? b.campaign.hook}
                </p>
                <p className="signal-label mt-2">
                  {b.campaign.risk} risk · {b.campaign.timing}
                </p>
                {lens !== "all" ? (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/50">
                    {lensCaption(b, lens)}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
