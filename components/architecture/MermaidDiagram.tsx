"use client";

import { useEffect, useId, useRef } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renderId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    void import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
        fontFamily: "IBM Plex Sans, system-ui, sans-serif",
        themeVariables: {
          darkMode: true,
          background: "#0c0d10",
          primaryColor: "#14171e",
          primaryTextColor: "#f4f4f5",
          primaryBorderColor: "rgba(255,255,255,0.16)",
          lineColor: "rgba(244,244,245,0.52)",
          secondaryColor: "#14171e",
          tertiaryColor: "#07080b",
        },
      });
      return mermaid.render(`hawkxai-${renderId}`, chart);
    }).then((result) => {
      if (cancelled || !host || !result) return;
      host.innerHTML = result.svg;
    }).catch((err) => {
      if (cancelled || !host) return;
      host.textContent = err instanceof Error ? err.message : "Diagram failed to render.";
    });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [chart, renderId]);

  return (
    <div
      ref={hostRef}
      className="overflow-x-auto rounded-xl border border-white/10 bg-[#0c0d10] p-4 text-sm text-[var(--mute)]"
    />
  );
}
