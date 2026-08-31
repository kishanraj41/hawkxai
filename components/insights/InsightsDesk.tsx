"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import InsightsDetail from "@/components/insights/InsightsDetail";
import InsightsLookup from "@/components/insights/InsightsLookup";
import InsightsOverview from "@/components/insights/InsightsOverview";
import InsightsTaproot from "@/components/insights/InsightsTaproot";
import {
  DeskFrame,
  GhostButton,
  HomeMark,
  PrimaryButton,
  StatusChip,
  DeskNav,
} from "@/components/shell/DeskChrome";
import DeskWorkspace from "@/components/shell/DeskWorkspace";
import type { RootTrace } from "@/lib/insights-types";

function setQueryUrl(phrase: string, sense?: string | null) {
  const url = new URL(window.location.href);
  if (phrase) url.searchParams.set("q", phrase);
  else url.searchParams.delete("q");
  if (sense) url.searchParams.set("sense", sense);
  else url.searchParams.delete("sense");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function InsightsDesk() {
  const [trace, setTrace] = useState<RootTrace | null>(null);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [plugged, setPlugged] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const lookupGen = useRef(0);
  const booted = useRef(false);

  const plug = useCallback(async (raw: string, sense?: string | null) => {
    const name = raw.trim();
    if (name.length < 2) return;
    const gen = ++lookupGen.current;
    setError(null);
    setPlugged(name);
    setDraft(name);
    setQueryUrl(name, sense);
    setLooking(true);

    try {
      const params = new URLSearchParams({ q: name });
      if (sense) params.set("sense", sense);
      const res = await fetch(`/api/insights?${params.toString()}`);
      if (gen !== lookupGen.current) return;
      if (!res.ok) throw new Error(`Trace failed (${res.status})`);
      const next = (await res.json()) as RootTrace;
      setTrace(next);
      setNames((prev) => [name, ...prev.filter((n) => n.toLowerCase() !== name.toLowerCase())].slice(0, 12));
    } catch (err) {
      if (gen !== lookupGen.current) return;
      setError(err instanceof Error ? err.message : "Could not trace that name");
    } finally {
      if (gen === lookupGen.current) setLooking(false);
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q")?.trim() ?? "";
    const sense = params.get("sense")?.trim() || null;
    if (q) void plug(q, sense);
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
    void plug(draft);
  }

  function handleClear() {
    lookupGen.current += 1;
    setTrace(null);
    setPlugged("");
    setDraft("");
    setError(null);
    setQueryUrl("");
    inputRef.current?.focus();
  }

  const empty = !plugged && !looking && !trace;

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
              Trace a name to its root
            </label>
            <input
              id="insights-lookup"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="A particular name…"
              enterKeyHint="search"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              className="field-input"
            />
            <PrimaryButton type="submit" disabled={looking || draft.trim().length < 2}>
              {looking ? "Tracing…" : "Trace"}
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
              {trace?.originTitle ? <StatusChip>{trace.originTitle}</StatusChip> : null}
              {trace?.originLag ? <StatusChip>{trace.originLag.lagYears}y gap</StatusChip> : null}
              {trace?.thin ? <StatusChip>thin</StatusChip> : null}
              <GhostButton onClick={handleClear}>Clear</GhostButton>
            </>
          ) : (
            <span className="signal-label">
              Trace a particular name to its deepest dated root.
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
              ? `tracing ${plugged || "…"}`
              : trace
                ? `${trace.layers.length} strata · ${trace.receipts.length} receipts`
                : "plug a name"}
          </StatusChip>
          {trace?.degraded.map((msg) => (
            <StatusChip key={msg}>{msg}</StatusChip>
          ))}
        </div>
        <div className="desk-chrome__actions ml-auto flex shrink-0 items-center gap-1">
          <GhostButton
            onClick={() => void plug(plugged || draft, trace?.senseId)}
            disabled={looking || !(plugged || draft).trim()}
          >
            Retrace
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div role="alert" className="relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <DeskWorkspace
        listLabel="Traces"
        listBlurb="This session"
        stageLabel="Well"
        stageBlurb="Down to origin"
        detailLabel="Roots"
        detailBlurb="Oldest first"
        jumpToDetailKey={null}
        preferStage={empty}
        stageKey={plugged || null}
        list={<InsightsOverview names={names} selected={plugged || null} onSelect={(name) => void plug(name)} />}
        stage={
          empty ? (
            <InsightsLookup onLookup={(q) => void plug(q)} onFocusLookup={() => inputRef.current?.focus()} />
          ) : (
            <InsightsTaproot
              trace={trace}
              loading={looking}
              queryLabel={plugged}
              onSelectSense={(id) => void plug(plugged, id)}
            />
          )
        }
        detail={<InsightsDetail trace={trace} />}
      />
      <p className="sr-only" aria-live="polite">
        {looking
          ? `Tracing ${plugged}`
          : trace
            ? `${trace.query}: ${trace.thin ? "thin" : `${trace.layers.length} strata`}`
            : ""}
      </p>
    </main>
  );
}
