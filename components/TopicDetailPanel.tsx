"use client";

import { motion, useReducedMotion } from "framer-motion";
import { divergenceLabel, topPosts } from "@/lib/ui-helpers";
import { motionTokens } from "@/lib/motionTokens";
import BoosterInsights from "@/components/BoosterInsights";
import type { BoosterTopicBrief, Platform, Topic } from "@/lib/types";

function VelocityMark({ velocity }: { velocity: Topic["velocity"] }) {
  if (velocity === "rising") {
    return <span className="signal-label text-[#ffb24d]">Rising</span>;
  }
  if (velocity === "fading") {
    return <span className="signal-label opacity-45">Fading</span>;
  }
  return <span className="signal-label">Peaking</span>;
}

function DivergenceMeter({ value }: { value: number }) {
  const filled = Math.max(1, Math.round(value * 24));
  return (
    <div className="flex h-4 items-end gap-px" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="w-px"
          style={{
            height: i % 4 === 0 ? 14 : 9,
            background: i < filled ? "#f4f1ea" : "#2a3245",
          }}
        />
      ))}
    </div>
  );
}

function SourceMark({ platform }: { platform: Platform }) {
  const dash =
    platform === "reddit" ? "5 3" : platform === "hn" ? "1.5 2.4" : undefined;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
      <circle
        cx="7"
        cy="7"
        r="4.5"
        fill="none"
        stroke="#46506b"
        strokeWidth="1.4"
        strokeDasharray={dash}
      />
    </svg>
  );
}

interface TopicDetailPanelProps {
  topic: Topic;
  brief?: BoosterTopicBrief;
  onClose: () => void;
}

export default function TopicDetailPanel({ topic, brief }: TopicDetailPanelProps) {
  const reduce = useReducedMotion();
  const receipts = topPosts(topic);
  const platformScores = (["x", "reddit", "hn"] as const).filter(
    (p) => topic.platforms[p].score > 0,
  );

  return (
    <motion.aside
      key={topic.id}
      initial={{ opacity: 0, x: reduce ? 0 : motionTokens.distance.lg }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduce ? 0 : motionTokens.distance.md }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
      }}
      className="absolute right-3 top-3 z-10 flex h-[calc(100%-1.5rem)] w-full max-w-sm flex-col rounded-[4px] border border-[#1c2333] bg-[#0a0e17] p-5"
    >
      <span
        aria-hidden
        className="absolute left-0 top-5 h-4 w-0.5 bg-[#ffb24d]"
      />

      <motion.h2
        className="text-balance text-2xl font-medium leading-snug tracking-tight text-[#f4f1ea]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
      >
        {topic.label}
      </motion.h2>

      <div className="mt-5 space-y-4">
        <div>
          <p className="signal-label">Detected</p>
          <div className="mt-2">
            <VelocityMark velocity={topic.velocity} />
          </div>
        </div>
        <div>
          <p className="signal-label">Spread</p>
          <div className="mt-2 flex items-center gap-3">
            <DivergenceMeter value={topic.divergence} />
            <span className="signal-label text-[#f4f1ea]">{divergenceLabel(topic)}</span>
          </div>
        </div>
        <div>
          <p className="signal-label">Sources</p>
          <div className="mt-2 flex gap-3">
            {platformScores.map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <SourceMark platform={p} />
                <span className="signal-label tabular-nums text-[#f4f1ea]">
                  {topic.platforms[p].score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topic.why ? (
        <p className="mt-4 text-pretty text-sm leading-relaxed text-[#7c8598]">{topic.why}</p>
      ) : null}

      {topic.peakHourCT ? (
        <p className="signal-label mt-2 tabular-nums">Peak {topic.peakHourCT} CT</p>
      ) : null}

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <p className="signal-label">Receipts</p>
        <div className="mt-3 space-y-3">
          {receipts.length === 0 ? (
            <p className="signal-label">No posts attached</p>
          ) : (
            receipts.map((post) => (
              <a
                key={post.url}
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 text-sm text-[#f4f1ea] hover:underline hover:decoration-[#ffb24d] hover:underline-offset-4"
              >
                <SourceMark platform={post.platform} />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-pretty">{post.title}</span>
                  <span className="signal-label mt-1 block tabular-nums">{post.score}</span>
                </span>
              </a>
            ))
          )}
        </div>

        {brief ? <BoosterInsights brief={brief} /> : null}
      </div>

      {topic.tickers.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1c2333] pt-4">
          {topic.tickers.map((t) => (
            <span key={t.symbol} className="signal-label tabular-nums text-[#f4f1ea]">
              {t.symbol} · {t.sentiment}
            </span>
          ))}
        </div>
      ) : null}
    </motion.aside>
  );
}
