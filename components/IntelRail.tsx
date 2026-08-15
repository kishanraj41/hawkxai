"use client";

import type { BoosterPayload, Topic } from "@/lib/types";
import TopicDetailPanel from "@/components/TopicDetailPanel";

interface IntelRailProps {
  selected: Topic | null;
  booster: BoosterPayload | null;
  onSelect: (topic: Topic | null) => void;
  onPickId: (id: string) => void;
}

export default function IntelRail({
  selected,
  booster,
  onSelect,
  onPickId,
}: IntelRailProps) {
  if (selected) {
    return (
      <aside className="signal-glass relative min-h-0 overflow-hidden">
        <TopicDetailPanel
          topic={selected}
          brief={booster?.briefs.find((b) => b.topicId === selected.id)}
          onClose={() => onSelect(null)}
        />
      </aside>
    );
  }

  const briefs = booster?.briefs.slice(0, 5) ?? [];

  return (
    <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-medium tracking-tight text-[#f4f1ea]">
          Booster intel
        </p>
        <span className="signal-label">booster</span>
      </div>
      <p className="mt-2 text-pretty text-xs leading-relaxed text-[#7c8598]">
        {booster?.summary ?? "Load trends to capture hashtags, QRs, and campaign hooks."}
      </p>

      <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {briefs.map((b) => (
          <li key={b.topicId}>
            <button
              type="button"
              onClick={() => onPickId(b.topicId)}
              className="w-full rounded-xl border border-[#1c2333] bg-[#05060a]/50 px-3 py-3 text-left transition-colors hover:border-[#ffb24d]/40"
            >
              <p className="line-clamp-2 text-sm text-[#f4f1ea]">{b.whyTrending}</p>
              <p className="signal-label mt-2">
                {b.campaign.risk} risk · {b.campaign.timing}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {booster?.improvisations[0] ? (
        <p className="signal-label mt-3 border-t border-[#1c2333] pt-3 text-[#f4f1ea]">
          Next {booster.improvisations[0].priority}: {booster.improvisations[0].title}
        </p>
      ) : null}
    </aside>
  );
}
