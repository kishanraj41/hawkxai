"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
import { formatUpdatedAt } from "@/lib/ui-helpers";
import type { PoiInsight } from "@/lib/types";

const SUGGESTIONS = [
  { id: "camry", label: "Camry" },
  { id: "tesla", label: "Tesla" },
  { id: "wwdc", label: "WWDC" },
  { id: "heatwave", label: "#HeatWaveFit" },
] as const;

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function deltaLabel(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function Row({
  insight,
  onOpen,
  onRemove,
}: {
  insight: PoiInsight;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const e = insight.entity;
  return (
    <li className="border-b border-white/8 last:border-b-0">
      <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <p className="text-[14px] font-medium tracking-tight text-white/92">{e.label}</p>
          <p className="mt-0.5 font-mono text-[10px] text-white/40">
            {e.aliases.join(" · ") || e.label}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/70">{insight.analysis}</p>
          {insight.occupiers.length > 0 ? (
            <p className="mt-1.5 line-clamp-1 font-mono text-[10px] text-white/40">
              Occupied by {insight.occupiers.map((o) => o.host).join(" · ")}
            </p>
          ) : null}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex flex-wrap justify-end gap-1.5">
            <StatusChip>
              {insight.thin ? "thin" : insight.outlook}
            </StatusChip>
            <StatusChip>Δ {deltaLabel(insight.delta)}</StatusChip>
            <StatusChip>organic {pct(insight.organic)}</StatusChip>
            <StatusChip>occupied {pct(insight.occupancy)}</StatusChip>
            <StatusChip>{insight.receiptCount} receipts</StatusChip>
          </div>
          <GhostButton onClick={onRemove}>Remove</GhostButton>
        </div>
      </div>
    </li>
  );
}

export default function WatchlistDesk() {
  const [insights, setInsights] = useState<PoiInsight[]>([]);
  const [backend, setBackend] = useState<"postgres" | "memory" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [aliases, setAliases] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || `Add failed (${res.status})`);
      setLabel("");
      setAliases("");
      await load();
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
    await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  const empty = !loading && insights.length === 0;

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
            <span className="desk-shortcut"> · ⌘K</span>
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
          <GhostButton onClick={() => void load()} disabled={loading}>
            Refresh
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div className="no-print relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <div className="relative z-10 min-h-0 flex-1 overflow-hidden p-3 max-md:p-2">
        {empty ? (
          <EmptyStage
            eyebrow="Watch"
            title="Track companies and campaigns"
            copy="Add a name you own or follow. We join it to public receipts and score organic vs occupied. Open Footprint for the full desk."
            primaryLabel="Focus watch"
            onPrimary={() => inputRef.current?.focus()}
            suggestions={[...SUGGESTIONS]}
            onSuggest={(name) => void addLabel(name)}
          />
        ) : (
          <section className="signal-glass flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div>
                <h1 className="text-sm font-medium tracking-tight">Watchlist</h1>
                <p className="mt-0.5 text-xs text-white/45">
                  Click a name to open Footprint. Occupancy is other printers of that phrase.
                </p>
              </div>
              {loading ? (
                <span className="font-mono text-[11px] tabular-nums text-white/45">updating…</span>
              ) : null}
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {insights.map((row) => (
                <Row
                  key={row.entity.id}
                  insight={row}
                  onOpen={() => {
                    window.location.assign(`/footprint?q=${encodeURIComponent(row.entity.label)}`);
                  }}
                  onRemove={() => void handleRemove(row.entity.id)}
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
