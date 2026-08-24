import { TrendMark, trendAria } from "@/components/desk/TrendMarks";
import { topicRisk } from "@/lib/booster";
import { totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import type { CapturedArtifact, Topic } from "@/lib/types";

interface TickerTapeProps {
  topics: Topic[];
  artifactsById?: Map<string, CapturedArtifact[]>;
  onSelect: (topic: Topic) => void;
}

export default function TickerTape({ topics, artifactsById, onSelect }: TickerTapeProps) {
  const ranked = [...topics].toSorted((a, b) => totalScore(b) - totalScore(a));
  const items = ranked.length ? [...ranked, ...ranked] : [];

  if (items.length === 0) return null;

  return (
    <div className="relative z-20 mx-3 mt-2 overflow-hidden rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)]">
      <div className="tape-track flex w-max gap-7 px-4 py-2">
        {items.map((t, i) => {
          const risk = topicRisk(t);
          const category = TrendMark.category(t, artifactsById?.get(t.id) ?? []);
          const name = trendAria(t, category);
          return (
            <button
              key={`${t.id}-${i}`}
              type="button"
              onClick={() => onSelect(t)}
              title={name}
              aria-label={name}
              className="group flex shrink-0 items-center gap-2 font-mono text-[11px] tabular-nums text-white/80 transition-colors duration-150 hover:text-white"
            >
              <TrendMark.Tile topic={t} category={category} size={22} />
              <TrendMark.Caption>{name}</TrendMark.Caption>
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
                className={`h-1.5 w-1.5 rounded-full ${
                  risk === "high" ? "bg-red-400" : risk === "medium" ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
