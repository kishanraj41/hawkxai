"use client";

import DemoWalk from "@/components/desk/DemoWalk";
import EmptyStage from "@/components/shell/EmptyStage";

const SUGGESTIONS = [
  { id: "camry", label: "Camry" },
  { id: "heatwave", label: "#HeatWaveFit" },
  { id: "tesla", label: "Tesla" },
  { id: "wwdc", label: "WWDC" },
  { id: "justdoit", label: "Just Do It" },
] as const;

interface PhraseLookupProps {
  onLookup: (phrase: string) => void;
  onFocusLookup: () => void;
}

export default function PhraseLookup({ onLookup, onFocusLookup }: PhraseLookupProps) {
  return (
    <EmptyStage
      eyebrow="Footprint"
      title="Look up a campaign or phrase"
      copy="Plug the name your team already owns. Occurrence, receipts, and a keepable brief fill from live tape — never an invented WHY. Overlay a second phrase after lookup: two lines, not a shared story."
      primaryLabel="Focus lookup"
      onPrimary={onFocusLookup}
      suggestions={[...SUGGESTIONS]}
      onSuggest={onLookup}
    >
      <DemoWalk />
    </EmptyStage>
  );
}
