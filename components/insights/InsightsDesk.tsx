"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import BoosterInsights from "@/components/BoosterInsights";
import { KeepBrief } from "@/components/brief/KeepBrief";
import { TermStage } from "@/components/desk/TermStage";
import InsightsLookup from "@/components/insights/InsightsLookup";
import {
  DeskFrame,
  GhostButton,
  HomeMark,
  PrimaryButton,
  StatusChip,
  DeskNav,
} from "@/components/shell/DeskChrome";
import DeskWorkspace from "@/components/shell/DeskWorkspace";
import { boostTrends } from "@/lib/booster";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import { leadTopic } from "@/lib/watchlist-lookup";
import type { TrendsPayload } from "@/lib/types";
import InsightsOverview from "./InsightsOverview";
import InsightsDetail from "./InsightsDetail";

function setQueryUrl(phrase: string) {
  const url = new URL(window.location.href);
  if (phrase) url.searchParams.set("q", phrase);
  else url.searchParams.delete("q");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function InsightsDesk() {
  const [lookup, setLookup] = useState<TrendsPayload | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poiQuery, setPoiQuery] = useState("");
  const [plugged, setPlugged] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [bucketT, setBucketT] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lookupGen = useRef(0);
  const booted = useRef(false);

  const booster = useMemo(() => (lookup ? boostTrends(lookup) : null), [lookup]);
  const lead = leadTopic(lookup);
  const brief = lead ? booster?.briefs.find((b) => b.topicId === lead.id) : undefined;

  const plug = useCallback(async (raw: string) => {
    const name = raw.trim();
    if (name.length < 2) return;
    const gen = ++lookupGen.current;
    setError(null);
    setBucketT(null);
    setPlugged(name);
    setPoiQuery(name);
    setQueryUrl(name);
    setLooking(true);

    try {
      const trendsRes = await fetch(`/api/trends?topic=${encodeURIComponent(name)}`);
      if (gen !== lookupGen.current) return;
      if (!trendsRes.ok) throw new Error(`Lookup failed (${trendsRes.status})`);
      const trends = (await trendsRes.json()) as TrendsPayload;
      setLookup(trends);
      setNames((prev) => [name, ...prev.filter((n) => n.toLowerCase() !== name.toLowerCase())].slice(0, 12));
    } catch (err) {
      if (gen !== lookupGen.current) return;
      setError(err instanceof Error ? err.message : "Could not look up that phrase");
    } finally {
      if (gen === lookupGen.current) setLooking(false);
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const q = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (q) void plug(q);
  }, [plug]);

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void plug(poiQuery);
  }

  function handleSelectName(name: string) {
    void plug(name);
  }

  function handleClear() {
    lookupGen.current += 1;
    setLookup(null);
    setPlugged("");
    setPoiQuery("");
    setBucketT(null);
    setError(null);
    setQueryUrl("");
    inputRef.current?.focus();
  }

  const empty = !plugged && !looking && !lookup;

  return (
    <main className="desk-shell">
      <AmbientBackground />

      <DeskFrame
        toolbar={
          <form
            onSubmit={handleSubmit}
            className="desk-chrome__toolbar-form flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px] sm:max-w-lg"
          >
            <label htmlFor="insights-lookup" className="sr-only">
              Look up a campaign, product, or brand
            </label>
            <input
              id="insights-lookup"
              ref={inputRef}
              value={poiQuery}
              onChange={(e) => setPoiQuery(e.target.value)}
              placeholder="Campaign, product, or brand…"
              enterKeyHint="search"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              className="field-input"
            />
            <PrimaryButton type="submit" disabled={looking || poiQuery.trim().length < 2}>
              {looking ? "Looking up…" : "Look up"}
            </PrimaryButton>
          </form>
        }
        context={
          plugged ? (
            <>
              <span className="signal-label shrink-0">Insights</span>
              <span className="max-w-[min(220px,55vw)] truncate rounded border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[12px]">
                {plugged}
              </span>
              {lookup?.query ? (
                <StatusChip>
                  {lookup.query.kind} · {lookup.query.match} · {lookup.query.hitCount}
                </StatusChip>
              ) : null}
              <GhostButton onClick={handleClear}>Clear</GhostButton>
            </>
          ) : (
            <span className="signal-label">
              Look up a campaign. Live occurrence and receipts fill the board.
              <span className="desk-shortcut"> · ⌘K</span>
            </span>
          )
        }
      >
        <div className="desk-chrome__brand flex min-w-0 shrink-0 items-center gap-3">
          <HomeMark />
          <DeskNav active="insights" />
        </div>
        <div className="desk-chrome__status flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <StatusChip>
            {looking
              ? `lookup ${plugged || "…"}`
              : lookup
                ? `${lookup.topics.length} related prints · ${formatUpdatedAt(lookup.updatedAt)}`
                : "look up a campaign"}
          </StatusChip>
          {lookup?.degraded.map((msg) => (
            <StatusChip key={msg}>{msg}</StatusChip>
          ))}
        </div>
        <div className="desk-chrome__actions ml-auto flex shrink-0 items-center gap-1">
          <GhostButton onClick={() => void plug(plugged || poiQuery)} disabled={looking || !(plugged || poiQuery).trim()}>
            Refresh
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div role="alert" className="relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <DeskWorkspace
        listLabel="Names"
        listBlurb="This session"
        stageLabel="Board"
        stageBlurb="Live tape"
        detailLabel="Facts"
        detailBlurb="Receipts only"
        jumpToDetailKey={null}
        preferStage={empty}
        stageKey={plugged || null}
        list={
          <InsightsOverview
            names={names}
            selected={plugged || null}
            onSelect={handleSelectName}
          />
        }
        stage={
          empty ? (
            <InsightsLookup
              onLookup={(q) => void plug(q)}
              onFocusLookup={() => inputRef.current?.focus()}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <TermStage
                payload={lookup}
                loading={looking}
                bucketT={bucketT}
                queryLabel={plugged}
                emptyCopy="Occurrence fills from live tape — never an invented WHY, never invented spend."
                onSelectBucket={setBucketT}
                onSelectRelated={(name) => void plug(name)}
              />
              {lead && brief ? (
                <KeepBrief.Provider topic={lead} brief={brief} query={lookup?.query}>
                  <BoosterInsights brief={brief} topic={lead} />
                </KeepBrief.Provider>
              ) : null}
            </div>
          )
        }
        detail={
          <InsightsDetail payload={lookup} />
        }
      />
      <p className="sr-only" aria-live="polite">
        {looking ? `Looking up ${plugged}` : lookup ? `${lookup.plugged ?? plugged}: ${lookup.topics.length} related prints` : ""}
      </p>
    </main>
  );
}
