"use client";

import type { TapeDelta } from "@/lib/watch";

interface TapeWatchProps {
  deltas: TapeDelta[];
  onPick: (topicId: string) => void;
}

export default function TapeWatch({ deltas, onPick }: TapeWatchProps) {
  if (!deltas.length) return null;

  return (
    <div className="no-print relative z-20 mx-3 mt-2 rounded-lg border border-white/8 bg-[#0c0d10] px-4 py-2">
      <p className="signal-label">Since last look</p>
      <ul className="mt-1 space-y-1">
        {deltas.map((d) => (
          <li key={d.topicId}>
            <button
              type="button"
              onClick={() => onPick(d.topicId)}
              className="text-left text-sm text-white/80 hover:text-white"
            >
              <span className="text-white">{d.label}</span>
              <span className="text-white/50"> · {d.lines.join(" · ")}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
