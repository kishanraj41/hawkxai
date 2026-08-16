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
  /** When this changes to a non-null value, mobile jumps to the detail pane. */
  jumpToDetailKey?: string | null;
  /** Prefer stage on first paint / when key clears (e.g. empty lookup). */
  preferStage?: boolean;
}

export default function DeskWorkspace({
  list,
  stage,
  detail,
  listLabel = "List",
  stageLabel = "Stage",
  detailLabel = "Detail",
  jumpToDetailKey = null,
  preferStage = false,
}: DeskWorkspaceProps) {
  const [pane, setPane] = useState<DeskPane>(preferStage ? "stage" : "stage");

  useEffect(() => {
    if (preferStage) setPane("stage");
  }, [preferStage]);

  useEffect(() => {
    if (jumpToDetailKey) setPane("detail");
  }, [jumpToDetailKey]);

  const tabs: { id: DeskPane; label: string }[] = [
    { id: "list", label: listLabel },
    { id: "stage", label: stageLabel },
    { id: "detail", label: detailLabel },
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
            onClick={() => setPane(tab.id)}
            className={`desk-workspace__tab ${pane === tab.id ? "desk-workspace__tab--active" : ""}`}
          >
            {tab.label}
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
