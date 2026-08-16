"use client";

const SUGGESTIONS = [
  { id: "crispr", label: "CRISPR gene editing ethics" },
  { id: "supply", label: "Semiconductor supply chain 2026" },
  { id: "arctic", label: "Arctic shipping routes" },
  { id: "open", label: "Open-source AI model licensing" },
  { id: "water", label: "Urban water scarcity" },
] as const;

interface ResearchLookupProps {
  onLookup: (topic: string) => void;
  onFocusLookup: () => void;
}

export default function ResearchLookup({ onLookup, onFocusLookup }: ResearchLookupProps) {
  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-medium tracking-tight">Research</h1>
          <p className="mt-0.5 text-xs text-white/45">
            Deep lookup across Wikipedia, the open web, HN, Reddit, and X — receipts only.
          </p>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-white/45">⌘K</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center px-8 py-10">
        <p className="text-lg font-medium tracking-tight">Research a topic</p>
        <p className="mt-2 max-w-lg text-pretty text-sm leading-relaxed text-white/55">
          HawkAI digs the corners: encyclopedia pages, live discussion, and a deep Grok pass when
          available. Findings cite sources. Thin evidence stays thin — never invented.
        </p>
        <button
          type="button"
          onClick={onFocusLookup}
          className="mt-6 h-9 rounded-full bg-white px-4 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/85"
        >
          Focus research
        </button>
        <div className="mt-6 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onLookup(s.label)}
              className="h-8 rounded border border-white/10 px-2.5 font-mono text-[11px] text-white/70 transition-colors duration-80 hover:border-white/30 hover:text-white"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
