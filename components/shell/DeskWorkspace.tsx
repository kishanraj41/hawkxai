"use client";

import { useEffect, useState, type ReactNode } from "react";

export type DeskPane = "list" | "stage" | "detail";

interface DeskWorkspaceProps {
  list: ReactNode;
  stage: ReactNode;
  detail: ReactNode;
  listLabel?: string;
  stageLabel?: string;
  detailLabel?: string;
  listBlurb?: string;
  stageBlurb?: string;
  detailBlurb?: string;
  /** When this changes to a non-null value, mobile jumps to the detail pane. */
  jumpToDetailKey?: string | null;
  /** Prefer stage on first paint / when key clears (e.g. empty lookup). */
  preferStage?: boolean;
  /** When this changes to a non-null value, jump to the stage pane (e.g. a new lookup). */
  stageKey?: string | null;
}

export default function DeskWorkspace({
  list,
  stage,
  detail,
  listLabel = "List",
  stageLabel = "Stage",
  detailLabel = "Detail",
  listBlurb,
  stageBlurb,
  detailBlurb,
  jumpToDetailKey = null,
  preferStage = false,
  stageKey = null,
}: DeskWorkspaceProps) {
  const [pane, setPane] = useState<DeskPane>("stage");

  useEffect(() => {
    if (preferStage) setPane("stage");
  }, [preferStage]);

  useEffect(() => {
    if (stageKey) setPane("stage");
  }, [stageKey]);

  useEffect(() => {
    if (jumpToDetailKey) setPane("detail");
  }, [jumpToDetailKey]);

  const tabs: { id: DeskPane; label: string; blurb?: string }[] = [
    { id: "list", label: listLabel, blurb: listBlurb },
    { id: "stage", label: stageLabel, blurb: stageBlurb },
    { id: "detail", label: detailLabel, blurb: detailBlurb },
  ];

  return (
    <div className="desk-workspace">
      <div className="desk-workspace__tabs no-print" role="tablist" aria-label="Desk panes">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={pane === tab.id}
            aria-label={tab.blurb ? `${tab.label}: ${tab.blurb}` : tab.label}
            title={tab.blurb ? `${tab.label}: ${tab.blurb}` : tab.label}
            onClick={() => setPane(tab.id)}
            className={`desk-workspace__tab ${pane === tab.id ? "desk-workspace__tab--active" : ""}`}
          >
            <span>{tab.label}</span>
            {tab.blurb ? <span className="desk-workspace__blurb">{tab.blurb}</span> : null}
          </button>
        ))}
      </div>
      <div className="desk-workspace__panes">
        <div
          className={`desk-workspace__pane ${pane === "list" ? "desk-workspace__pane--active" : ""}`}
          data-pane="list"
        >
          {list}
        </div>
        <div
          className={`desk-workspace__pane ${pane === "stage" ? "desk-workspace__pane--active" : ""}`}
          data-pane="stage"
        >
          {stage}
        </div>
        <div
          className={`desk-workspace__pane ${pane === "detail" ? "desk-workspace__pane--active" : ""}`}
          data-pane="detail"
        >
          {detail}
        </div>
      </div>
    </div>
  );
}
