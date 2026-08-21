import { lineageLine } from "@/lib/lineage";

export default function LineageStrip({
  tool,
  collectedAt,
  sourceApi,
}: {
  tool?: string;
  collectedAt?: string;
  sourceApi?: string;
}) {
  const line = lineageLine({ tool, collectedAt, sourceApi });
  if (!line) return null;
  return <p className="signal-label mt-0.5 tabular-nums text-white/40">{line}</p>;
}
