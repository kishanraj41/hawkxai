"use client";

import { useMemo, useState } from "react";
import MindInspect from "@/components/desk/MindInspect";
import MindMapChart from "@/components/desk/MindMap";
import { CATEGORY_LABEL } from "@/lib/desk";
import { buildMindMap } from "@/lib/mindmap";
import type { BoosterPayload, DeskCategory, MindNode, Topic } from "@/lib/types";

interface MindDeskProps {
  category: DeskCategory;
  topics: Topic[];
  selected: Topic | null;
  hoverId: string | null;
  booster: BoosterPayload | null;
  loading: boolean;
  caption?: string;
  phrase?: string;
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
  caption,
  phrase,
  onSelect,
  onHover,
}: MindDeskProps) {
  const graph = useMemo(
    () =>
      buildMindMap(
        topics,
        booster?.briefs ?? [],
        category,
        phrase
          ? { label: phrase.slice(0, 42), detail: `${topics.length} related prints` }
          : undefined,
        booster?.forecasts ?? [],
      ),
    [topics, booster, category, phrase],
  );
  const artifacts = graph.nodes.filter((n) => n.kind === "artifact").length;
  const [inspect, setInspect] = useState<MindNode | null>(null);
  const node =
    inspect ??
    graph.nodes.find((n) => n.id === `topic:${selected?.id}`) ??
    null;
  const brief = node?.topicId
    ? booster?.briefs.find((b) => b.topicId === node.topicId)
    : undefined;

  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/8 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-sm font-medium tracking-tight">
            {phrase ? `“${phrase}” mind` : `${CATEGORY_LABEL[category]} mind`}
          </h1>
          <p className="mt-0.5 text-xs text-white/45">
            {caption
              ? caption
              : "Tap a print or leaf. Analysis and next-window call come from collected snapshots — never an invented WHY."}
          </p>
        </div>
        <div className="flex shrink-0 gap-4 font-mono text-[11px] tabular-nums">
          <Kpi label="Prints" value={String(topics.length)} />
          <Kpi label="Artifacts" value={String(artifacts)} />
          <Kpi label="Bridges" value={String(graph.bridges)} />
          <Kpi
            label="Called"
            value={String((booster?.forecasts ?? []).filter((f) => !f.thin && f.kind !== "hub").length)}
          />
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-full border border-white/10" />
          </div>
        ) : (
          <div className="relative min-h-0 min-w-0 flex-1">
            <MindMapChart
              graph={graph}
              topics={topics}
              selectedId={selected?.id ?? null}
              hoverId={hoverId}
              inspectId={inspect?.id ?? null}
              onSelect={onSelect}
              onHover={onHover}
              onInspect={setInspect}
            />
          </div>
        )}
        {node && !loading ? (
          <MindInspect
            node={node}
            graph={graph}
            topics={topics}
            brief={brief}
            onClose={() => {
              setInspect(null);
              onSelect(null);
            }}
            onPick={(topic) => {
              onSelect(topic);
              setInspect(graph.nodes.find((n) => n.id === `topic:${topic.id}`) ?? null);
            }}
          />
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-t border-white/8 px-4 py-2 font-mono text-[10px] text-white/45">
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
