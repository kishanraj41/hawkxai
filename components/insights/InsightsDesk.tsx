"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AmbientBackground from "@/components/AmbientBackground";
import {
  DeskFrame,
  FieldSelect,
  GhostButton,
  HomeMark,
  PrimaryButton,
  StatusChip,
  DeskNav,
} from "@/components/shell/DeskChrome";
import DeskWorkspace from "@/components/shell/DeskWorkspace";
import { formatUpdatedAt } from "@/lib/ui-helpers";
import type { InsightsPayload, IndustryCategory, InsightsDashboard } from "@/lib/insights-types";
import InsightsOverview from "./InsightsOverview";
import InsightsStage from "./InsightsStage";
import InsightsDetail from "./InsightsDetail";

const INDUSTRY_OPTIONS: { id: IndustryCategory | "all"; label: string }[] = [
  { id: "all", label: "All Industries" },
  { id: "technology", label: "Technology" },
  { id: "finance", label: "Finance" },
  { id: "healthcare", label: "Healthcare" },
  { id: "retail", label: "Retail" },
  { id: "automotive", label: "Automotive" },
  { id: "real-estate", label: "Real Estate" },
  { id: "entertainment", label: "Entertainment" },
  { id: "education", label: "Education" },
  { id: "hospitality", label: "Hospitality" },
  { id: "manufacturing", label: "Manufacturing" },
];

export default function InsightsDesk() {
  const [payload, setPayload] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poiQuery, setPoiQuery] = useState("");
  const [category, setCategory] = useState<IndustryCategory | "all">("all");
  const [selectedDashboard, setSelectedDashboard] = useState<InsightsDashboard | null>(null);
  const [creating, setCreating] = useState(false);

  const loadInsights = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      const qs = params.toString();
      const res = await fetch(`/api/insights${qs ? `?${qs}` : ""}`);
      
      if (!res.ok) throw new Error(`Failed to load insights (${res.status})`);
      
      const data = (await res.json()) as InsightsPayload;
      setPayload(data);
      
      if (data.dashboards.length > 0 && !selectedDashboard) {
        setSelectedDashboard(data.dashboards[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load insights");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, selectedDashboard]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  async function handleCreateInsight(event: FormEvent) {
    event.preventDefault();
    const poi = poiQuery.trim();
    if (!poi || creating) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          poiLabel: poi,
          category: category !== "all" ? category : "technology",
          keywords: [poi],
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Failed to create insight (${res.status})`);
      }

      const data = (await res.json()) as InsightsPayload;
      
      setPayload(prev => ({
        dashboards: [...(prev?.dashboards || []), ...data.dashboards],
        updatedAt: data.updatedAt,
        summary: data.summary,
        degraded: data.degraded,
      }));

      if (data.dashboards[0]) {
        setSelectedDashboard(data.dashboards[0]);
      }

      setPoiQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create insight");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="desk-shell">
      <AmbientBackground />

      <DeskFrame
        toolbar={
          <>
            <FieldSelect
              label="Industry"
              value={category}
              onChange={(v) => setCategory(v as IndustryCategory | "all")}
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#0a0e17]">
                  {opt.label}
                </option>
              ))}
            </FieldSelect>
            <form
              onSubmit={handleCreateInsight}
              className="desk-chrome__toolbar-form flex min-w-0 flex-1 items-center gap-2 sm:min-w-[220px] sm:max-w-lg"
            >
              <input
                value={poiQuery}
                onChange={(e) => setPoiQuery(e.target.value)}
                placeholder="Campaign, product, or brand…"
                enterKeyHint="search"
                className="field-input"
              />
              <PrimaryButton type="submit" disabled={creating || !poiQuery.trim()}>
                Analyze
              </PrimaryButton>
            </form>
          </>
        }
        context={
          <>
            <span className="signal-label shrink-0">Insights</span>
            {selectedDashboard ? (
              <span className="max-w-[min(220px,55vw)] truncate rounded border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[12px]">
                {selectedDashboard.poiLabel}
              </span>
            ) : null}
            <div className="desk-chrome__context-trail ml-auto flex items-center gap-2">
              <span className="signal-label">
                {category !== "all" ? INDUSTRY_OPTIONS.find(o => o.id === category)?.label : "All"}
              </span>
            </div>
          </>
        }
      >
        <div className="desk-chrome__brand flex min-w-0 shrink-0 items-center gap-3">
          <HomeMark />
          <DeskNav active="insights" />
        </div>
        <div className="desk-chrome__status flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          <StatusChip>
            {loading
              ? "loading insights"
              : `${payload?.dashboards.length || 0} dashboard${payload?.dashboards.length !== 1 ? 's' : ''} · ${formatUpdatedAt(payload?.updatedAt ?? null)}`}
          </StatusChip>
          {payload?.degraded.map((msg) => (
            <StatusChip key={msg}>{msg}</StatusChip>
          ))}
        </div>
        <div className="desk-chrome__actions ml-auto flex shrink-0 items-center gap-1">
          <GhostButton
            onClick={() => void loadInsights(true)}
            disabled={refreshing}
          >
            Refresh
          </GhostButton>
        </div>
      </DeskFrame>

      {error ? (
        <div className="relative z-20 mx-3 mt-2 rounded-[var(--radius-md)] border border-white/8 bg-[var(--panel-strong)] px-4 py-2.5">
          <p className="signal-label">{error}</p>
        </div>
      ) : null}

      <DeskWorkspace
        listLabel="Dashboards"
        listBlurb="Analyzed POIs"
        stageLabel="Insights"
        stageBlurb="Comprehensive analysis"
        detailLabel="Details"
        detailBlurb="Deep dive"
        jumpToDetailKey={selectedDashboard?.poiId ?? null}
        preferStage={false}
        list={
          <InsightsOverview
            dashboards={payload?.dashboards || []}
            selectedId={selectedDashboard?.poiId ?? null}
            onSelect={setSelectedDashboard}
          />
        }
        stage={
          <InsightsStage
            dashboard={selectedDashboard}
            loading={loading}
          />
        }
        detail={
          <InsightsDetail
            dashboard={selectedDashboard}
          />
        }
      />
    </main>
  );
}
