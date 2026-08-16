"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import ResearchLookup from "@/components/research/ResearchLookup";
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
  formatResearchBrief,
  researchBriefFilename,
} from "@/lib/research-brief";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import type { ResearchPayload, ResearchSource, ResearchSourceKind } from "@/lib/types";

const KIND_LABEL: Record<ResearchSourceKind, string> = {
  wikipedia: "Wiki",
  web: "Web",
  hn: "HN",
  reddit: "Reddit",
  x: "X",
  public: "APIs",
  pubmed: "PubMed",
  arxiv: "arXiv",
  uspto: "USPTO",
};

function setQueryUrl(topic: string) {
  const url = new URL(window.location.href);
  if (topic) url.searchParams.set("q", topic);
  else url.searchParams.delete("q");
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function ResearchExport({ payload }: { payload: ResearchPayload }) {
  const markdown = useMemo(() => formatResearchBrief(payload), [payload]);
  const filename = useMemo(() => researchBriefFilename(payload.query), [payload.query]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      /* clipboard can fail in locked-down browsers */
    }
  }, [markdown]);

  const download = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, filename]);

  return (
    <>
      <div className="no-print flex shrink-0 items-center gap-0.5">
        <GhostButton onClick={() => void copy()}>Copy</GhostButton>
        <GhostButton onClick={download}>Save .md</GhostButton>
        <GhostButton onClick={() => window.print()}>Print / PDF</GhostButton>
      </div>
      <article className="keep-brief-sheet" aria-hidden>
        <pre>{markdown}</pre>
      </article>
    </>
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
      className={`w-full rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors duration-120 ${
        active
          ? "border-white/30 bg-white/[0.07]"
          : "border-white/8 hover:border-white/18 hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="signal-label shrink-0">{KIND_LABEL[source.kind]}</span>
        {source.score != null ? (
          <span className="font-mono text-[10px] tabular-nums text-white/40">{source.score}</span>
        ) : null}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-white/88">{source.title}</p>
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
    <main className="desk-shell">
      <AmbientBackground />

      <DeskFrame
        toolbar={
          <form
            onSubmit={handleSubmit}
            className="desk-chrome__toolbar-form flex min-w-0 flex-1 items-center gap-2"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Topic, paper, policy, patent…"
              enterKeyHint="search"
              className="field-input max-w-xl"
            />
            <PrimaryButton type="submit" disabled={loading || !query.trim()}>
              Research
            </PrimaryButton>
          </form>
        }
        context={
          payload ? (
            <>
              <span className="signal-label shrink-0">Topic</span>
              <span className="max-w-[min(280px,60vw)] truncate rounded border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[12px]">
                {payload.query}
              </span>
              <div className="desk-chrome__context-trail flex items-center gap-2">
                {Object.entries(byKind).map(([kind, n]) => (
                  <StatusChip key={kind}>
                    {KIND_LABEL[kind as ResearchSourceKind]} {n}
                  </StatusChip>
                ))}
              </div>
              <GhostButton onClick={handleClear}>Clear</GhostButton>
            </>
          ) : (
            <span className="signal-label shrink-0">
              Name a topic · dig the corners
              <span className="desk-shortcut"> · ⌘K</span>
            </span>
          )
        }
      >
        <div className="desk-chrome__brand flex min-w-0 shrink-0 items-center gap-3">
          <HomeMark />
          <DeskNav active="research" />
        </div>
        <div className="desk-chrome__status flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <StatusChip>
            {loading
              ? "researching"
              : payload
                ? `${payload.sources.length} sources · ${formatUpdatedAt(payload.updatedAt)}`
                : "research a topic"}
          </StatusChip>
          {payload?.thin ? (
            <span className="status-chip status-chip--warn">thin evidence</span>
          ) : null}
          {payload?.degraded.map((msg) => (
            <StatusChip key={msg}>{msg}</StatusChip>
          ))}
        </div>
        <div className="desk-chrome__actions ml-auto flex shrink-0 items-center gap-1">
          {payload ? <ResearchExport payload={payload} /> : null}
          <GhostButton
            onClick={() => void runResearch(query)}
            disabled={loading || !query.trim()}
          >
            Refresh
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div className="no-print relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <DeskWorkspace
        listLabel="Sources"
        listBlurb="Cited receipts"
        stageLabel="Brief"
        stageBlurb="What they say"
        detailLabel="Inspect"
        detailBlurb="One source"
        jumpToDetailKey={selectedId}
        preferStage={empty}
        list={
          <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-3.5">
            <p className="text-sm font-medium tracking-tight">Sources</p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Wiki, web, PubMed, arXiv, USPTO, HN, Reddit, X.
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
        }
        stage={
          empty ? (
            <ResearchLookup
              onLookup={(t) => void runResearch(t)}
              onFocusLookup={() => inputRef.current?.focus()}
            />
          ) : (
            <section className="signal-glass flex min-h-0 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
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
                  <p className="text-sm text-white/45">
                    Digging Wikipedia, web, PubMed, arXiv, USPTO, HN, Reddit, X…
                  </p>
                ) : (
                  <>
                    <p className="text-pretty text-[15px] leading-relaxed text-white/88">
                      {payload?.summary}
                    </p>

                    <h2 className="mt-7 signal-label">Findings</h2>
                    <ul className="mt-2.5 space-y-2.5">
                      {(payload?.findings ?? []).map((f, i) => (
                        <li
                          key={`${f.claim.slice(0, 40)}-${i}`}
                          className="rounded-[var(--radius-sm)] border border-white/8 bg-white/[0.02] px-3 py-2.5"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[13px] leading-snug text-white/90">{f.claim}</p>
                            <span
                              className={`signal-label shrink-0 ${
                                f.confidence === "thin" ? "text-amber-300/80" : ""
                              }`}
                            >
                              {f.confidence}
                            </span>
                          </div>
                          <p className="mt-1.5 font-mono text-[10px] text-white/35">
                            {f.evidenceIds.join(" · ")}
                          </p>
                        </li>
                      ))}
                    </ul>

                    {(payload?.angles.length ?? 0) > 0 ? (
                      <>
                        <h2 className="mt-7 signal-label">Angles</h2>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {payload!.angles.map((a) => (
                            <button
                              key={a}
                              type="button"
                              disabled={loading}
                              onClick={() => void runResearch(`${payload!.query}: ${a}`)}
                              className="empty-stage__chip disabled:opacity-40"
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {(payload?.openQuestions.length ?? 0) > 0 ? (
                      <>
                        <h2 className="mt-7 signal-label">Open questions</h2>
                        <p className="mt-1 text-xs text-white/40">Tap to research that angle.</p>
                        <ul className="mt-2.5 space-y-1.5">
                          {payload!.openQuestions.map((q) => (
                            <li key={q}>
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => void runResearch(q)}
                                className="w-full rounded-[var(--radius-sm)] border border-white/8 px-3 py-2.5 text-left text-[13px] text-white/70 transition-colors duration-120 hover:border-white/22 hover:bg-white/[0.03] hover:text-white disabled:opacity-40"
                              >
                                {q}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </section>
          )
        }
        detail={
          <aside className="signal-glass flex min-h-0 flex-col overflow-hidden p-4">
            <p className="text-sm font-medium tracking-tight">Inspector</p>
            {selected ? (
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                <p className="signal-label">{KIND_LABEL[selected.kind]}</p>
                <p className="mt-2 text-sm leading-snug text-white/92">{selected.title}</p>
                <p className="mt-3 text-pretty text-xs leading-relaxed text-white/55">
                  {selected.snippet}
                </p>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost mt-4 border border-white/12"
                >
                  Open source
                </a>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-white/45">
                Select a source from the list. Research never invents a citation.
              </p>
            )}
          </aside>
        }
      />
    </main>
  );
}
