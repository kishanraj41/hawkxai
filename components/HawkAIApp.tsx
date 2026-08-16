"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import ChartDesk from "@/components/ChartDesk";
import CategoryPlugs from "@/components/desk/CategoryPlugs";
import TopicPlug from "@/components/desk/TopicPlug";
import IntelRail from "@/components/IntelRail";
import MapStage from "@/components/MapStage";
import MindDesk from "@/components/MindDesk";
import OverviewRail from "@/components/OverviewRail";
import TickerTape from "@/components/TickerTape";
import TrendMap from "@/components/TrendMap";
import { AUDIENCE_OPTIONS, boostTrends } from "@/lib/booster";
import { categoryCounts, filterByCategory } from "@/lib/desk";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { CITY_OPTIONS, type CityId } from "@/lib/geo";
import type { AgeLens, BoosterPayload, DeskCategory, Platform, Topic, TrendsPayload } from "@/lib/types";

type SortKey = "score" | Platform | "risk";
type VelocityFilter = Topic["velocity"] | "all";
type Surface = "mind" | "desk" | "map";

function MapSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-white/45">Loading…</p>
    </div>
  );
}

export default function HawkAIApp() {
  const [payload, setPayload] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [askQuery, setAskQuery] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [city, setCity] = useState<CityId>("all");
  const [booster, setBooster] = useState<BoosterPayload | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [velocityFilter, setVelocityFilter] = useState<VelocityFilter>("all");
  const [lens, setLens] = useState<AgeLens | "all">("all");
  const [category, setCategory] = useState<DeskCategory>("all");
  const [surface, setSurface] = useState<Surface>("mind");
  const [plugged, setPlugged] = useState("");
  const askRef = useRef<HTMLInputElement>(null);
  const pluggedRef = useRef("");
  pluggedRef.current = plugged;

  const loadTrends = useCallback(async (refresh = false, topicOverride?: string | null) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const topic =
        topicOverride === null ? "" : (topicOverride ?? pluggedRef.current).trim();
      const params = new URLSearchParams();
      if (refresh) params.set("refresh", "1");
      if (city !== "all") params.set("city", city);
      if (topic) params.set("topic", topic);
      const qs = params.toString();
      const res = await fetch(`/api/trends${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error(`Trends failed (${res.status})`);
      const data = (await res.json()) as TrendsPayload;
      setPayload(data);
      setBooster(boostTrends(data));
      if (data.plugged) {
        setPlugged(data.plugged);
        const first = data.topics[0] ?? null;
        setSelected(first);
        setHighlightedIds(data.topics.map((t) => t.id));
      }
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
    setPlugged(q);
    setSurface("desk");
    setCategory("all");
    try {
      await loadTrends(true, q);
      setAskAnswer(`Plugged “${q}” — desk graphs use live X, Reddit, HN, and public APIs.`);
    } catch {
      setAskAnswer("Could not plug that topic.");
    } finally {
      setAsking(false);
    }
  }

  async function handlePlug(topic: string) {
    const q = topic.trim();
    if (!q || asking) return;
    setAsking(true);
    setAskQuery(q);
    setPlugged(q);
    setAskAnswer(null);
    setSurface("desk");
    setCategory("all");
    try {
      await loadTrends(true, q);
      setAskAnswer(`Plugged “${q}” — sources search that topic and the desk rebuilds.`);
    } finally {
      setAsking(false);
    }
  }

  async function handleClearPlug() {
    setPlugged("");
    setAskQuery("");
    setAskAnswer(null);
    setSelected(null);
    setHighlightedIds([]);
    await loadTrends(true, null);
  }

  const artifactsById = useMemo(() => {
    const map = new Map<string, NonNullable<BoosterPayload["briefs"][number]["artifacts"]>>();
    for (const brief of booster?.briefs ?? []) map.set(brief.topicId, brief.artifacts);
    return map;
  }, [booster]);

  const topics = useMemo(() => {
    const all = payload?.topics ?? [];
    const byVelocity = velocityFilter === "all" ? all : all.filter((t) => t.velocity === velocityFilter);
    return filterByCategory(byVelocity, category, artifactsById);
  }, [payload, velocityFilter, category, artifactsById]);

  const counts = useMemo(() => {
    const all = payload?.topics ?? [];
    const byVelocity = velocityFilter === "all" ? all : all.filter((t) => t.velocity === velocityFilter);
    return categoryCounts(byVelocity, artifactsById);
  }, [payload, velocityFilter, artifactsById]);

  useEffect(() => {
    if (selected && !topics.some((t) => t.id === selected.id)) {
      setSelected(null);
      setHighlightedIds([]);
    }
  }, [topics, selected]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (event.key === "Escape") {
        setSelected(null);
        setHighlightedIds([]);
        return;
      }
      if (typing && !((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        askRef.current?.focus();
        return;
      }
      if (event.key === "g" || event.key === "G") setSurface("mind");
      if (event.key === "m" || event.key === "M") setSurface("map");
      if (event.key === "d" || event.key === "D") setSurface("desk");
      if (event.key === "j" || event.key === "k" || event.key === "J" || event.key === "K") {
        event.preventDefault();
        if (!topics.length) return;
        const idx = selected ? topics.findIndex((t) => t.id === selected.id) : -1;
        const nextIdx =
          event.key.toLowerCase() === "j"
            ? idx < 0 ? 0 : Math.min(topics.length - 1, idx + 1)
            : idx < 0 ? 0 : Math.max(0, idx - 1);
        const next = topics[nextIdx];
        if (next) {
          setSelected(next);
          setHighlightedIds([next.id]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, topics]);

  function pickTopicId(id: string) {
    const topic = topics.find((t) => t.id === id) ?? payload?.topics.find((t) => t.id === id) ?? null;
    pickTopic(topic);
  }

  function pickTopic(topic: Topic | null) {
    setSelected(topic);
    setHighlightedIds(topic ? [topic.id] : []);
    if (!topic) return;
    const feeds = [
      ...new Set(
        (topic.platforms.public?.posts ?? [])
          .map((p) => p.sourceApi)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    if (topic.platforms.x?.posts.length) feeds.push("X");
    if (topic.platforms.reddit?.posts.length) feeds.push("Reddit");
    if (topic.platforms.hn?.posts.length) feeds.push("HN");
    if (!feeds.length) return;
    void fetch("/api/rl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeds, reward: 1 }),
    });
  }

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#07080b] text-white">
      <AmbientBackground />

      <header className="relative z-50 mx-3 mt-3 shrink-0 rounded-lg border border-white/8 bg-[#0c0d10]">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex shrink-0 items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="text-white">
              <polygon
                points="8,1.5 14.5,5 14.5,11 8,14.5 1.5,11 1.5,5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            <span className="text-sm font-medium tracking-tight">hawkai</span>
            <span className="signal-live" aria-label="Live" />
          </span>
          <span className="font-mono text-[11px] tabular-nums text-white/50">
            {loading
              ? "loading"
              : `${topics.length} names · ${formatUpdatedAt(payload?.updatedAt ?? null)}`}
          </span>
          {payload?.degraded.map((msg) => (
            <span key={msg} className="signal-label rounded border border-white/10 px-1.5 py-0.5">
              {msg}
            </span>
          ))}
        </div>

        <div className="flex h-9 shrink-0 overflow-hidden rounded border border-white/10">
          <button
            type="button"
            onClick={() => setSurface("mind")}
            className={`px-2.5 font-mono text-[11px] tabular-nums ${
              surface === "mind" ? "bg-white text-black" : "text-white/55 hover:text-white"
            }`}
          >
            Mind <kbd className="ml-1 opacity-50">G</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSurface("desk")}
            className={`px-2.5 font-mono text-[11px] tabular-nums ${
              surface === "desk" ? "bg-white text-black" : "text-white/55 hover:text-white"
            }`}
          >
            Desk <kbd className="ml-1 opacity-50">D</kbd>
          </button>
          <button
            type="button"
            onClick={() => setSurface("map")}
            className={`px-2.5 font-mono text-[11px] tabular-nums ${
              surface === "map" ? "bg-white text-black" : "text-white/55 hover:text-white"
            }`}
          >
            Map <kbd className="ml-1 opacity-50">M</kbd>
          </button>
        </div>

        <select
          value={velocityFilter}
          onChange={(e) => setVelocityFilter(e.target.value as VelocityFilter)}
          aria-label="Velocity"
          className="signal-label h-9 shrink-0 rounded border border-white/10 bg-transparent px-2 text-white focus:border-white/40 focus:outline-none"
        >
          <option value="all" className="bg-[#0a0e17]">All</option>
          <option value="rising" className="bg-[#0a0e17]">Rising</option>
          <option value="peaking" className="bg-[#0a0e17]">Peaking</option>
          <option value="fading" className="bg-[#0a0e17]">Fading</option>
        </select>

        <select
          value={lens}
          onChange={(e) => setLens(e.target.value as AgeLens | "all")}
          aria-label="Audience"
          className="signal-label h-9 shrink-0 rounded border border-white/10 bg-transparent px-2 text-white focus:border-white/40 focus:outline-none"
        >
          {AUDIENCE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-[#0a0e17]">
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value as CityId)}
          aria-label="City"
          className="signal-label h-9 shrink-0 rounded border border-white/10 bg-transparent px-2 text-white focus:border-white/40 focus:outline-none"
        >
          {CITY_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-[#0a0e17]">
              {opt.label}
            </option>
          ))}
        </select>

        <form onSubmit={handleAsk} className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-md">
          <input
            ref={askRef}
            value={askQuery}
            onChange={(e) => setAskQuery(e.target.value)}
            placeholder="Plug any topic… ⌘K"
            className="h-9 w-full rounded border border-white/10 bg-transparent px-3 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={asking || !askQuery.trim()}
            className="h-9 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/85 disabled:opacity-40"
          >
            Ask / Plug
          </button>
        </form>

        <button
          type="button"
          onClick={() => void loadTrends(true)}
          disabled={refreshing}
          className="signal-label h-9 shrink-0 px-2 disabled:opacity-40"
        >
          Refresh
        </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto border-t border-white/8 px-3 py-2">
          <span className="signal-label shrink-0">Plug</span>
          <TopicPlug
            value={plugged}
            busy={asking || loading || refreshing}
            onPlug={(q) => void handlePlug(q)}
            onClear={() => void handleClearPlug()}
          />
          <CategoryPlugs value={category} counts={counts} onChange={setCategory} />
        </div>
      </header>

      <TickerTape topics={payload?.topics ?? []} onSelect={pickTopic} />

      {askAnswer ? (
        <div className="relative z-20 mx-3 mt-2 rounded-lg border border-white/8 bg-[#0c0d10] px-4 py-2">
          <p className="text-sm text-white/80">{askAnswer}</p>
        </div>
      ) : null}

      {error ? (
        <div className="relative z-20 mx-3 mt-2 rounded-lg border border-white/8 bg-[#0c0d10] px-4 py-2">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <div className="relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-[240px_minmax(0,1fr)_300px] gap-3 p-3">
        <OverviewRail
          payload={payload}
          topics={topics}
          selectedId={selected?.id ?? null}
          hoverId={hoverId}
          sortKey={sortKey}
          onSort={setSortKey}
          onSelect={pickTopic}
          onHover={setHoverId}
        />

        {surface === "mind" ? (
          <MindDesk
            category={category}
            topics={topics}
            selected={selected}
            hoverId={hoverId}
            booster={booster}
            loading={loading}
            onSelect={pickTopic}
            onHover={setHoverId}
          />
        ) : surface === "desk" ? (
          <ChartDesk
            category={category}
            topics={topics}
            selected={selected}
            hoverId={hoverId}
            booster={booster}
            loading={loading}
            onSelect={pickTopic}
            onHover={setHoverId}
          />
        ) : (
          <MapStage
            topics={topics}
            loading={loading}
            selectedId={selected?.id ?? null}
            hoverId={hoverId}
            onSelect={pickTopic}
            onHover={setHoverId}
          >
            {loading ? (
              <MapSkeleton />
            ) : topics.length > 0 ? (
              <TrendMap
                topics={topics}
                selectedId={selected?.id ?? null}
                highlightedIds={highlightedIds}
                hoverId={hoverId}
                onSelect={pickTopic}
                onHover={setHoverId}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="signal-label">No names in this category — plug All</p>
              </div>
            )}
          </MapStage>
        )}

        <IntelRail
          selected={selected}
          booster={booster}
          topics={topics}
          hoverId={hoverId}
          lens={lens}
          onSelect={pickTopic}
          onPickId={pickTopicId}
          onHover={setHoverId}
        />
      </div>
    </main>
  );
}
