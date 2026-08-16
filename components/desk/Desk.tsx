"use client";

import { createContext, useContext, type ReactNode } from "react";
import CausationChart from "@/components/desk/CausationChart";
import MindMapChart from "@/components/desk/MindMap";
import TimeseriesChart from "@/components/desk/TimeseriesChart";
import { CATEGORY_LABEL } from "@/lib/desk";
import { topicRisk } from "@/lib/booster";
import { totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import type { CausationReport, DeskCategory, MindGraph, TimeBucket, Topic } from "@/lib/types";

interface DeskState {
  category: DeskCategory;
  topics: Topic[];
  selectedId: string | null;
  hoverId: string | null;
  series: TimeBucket[];
  causation: CausationReport | null;
  graph: MindGraph;
  loading: boolean;
}

interface DeskActions {
  select: (topic: Topic) => void;
  hover: (id: string | null) => void;
}

interface DeskContextValue {
  state: DeskState;
  actions: DeskActions;
}

const DeskContext = createContext<DeskContextValue | null>(null);

function useDesk(): DeskContextValue {
  const value = useContext(DeskContext);
  if (!value) throw new Error("Desk parts must sit inside Desk.Provider");
  return value;
}

function Provider({
  state,
  actions,
  children,
}: {
  state: DeskState;
  actions: DeskActions;
  children: ReactNode;
}) {
  return <DeskContext.Provider value={{ state, actions }}>{children}</DeskContext.Provider>;
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">{children}</section>
  );
}

function Header() {
  const { state } = useDesk();
  const rising = state.topics.filter((t) => t.velocity === "rising").length;
  const first = state.causation?.firstAt
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      }).format(new Date(state.causation.firstAt))
    : "—";
  const lag =
    state.causation?.lagHours != null ? `${state.causation.lagHours}h` : "single-source";

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
      <div>
        <h1 className="text-sm font-medium tracking-tight">
          {CATEGORY_LABEL[state.category]} desk
        </h1>
        <p className="mt-0.5 text-xs text-white/45">
          Plug a category. Mind map of receipts, measured drivers, occurrence. Never an invented WHY.
        </p>
      </div>
      <div className="flex gap-4 font-mono text-[11px] tabular-nums">
        <Kpi label="Names" value={String(state.topics.length)} />
        <Kpi label="Rising" value={String(rising)} />
        <Kpi label="First print" value={first} />
        <Kpi label="Lag" value={lag} />
      </div>
    </div>
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

function Mind() {
  const { state, actions } = useDesk();
  return (
    <div className="relative h-52 overflow-hidden rounded border border-white/8">
      <MindMapChart
        graph={state.graph}
        topics={state.topics}
        selectedId={state.selectedId}
        hoverId={state.hoverId}
        onSelect={(topic) => {
          if (topic) actions.select(topic);
        }}
        onHover={actions.hover}
      />
    </div>
  );
}

function Timeseries() {
  const { state } = useDesk();
  return (
    <div className="rounded-lg border border-white/8 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-medium">Occurrence</p>
        <p className="signal-label">area · by source · CT</p>
      </div>
      {state.loading ? (
        <div className="h-32 animate-pulse rounded bg-white/5" />
      ) : (
        <TimeseriesChart series={state.series} firstAt={state.causation?.firstAt} />
      )}
      <div className="mt-2 flex gap-3 font-mono text-[10px] text-white/45">
        <span>X</span>
        <span className="text-[#ff4500]">Reddit</span>
        <span className="text-[#ff6600]">HN</span>
        <span className="text-[#7dd3fc]">APIs</span>
        {state.causation?.firstAt ? <span className="text-[#e8a23a]">first print</span> : null}
      </div>
    </div>
  );
}

function Causation() {
  const { state } = useDesk();
  return (
    <div className="rounded-lg border border-white/8 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-medium">Causation</p>
        <p className="signal-label">measured drivers</p>
      </div>
      {state.loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-6 rounded bg-white/5" />
          ))}
        </div>
      ) : (
        <CausationChart report={state.causation} />
      )}
    </div>
  );
}

function Trends() {
  const { state, actions } = useDesk();
  if (state.loading) {
    return (
      <div className="mt-4 space-y-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-8 rounded bg-white/5" />
        ))}
      </div>
    );
  }
  if (state.topics.length === 0) {
    return (
      <p className="signal-label mt-4">No names in this category — plug All or another desk.</p>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-medium">Trends</p>
        <p className="signal-label">J/K · click a row</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="signal-label">
            <th className="px-2 py-1.5 font-normal">Score</th>
            <th className="px-2 py-1.5 font-normal">Name</th>
            <th className="px-2 py-1.5 font-normal">Peak</th>
            <th className="px-2 py-1.5 text-right font-normal">Spread</th>
            <th className="px-2 py-1.5 text-right font-normal">Risk</th>
          </tr>
        </thead>
        <tbody>
          {state.topics.map((topic) => {
            const active = topic.id === state.selectedId || topic.id === state.hoverId;
            const risk = topicRisk(topic);
            return (
              <tr
                key={topic.id}
                onClick={() => actions.select(topic)}
                onMouseEnter={() => actions.hover(topic.id)}
                onMouseLeave={() => actions.hover(null)}
                className={`cursor-pointer transition-colors duration-80 ${
                  active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                }`}
                style={active ? { boxShadow: "inset 2px 0 0 #e8a23a" } : undefined}
              >
                <td className="px-2 py-2 text-right font-mono text-[12px] tabular-nums">
                  <span className="mr-2 text-white/40">{VELOCITY_MARK[topic.velocity]}</span>
                  {Math.round(totalScore(topic))}
                </td>
                <td className="max-w-[160px] truncate px-2 py-2 text-[12px]">{topic.label}</td>
                <td className="px-2 py-2 font-mono text-[11px] tabular-nums text-white/55">
                  {topic.peakHourCT ?? "—"}
                </td>
                <td className="px-2 py-2 text-right font-mono text-[11px] tabular-nums text-white/55">
                  {topic.divergence >= 0.66 ? "bubble" : "spread"}
                </td>
                <td
                  className={`px-2 py-2 text-right font-mono text-[11px] tabular-nums ${
                    risk === "high"
                      ? "text-red-400"
                      : risk === "medium"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {risk}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const Desk = {
  Provider,
  Frame,
  Header,
  Mind,
  Timeseries,
  Causation,
  Trends,
};
