import type { CausationReport } from "@/lib/types";

interface CausationChartProps {
  report: CausationReport | null;
}

export default function CausationChart({ report }: CausationChartProps) {
  if (!report || report.drivers.length === 0) {
    return <p className="signal-label">No receipts — will not invent a cause.</p>;
  }

  return (
    <div>
      {report.thin ? (
        <p className="signal-label mb-2 text-amber-400/80">Thin evidence — drivers are measurements, not a story.</p>
      ) : null}
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
                className="h-full rounded-full bg-white/70"
                style={{ width: `${driver.weight}%` }}
              />
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-white/40" title={driver.evidence}>
              {driver.evidence}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
