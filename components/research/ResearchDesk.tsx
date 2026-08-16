"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import ResearchLookup from "@/components/research/ResearchLookup";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import type { ResearchPayload, ResearchSource, ResearchSourceKind } from "@/lib/types";

const KIND_LABEL: Record<ResearchSourceKind, string> = {
  wikipedia: "Wiki",
  web: "Web",
  hn: "HN",
  reddit: "Reddit",
  x: "X",
  public: "APIs",
};

function goHome() {
  window.location.assign("/");
}

function setQueryUrl(topic: string) {
  const url = new URL(window.location.href);
  if (topic) url.searchParams.set("q", topic);
  else url.searchParams.delete("q");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
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

function DeskNav() {
  return (
    <nav className="flex h-9 shrink-0 items-center gap-1" aria-label="Desks">
      <a
        href="/"
        className="signal-label flex h-9 items-center rounded border border-white/10 px-2.5 hover:border-white/30 hover:text-white"
        onClick={(e) => {
          e.preventDefault();
          goHome();
        }}
      >
        Trends
      </a>
      <a
        href="/footprint"
        className="signal-label flex h-9 items-center rounded border border-white/10 px-2.5 hover:border-white/30 hover:text-white"
      >
        Footprint
      </a>
      <span className="signal-label flex h-9 items-center rounded border border-white/30 bg-white px-2.5 text-black">
        Research
      </span>
    </nav>
  );
}

function SourceCard({
  source,
  active,
  onSelect,
}: {
  source: ResearchSource;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded border px-3 py-2 text-left transition-colors duration-80 ${
        active ? "border-white/40 bg-white/10" : "border-white/8 hover:border-white/20"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="signal-label shrink-0">{KIND_LABEL[source.kind]}</span>
        {source.score != null ? (
          <span className="font-mono text-[10px] tabular-nums text-white/40">{source.score}</span>
        ) : null}
      </div>
      <p className="mt-1 line-clamp-2 text-[12px] text-white/85">{source.title}</p>
    </button>
  );
}

export default function ResearchDesk() {
  const [payload, setPayload] = useState<ResearchPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const booted = useRef(false);

  const selected = useMemo(
    () => payload?.sources.find((s) => s.id === selectedId) ?? null,
    [payload, selectedId],
  );

  const byKind = useMemo(() => {
    const counts: Partial<Record<ResearchSourceKind, number>> = {};
    for (const s of payload?.sources ?? []) {
      counts[s.kind] = (counts[s.kind] ?? 0) + 1;
    }
    return counts;
  }, [payload]);

  const runResearch = useCallback(async (topic: string) => {
    const q = topic.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setQuery(q);
    setQueryUrl(q);
    try {
      const res = await fetch(`/api/research?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Research failed (${res.status})`);
      const data = (await res.json()) as ResearchPayload;
      setPayload(data);
      setSelectedId(data.sources[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not research that topic");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const q = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    if (q) {
      setQuery(q);
      void runResearch(q);
    }
  }, [runResearch]);

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runResearch(query);
  }

  function handleClear() {
    setPayload(null);
    setQuery("");
    setSelectedId(null);
    setError(null);
    setQueryUrl("");
    inputRef.current?.focus();
  }

  const empty = !payload && !loading;

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#07080b] text-white">
      <AmbientBackground />

      <header className="no-print relative z-50 mx-3 mt-3 shrink-0 rounded-lg border border-white/8 bg-[#0c0d10]">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
          <div className="flex shrink-0 items-center gap-3">
            <HomeMark />
            <span className="font-mono text-[11px] tabular-nums text-white/50">
              {loading
                ? "researching"
                : payload
                  ? `${payload.sources.length} sources · ${formatUpdatedAt(payload.updatedAt)}`
                  : "research a topic"}
            </span>
            {payload?.thin ? (
              <span className="signal-label rounded border border-amber-400/30 px-1.5 py-0.5 text-amber-300/80">
                thin evidence
              </span>
            ) : null}
            {payload?.degraded.map((msg) => (
              <span key={msg} className="signal-label rounded border border-white/10 px-1.5 py-0.5">
                {msg}
              </span>
            ))}
          </div>

          <DeskNav />

          <form onSubmit={handleSubmit} className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-xl">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Topic, paper, policy, market… ⌘K"
              className="h-9 w-full rounded border border-white/10 bg-transparent px-3 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-9 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/85 disabled:opacity-40"
            >
              Research
            </button>
          </form>

          <button
            type="button"
            onClick={() => void runResearch(query)}
            disabled={loading || !query.trim()}
            className="signal-label h-9 shrink-0 px-2 disabled:opacity-40"
          >
            Refresh
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto border-t border-white/8 px-3 py-2">
          {payload ? (
            <>
              <span className="signal-label shrink-0">Topic</span>
              <span className="max-w-[280px] truncate rounded border border-white/20 px-2 py-1 text-[12px]">
                {payload.query}
              </span>
              {Object.entries(byKind).map(([kind, n]) => (
                <span key={kind} className="signal-label shrink-0">
                  {KIND_LABEL[kind as ResearchSourceKind]} {n}
                </span>
              ))}
              <button type="button" onClick={handleClear} className="signal-label h-9 shrink-0 px-2">
                Clear
              </button>
            </>
          ) : (
            <span className="signal-label shrink-0">Name a topic · dig the corners · ⌘K</span>
          )}
        </div>
      </header>

      {error ? (
        <div className="relative z-20 mx-3 mt-2 rounded-lg border border-white/8 bg-[#0c0d10] px-4 py-2">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <div className="relative z-10 grid min-h-0 min-w-0 flex-1 grid-cols-[260px_minmax(0,1fr)_300px] gap-3 p-3">
        <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-3">
          <p className="text-sm font-medium tracking-tight">Sources</p>
          <p className="mt-1 text-xs text-white/45">
            Live receipts from the open web and discussion boards. Click to inspect.
          </p>
          <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {loading && !payload ? (
              <p className="signal-label">Gathering…</p>
            ) : (
              (payload?.sources ?? []).map((s) => (
                <SourceCard
                  key={s.id}
                  source={s}
                  active={s.id === selectedId}
                  onSelect={() => setSelectedId(s.id)}
                />
              ))
            )}
          </div>
        </aside>

        {empty ? (
          <ResearchLookup
            onLookup={(t) => void runResearch(t)}
            onFocusLookup={() => inputRef.current?.focus()}
          />
        ) : (
          <section className="signal-glass flex min-h-0 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
              <div>
                <h1 className="text-sm font-medium tracking-tight">Brief</h1>
                <p className="mt-0.5 text-xs text-white/45">
                  Evidence-grounded findings. Thin corners stay marked thin.
                </p>
              </div>
              {loading ? (
                <span className="font-mono text-[11px] tabular-nums text-white/45">updating…</span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {loading && !payload ? (
                <p className="text-sm text-white/45">Digging Wikipedia, web, HN, Reddit, X…</p>
              ) : (
                <>
                  <p className="text-pretty text-sm leading-relaxed text-white/85">
                    {payload?.summary}
                  </p>

                  <h2 className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                    Findings
                  </h2>
                  <ul className="mt-2 space-y-3">
                    {(payload?.findings ?? []).map((f, i) => (
                      <li key={`${f.claim.slice(0, 40)}-${i}`} className="rounded border border-white/8 px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[13px] text-white/90">{f.claim}</p>
                          <span
                            className={`signal-label shrink-0 ${
                              f.confidence === "thin" ? "text-amber-300/80" : ""
                            }`}
                          >
                            {f.confidence}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-white/40">
                          {f.evidenceIds.join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {(payload?.angles.length ?? 0) > 0 ? (
                    <>
                      <h2 className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                        Angles
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {payload!.angles.map((a) => (
                          <span
                            key={a}
                            className="rounded border border-white/10 px-2 py-1 font-mono text-[11px] text-white/70"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}

                  {(payload?.openQuestions.length ?? 0) > 0 ? (
                    <>
                      <h2 className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-white/45">
                        Open questions
                      </h2>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-white/70">
                        {payload!.openQuestions.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </>
              )}
            </div>
          </section>
        )}

        <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-4">
          <p className="text-sm font-medium tracking-tight">Inspector</p>
          {selected ? (
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
              <p className="signal-label">{KIND_LABEL[selected.kind]}</p>
              <p className="mt-2 text-sm text-white/90">{selected.title}</p>
              <p className="mt-3 text-pretty text-xs leading-relaxed text-white/55">
                {selected.snippet}
              </p>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-9 items-center rounded-full border border-white/20 px-3 text-xs text-white/80 hover:border-white/40 hover:text-white"
              >
                Open source
              </a>
            </div>
          ) : (
            <p className="mt-3 text-xs text-white/45">
              Select a source on the left. Research never invents a citation.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
