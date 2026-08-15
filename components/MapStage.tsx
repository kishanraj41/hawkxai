"use client";

import type { ReactNode } from "react";
import { topicRisk } from "@/lib/booster";
import { totalScore } from "@/lib/ui-helpers";
import type { Topic } from "@/lib/types";

function barColor(topic: Topic, active: boolean): string {
  if (active) return "#ffffff";
  if (topicRisk(topic) === "high") return "#f87171";
  if (topic.velocity === "rising") return "#e8a23a";
  if (topic.velocity === "fading") return "rgba(255,255,255,0.25)";
  return "rgba(255,255,255,0.45)";
}

interface MapStageProps {
  topics: Topic[];
  loading: boolean;
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (topic: Topic) => void;
  onHover: (id: string | null) => void;
  children: ReactNode;
}

export default function MapStage({
  topics,
  loading,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  children,
}: MapStageProps) {
  const rising = topics.filter((t) => t.velocity === "rising").length;
  const highRisk = topics.filter((t) => topicRisk(t) === "high").length;
  const ranked = [...topics].toSorted((a, b) => totalScore(b) - totalScore(a));
  const max = Math.max(...ranked.map((t) => totalScore(t)), 1);

  return (
    <section className="signal-glass relative flex min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-medium tracking-tight">Map</h1>
          <p className="mt-0.5 text-xs text-white/45">Size is score. Click a node, bar, or diamond.</p>
        </div>
        <div className="flex gap-4 font-mono text-[11px] tabular-nums">
          <Kpi label="Rising" value={String(rising)} />
          <Kpi label="High risk" value={String(highRisk)} />
          <Kpi label="Names" value={String(topics.length)} />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">{children}</div>

      <div className="grid shrink-0 grid-cols-1 gap-4 border-t border-white/8 px-4 py-3 sm:grid-cols-2">
        <div>
          <p className="signal-label mb-2">Intensity</p>
          <div className="flex h-14 items-end gap-[3px]">
            {(loading ? [] : ranked).map((t) => {
              const active = t.id === selectedId || t.id === hoverId;
              const h = 8 + Math.round((totalScore(t) / max) * 40);
              return (
                <button
                  key={t.id}
                  type="button"
                  title={`${t.label} · ${Math.round(totalScore(t))}`}
                  onClick={() => onSelect(t)}
                  onMouseEnter={() => onHover(t.id)}
                  onMouseLeave={() => onHover(null)}
                  className="min-w-0 flex-1 rounded-sm transition-opacity duration-150"
                  style={{
                    height: `${h}px`,
                    background: barColor(t, active),
                    opacity: active ? 1 : 0.7,
                  }}
                />
              );
            })}
            {loading
              ? Array.from({ length: 16 }, (_, i) => (
                  <span key={i} className="flex-1 rounded-sm bg-white/10" style={{ height: 8 }} />
                ))
              : null}
          </div>
        </div>
        <div>
          <p className="signal-label mb-2">Concentration</p>
          <div className="flex flex-wrap gap-1">
            {ranked.map((t) => {
              const active = t.id === selectedId || t.id === hoverId;
              return (
                <button
                  key={t.id}
                  type="button"
                  title={`${t.label} · concentration ${t.divergence.toFixed(2)}`}
                  onClick={() => onSelect(t)}
                  onMouseEnter={() => onHover(t.id)}
                  onMouseLeave={() => onHover(null)}
                  className="h-3.5 w-3.5 rotate-45 rounded-[1px] transition-transform duration-150"
                  style={{
                    background: barColor(t, active),
                    transform: `rotate(45deg) scale(${active ? 1.25 : 1})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="signal-label">{label}</p>
      <p className="mt-0.5 text-base text-white">{value}</p>
    </div>
  );
}
