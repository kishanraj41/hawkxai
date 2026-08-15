import { topicRisk } from "@/lib/booster";
import { totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import type { Topic } from "@/lib/types";

interface TickerTapeProps {
  topics: Topic[];
  onSelect: (topic: Topic) => void;
}

export default function TickerTape({ topics, onSelect }: TickerTapeProps) {
  const ranked = [...topics].toSorted((a, b) => totalScore(b) - totalScore(a));
  const items = ranked.length ? [...ranked, ...ranked] : [];

  if (items.length === 0) return null;

  return (
    <div className="relative z-20 mx-3 mt-2 overflow-hidden rounded-lg border border-white/8 bg-[#0c0d10]">
      <div className="tape-track flex w-max gap-6 px-4 py-1.5">
        {items.map((t, i) => {
          const risk = topicRisk(t);
          return (
            <button
              key={`${t.id}-${i}`}
              type="button"
              onClick={() => onSelect(t)}
              className="flex shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums text-white/80 transition-colors duration-150 hover:text-white"
            >
              <span className="max-w-[220px] truncate">{t.label}</span>
              <span className="text-white">{Math.round(totalScore(t))}</span>
              <span
                className={
                  t.velocity === "rising"
                    ? "text-emerald-400"
                    : t.velocity === "fading"
                      ? "text-red-400"
                      : "text-white/40"
                }
              >
                {VELOCITY_MARK[t.velocity]}
              </span>
              <span
                className={
                  risk === "high"
                    ? "text-red-400"
                    : risk === "medium"
                      ? "text-amber-400"
                      : "text-white/35"
                }
              >
                {risk}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
