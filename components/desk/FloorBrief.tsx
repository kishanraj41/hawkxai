import { CATEGORY_LABEL } from "@/lib/desk";
import type { QueryInsight, SentimentReport } from "@/lib/types";

interface FloorBriefProps {
  query: QueryInsight;
  sentiment: SentimentReport | null;
  hook?: string;
}

const KIND_COPY: Record<QueryInsight["kind"], string> = {
  ticker: "Ticker",
  hashtag: "Hashtag",
  campaign: "Campaign",
  event: "Event",
  product: "Product",
  place: "Place",
  generic: "Topic",
};

export default function FloorBrief({ query, sentiment, hook }: FloorBriefProps) {
  return (
    <div className="rounded-lg border border-white/8 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium">Floor facts</p>
        <p className="signal-label">
          {KIND_COPY[query.kind]} · {CATEGORY_LABEL[query.category]} · {query.match}
        </p>
      </div>
      <p className="text-sm text-white/80">{query.floor}</p>
      {hook ? <p className="mt-2 text-xs text-white/50">{hook}</p> : null}
      {sentiment?.quotes[0] ? (
        <p className="mt-2 truncate font-mono text-[11px] text-white/45" title={sentiment.quotes[0]}>
          Receipt: {sentiment.quotes[0]}
        </p>
      ) : null}
    </div>
  );
}
