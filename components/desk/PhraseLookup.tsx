"use client";

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
      copy="Plug the name your team already owns. The desk fills with where it is printing — mind, related prints, and receipts for that print only."
      primaryLabel="Focus lookup"
      onPrimary={onFocusLookup}
      suggestions={[...SUGGESTIONS]}
      onSuggest={onLookup}
    />
  );
}
