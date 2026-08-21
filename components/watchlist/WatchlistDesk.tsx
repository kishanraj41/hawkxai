"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
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
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { rollupWatchlist, sortInsights, type WatchSort } from "@/lib/watchlist-metrics";
import { notifyWatchlistChanged, onWatchlistChanged } from "@/lib/watchlist-sync";
import type { PoiInsight } from "@/lib/types";

const SUGGESTIONS = [
  { id: "camry", label: "Camry" },
  { id: "tesla", label: "Tesla" },
  { id: "wwdc", label: "WWDC" },
  { id: "heatwave", label: "#HeatWaveFit" },
] as const;

export default function WatchlistDesk() {
  const [insights, setInsights] = useState<PoiInsight[]>([]);
  const [backend, setBackend] = useState<"postgres" | "memory" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [aliases, setAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [sort, setSort] = useState<WatchSort>("rank");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const inputRef = useRef<HTMLInputElement>(null);
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
        setSelectedId(rows[next].entity.id);
      }
      if (e.key === "Enter" && selectedId) {
        if (target?.tagName === "A" || target?.tagName === "BUTTON") return;
        e.preventDefault();
        openFootprint(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, selectedId, openFootprint]);

  async function addLabel(raw: string, extra = "") {
    const name = raw.trim();
    if (name.length < 2) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: name, aliases: extra }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        insight?: PoiInsight;
      };
      if (!res.ok) throw new Error(data.error || `Add failed (${res.status})`);
      setLabel("");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that name");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void addLabel(label, aliases);
  }

  async function handleRemove(id: string) {
    setInsights((prev) => prev.filter((row) => row.entity.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    notifyWatchlistChanged();
    await load(true);
  }

  const empty = !loading && insights.length === 0;
  const rollup = rollupWatchlist(rows);
  const selected = rows.find((row) => row.entity.id === selectedId) ?? null;

  function handleSort(next: WatchSort) {
    if (next === sort) setDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSort(next);
      setDir("desc");
    }
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
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Company or campaign…"
              enterKeyHint="go"
              className="field-input max-w-xs"
            />
            <input
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Aliases, comma separated"
              className="field-input max-w-sm"
            />
            <PrimaryButton type="submit" disabled={saving || label.trim().length < 2}>
              Watch
            </PrimaryButton>
          </form>
        }
        context={
          <span className="signal-label">
            Public tape vs names you own. Organic vs occupied. Never an invented WHY.
            <span className="desk-shortcut"> · ⌘K add · J/K rows</span>
          </span>
        }
      >
        <div className="desk-chrome__brand flex min-w-0 shrink-0 items-center gap-3">
          <HomeMark />
          <DeskNav active="watchlist" />
        </div>
        <div className="desk-chrome__status flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <StatusChip>
            {loading
              ? "loading"
              : `${insights.length} watched · ${formatUpdatedAt(updatedAt)}`}
          </StatusChip>
          {backend ? <StatusChip>{backend}</StatusChip> : null}
        </div>
        <div className="desk-chrome__actions ml-auto flex shrink-0 items-center gap-1">
          <GhostButton onClick={() => void load(true)} disabled={loading}>
            Refresh
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div className="no-print relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      {empty ? (
        <div className="relative z-10 min-h-0 flex-1 overflow-hidden p-3 max-md:p-2">
          <EmptyStage
            eyebrow="Watch"
            title="Track companies and campaigns"
            copy="Add a name you own or follow. The board fills with overlap receipts, organic vs occupied, and who else printed it. Open Footprint for the full desk."
            primaryLabel="Focus watch"
            onPrimary={() => inputRef.current?.focus()}
            suggestions={[...SUGGESTIONS]}
            onSuggest={(name) => void addLabel(name)}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <WatchlistMetrics rollup={rollup} loading={loading} />
          <DeskWorkspace
            listLabel="Names"
            listBlurb="Ranked POIs"
            stageLabel="Board"
            stageBlurb="Charts and overlap"
            detailLabel="Inspect"
            detailBlurb="Occupiers"
            jumpToDetailKey={selectedId}
            list={
              <WatchlistNames
                insights={rows}
                selectedId={selectedId}
                compareId={compareId}
                onSelect={setSelectedId}
                onCompare={(id) => setCompareId((prev) => (prev === id ? null : id))}
              />
            }
            stage={
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <WatchlistViz
                  insights={rows}
                  selectedId={selectedId}
                  compareId={compareId}
                  sort={sort}
                  onSelect={setSelectedId}
                  onSort={handleSort}
                />
                <WatchlistTable
                  insights={rows}
                  selectedId={selectedId}
                  loading={loading}
                  sort={sort}
                  onSelect={setSelectedId}
                  onSort={handleSort}
                />
              </div>
            }
            detail={
              <WatchlistInspect
                insight={selected}
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
      )}
    </main>
  );
}
