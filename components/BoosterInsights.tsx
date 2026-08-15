"use client";

import type { BoosterTopicBrief } from "@/lib/types";

const RISK_STYLE = {
  low: "text-emerald-300",
  medium: "text-[#ffb24d]",
  high: "text-red-300",
};

interface BoosterInsightsProps {
  brief: BoosterTopicBrief;
}

export default function BoosterInsights({ brief }: BoosterInsightsProps) {
  return (
    <section className="mt-5 border-t border-[#1c2333] pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="signal-label">Booster</p>
        <span className="signal-label tabular-nums">
          {Math.round(brief.confidence * 100)}% evidence
        </span>
      </div>

      <p className="mt-2 text-pretty text-sm leading-relaxed text-[#c5c9d4]">
        {brief.whyTrending}
      </p>

      {brief.artifacts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brief.artifacts.slice(0, 8).map((a) => (
            <span
              key={`${a.kind}:${a.value}`}
              className="max-w-full truncate rounded-md border border-[#1c2333] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#f4f1ea]"
              title={a.value}
            >
              {a.kind === "hashtag" || a.kind === "ticker" ? a.value : `${a.kind}: ${a.value}`}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-[#1c2333] bg-[#05060a]/60 p-3">
        <p className="signal-label">
          Competitor move · {brief.campaign.timing}
        </p>
        <p className="mt-1 text-sm text-[#f4f1ea]">{brief.campaign.hook}</p>
        <p className="mt-1 text-pretty text-xs leading-relaxed text-[#7c8598]">
          {brief.campaign.forCompetitors}
        </p>
        <p className={`mt-2 signal-label ${RISK_STYLE[brief.campaign.risk]}`}>
          {brief.campaign.risk} risk · {brief.campaign.angle}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {brief.audiences.map((a) => (
          <p key={a.lens} className="text-pretty text-xs leading-relaxed text-[#7c8598]">
            <span className="font-medium text-[#f4f1ea]">{a.label}.</span> {a.takeaway}
          </p>
        ))}
      </div>
    </section>
  );
}
