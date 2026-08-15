"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AmbientBackground from "@/components/AmbientBackground";
import BoosterBriefBar from "@/components/BoosterBriefBar";
import TopicDetailPanel from "@/components/TopicDetailPanel";
import TrendMap from "@/components/TrendMap";
import { boostTrends } from "@/lib/booster";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { motionTokens } from "@/lib/motionTokens";
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
        <motion.div
          key={i}
          className="absolute rounded-full border border-white/10 bg-white/[0.03]"
          style={{
            left: b.x,
            top: b.y,
            width: b.r * 2,
            height: b.r * 2,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.06, 1] }}
          transition={{
            duration: 2.2 + i * 0.2,
            repeat: Infinity,
            ease: motionTokens.easing.smooth,
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

export default function HawkAIApp() {
  const reduce = useReducedMotion();
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
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#0a0e14] text-zinc-200">
      <AmbientBackground />

      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="relative z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 bg-[#0a0e14]/60 px-4 py-3 backdrop-blur-md"
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="shrink-0 bg-gradient-to-r from-zinc-100 via-sky-200 to-zinc-300 bg-clip-text tracking-[0.2em] text-transparent">
            HAWKAI
          </span>
          <span className="truncate text-xs tabular-nums text-zinc-500">
            {loading ? "clustering live signals…" : formatUpdatedAt(payload?.updatedAt ?? null)}
          </span>
          {payload?.pipeline ? (
            <span className="hidden max-w-xl truncate font-mono text-[10px] text-zinc-600 lg:inline" title={payload.pipeline}>
              {payload.pipeline}
            </span>
          ) : null}
          <AnimatePresence mode="popLayout">
            {payload?.degraded.map((msg) => (
              <motion.span
                key={msg}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-200"
              >
                {msg}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value as CityId)}
          aria-label="City"
          className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-zinc-200 focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
        >
          {CITY_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-[#0a0e14]">
              {opt.label}
            </option>
          ))}
        </select>

        <form onSubmit={handleAsk} className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-md">
          <motion.input
            value={askQuery}
            onChange={(e) => setAskQuery(e.target.value)}
            placeholder="Ask what's blowing up…"
            whileFocus={{ scale: reduce ? 1 : 1.01 }}
            transition={{ duration: motionTokens.duration.fast }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
          />
          <motion.button
            type="submit"
            disabled={asking || !askQuery.trim()}
            whileHover={asking ? undefined : { scale: 1.03 }}
            whileTap={asking ? undefined : { scale: 0.96 }}
            className="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-zinc-100 disabled:opacity-40"
          >
            {asking ? "…" : "Ask"}
          </motion.button>
        </form>

        <motion.button
          type="button"
          onClick={() => void loadTrends(true)}
          disabled={refreshing}
          whileHover={refreshing ? undefined : { scale: 1.03 }}
          whileTap={refreshing ? undefined : { scale: 0.96 }}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-zinc-300 disabled:opacity-40"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </motion.button>
      </motion.header>

      <AnimatePresence mode="wait">
        {askAnswer ? (
          <motion.div
            key={askAnswer}
            initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="relative z-20 overflow-hidden border-b border-white/10 bg-sky-950/40 backdrop-blur-sm"
          >
            <p className="px-4 py-2 text-pretty text-sm text-sky-100">{askAnswer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {booster ? <BoosterBriefBar key="booster" booster={booster} /> : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-20 border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-sm text-red-200"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <MapSkeleton />
            </motion.div>
          ) : topics.length > 0 ? (
            <motion.div
              key="map"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth }}
              className="absolute inset-0"
            >
              <TrendMap
                topics={topics}
                selectedId={selected?.id ?? null}
                highlightedIds={highlightedIds}
                onSelect={setSelected}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center text-zinc-500"
            >
              No topics yet — try refresh or check API keys.
            </motion.div>
          )}
        </AnimatePresence>

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
