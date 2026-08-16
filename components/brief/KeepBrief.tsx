"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { briefFilename, formatKeepBrief, type KeepBriefInput } from "@/lib/brief";

interface KeepBriefContextValue {
  markdown: string;
  filename: string;
  ready: boolean;
}

const KeepBriefContext = createContext<KeepBriefContextValue | null>(null);

function useKeepBrief(): KeepBriefContextValue {
  const value = useContext(KeepBriefContext);
  if (!value) throw new Error("KeepBrief parts must sit inside KeepBrief.Provider");
  return value;
}

function Provider({
  topic,
  brief,
  query,
  lens,
  since,
  children,
}: {
  topic: KeepBriefInput["topic"] | null;
  brief: KeepBriefInput["brief"] | undefined;
  query?: KeepBriefInput["query"];
  lens?: KeepBriefInput["lens"];
  since?: KeepBriefInput["since"];
  children: ReactNode;
}) {
  const markdown = useMemo(() => {
    if (!topic || !brief) return "";
    return formatKeepBrief({ topic, brief, query, lens, since });
  }, [topic, brief, query, lens, since]);
  const filename = topic ? briefFilename(topic.label) : "hawkai-brief.md";
  return (
    <KeepBriefContext.Provider value={{ markdown, filename, ready: Boolean(markdown) }}>
      {children}
    </KeepBriefContext.Provider>
  );
}

function Actions() {
  const { markdown, filename, ready } = useKeepBrief();

  const copy = useCallback(async () => {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      /* clipboard can fail in locked-down browsers */
    }
  }, [markdown, ready]);

  const download = useCallback(() => {
    if (!ready) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, filename, ready]);

  const print = useCallback(() => {
    if (!ready) return;
    window.print();
  }, [ready]);

  if (!ready) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <button type="button" onClick={() => void copy()} className="btn-ghost">
        Copy
      </button>
      <button type="button" onClick={download} className="btn-ghost">
        Save .md
      </button>
      <button type="button" onClick={print} className="btn-ghost">
        Print / PDF
      </button>
    </div>
  );
}

function Sheet() {
  const { markdown, ready } = useKeepBrief();
  if (!ready) return null;
  return (
    <article className="keep-brief-sheet" aria-hidden>
      <pre>{markdown}</pre>
    </article>
  );
}

export const KeepBrief = {
  Provider,
  Actions,
  Sheet,
};
