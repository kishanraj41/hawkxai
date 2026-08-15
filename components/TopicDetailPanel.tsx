"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { divergenceLabel, PLATFORM_COLOR, topPosts } from "@/lib/ui-helpers";
import { motionTokens } from "@/lib/motionTokens";
import BoosterInsights from "@/components/BoosterInsights";
import type { BoosterTopicBrief, Topic } from "@/lib/types";

function VelocityBadge({ velocity }: { velocity: Topic["velocity"] }) {
  const styles = {
    rising: "text-sky-300 border-sky-400/40 bg-sky-400/10",
    peaking: "text-amber-200 border-amber-400/40 bg-amber-400/10",
    fading: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
  }[velocity];

  return (
    <motion.span
      layout
      className={`rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide ${styles}`}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: motionTokens.duration.fast }}
    >
      {velocity}
    </motion.span>
  );
}

interface TopicDetailPanelProps {
  topic: Topic;
  brief?: BoosterTopicBrief;
  onClose: () => void;
}

export default function TopicDetailPanel({ topic, brief, onClose }: TopicDetailPanelProps) {
  const reduce = useReducedMotion();
  const receipts = topPosts(topic);
  const platformScores = (["x", "reddit", "hn"] as const).filter(
    (p) => topic.platforms[p].score > 0,
  );

  return (
    <motion.aside
      key={topic.id}
      initial={{ opacity: 0, x: reduce ? 0 : motionTokens.distance.lg, filter: "blur(8px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: reduce ? 0 : motionTokens.distance.md, filter: "blur(4px)" }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
      }}
      className="absolute right-0 top-0 z-10 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#0a0e14]/80 p-5 shadow-[-24px_0_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      <motion.button
        type="button"
        onClick={onClose}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="mb-4 self-end rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300"
      >
        Close
      </motion.button>

      <motion.h2
        className="text-balance text-lg font-medium leading-snug text-zinc-50"
        initial={{ opacity: 0, y: motionTokens.distance.sm }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
      >
        {topic.label}
      </motion.h2>

      <motion.div
        className="mt-3 flex items-center gap-2"
        initial={{ opacity: 0, y: motionTokens.distance.sm }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
      >
        <VelocityBadge velocity={topic.velocity} />
        <span className="text-pretty text-xs text-zinc-400">{divergenceLabel(topic)}</span>
      </motion.div>

      <motion.div
        className="mt-4 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
      >
        {platformScores.map((p, i) => (
          <motion.div
            key={p}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * motionTokens.stagger }}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-300"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: PLATFORM_COLOR[p] }}
            />
            {topic.platforms[p].score}
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {topic.why ? (
          <motion.p
            key="why"
            initial={{ opacity: 0, y: motionTokens.distance.sm }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-pretty text-sm leading-relaxed text-zinc-400"
          >
            {topic.why}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {topic.peakHourCT ? (
        <p className="mt-2 text-xs tabular-nums text-zinc-500">
          Peak hour CT: {topic.peakHourCT}
        </p>
      ) : null}

      <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Receipts</p>
        <motion.div
          className="mt-3 space-y-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: motionTokens.stagger, delayChildren: 0.18 } },
          }}
        >
          {receipts.length === 0 ? (
            <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="text-sm text-zinc-500">
              No posts attached.
            </motion.p>
          ) : (
            receipts.map((post) => (
              <motion.a
                key={post.url}
                href={post.url}
                target="_blank"
                rel="noreferrer"
                variants={{
                  hidden: { opacity: 0, y: motionTokens.distance.md, filter: "blur(6px)" },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth },
                  },
                }}
                whileHover={{
                  y: -2,
                  borderColor: "rgba(255,255,255,0.22)",
                  backgroundColor: "rgba(255,255,255,0.07)",
                }}
                whileTap={{ scale: 0.98 }}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200 shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
              >
                <span className="text-[10px] uppercase text-zinc-500">{post.platform}</span>
                <p className="mt-1 line-clamp-2 text-pretty">{post.title}</p>
                <p className="mt-1 text-xs tabular-nums text-zinc-500">score {post.score}</p>
              </motion.a>
            ))
          )}
        </motion.div>

        {brief ? <BoosterInsights brief={brief} /> : null}
      </div>

      {topic.tickers.length > 0 ? (
        <motion.div
          className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          {topic.tickers.map((t, i) => (
            <motion.span
              key={t.symbol}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.38 + i * motionTokens.stagger }}
              whileHover={{ scale: 1.05 }}
              className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs tabular-nums text-zinc-200"
            >
              {t.symbol} · {t.sentiment}
            </motion.span>
          ))}
        </motion.div>
      ) : null}
    </motion.aside>
  );
}
