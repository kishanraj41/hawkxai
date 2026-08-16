"use client";

import { FormEvent, useEffect, useState } from "react";

interface TopicPlugProps {
  value: string;
  busy: boolean;
  onPlug: (topic: string) => void;
  onClear: () => void;
}

export default function TopicPlug({ value, busy, onPlug, onClear }: TopicPlugProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    onPlug(q);
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-[220px] flex-1 items-center gap-2 sm:max-w-lg">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Camry, #HeatWaveFit, launch event…"
        aria-label="Plug a topic"
        className="h-9 w-full rounded border border-white/10 bg-transparent px-3 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || !draft.trim()}
        className="h-9 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black transition-colors duration-150 hover:bg-white/85 disabled:opacity-40"
      >
        Plug
      </button>
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="signal-label h-9 shrink-0 px-2"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
