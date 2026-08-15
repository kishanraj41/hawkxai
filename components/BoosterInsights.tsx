"use client";

import { motion } from "motion/react";
import { motionTokens } from "@/lib/motionTokens";
import type { BoosterTopicBrief } from "@/lib/types";

const KIND_STYLE: Record<BoosterTopicBrief["artifacts"][number]["kind"], string> = {
  hashtag: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  phrase: "border-white/15 bg-white/5 text-zinc-200",
  url: "border-violet-400/25 bg-violet-400/10 text-violet-100",
  qr: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  ticker: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
};

const RISK_STYLE = {
  low: "text-emerald-300",
  medium: "text-amber-300",
  high: "text-red-300",
};

interface BoosterInsightsProps {
  brief: BoosterTopicBrief;
}

export default function BoosterInsights({ brief }: BoosterInsightsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: motionTokens.distance.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
      className="mt-5 border-t border-white/10 pt-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Booster</p>
        <span className="text-[10px] tabular-nums text-zinc-500">
          {Math.round(brief.confidence * 100)}% evidence
        </span>
      </div>

      <p className="mt-2 text-pretty text-sm leading-relaxed text-zinc-300">
        {brief.whyTrending}
      </p>

      {brief.artifacts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brief.artifacts.slice(0, 8).map((a) => (
            <span
              key={`${a.kind}:${a.value}`}
              className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[10px] ${KIND_STYLE[a.kind]}`}
              title={a.value}
            >
              {a.kind === "hashtag" || a.kind === "ticker" ? a.value : `${a.kind}: ${a.value}`}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">
          Competitor move · {brief.campaign.timing}
        </p>
        <p className="mt-1 text-sm text-zinc-100">{brief.campaign.hook}</p>
        <p className="mt-1 text-pretty text-xs leading-relaxed text-zinc-400">
          {brief.campaign.forCompetitors}
        </p>
        <p className={`mt-2 text-[10px] uppercase tracking-wide ${RISK_STYLE[brief.campaign.risk]}`}>
          {brief.campaign.risk} risk · {brief.campaign.angle}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {brief.audiences.map((a) => (
          <p key={a.lens} className="text-pretty text-xs leading-relaxed text-zinc-400">
            <span className="font-medium text-zinc-300">{a.label}.</span> {a.takeaway}
          </p>
        ))}
      </div>
    </motion.section>
  );
}
