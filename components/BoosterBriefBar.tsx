"use client";

import { motion } from "framer-motion";
import { motionTokens } from "@/lib/motionTokens";
import type { BoosterPayload } from "@/lib/types";

interface BoosterBriefBarProps {
  booster: BoosterPayload;
}

export default function BoosterBriefBar({ booster }: BoosterBriefBarProps) {
  const top = booster.improvisations[0];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
      className="relative z-20 overflow-hidden border-b border-white/10 bg-[#0a0e14]/70 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-baseline sm:gap-4">
        <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-sky-300/80">
          Booster
        </span>
        <p className="min-w-0 flex-1 text-pretty text-xs leading-relaxed text-zinc-300 sm:text-sm">
          {booster.summary}
        </p>
        {top ? (
          <p className="shrink-0 text-[11px] text-zinc-500">
            Next: {top.priority} {top.title}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
