"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import ChartDesk from "@/components/ChartDesk";
import CategoryPlugs from "@/components/desk/CategoryPlugs";
import PhraseLookup from "@/components/desk/PhraseLookup";
import TopicPlug from "@/components/desk/TopicPlug";
import { KeepBrief } from "@/components/brief/KeepBrief";
import IntelRail from "@/components/IntelRail";
import MapStage from "@/components/MapStage";
import MindDesk from "@/components/MindDesk";
import OverviewRail from "@/components/OverviewRail";
import TapeWatch from "@/components/TapeWatch";
import TickerTape from "@/components/TickerTape";
import TrendMap from "@/components/TrendMap";
import { AUDIENCE_OPTIONS, boostTrends } from "@/lib/booster";
import { lensCaption } from "@/lib/brief";
import { categoryCounts, filterByCategory } from "@/lib/desk";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { CITY_OPTIONS, type CityId } from "@/lib/geo";
import {
  ingestTape,
  parseWatchStore,
  TAPE_WATCH_KEY,
  toggleWatch,
  type TapeDelta,
  type TapeWatchStore,
} from "@/lib/watch";
import type { AgeLens, BoosterPayload, DeskCategory, Platform, Topic, TrendsPayload } from "@/lib/types";

type SortKey = "score" | Platform | "risk";
type VelocityFilter = Topic["velocity"] | "all";
type Surface = "mind" | "desk" | "map";
type DeskKind = "trends" | "footprint";

function readWatch(): TapeWatchStore {
  if (typeof window === "undefined") return { ids: [], snaps: {} };
  try {
    return parseWatchStore(window.localStorage.getItem(TAPE_WATCH_KEY));
  } catch {
    return parseWatchStore(null);
  }
}

function writeWatch(store: TapeWatchStore) {
  try {
    window.localStorage.setItem(TAPE_WATCH_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

function setQueryUrl(phrase: string) {
  const url = new URL(window.location.href);
  if (phrase) url.searchParams.set("q", phrase);
  else url.searchParams.delete("q");
  url.searchParams.delete("topic");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function MapSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-white/45">Loading…</p>
    </div>
  );
}

function goHome() {
  window.location.assign("/");
}

function HomeMark() {
  return (
    <a
      href="/"
      aria-label="hawkai home"
      className="flex shrink-0 items-center gap-2 hover:text-white"
      onClick={(e) => {
        e.preventDefault();
        goHome();
      }}
    >
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
    </a>
  );
}

function DeskSwitch({ desk }: { desk: DeskKind }) {
  const link =
    "signal-label flex h-9 shrink-0 items-center rounded border border-white/10 px-2.5 hover:border-white/30 hover:text-white";
  const active =
    "signal-label flex h-9 shrink-0 items-center rounded border border-white/30 bg-white px-2.5 text-black";

  return (
    <nav className="flex h-9 shrink-0 items-center gap-1" aria-label="Desks">
      {desk === "trends" ? (
        <span className={active}>Trends</span>
      ) : (
        <a
          href="/"
          className={link}
          onClick={(e) => {
            e.preventDefault();
            goHome();
          }}
        >
          Trends
        </a>
      )}
      {desk === "footprint" ? (
        <span className={active}>Footprint</span>
      ) : (
        <a href="/footprint" className={link}>
          Footprint
        </a>
      )}
      <a href="/research" className={link}>
        Research
      </a>
    </nav>
  );
}

export function TrendDesk() {
  return <LiveDesk desk="trends" />;
}

export function FootprintDesk() {
  return <LiveDesk desk="footprint" />;
}

export default function HawkAIApp() {
  return <TrendDesk />;
}

function LiveDesk({ desk }: { desk: DeskKind }) {
  const footprint = desk === "footprint";
  const [payload, setPayload] = useState<TrendsPayload | null>(null);
  const [loading, setLoading] = useState(!footprint);
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
  const [watchIds, setWatchIds] = useState<string[]>([]);
  const [deltas, setDeltas] = useState<TapeDelta[]>([]);
  const askRef = useRef<HTMLInputElement>(null);
  const pluggedRef = useRef("");
  const bootedRef = useRef(false);
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
        if (footprint) setQueryUrl(data.plugged);
        const first = data.topics[0] ?? null;
        setSelected(first);
        setHighlightedIds(data.topics.map((t) => t.id));
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : footprint ? "Could not look up that phrase" : "Could not load trends");
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city, footprint]);

  useEffect(() => {
    if (!payload || !booster) return;
    const next = ingestTape(
      readWatch(),
      payload.topics,
      booster.briefs,
      payload.updatedAt,
    );
    writeWatch(next.store);
    setWatchIds(next.store.ids);
    setDeltas(next.deltas);
  }, [payload, booster]);

  useEffect(() => {
    if (footprint) {
      if (!bootedRef.current) {
        bootedRef.current = true;
        const params = new URLSearchParams(window.location.search);
        const q = (params.get("q") ?? params.get("topic") ?? "").trim();
        if (q) {
          setAskQuery(q);
          setPlugged(q);
          void loadTrends(false, q);
        }
        return;
      }
      if (!pluggedRef.current) return;
    }
    setSelected(null);
    setHighlightedIds([]);
    void loadTrends();
  }, [loadTrends, footprint]);

  function ensureWatched(topicId: string) {
    const store = readWatch();
    if (store.ids.includes(topicId)) return;
    const next = toggleWatch(store, topicId);
    writeWatch(next);
    setWatchIds(next.ids);
  }

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const q = askQuery.trim();
    if (!q || asking) return;
    setAsking(true);
    setPlugged(q);
    setAskAnswer(null);
    setHighlightedIds([]);
    setSurface("desk");
    setCategory("all");
    try {
      const data = await loadTrends(true, q);
      setAskAnswer(data?.query?.floor ?? `Nearest receipts for “${q}”.`);
      if (data?.topics[0]) ensureWatched(data.topics[0].id);
    } catch {
      setAskAnswer(footprint ? "Lookup failed — try a close alias (Camry → Toyota Camry)." : "Search failed — try a close alias (Camry → Toyota Camry).");
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
      const data = await loadTrends(true, q);
      setAskAnswer(data?.query?.floor ?? `Nearest receipts for “${q}”.`);
      if (data?.topics[0]) ensureWatched(data.topics[0].id);
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
    if (footprint) {
      setPayload(null);
      setBooster(null);
      setQueryUrl("");
      return;
    }
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

  function handleToggleWatch(topicId: string) {
    const next = toggleWatch(readWatch(), topicId);
    writeWatch(next);
    setWatchIds(next.ids);
  }

  const focus = selected ?? topics[0] ?? null;
  const focusBrief = focus
    ? booster?.briefs.find((b) => b.topicId === focus.id)
    : undefined;
  const focusCaption = lensCaption(focusBrief, lens);
  const sinceLastLook = focus
    ? (deltas.find((d) => d.topicId === focus.id)?.lines ?? [])
    : [];

  return (
    <KeepBrief.Provider
      topic={focus}
      brief={focusBrief}
      query={payload?.query ?? null}
      lens={lens}
      since={sinceLastLook}
    >
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#07080b] text-white">
      <AmbientBackground />

      <header className="no-print relative z-50 mx-3 mt-3 shrink-0 rounded-lg border border-white/8 bg-[#0c0d10]">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
        <div className="flex shrink-0 items-center gap-3">
          <HomeMark />
          <span className="font-mono text-[11px] tabular-nums text-white/50">
            {loading
              ? footprint
                ? "looking up"
                : "loading"
              : footprint && !plugged
                ? "look up a phrase"
                : `${topics.length} ${footprint ? "prints" : "names"} · ${formatUpdatedAt(payload?.updatedAt ?? null)}`}
          </span>
          {payload?.degraded.map((msg) => (
            <span key={msg} className="signal-label rounded border border-white/10 px-1.5 py-0.5">
              {msg}
            </span>
          ))}
        </div>

        <DeskSwitch desk={desk} />

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
            placeholder={footprint ? "Campaign, hashtag, or phrase… ⌘K" : "Camry, #HeatWaveFit, launch event… ⌘K"}
            className="h-9 w-full rounded border border-white/10 bg-transparent px-3 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={asking || !askQuery.trim()}
            className="h-9 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/85 disabled:opacity-40"
          >
            {footprint ? "Look up" : "Ask / Plug"}
          </button>
        </form>

        <KeepBrief.Actions />
        <button
          type="button"
          onClick={() => void loadTrends(true)}
          disabled={refreshing || (footprint && !plugged)}
          className="signal-label h-9 shrink-0 px-2 disabled:opacity-40"
        >
          Refresh
        </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto border-t border-white/8 px-3 py-2">
          {footprint ? (
            plugged ? (
              <>
                <span className="signal-label shrink-0">Footprint</span>
                <span className="max-w-[220px] truncate rounded border border-white/20 px-2 py-1 text-[12px]">
                  {plugged}
                </span>
                {payload?.query ? (
                  <span className="signal-label shrink-0">
                    {payload.query.kind} · {payload.query.match} · {payload.query.hitCount}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleClearPlug()}
                  className="signal-label h-9 shrink-0 px-2"
                >
                  Clear
                </button>
              </>
            ) : (
              <span className="signal-label shrink-0">Look up a campaign or phrase · ⌘K</span>
            )
          ) : (
            <>
              <span className="signal-label shrink-0">Plug</span>
              <TopicPlug
                value={plugged}
                busy={asking || loading || refreshing}
                onPlug={(q) => void handlePlug(q)}
                onClear={() => void handleClearPlug()}
              />
            </>
          )}
          <CategoryPlugs value={category} counts={counts} onChange={setCategory} />
        </div>
      </header>

      <TickerTape topics={payload?.topics ?? []} onSelect={pickTopic} />

      {askAnswer ? (
        <div className="no-print relative z-20 mx-3 mt-2 rounded-lg border border-white/8 bg-[#0c0d10] px-4 py-2">
          <p className="text-sm text-white/80">{askAnswer}</p>
        </div>
      ) : null}

      <TapeWatch deltas={deltas} onPick={pickTopicId} />

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
          watchedIds={watchIds}
          onSort={setSortKey}
          onSelect={pickTopic}
          onHover={setHoverId}
          onToggleWatch={handleToggleWatch}
        />

        {footprint && !(plugged || loading) ? (
          <PhraseLookup
            onLookup={(q) => void handlePlug(q)}
            onFocusLookup={() => askRef.current?.focus()}
          />
        ) : surface === "mind" ? (
          <MindDesk
            category={category}
            topics={topics}
            selected={selected}
            hoverId={hoverId}
            booster={booster}
            loading={loading}
            phrase={plugged}
            caption={focusCaption}
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
            query={payload?.query ?? null}
            takeaway={lens === "all" ? undefined : focusCaption}
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
                captionFor={(t) =>
                  lensCaption(
                    booster?.briefs.find((b) => b.topicId === t.id),
                    lens,
                  )
                }
                onSelect={pickTopic}
                onHover={setHoverId}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="signal-label">{footprint ? "No prints in this filter — try All" : "Nearest names are in another plug — try All"}</p>
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
      <KeepBrief.Sheet />
    </main>
    </KeepBrief.Provider>
  );
}
