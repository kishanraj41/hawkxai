"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import MindInspect from "@/components/desk/MindInspect";
import MindMapChart from "@/components/desk/MindMap";
import { SentimentChart } from "@/components/desk/SentimentChart";
import TimeseriesChart from "@/components/desk/TimeseriesChart";
import { TrendMark, trendAria } from "@/components/desk/TrendMarks";
import { CATEGORY_LABEL } from "@/lib/desk";
import { topicRisk } from "@/lib/booster";
import { PLATFORM_LABEL, topPosts, totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import { allTopicPosts, postsInBucket, topicsInBucket } from "@/lib/watchlist-lookup";
import type { EventTick } from "@/lib/event-ticks";
import type {
  BoosterTopicBrief,
  CausationReport,
  DeskCategory,
  MindGraph,
  MindNode,
  QueryInsight,
  SentimentReport,
  SnapshotPoint,
  TimeBucket,
  Topic,
} from "@/lib/types";

type DeskOpen = "mind" | "sentiment" | null;

interface DeskState {
  category: DeskCategory;
  topics: Topic[];
  selectedId: string | null;
  hoverId: string | null;
  series: TimeBucket[];
  causation: CausationReport | null;
  sentiment: SentimentReport | null;
  graph: MindGraph;
  loading: boolean;
  open: DeskOpen;
  inspectId: string | null;
  focus: Topic | null;
  brief?: BoosterTopicBrief;
  query?: QueryInsight | null;
  bucketT?: string | null;
  overlay?: { label: string; totals: number[] } | null;
  ticks?: EventTick[];
  history?: SnapshotPoint[];
}

interface DeskActions {
  select: (topic: Topic) => void;
  hover: (id: string | null) => void;
  open: (panel: DeskOpen) => void;
  inspect: (node: MindNode | null) => void;
  selectBucket?: (t: string | null) => void;
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
          {state.query ? `“${state.query.raw}” desk` : `${CATEGORY_LABEL[state.category]} desk`}
        </h1>
        <p className="mt-0.5 text-xs text-white/45">
          {state.query
            ? "Footprint of this phrase. Mind map of receipts, sentiment from titles, occurrence. Never an invented WHY."
            : "Look up a phrase. Mind map of receipts, sentiment from titles, occurrence. Never an invented WHY."}
        </p>
      </div>
      <div className="flex gap-4 font-mono text-[11px] tabular-nums">
        <Kpi label="Prints" value={String(state.topics.length)} />
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

function MindMapBody({
  tall,
  onInspect,
}: {
  tall?: boolean;
  onInspect: (node: MindNode | null) => void;
}) {
  const { state, actions } = useDesk();
  return (
    <div className={`relative overflow-hidden ${tall ? "min-h-0 flex-1" : "h-52"}`}>
      <MindMapChart
        graph={state.graph}
        topics={state.topics}
        selectedId={state.selectedId}
        hoverId={state.hoverId}
        inspectId={state.inspectId}
        onSelect={(topic) => {
          if (topic) actions.select(topic);
        }}
        onHover={actions.hover}
        onInspect={onInspect}
      />
    </div>
  );
}

function Mind() {
  const { state, actions } = useDesk();
  const inspect =
    state.graph.nodes.find((n) => n.id === state.inspectId) ??
    state.graph.nodes.find((n) => n.id === `topic:${state.selectedId}`) ??
    null;

  return (
    <div className="overflow-hidden rounded border border-white/8">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div>
          <p className="text-[13px] font-medium">Mind</p>
          <p className="signal-label">hover a blob to read it · click to open · shared dashes only</p>
        </div>
        <button
          type="button"
          onClick={() => actions.open("mind")}
          className="signal-label hover:text-white"
        >
          Open
        </button>
      </div>
      <MindMapBody
        onInspect={(node) => {
          actions.inspect(node);
          if (node) actions.open("mind");
        }}
      />
      {inspect && state.open !== "mind" ? (
        <p className="truncate border-t border-white/8 px-3 py-2 font-mono text-[10px] text-white/45">
          {inspect.kind} · {inspect.label}
          {inspect.detail ? ` · ${inspect.detail}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function MindSheet() {
  const { state, actions } = useDesk();
  const closeRef = useRef<HTMLButtonElement>(null);
  const inspect =
    state.graph.nodes.find((n) => n.id === state.inspectId) ??
    state.graph.nodes.find((n) => n.id === `topic:${state.selectedId}`) ??
    state.graph.nodes.find((n) => n.id === state.graph.hubId) ??
    null;

  useEffect(() => {
    if (state.open !== "mind") return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.open(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, actions]);

  if (state.open !== "mind") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mind map"
      className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[#0c0d10]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div>
          <p className="text-sm font-medium tracking-tight">
            {state.query ? `“${state.query.raw}” mind` : `${CATEGORY_LABEL[state.category]} mind`}
          </p>
          <p className="signal-label mt-0.5">
            Click a print, artifact, or first print. Amber dashes are shared receipts — never an invented link.
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={() => actions.open(null)}
          className="signal-label hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <MindMapBody tall onInspect={actions.inspect} />
        {inspect ? (
          <MindInspect
            node={inspect}
            graph={state.graph}
            topics={state.topics}
            brief={state.brief}
            onClose={() => actions.inspect(null)}
            onPick={(topic) => {
              actions.select(topic);
              actions.inspect(
                state.graph.nodes.find((n) => n.id === `topic:${topic.id}`) ?? null,
              );
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function Timeseries() {
  const { state, actions } = useDesk();
  const bucketT = state.bucketT ?? null;
  const selectedBucket = state.series.find((b) => b.t === bucketT) ?? null;
  const windowPosts = bucketT
    ? postsInBucket(allTopicPosts(state.topics), state.series, bucketT).slice(0, 12)
    : [];

  return (
    <div className="rounded-lg border border-white/8 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-medium">Occurrence</p>
        <p className="signal-label">
          {selectedBucket
            ? `${selectedBucket.label} · ${selectedBucket.total} in window · click again to clear`
            : "area · by source · CT · click a window"}
        </p>
      </div>
      {state.loading ? (
        <div className="h-32 animate-pulse rounded bg-white/5" />
      ) : (
        <TimeseriesChart
          series={state.series}
          firstAt={state.causation?.firstAt}
          selectedT={bucketT}
          onSelect={actions.selectBucket}
          overlay={state.overlay ?? null}
          ticks={state.ticks ?? []}
          history={state.history ?? []}
        />
      )}
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-white/45">
        <span>X</span>
        <span className="text-[#ff4500]">Reddit</span>
        <span className="text-[#ff6600]">HN</span>
        <span className="text-[#7dd3fc]">APIs</span>
        {state.causation?.firstAt ? <span className="text-[#e8a23a]">first print</span> : null}
        {state.overlay ? <span className="text-[#e4e4e7]">vs {state.overlay.label}</span> : null}
        {(state.history?.length ?? 0) >= 2 ? <span className="text-[#a78bfa]">hourly snaps</span> : null}
        {(state.ticks ?? []).some((t) => t.kind === "gdelt") ? <span className="text-[#7dd3fc]">GDELT</span> : null}
        {(state.ticks ?? []).some((t) => t.kind === "nws") ? <span className="text-[#38bdf8]">NWS</span> : null}
      </div>
      {state.overlay ? (
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
          Two occurrence lines. Not a shared WHY.
        </p>
      ) : null}
      {selectedBucket ? (
        <div className="mt-3">
          <p className="signal-label">Receipts · {selectedBucket.label} · {windowPosts.length}</p>
          {windowPosts.length === 0 ? (
            <p className="mt-1 text-[12px] text-white/50">
              No receipts in that window. Click the chart again to show all.
            </p>
          ) : (
            <ul className="mt-1 max-h-36 space-y-1 overflow-y-auto">
              {windowPosts.map((p) => (
                <li key={`${p.url}-${p.createdAt}`}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md px-1 py-1 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--amber)]"
                  >
                    <span className="line-clamp-2 text-[12px] leading-snug text-white/88">{p.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-white/40">
                      {PLATFORM_LABEL[p.platform]}
                      {p.sourceApi ? ` · ${p.sourceApi}` : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Sentiment() {
  const { state, actions } = useDesk();
  return (
    <div className="relative rounded-lg border border-white/8 p-4">
      <button
        type="button"
        onClick={() => actions.open("sentiment")}
        className="absolute inset-0 z-10 rounded-lg"
        aria-expanded={state.open === "sentiment"}
        aria-label="Open title sentiment"
      />
      <div className="pointer-events-none relative">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div>
            <p className="text-[13px] font-medium">Sentiment</p>
            <p className="signal-label">click to open · title correlation · receipts only</p>
          </div>
          <span className="signal-label">Open</span>
        </div>
        {state.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-6 rounded bg-white/5" />
            ))}
          </div>
        ) : (
          <SentimentChart.Peek report={state.sentiment} />
        )}
      </div>
    </div>
  );
}

function SentimentSheet() {
  const { state, actions } = useDesk();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state.open !== "sentiment") return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") actions.open(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, actions]);

  if (state.open !== "sentiment") return null;

  const posts = state.focus ? topPosts(state.focus, 12) : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Title sentiment"
      className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[#0c0d10]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div>
          <p className="text-sm font-medium tracking-tight">
            {state.focus?.label ?? "Sentiment"}
          </p>
          <p className="signal-label mt-0.5">Word hits in receipt titles. Never a generated mood.</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={() => actions.open(null)}
          className="signal-label hover:text-white"
        >
          Close
        </button>
      </div>
      {state.loading ? (
        <div className="p-4">
          <div className="h-32 animate-pulse rounded bg-white/5" />
        </div>
      ) : (
        <SentimentChart.Sheet report={state.sentiment} posts={posts} />
      )}
    </div>
  );
}

function Trends() {
  const { state, actions } = useDesk();
  const rows = topicsInBucket(state.topics, state.series, state.bucketT ?? null);
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
      <p className="signal-label mt-4">No prints in this filter — try All.</p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="signal-label mt-4">No prints in that window. Click the chart again to show all.</p>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[13px] font-medium">{state.query ? "Related prints" : "Trends"}</p>
        <p className="signal-label">J/K · click a row</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="signal-label">
            <th className="px-2 py-1.5 font-normal">Score</th>
            <th className="px-2 py-1.5 font-normal">Print</th>
            <th className="px-2 py-1.5 font-normal">Peak</th>
            <th className="px-2 py-1.5 text-right font-normal">Spread</th>
            <th className="px-2 py-1.5 text-right font-normal">Risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((topic) => {
            const active = topic.id === state.selectedId || topic.id === state.hoverId;
            const risk = topicRisk(topic);
            const category = TrendMark.category(topic, state.brief?.topicId === topic.id ? state.brief.artifacts : []);
            const name = trendAria(topic, category);
            return (
              <tr
                key={topic.id}
                tabIndex={0}
                title={name}
                aria-label={name}
                onClick={() => actions.select(topic)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    actions.select(topic);
                  }
                }}
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
                <td className="px-2 py-2">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <TrendMark.Tile topic={topic} category={category} size={24} />
                    <span className="max-w-[140px] truncate text-[12px]">{topic.label}</span>
                  </span>
                </td>
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

function Stage({ children }: { children: ReactNode }) {
  return <div className="relative min-h-0 flex-1">{children}</div>;
}

export const Desk = {
  Provider,
  Frame,
  Header,
  Stage,
  Mind,
  MindSheet,
  Timeseries,
  Sentiment,
  SentimentSheet,
  Causation: Sentiment,
  Trends,
};
