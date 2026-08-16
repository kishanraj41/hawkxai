"use client";

import { useMemo } from "react";
import MindMapChart from "@/components/desk/MindMap";
import { CATEGORY_LABEL } from "@/lib/desk";
import { buildMindMap } from "@/lib/mindmap";
import type { BoosterPayload, DeskCategory, Topic } from "@/lib/types";

interface MindDeskProps {
  category: DeskCategory;
  topics: Topic[];
  selected: Topic | null;
  hoverId: string | null;
  booster: BoosterPayload | null;
  loading: boolean;
  onSelect: (topic: Topic | null) => void;
  onHover: (id: string | null) => void;
}

export default function MindDesk({
  category,
  topics,
  selected,
  hoverId,
  booster,
  loading,
  onSelect,
  onHover,
}: MindDeskProps) {
  const graph = useMemo(
    () => buildMindMap(topics, booster?.briefs ?? [], category),
    [topics, booster, category],
  );
  const artifacts = graph.nodes.filter((n) => n.kind === "artifact").length;

  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-medium tracking-tight">{CATEGORY_LABEL[category]} mind</h1>
          <p className="mt-0.5 text-xs text-white/45">
            Hub is the plug. Branches are receipts. Amber dashes are shared artifacts — never an invented link.
          </p>
        </div>
        <div className="flex gap-4 font-mono text-[11px] tabular-nums">
          <Kpi label="Names" value={String(topics.length)} />
          <Kpi label="Artifacts" value={String(artifacts)} />
          <Kpi label="Bridges" value={String(graph.bridges)} />
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-full border border-white/10" />
          </div>
        ) : (
          <MindMapChart
            graph={graph}
            topics={topics}
            selectedId={selected?.id ?? null}
            hoverId={hoverId}
            onSelect={onSelect}
            onHover={onHover}
          />
        )}
      </div>
      <div className="flex shrink-0 gap-4 border-t border-white/8 px-4 py-2 font-mono text-[10px] text-white/45">
        <span className="text-[#e8a23a]">hub</span>
        <span>topic</span>
        <span className="text-[#7dd3fc]">artifact</span>
        <span className="text-[#34d399]">first print</span>
        <span className="text-[#e8a23a]">shared</span>
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="signal-label">{label}</p>
      <p className="mt-0.5 text-base tabular-nums text-white">{value}</p>
    </div>
  );
}
