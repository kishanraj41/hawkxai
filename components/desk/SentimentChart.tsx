import { PLATFORMS, type Post, type SentimentReport } from "@/lib/types";

interface SentimentPeekProps {
  report: SentimentReport | null;
}

interface SentimentSheetProps {
  report: SentimentReport | null;
  posts?: Post[];
}

const LEAN: Record<SentimentReport["lean"], string> = {
  pos: "positive lean",
  neg: "negative lean",
  mixed: "split",
  thin: "thin",
};

function Bars({ report }: { report: SentimentReport }) {
  return (
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
          <p className="mt-1 font-mono text-[10px] text-white/40">{driver.evidence}</p>
        </li>
      ))}
    </ul>
  );
}

function SentimentPeek({ report }: SentimentPeekProps) {
  if (!report || report.drivers.length === 0) {
    return <p className="signal-label">No receipts — will not invent a mood.</p>;
  }

  return (
    <div>
      <p className={`signal-label mb-2 ${report.thin ? "text-amber-400/80" : "text-white/55"}`}>
        {LEAN[report.lean]} · {report.overall.pos} pos / {report.overall.neg} neg / {report.overall.n}{" "}
        titles
        {report.thin ? " — measurements, not a story" : ""}
      </p>
      <Bars report={report} />
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

function SentimentSheet({ report, posts = [] }: SentimentSheetProps) {
  if (!report || report.drivers.length === 0) {
    return <p className="signal-label">No receipts — will not invent a mood.</p>;
  }

  const hits =
    report.hits?.length > 0
      ? report.hits
      : posts.flatMap((p) => {
          const quoted = report.quotes.find((q) => p.title.startsWith(q.slice(0, 20)));
          return quoted ? [{ title: p.title, url: p.url, platform: p.platform, pos: 0, neg: 0, risk: 0 }] : [];
        });

  return (
    <div className="min-h-0 overflow-y-auto p-4">
      <p className={`signal-label ${report.thin ? "text-amber-400/80" : "text-white/55"}`}>
        {LEAN[report.lean]} · {report.overall.pos} pos / {report.overall.neg} neg / {report.overall.risk}{" "}
        risk · n={report.overall.n}
        {report.thin ? " — thin titles, not a story" : ""}
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[13px] font-medium">Title correlation</p>
          <Bars report={report} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium">By source</p>
          <table className="w-full text-left">
            <thead>
              <tr className="signal-label">
                <th className="py-1 pr-2 font-normal">Source</th>
                <th className="py-1 pr-2 text-right font-normal">n</th>
                <th className="py-1 pr-2 text-right font-normal">Pos</th>
                <th className="py-1 pr-2 text-right font-normal">Neg</th>
                <th className="py-1 text-right font-normal">Risk</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((p) => {
                const mix = report.byPlatform[p];
                if (!mix || mix.n === 0) return null;
                return (
                  <tr key={p} className="font-mono text-[11px] tabular-nums text-white/75">
                    <td className="py-1.5 pr-2 uppercase">{p === "public" ? "APIs" : p}</td>
                    <td className="py-1.5 pr-2 text-right">{mix.n}</td>
                    <td className="py-1.5 pr-2 text-right text-[#34d399]">{mix.pos}</td>
                    <td className="py-1.5 pr-2 text-right text-[#f87171]">{mix.neg}</td>
                    <td className="py-1.5 text-right text-amber-400">{mix.risk}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {PLATFORMS.every((p) => !report.byPlatform[p]?.n) ? (
            <p className="signal-label mt-2">No titled receipts on a source yet.</p>
          ) : null}
        </div>
      </div>

      {hits.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-medium">Receipts with tone words</p>
          <ul className="space-y-2">
            {hits.map((hit) => (
              <li key={hit.url}>
                <a
                  href={hit.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] leading-snug text-white/90 hover:underline"
                >
                  {hit.title}
                </a>
                <p className="signal-label mt-0.5">
                  {hit.platform} · {hit.pos} pos / {hit.neg} neg / {hit.risk} risk
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="signal-label mt-6">No pos/neg/risk lexicon hits — will not invent a mood.</p>
      )}

      <p className="signal-label mt-6">Evidence only. Title counts, never a generated WHY.</p>
    </div>
  );
}

export const SentimentChart = {
  Peek: SentimentPeek,
  Sheet: SentimentSheet,
};

export default SentimentPeek;
