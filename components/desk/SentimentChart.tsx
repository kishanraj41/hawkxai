import type { SentimentReport } from "@/lib/types";

interface SentimentChartProps {
  report: SentimentReport | null;
}

const LEAN: Record<SentimentReport["lean"], string> = {
  pos: "positive lean",
  neg: "negative lean",
  mixed: "split",
  thin: "thin",
};

export default function SentimentChart({ report }: SentimentChartProps) {
  if (!report || report.drivers.length === 0) {
    return <p className="signal-label">No receipts — will not invent a mood.</p>;
  }

  return (
    <div>
      <p className={`signal-label mb-2 ${report.thin ? "text-amber-400/80" : "text-white/55"}`}>
        {LEAN[report.lean]} · {report.overall.pos} pos / {report.overall.neg} neg / {report.overall.n} titles
        {report.thin ? " — measurements, not a story" : ""}
      </p>
      <ul className="space-y-2">
        {report.drivers.map((driver) => (
          <li key={driver.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-[12px] text-white/85">{driver.label}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/55">
                {driver.weight}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  driver.id.includes("neg") || driver.id.includes("risk")
                    ? "bg-[#f87171]/80"
                    : driver.id.includes("pos")
                      ? "bg-[#34d399]/80"
                      : "bg-white/70"
                }`}
                style={{ width: `${driver.weight}%` }}
              />
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-white/40" title={driver.evidence}>
              {driver.evidence}
            </p>
          </li>
        ))}
      </ul>
      {report.quotes.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {report.quotes.map((q) => (
            <li key={q} className="truncate text-[11px] text-white/50" title={q}>
              “{q}”
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
