"use client";

import { useMemo } from "react";
import { Desk } from "@/components/desk/Desk";
import FloorBrief from "@/components/desk/FloorBrief";
import { buildCausation, buildTimeseries } from "@/lib/desk";
import { buildMindMap } from "@/lib/mindmap";
import { buildSentiment } from "@/lib/sentiment";
import type { BoosterPayload, QueryInsight, Topic } from "@/lib/types";
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
    () => buildMindMap(topics, booster?.briefs ?? [], category),
    [topics, booster, category],
  );
  const causation = useMemo(() => {
    if (!focus) return null;
    return brief?.causation ?? buildCausation(focus, brief?.artifacts ?? []);
  }, [focus, brief]);
  const sentiment = useMemo(() => {
    if (!focus) return null;
    return brief?.sentiment ?? buildSentiment(focus);
  }, [focus, brief]);

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
      }}
      actions={{ select: onSelect, hover: onHover }}
    >
      <Desk.Frame>
        <Desk.Header />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
      </Desk.Frame>
    </Desk.Provider>
  );
}
