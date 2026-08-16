"use client";

import { useState } from "react";
import type { AgeLens, BoosterTopicBrief } from "@/lib/types";

const RISK_STYLE = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

interface BoosterInsightsProps {
  brief: BoosterTopicBrief;
  lens?: AgeLens | "all";
}

export default function BoosterInsights({ brief, lens = "all" }: BoosterInsightsProps) {
  const [picked, setPicked] = useState<AgeLens>("millennial");
  const open = lens === "all" ? picked : lens;
  const active = brief.audiences.find((a) => a.lens === open) ?? brief.audiences[0];

  return (
    <section className="mt-5 border-t border-white/8 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="signal-label">Brief · {brief.category}</p>
        <span className="font-mono text-[10px] tabular-nums text-white/45">
          {Math.round(brief.confidence * 100)}% evidence
        </span>
      </div>

      <p className="mt-2 text-pretty text-sm leading-relaxed text-white/70">{brief.whyTrending}</p>

      {brief.artifacts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brief.artifacts.slice(0, 8).map((a) => (
            <span
              key={`${a.kind}:${a.value}`}
              className="max-w-full truncate rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/80"
              title={a.value}
            >
              {a.kind === "hashtag" || a.kind === "ticker" ? a.value : a.value}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.03] p-3">
        <p className="signal-label">
          Play · {brief.campaign.timing}
        </p>
        <p className="mt-1 text-sm text-white">{brief.campaign.hook}</p>
        <p className="mt-1 text-pretty text-xs leading-relaxed text-white/50">
          {brief.campaign.forCompetitors}
        </p>
        <p className={`mt-2 signal-label ${RISK_STYLE[brief.campaign.risk]}`}>
          {brief.campaign.risk} risk · {brief.campaign.angle}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {brief.audiences.map((a) => (
          <button
            key={a.lens}
            type="button"
            onClick={() => setPicked(a.lens)}
            className={`rounded px-2 py-1 font-mono text-[10px] tabular-nums transition-colors duration-150 ${
              active?.lens === a.lens ? "bg-white text-black" : "text-white/50 hover:text-white"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {active ? (
        <p className="mt-2 text-pretty text-xs leading-relaxed text-white/60">{active.takeaway}</p>
      ) : null}
    </section>
  );
}
