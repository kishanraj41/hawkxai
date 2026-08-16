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
    <form
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px] sm:max-w-lg"
    >
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Camry, #HeatWaveFit, launch event…"
        aria-label="Plug a topic"
        enterKeyHint="go"
        className="field-input"
      />
      <button type="submit" disabled={busy || !draft.trim()} className="btn-primary">
        Plug
      </button>
      {value ? (
        <button type="button" onClick={onClear} className="btn-ghost">
          Clear
        </button>
      ) : null}
    </form>
  );
}
