"use client";

import { motion, useReducedMotion } from "framer-motion";
import BoosterInsights from "@/components/BoosterInsights";
import { SentimentChart } from "@/components/desk/SentimentChart";
import Sparkline from "@/components/Sparkline";
import TimeseriesChart from "@/components/desk/TimeseriesChart";
import { buildTimeseries, CATEGORY_LABEL } from "@/lib/desk";
import { divergenceLabel, sparkValues, topPosts } from "@/lib/ui-helpers";
import LineageStrip from "@/components/desk/LineageStrip";
import { motionTokens } from "@/lib/motionTokens";
import { PLATFORMS, type AgeLens, type BoosterTopicBrief, type Platform, type Topic } from "@/lib/types";

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
            background: i < filled ? "#f4f4f5" : "#1a1d24",
          }}
        />
      ))}
    </div>
  );
}

function SourceMark({ platform }: { platform: Platform }) {
  const dash =
    platform === "reddit"
      ? "5 3"
      : platform === "hn"
        ? "1.5 2.4"
        : platform === "public"
          ? "2 3"
          : undefined;
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
  lens?: AgeLens | "all";
  onClose: () => void;
}

export default function TopicDetailPanel({ topic, brief, lens, onClose }: TopicDetailPanelProps) {
  const reduce = useReducedMotion();
  const receipts = topPosts(topic);
  const platformScores = PLATFORMS.filter((p) => (topic.platforms[p]?.score ?? 0) > 0);

  return (
    <motion.div
      key={topic.id}
      initial={{ opacity: 0, x: reduce ? 0 : motionTokens.distance.lg }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduce ? 0 : motionTokens.distance.md }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
      }}
      className="relative flex h-full w-full flex-col p-5"
    >

      <button
        type="button"
        onClick={onClose}
        className="signal-label mb-3 self-end hover:text-white"
      >
        Close
      </button>

      <motion.h2
        className="text-balance text-xl font-medium leading-snug tracking-tight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
      >
        {topic.label}
      </motion.h2>

        {brief ? (
          <p className="signal-label mt-2">{CATEGORY_LABEL[brief.category]}</p>
        ) : null}

      <div className="mt-5 space-y-4">
        <div>
          <p className="signal-label">Tape</p>
          <div className="mt-2 flex items-center gap-3">
            <VelocityMark velocity={topic.velocity} />
            <Sparkline
              values={sparkValues(topic)}
              width={88}
              height={22}
              color={topic.velocity === "fading" ? "#f87171" : "#34d399"}
            />
          </div>
        </div>
        <div>
          <p className="signal-label">Spread</p>
          <div className="mt-2 flex items-center gap-3">
            <DivergenceMeter value={topic.divergence} />
            <span className="signal-label text-white">{divergenceLabel(topic)}</span>
          </div>
        </div>
        <div>
          <p className="signal-label">Sources</p>
          <div className="mt-2 flex gap-3">
            {platformScores.map((p) => (
              <div key={p} className="flex items-center gap-1.5">
                <SourceMark platform={p} />
                <span className="signal-label tabular-nums text-[#f4f1ea]">
                  {p} {topic.platforms[p].score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topic.peakHourCT ? (
        <p className="signal-label mt-2 tabular-nums">Peak {topic.peakHourCT} CT</p>
      ) : null}

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <p className="signal-label">Occurrence</p>
        <div className="mt-2">
          <TimeseriesChart series={buildTimeseries([topic])} firstAt={brief?.causation.firstAt} />
        </div>

        {brief?.sentiment ? (
          <div className="mt-4">
            <p className="signal-label">Sentiment</p>
            <div className="mt-2">
              <SentimentChart.Sheet report={brief.sentiment} posts={receipts} />
            </div>
          </div>
        ) : null}

        <p className="signal-label mt-5">Print</p>
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
                className="flex items-start gap-2 text-sm text-white/90 hover:underline hover:underline-offset-4"
              >
                <SourceMark platform={post.platform} />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-pretty">{post.title}</span>
                  <span className="signal-label mt-1 block tabular-nums">
                    {post.sourceApi ? `${post.sourceApi} · ` : ""}
                    {post.score}
                  </span>
                  <LineageStrip tool={post.tool} collectedAt={post.collectedAt} />
                </span>
              </a>
            ))
          )}
        </div>

        {brief ? <BoosterInsights brief={brief} lens={lens} /> : null}
      </div>

      {topic.tickers.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
          {topic.tickers.map((t) => (
            <span key={t.symbol} className="signal-label text-white">
              {t.symbol} · {t.sentiment}
            </span>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
