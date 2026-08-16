"use client";

import { useMemo } from "react";
import { Desk } from "@/components/desk/Desk";
import { buildCausation, buildTimeseries } from "@/lib/desk";
import type { BoosterPayload, Topic } from "@/lib/types";
import type { DeskCategory } from "@/lib/types";

interface ChartDeskProps {
  category: DeskCategory;
  topics: Topic[];
  selected: Topic | null;
  hoverId: string | null;
  booster: BoosterPayload | null;
  loading: boolean;
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
  onSelect,
  onHover,
}: ChartDeskProps) {
  const focus = selected ?? topics[0] ?? null;
  const brief = focus ? booster?.briefs.find((b) => b.topicId === focus.id) : undefined;
  const series = useMemo(() => buildTimeseries(topics), [topics]);
  const causation = useMemo(() => {
    if (!focus) return null;
    return brief?.causation ?? buildCausation(focus, brief?.artifacts ?? []);
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
        loading,
      }}
      actions={{ select: onSelect, hover: onHover }}
    >
      <Desk.Frame>
        <Desk.Header />
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Desk.Timeseries />
            <Desk.Causation />
          </div>
          <Desk.Trends />
        </div>
      </Desk.Frame>
    </Desk.Provider>
  );
}
