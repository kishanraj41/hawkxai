"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import DemoWalk from "@/components/desk/DemoWalk";
import EmptyStage from "@/components/shell/EmptyStage";
import {
  DeskFrame,
  DeskNav,
  GhostButton,
  HomeMark,
  PrimaryButton,
  StatusChip,
} from "@/components/shell/DeskChrome";
import DeskWorkspace from "@/components/shell/DeskWorkspace";
import {
  WatchlistInspect,
  WatchlistMetrics,
  WatchlistNames,
  WatchlistTable,
  WatchlistViz,
} from "@/components/watchlist/WatchlistDashboard";
import { WatchTermStage } from "@/components/watchlist/WatchTermStage";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { insightForQuery } from "@/lib/watchlist-lookup";
import { rollupWatchlist, sortInsights, type WatchSort } from "@/lib/watchlist-metrics";
import { notifyWatchlistChanged, onWatchlistChanged } from "@/lib/watchlist-sync";
import type { PoiInsight, TrendsPayload } from "@/lib/types";

const SUGGESTIONS = [
  { id: "camry", label: "Camry" },
  { id: "tesla", label: "Tesla" },
  { id: "wwdc", label: "WWDC" },
  { id: "heatwave", label: "#HeatWaveFit" },
] as const;

function setQueryUrl(phrase: string) {
  const url = new URL(window.location.href);
  if (phrase) url.searchParams.set("q", phrase);
  else url.searchParams.delete("q");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function WatchlistDesk() {
  const [insights, setInsights] = useState<PoiInsight[]>([]);
  const [backend, setBackend] = useState<"postgres" | "memory" | null>(null);
  const [loading, setLoading] = useState(true);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [aliases, setAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [sort, setSort] = useState<WatchSort>("rank");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [lookup, setLookup] = useState<TrendsPayload | null>(null);
  const [bucketT, setBucketT] = useState<string | null>(null);
  const [plugged, setPlugged] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lookupGen = useRef(0);
  const booted = useRef(false);
  const rows = useMemo(() => sortInsights(insights, sort, dir), [insights, sort, dir]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const res = await fetch("/api/watchlist");
      if (!res.ok) throw new Error(`Watchlist failed (${res.status})`);
      const data = (await res.json()) as {
        backend: "postgres" | "memory";
        updatedAt: string;
        insights: PoiInsight[];
      };
      setBackend(data.backend);
      setUpdatedAt(data.updatedAt);
      setInsights(data.insights);
      setSelectedId((prev) => {
        if (prev && data.insights.some((row) => row.entity.id === prev)) return prev;
        return data.insights[0]?.entity.id ?? null;
      });
      setError(null);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Could not load watchlist");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => void load(true);
    const stop = onWatchlistChanged(tick);
    const poll = window.setInterval(tick, 12_000);
    return () => {
      stop();
      window.clearInterval(poll);
    };
  }, [load]);

  const openFootprint = useCallback((id: string) => {
    const row = insights.find((r) => r.entity.id === id);
    const q = row?.entity.label ?? id;
    window.location.assign(`/footprint?q=${encodeURIComponent(q)}`);
  }, [insights]);

  const plug = useCallback(async (raw: string, extra = "", persist = true) => {
    const name = raw.trim();
    if (name.length < 2) return;
    const gen = ++lookupGen.current;
    setError(null);
    setBucketT(null);
    setPlugged(name);
    setLabel(name);
    setQueryUrl(name);
    if (persist) {
      setLooking(true);
      setSaving(true);
    }
    try {
      const trendsRes = await fetch(`/api/trends?topic=${encodeURIComponent(name)}`);
      if (gen !== lookupGen.current) return;
      if (!trendsRes.ok) throw new Error(`Lookup failed (${trendsRes.status})`);
      const trends = (await trendsRes.json()) as TrendsPayload;
      if (gen !== lookupGen.current) return;
      setLookup(trends);
      setLooking(false);
      if (persist) {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label: name, aliases: extra }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          insight?: PoiInsight;
        };
        if (gen !== lookupGen.current) return;
        if (!res.ok) throw new Error(data.error || `Add failed (${res.status})`);
        setAliases("");
        if (data.insight) {
          setInsights((prev) => {
            const rest = prev.filter((row) => row.entity.id !== data.insight!.entity.id);
            return [data.insight!, ...rest];
          });
          setSelectedId(data.insight.entity.id);
        }
        notifyWatchlistChanged();
        await load(true);
      } else {
        setSelectedId((prev) => {
          const hit = insightForQuery(insights, name);
          return hit?.entity.id ?? prev;
        });
      }
    } catch (err) {
      if (gen !== lookupGen.current) return;
      setError(err instanceof Error ? err.message : "Could not look up that name");
    } finally {
      if (gen === lookupGen.current) {
        setLooking(false);
        setSaving(false);
      }
    }
  }, [insights, load]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const q = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (q.length >= 2) void plug(q);
  }, [plug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (typing) return;
      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        if (!rows.length) return;
        const idx = rows.findIndex((row) => row.entity.id === selectedId);
        const at = idx < 0 ? 0 : idx;
        const next = e.key === "j" ? Math.min(rows.length - 1, at + 1) : Math.max(0, at - 1);
        const row = rows[next];
        setSelectedId(row.entity.id);
        void plug(row.entity.label, "", false);
      }
      if (e.key === "Enter" && selectedId) {
        if (target?.tagName === "A" || target?.tagName === "BUTTON") return;
        e.preventDefault();
        openFootprint(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, selectedId, openFootprint, plug]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void plug(label, aliases, true);
  }

  async function handleRemove(id: string) {
    setInsights((prev) => prev.filter((row) => row.entity.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    if (lookup && insightForQuery(insights, plugged)?.entity.id === id) {
      setLookup(null);
      setPlugged("");
      setQueryUrl("");
    }
    await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    notifyWatchlistChanged();
    await load(true);
  }

  const selected = rows.find((row) => row.entity.id === selectedId) ?? null;
  const queried = plugged ? insightForQuery(rows, plugged) : null;
  const focus = queried ?? selected;
  const empty = !loading && insights.length === 0 && !lookup && !looking;
  const rollup = rollupWatchlist(rows);
  const showBoard = !empty;

  function handleSort(next: WatchSort) {
    if (next === sort) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSort(next);
      setDir("desc");
    }
  }

  function handleSelectName(id: string) {
    setSelectedId(id);
    const row = insights.find((r) => r.entity.id === id);
    if (row) void plug(row.entity.label, "", false);
  }

  return (
    <main className="desk-shell">
      <AmbientBackground />
      <DeskFrame
        toolbar={
          <form
            onSubmit={handleSubmit}
            className="desk-chrome__toolbar-form flex min-w-0 flex-1 flex-wrap items-center gap-2"
          >
            <label htmlFor="watch-lookup" className="sr-only">
              Look up a company or campaign
            </label>
            <input
              id="watch-lookup"
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Company or campaign…"
              enterKeyHint="search"
              autoComplete="off"
              aria-describedby={error ? "watch-error" : undefined}
              aria-invalid={error ? true : undefined}
              className="field-input max-w-xs"
            />
            <label htmlFor="watch-aliases" className="sr-only">
              Aliases, comma separated
            </label>
            <input
              id="watch-aliases"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Aliases, comma separated"
              className="field-input max-w-sm"
            />
            <PrimaryButton type="submit" disabled={saving || looking || label.trim().length < 2}>
              {looking ? "Looking up…" : "Look up"}
            </PrimaryButton>
          </form>
        }
        context={
          <span className="signal-label">
            Look up a name. Occurrence, source mix, and receipts fill the board. The name stays on Watch.
            <span className="desk-shortcut"> · ⌘K lookup · J/K rows</span>
          </span>
        }
      >
        <div className="desk-chrome__brand flex min-w-0 shrink-0 items-center gap-3">
          <HomeMark />
          <DeskNav active="watchlist" />
        </div>
        <div className="desk-chrome__status flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <StatusChip>
            {looking
              ? `lookup ${plugged || "…"}`
              : loading
                ? "loading"
                : `${insights.length} watched · ${formatUpdatedAt(updatedAt)}`}
          </StatusChip>
          {lookup?.query ? <StatusChip>{lookup.query.kind}</StatusChip> : null}
          {backend ? <StatusChip>{backend}</StatusChip> : null}
        </div>
        <div className="desk-chrome__actions ml-auto flex shrink-0 items-center gap-1">
          <GhostButton onClick={() => void load(true)} disabled={loading}>
            Refresh
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div id="watch-error" role="alert" className="no-print relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      {empty ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-hidden p-3 max-md:p-2">
          <EmptyStage
            eyebrow="Watch"
            title="Look up a company or campaign"
            copy="Plug a name you own or follow. The board fills with its occurrence trend, source mix, and receipts. Open Footprint for the full desk."
            primaryLabel="Focus lookup"
            onPrimary={() => inputRef.current?.focus()}
            suggestions={[...SUGGESTIONS]}
            onSuggest={(name) => void plug(name)}
          >
            <DemoWalk />
          </EmptyStage>
        </div>
      ) : null}

      {showBoard ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <WatchlistMetrics rollup={rollup} loading={loading && !looking} />
          <DeskWorkspace
            listLabel="Names"
            listBlurb="Ranked POIs"
            stageLabel="Board"
            stageBlurb="Trends and overlap"
            detailLabel="Inspect"
            detailBlurb="Occupiers"
            preferStage={Boolean(lookup || looking)}
            stageKey={plugged || null}
            jumpToDetailKey={looking || lookup ? null : selectedId}
            list={
              <WatchlistNames
                insights={rows}
                selectedId={selectedId}
                compareId={compareId}
                onSelect={handleSelectName}
                onCompare={(id) => setCompareId((prev) => (prev === id ? null : id))}
              />
            }
            stage={
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <WatchTermStage
                  payload={lookup}
                  insight={focus}
                  loading={looking}
                  bucketT={bucketT}
                  queryLabel={plugged}
                  onSelectBucket={setBucketT}
                  onSelectRelated={(name) => void plug(name)}
                />
                <WatchlistViz
                  insights={rows}
                  selectedId={selectedId}
                  compareId={compareId}
                  sort={sort}
                  onSelect={handleSelectName}
                  onSort={handleSort}
                />
                <WatchlistTable
                  insights={rows}
                  selectedId={selectedId}
                  loading={loading}
                  sort={sort}
                  onSelect={handleSelectName}
                  onSort={handleSort}
                />
              </div>
            }
            detail={
              <WatchlistInspect
                insight={focus}
                compareActive={Boolean(selectedId && compareId && compareId !== selectedId)}
                onOpen={() => selectedId && openFootprint(selectedId)}
                onRemove={() => selectedId && void handleRemove(selectedId)}
                onCompare={() => {
                  if (!selectedId) return;
                  setCompareId((prev) => (prev && prev !== selectedId ? null : rows.find((r) => r.entity.id !== selectedId)?.entity.id ?? null));
                }}
                onTag={(url, tag) => {
                  if (!selectedId) return;
                  void fetch("/api/watchlist", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ entityId: selectedId, url, tag }),
                  }).then(() => load(true));
                }}
              />
            }
          />
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {looking ? `Looking up ${plugged}` : lookup ? `${lookup.plugged ?? plugged}: ${lookup.topics.length} related prints` : ""}
      </p>
    </main>
  );
}
