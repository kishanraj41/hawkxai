"use client";

import type { ReactNode } from "react";
import type { Topic } from "@/lib/types";

function hexColor(divergence: number, velocity: Topic["velocity"]): string {
  if (velocity === "rising") return "#ffb24d";
  if (divergence >= 0.66) return "#ff4d4d";
  if (divergence >= 0.34) return "#ff7a18";
  return "#2a3245";
}

interface MapStageProps {
  topics: Topic[];
  loading: boolean;
  children: ReactNode;
}

export default function MapStage({ topics, loading, children }: MapStageProps) {
  const rising = topics.filter((t) => t.velocity === "rising").length;
  const withWhy = topics.filter((t) => Boolean(t.why)).length;
  const bars = topics.slice(0, 18).map((t) => 8 + Math.round(t.divergence * 22));

  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/15 px-4 py-3">
        <div>
          <h1 className="text-[15px] font-medium tracking-tight text-white drop-shadow-md">
            Live trend signal map
          </h1>
          <p className="mt-0.5 text-xs text-[#7c8598]">
            Real-time topics across X, Reddit, and Hacker News
          </p>
        </div>
        <div className="flex gap-2">
          <Kpi label="Rising" value={String(rising)} hint={`/${topics.length || 0}`} />
          <Kpi label="WHY locked" value={String(withWhy)} hint="grok" />
          <Kpi
            label="Coverage"
            value={topics.length ? `${Math.round((withWhy / topics.length) * 100)}%` : "—"}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">{children}</div>

      <div className="grid shrink-0 grid-cols-1 gap-3 border-t border-white/15 px-4 py-3 sm:grid-cols-2">
        <div>
          <p className="signal-label mb-2">Topic intensity</p>
          <div className="flex h-12 items-end gap-[3px]">
            {(loading ? Array.from({ length: 18 }, () => 6) : bars).map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-sm bg-[#f4f1ea]/80"
                style={{ height: `${h}px`, opacity: 0.35 + (i % 5) * 0.1 }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="signal-label mb-2">Divergence index</p>
          <div className="flex flex-wrap gap-1">
            {(topics.length ? topics : Array.from({ length: 24 }, () => null)).slice(0, 36).map((t, i) => (
              <span
                key={t?.id ?? i}
                title={t ? `${t.label} · div ${t.divergence.toFixed(2)}` : undefined}
                className="h-3.5 w-3.5 rotate-45 rounded-[2px]"
                style={{
                  background: t ? hexColor(t.divergence, t.velocity) : "#1c2333",
                  boxShadow: t?.velocity === "rising" ? "0 0 8px rgba(255,178,77,0.55)" : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-[88px] rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">
      <p className="signal-label">{label}</p>
      <p className="mt-1 text-lg font-medium leading-none text-[#ffb24d] signal-glow">
        {value}
        {hint ? <span className="ml-1 text-xs font-normal text-[#7c8598]">{hint}</span> : null}
      </p>
    </div>
  );
}
