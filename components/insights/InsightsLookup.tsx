"use client";

import DemoWalk from "@/components/desk/DemoWalk";
import EmptyStage from "@/components/shell/EmptyStage";

const SUGGESTIONS = [
  { id: "camry", label: "Camry" },
  { id: "tesla", label: "Tesla" },
  { id: "wwdc", label: "WWDC" },
  { id: "heatwave", label: "#HeatWaveFit" },
  { id: "justdoit", label: "Just Do It" },
] as const;

interface InsightsLookupProps {
  onLookup: (phrase: string) => void;
  onFocusLookup: () => void;
}

export default function InsightsLookup({ onLookup, onFocusLookup }: InsightsLookupProps) {
  return (
    <EmptyStage
      eyebrow="Insights"
      title="Look up a campaign or product"
      copy="Plug a name. Live occurrence, source mix, and receipts fill the board — never invented spend, never an invented WHY."
      primaryLabel="Focus lookup"
      onPrimary={onFocusLookup}
      suggestions={[...SUGGESTIONS]}
      onSuggest={onLookup}
    >
      <DemoWalk />
    </EmptyStage>
  );
}
