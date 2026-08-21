"use client";

import { useCallback, useMemo, useState } from "react";
import { Desk } from "@/components/desk/Desk";
import FloorBrief from "@/components/desk/FloorBrief";
import { buildCausation, buildTimeseries } from "@/lib/desk";
import { buildMindMap } from "@/lib/mindmap";
import { buildSentiment } from "@/lib/sentiment";
import type { BoosterPayload, MindNode, QueryInsight, Topic } from "@/lib/types";
import type { DeskCategory } from "@/lib/types";

interface ChartDeskProps {
  category: DeskCategory;
  topics: Topic[];
  selected: Topic | null;
  hoverId: string | null;
  booster: BoosterPayload | null;
  loading: boolean;
  query?: QueryInsight | null;
  takeaway?: string;
  onSelect: (topic: Topic) => void;
  onHover: (id: string | null) => void;
}

export default function ChartDesk({
  category,
  topics,
  selected,
  hoverId,
  booster,
  loading,
  query = null,
  takeaway,
  onSelect,
  onHover,
}: ChartDeskProps) {
  const focus = selected ?? topics[0] ?? null;
  const brief = focus ? booster?.briefs.find((b) => b.topicId === focus.id) : undefined;
  const series = useMemo(() => buildTimeseries(topics), [topics]);
  const graph = useMemo(
    () =>
      buildMindMap(
        topics,
        booster?.briefs ?? [],
        category,
        query
          ? { label: query.raw.slice(0, 42), detail: `${topics.length} related prints` }
          : undefined,
        booster?.forecasts ?? [],
      ),
    [topics, booster, category, query],
  );
  const causation = useMemo(() => {
    if (!focus) return null;
    return brief?.causation ?? buildCausation(focus, brief?.artifacts ?? []);
  }, [focus, brief]);
  const sentiment = useMemo(() => {
    if (!focus) return null;
    return brief?.sentiment ?? buildSentiment(focus);
  }, [focus, brief]);
  const [open, setOpen] = useState<"mind" | "sentiment" | null>(null);
  const [inspect, setInspect] = useState<MindNode | null>(null);
  const openPanel = useCallback((panel: "mind" | "sentiment" | null) => setOpen(panel), []);
  const inspectNode = useCallback((node: MindNode | null) => setInspect(node), []);
  const actions = useMemo(
    () => ({
      select: onSelect,
      hover: onHover,
      open: openPanel,
      inspect: inspectNode,
    }),
    [onSelect, onHover, openPanel, inspectNode],
  );

  return (
    <Desk.Provider
      state={{
        category,
        topics,
        selectedId: selected?.id ?? null,
        hoverId,
        series,
        causation,
        sentiment,
        graph,
        loading,
        open,
        inspectId: inspect?.id ?? null,
        focus,
        brief,
        query,
      }}
      actions={actions}
    >
      <Desk.Frame>
        <Desk.Header />
        <Desk.Stage>
          <div className="h-full min-h-0 overflow-y-auto p-4">
            {query ? (
              <div className="mb-4">
                <FloorBrief
                  query={query}
                  sentiment={sentiment}
                  hook={brief?.campaign.hook}
                  takeaway={takeaway}
                />
              </div>
            ) : null}
            <Desk.Mind />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Desk.Timeseries />
              <Desk.Sentiment />
            </div>
            <Desk.Trends />
          </div>
          <Desk.MindSheet />
          <Desk.SentimentSheet />
        </Desk.Stage>
      </Desk.Frame>
    </Desk.Provider>
  );
}
