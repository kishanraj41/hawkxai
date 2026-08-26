"use client";

import { useMemo } from "react";
import TimeseriesChart from "@/components/desk/TimeseriesChart";
import { buildCausation, buildTimeseries } from "@/lib/desk";
import { buildEventTicks } from "@/lib/event-ticks";
import { alignTotals } from "@/lib/occurrence-overlay";
import { divergenceLabel, PLATFORM_LABEL, totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import { PLATFORMS, type SnapshotPoint, type TimeBucket, type TrendsPayload } from "@/lib/types";
import { leadTopic, postsInBucket, relatedPrints, topicPosts } from "@/lib/watchlist-lookup";
import { pct } from "@/lib/watchlist-metrics";
import type { PoiInsight } from "@/lib/types";

export function TermStage({
  payload,
  insight = null,
  loading,
  bucketT,
  queryLabel,
  emptyTitle = "No live print yet",
  emptyCopy = "Plug a company or campaign. Occurrence and receipts fill from live tape — never an invented WHY.",
  onSelectBucket,
  onSelectRelated,
  overlayPayload = null,
  overlayLabel = null,
  history = [],
}: {
  payload: TrendsPayload | null;
  insight?: PoiInsight | null;
  loading: boolean;
  bucketT: string | null;
  queryLabel?: string;
  emptyTitle?: string;
  emptyCopy?: string;
  onSelectBucket: (t: string | null) => void;
  onSelectRelated: (label: string) => void;
  overlayPayload?: TrendsPayload | null;
  overlayLabel?: string | null;
  history?: SnapshotPoint[];
}) {
  const lead = leadTopic(payload);
  const neighbors = relatedPrints(payload);
  const series = useMemo(() => (lead ? buildTimeseries([lead]) : []), [lead]);
  const overlayLead = leadTopic(overlayPayload);
  const overlaySeries = useMemo(() => (overlayLead ? buildTimeseries([overlayLead]) : []), [overlayLead]);
  const overlay = useMemo(() => {
    if (!overlayLabel || overlaySeries.length === 0) return null;
    return { label: overlayLabel, totals: alignTotals(series, overlaySeries) };
  }, [overlayLabel, overlaySeries, series]);
  const ticks = useMemo(() => (lead ? buildEventTicks([lead]) : []), [lead]);
  const causation = useMemo(() => (lead ? buildCausation(lead) : null), [lead]);
  const posts = useMemo(() => topicPosts(lead), [lead]);
  const shown = useMemo(() => postsInBucket(posts, series, bucketT), [posts, series, bucketT]);
  const query = payload?.query ?? null;
  const heatMax = lead ? Math.max(...PLATFORMS.map((p) => lead.platforms[p]?.score ?? 0), 1) : 1;
  const selectedBucket: TimeBucket | null = series.find((b) => b.t === bucketT) ?? null;

  if (loading && !lead) {
    return (
      <section className="watch-term" aria-busy="true" aria-label="Term trends">
        <p className="signal-label">Looking up…</p>
        <div className="mt-3 h-40 animate-pulse rounded bg-white/5" />
      </section>
    );
  }

  if (!lead) {
    return (
      <section className="watch-term" aria-label="Term trends">
        <p className="text-[13px] font-medium tracking-tight">{emptyTitle}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/55">{emptyCopy}</p>
      </section>
    );
  }

  const score = Math.round(totalScore(lead));

  return (
    <section className="watch-term" aria-label={`Trends for ${lead.label}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium tracking-tight">{queryLabel || lead.label}</p>
          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-white/45">
            {VELOCITY_MARK[lead.velocity]} {lead.velocity}
            {" · "}
            {divergenceLabel(lead)}
            {" · "}
            score {score}
            {lead.match ? ` · ${lead.match}` : ""}
            {query ? ` · ${query.kind}` : ""}
          </p>
        </div>
        {insight ? (
          <p className="font-mono text-[10px] tabular-nums text-white/45">
            {insight.thin ? "thin overlap" : `${pct(insight.occupancy)} occupied`}
            {insight.delta ? ` · Δ ${insight.delta > 0 ? "+" : ""}${insight.delta}` : ""}
          </p>
        ) : null}
      </div>

      {query?.floor ? (
        <p className="mt-2 text-[12px] leading-relaxed text-white/75">{query.floor}</p>
      ) : null}

      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="signal-label">Occurrence</p>
          <p className="signal-label">
            {selectedBucket
              ? `${selectedBucket.label} · ${selectedBucket.total} in window · click again to clear`
              : "area · by source · CT · click a window"}
          </p>
        </div>
        {loading ? <div className="h-40 animate-pulse rounded bg-white/5" /> : null}
        <TimeseriesChart
          series={series}
          firstAt={causation?.firstAt}
          height={160}
          selectedT={bucketT}
          onSelect={onSelectBucket}
          overlay={overlay}
          ticks={ticks}
          history={history}
        />
        <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-white/45">
          <span>X</span>
          <span className="text-[#ff4500]">Reddit</span>
          <span className="text-[#ff6600]">HN</span>
          <span className="text-[#7dd3fc]">APIs</span>
          {causation?.firstAt ? <span className="text-[#e8a23a]">first print</span> : null}
          {overlay ? <span className="text-[#e4e4e7]">vs {overlay.label}</span> : null}
          {history.length >= 2 ? <span className="text-[#a78bfa]">hourly snaps</span> : null}
          {ticks.some((t) => t.kind === "gdelt") ? <span className="text-[#7dd3fc]">GDELT</span> : null}
          {ticks.some((t) => t.kind === "nws") ? <span className="text-[#38bdf8]">NWS</span> : null}
        </div>
        {overlay ? (
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">Two occurrence lines. Not a shared WHY.</p>
        ) : null}
      </div>

      <ul className="mt-3 space-y-1.5" aria-label="Source heat">
        {PLATFORMS.map((p) => {
          const slice = lead.platforms[p];
          const n = slice?.posts.length ?? 0;
          const share = (slice?.score ?? 0) / heatMax;
          return (
            <li key={p}>
              <div className="watch-bar">
                <span className="watch-bar__name">{PLATFORM_LABEL[p]}</span>
                <span className="watch-bar__track" aria-hidden>
                  <span className="watch-bar__fill is-organic" style={{ transform: `scaleX(${Math.max(share, n ? 0.04 : 0)})` }} />
                </span>
                <span className="watch-bar__n">{n}</span>
              </div>
            </li>
          );
        })}
      </ul>

      {causation && causation.drivers.length > 0 ? (
        <div className="mt-3">
          <p className="signal-label">Drivers from receipts</p>
          <ul className="mt-1.5 space-y-1.5">
            {causation.drivers.slice(0, 5).map((d) => (
              <li key={d.id}>
                <div className="watch-bar">
                  <span className="watch-bar__name" title={d.evidence}>
                    {d.label}
                  </span>
                  <span className="watch-bar__track" aria-hidden>
                    <span className="watch-bar__fill" style={{ transform: `scaleX(${Math.max(d.weight / 100, 0.04)})` }} />
                  </span>
                  <span className="watch-bar__n">{d.weight}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {neighbors.length > 0 ? (
        <div className="mt-3">
          <p className="signal-label">Related prints</p>
          <ul className="mt-1 flex flex-wrap gap-1">
            {neighbors.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="watch-sort"
                  onClick={() => onSelectRelated(t.label)}
                >
                  {t.label}
                  <span className="ml-1 font-mono tabular-nums text-white/40">{t.velocity}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="signal-label">
          Receipts{selectedBucket ? ` · ${selectedBucket.label}` : ""} · {shown.length}
        </p>
        {shown.length === 0 ? (
          <p className="mt-1 text-[12px] text-white/50">
            {posts.length === 0
              ? "No dated receipts for this phrase yet. Thin — no invented WHY."
              : "No receipts in that window. Click the chart again to show all."}
          </p>
        ) : (
          <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
            {shown.slice(0, 16).map((p) => (
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
    </section>
  );
}
