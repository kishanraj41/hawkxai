import { TrendMark, categoryCaption } from "@/components/desk/TrendMarks";
import { CATEGORIES, type DeskCategory } from "@/lib/types";

interface CategoryPlugsProps {
  value: DeskCategory;
  counts: Record<DeskCategory, number>;
  onChange: (category: DeskCategory) => void;
}

const PLUGS: DeskCategory[] = ["all", ...CATEGORIES];

export default function CategoryPlugs({ value, counts, onChange }: CategoryPlugsProps) {
  return (
    <div
      className="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Category"
    >
      {PLUGS.map((id) => {
        const n = counts[id] ?? 0;
        if (id !== "all" && n === 0) return null;
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            aria-label={`${categoryCaption(id)} · ${n}`}
            title={categoryCaption(id)}
            className={`flex h-10 shrink-0 items-center justify-center gap-1 rounded border px-1.5 transition-colors duration-80 sm:h-9 sm:px-2 ${
              active
                ? "border-white/40 bg-white/[0.08] text-white"
                : "border-white/10 text-white/55 hover:border-white/20 hover:text-white"
            }`}
          >
            <TrendMark.Plug category={id} size={22} />
            <span className="font-mono text-[10px] tabular-nums text-white/45">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
