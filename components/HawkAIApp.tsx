"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import AmbientBackground from "@/components/AmbientBackground";
import BoosterBriefBar from "@/components/BoosterBriefBar";
import TopicDetailPanel from "@/components/TopicDetailPanel";
import TrendMap from "@/components/TrendMap";
import { boostTrends } from "@/lib/booster";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { CITY_OPTIONS, type CityId } from "@/lib/geo";
import type { BoosterPayload, Topic, TrendsPayload } from "@/lib/types";

function MapSkeleton() {
  const blobs = [
    { x: "18%", y: "28%", r: 72 },
    { x: "42%", y: "22%", r: 96 },
    { x: "68%", y: "35%", r: 64 },
    { x: "55%", y: "58%", r: 88 },
    { x: "28%", y: "62%", r: 56 },
    { x: "78%", y: "68%", r: 48 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <p className="absolute left-1/2 top-[42%] z-10 w-max -translate-x-1/2 text-sm text-zinc-400">
        Clustering live signals… first load can take about a minute.
      </p>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-[#1c2333] bg-[#2a3245]/40"
          style={{
            left: b.x,
            top: b.y,
            width: b.r * 2,
            height: b.r * 2,
            transform: "translate(-50%, -50%)",
            opacity: 0.35 + (i % 3) * 0.08,
          }}
        />
      ))}
    </div>
  );
}

function noSignalLabel(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("reddit")) return "REDDIT: NO SIGNAL";
  if (m.includes("hacker") || /\bhn\b/.test(m)) return "HN: NO SIGNAL";
  if (m.includes("twitter") || /\bx\b/.test(m)) return "X: NO SIGNAL";
  return `${msg.replace(/\s+/g, " ").trim().toUpperCase()}`;
}

export default function HawkAIApp() {
  const [payload, setPayload] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [city, setCity] = useState<CityId>("all");
  const [booster, setBooster] = useState<BoosterPayload | null>(null);

  const loadTrends = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (refresh) params.set("refresh", "1");
      if (city !== "all") params.set("city", city);
      const qs = params.toString();
      const res = await fetch(`/api/trends${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`Trends failed (${res.status})`);
      const data = (await res.json()) as TrendsPayload;
      setPayload(data);
      setBooster(boostTrends(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trends");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city]);

  useEffect(() => {
    setSelected(null);
    setHighlightedIds([]);
    void loadTrends();
  }, [loadTrends]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
        setHighlightedIds([]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const q = askQuery.trim();
    if (!q || asking) return;

    setAsking(true);
    setAskAnswer(null);
    setHighlightedIds([]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, city }),
      });
      const data = (await res.json()) as {
        answer?: string;
        topicIds?: string[];
        error?: string;
      };

      if (!res.ok) {
        setAskAnswer(data.error ?? "Ask failed — load trends first.");
        return;
      }

      setAskAnswer(data.answer ?? "");
      const ids = data.topicIds ?? [];
      setHighlightedIds(ids);
      if (ids.length > 0) {
        const topic = payload?.topics.find((t) => t.id === ids[0]) ?? null;
        setSelected(topic);
      }
    } catch {
      setAskAnswer("Ask request failed.");
    } finally {
      setAsking(false);
    }
  }

  const topics = payload?.topics ?? [];

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#05060a] text-[#f4f1ea]">
      <AmbientBackground />

      <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-[#1c2333] bg-[#0a0e17] px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex shrink-0 items-center gap-2">
            <span className="signal-live" aria-label="Live" />
            <span className="text-[13px] font-medium tracking-tight text-[#f4f1ea]">
              HAWKAI
            </span>
          </span>
          <span className="signal-label truncate tabular-nums">
            {loading
              ? "clustering live signals"
              : `${topics.length} / ${formatUpdatedAt(payload?.updatedAt ?? null)}`}
          </span>
          {payload?.pipeline ? (
            <span className="signal-label hidden max-w-xl truncate lg:inline" title={payload.pipeline}>
              {payload.pipeline}
            </span>
          ) : null}
          {payload?.degraded.map((msg) => (
            <span
              key={msg}
              className="signal-label rounded-[4px] border border-[#1c2333] px-2 py-1"
            >
              {noSignalLabel(msg)}
            </span>
          ))}
        </div>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value as CityId)}
          aria-label="City"
          className="signal-label shrink-0 rounded-[4px] border border-[#1c2333] bg-[#05060a] px-2 py-1.5 text-[#f4f1ea] focus:border-[#ffb24d] focus:outline-none"
        >
          {CITY_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-[#0a0e17]">
              {opt.label}
            </option>
          ))}
        </select>

        <form onSubmit={handleAsk} className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-md">
          <input
            value={askQuery}
            onChange={(e) => setAskQuery(e.target.value)}
            placeholder="ask /"
            className="w-full rounded-[4px] border border-[#1c2333] bg-[#05060a] px-3 py-1.5 font-mono text-sm text-[#f4f1ea] placeholder:text-[#7c8598] focus:border-[#ffb24d] focus:outline-none focus:ring-1 focus:ring-[#ffb24d]"
          />
          <button
            type="submit"
            disabled={asking || !askQuery.trim()}
            className="signal-label shrink-0 rounded-[4px] border border-[#1c2333] px-3 py-1.5 text-[#f4f1ea] disabled:opacity-40"
          >
            Ask
          </button>
        </form>

        <button
          type="button"
          onClick={() => void loadTrends(true)}
          disabled={refreshing}
          className="signal-label shrink-0 px-2 py-1.5 text-[#7c8598] disabled:opacity-40"
        >
          Refresh
        </button>
      </header>

      {askAnswer ? (
        <div className="relative z-20 border-b border-[#1c2333] bg-[#0a0e17]">
          <p className="px-4 py-2 font-mono text-sm text-[#f4f1ea]">{askAnswer}</p>
        </div>
      ) : null}

      {booster ? <BoosterBriefBar booster={booster} /> : null}

      {error ? (
        <div className="relative z-20 border-b border-[#1c2333] bg-[#0a0e17] px-4 py-2">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <div className="absolute inset-0">
            <MapSkeleton />
          </div>
        ) : topics.length > 0 ? (
          <div className="absolute inset-0">
            <TrendMap
              topics={topics}
              selectedId={selected?.id ?? null}
              highlightedIds={highlightedIds}
              onSelect={setSelected}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="signal-label">No topics — refresh</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {selected ? (
            <TopicDetailPanel
              key={selected.id}
              topic={selected}
              brief={booster?.briefs.find((b) => b.topicId === selected.id)}
              onClose={() => setSelected(null)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
