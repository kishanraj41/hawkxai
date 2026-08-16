"use client";

const SUGGESTIONS = [
  { id: "camry", label: "Camry" },
  { id: "heatwave", label: "#HeatWaveFit" },
  { id: "tesla", label: "Tesla" },
  { id: "wwdc", label: "WWDC" },
  { id: "justdoit", label: "Just Do It" },
] as const;

interface PhraseLookupProps {
  onLookup: (phrase: string) => void;
  onFocusLookup: () => void;
}

export default function PhraseLookup({ onLookup, onFocusLookup }: PhraseLookupProps) {
  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-medium tracking-tight">Footprint</h1>
          <p className="mt-0.5 text-xs text-white/45">
            Look up a campaign, hashtag, or phrase. Same desk, mind, and map — for that print only.
          </p>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-white/45">
          ⌘K
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-start justify-center px-8 py-10">
        <p className="text-lg font-medium tracking-tight">Look up a word or phrase</p>
        <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-white/55">
          A marketing team plugs the campaign name. The desk shows where it is printing on the
          internet — receipts only, never an invented WHY.
        </p>
        <button
          type="button"
          onClick={onFocusLookup}
          className="mt-6 h-9 rounded-full bg-white px-4 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/85"
        >
          Focus lookup
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
