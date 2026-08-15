"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { Topic, TrendsPayload } from "@/lib/types";

function scoreOf(t: Topic): number {
  return t.platforms.x.score + t.platforms.reddit.score + t.platforms.hn.score;
}

type PackNode = d3.HierarchyCircularNode<{
  name: string;
  value?: number;
  topic?: Topic;
  children?: { name: string; value: number; topic: Topic }[];
}>;

export default function TrendMap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [status, setStatus] = useState("loading signals…");
  const [picked, setPicked] = useState<Topic | null>(null);

  useEffect(() => {
    fetch("/api/trends")
      .then(async (r) => {
        if (!r.ok) throw new Error(`trends ${r.status}`);
        return (await r.json()) as TrendsPayload;
      })
      .then((p) => {
        setData(p);
        setStatus(`${p.topics.length} topics`);
      })
      .catch((e: Error) => setStatus(e.message));
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    const wrap = wrapRef.current;
    if (!svgEl || !wrap || !data?.topics.length) return;

    const width = wrap.clientWidth || 800;
    const height = wrap.clientHeight || 600;
    const topics = data.topics.filter((t) => scoreOf(t) > 0);

    const root = d3
      .pack<{ name: string; value?: number; topic?: Topic }>()
      .size([width, height])
      .padding(6)(
        d3
          .hierarchy({
            name: "pulsemap",
            children: topics.map((t) => ({
              name: t.label,
              value: Math.max(scoreOf(t), 1),
              topic: t,
            })),
          })
          .sum((d) => d.value ?? 0),
      ) as PackNode;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    let view: [number, number, number] = [root.x, root.y, root.r * 2];

    const node = svg
      .append("g")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("cursor", "pointer");

    node
      .append("circle")
      .attr("fill", (d) => (d.depth === 0 ? "#0a0e14" : "#1c2430"))
      .attr("stroke", (d) => (d.depth === 0 ? "#222831" : "#ff6600"))
      .attr("stroke-width", (d) => (d.depth === 0 ? 1 : 1.5));

    node
      .append("text")
      .attr("fill", "#e4e4e7")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("pointer-events", "none")
      .style("font-size", "11px")
      .text((d) => (d.depth === 0 ? "" : d.data.name.slice(0, 28)));

    function apply(v: [number, number, number]) {
      const k = width / v[2];
      view = v;
      node.attr(
        "transform",
        (d) =>
          `translate(${(d.x - v[0]) * k + width / 2},${(d.y - v[1]) * k + height / 2})`,
      );
      node.select("circle").attr("r", (d) => d.r * k);
      node.select("text").style("display", (d) => (d.r * k > 22 ? "block" : "none"));
    }

    function zoom(d: PackNode) {
      const next: [number, number, number] = [d.x, d.y, d.r * 2.15];
      d3.transition()
        .duration(600)
        .tween("zoom", () => {
          const i = d3.interpolateZoom(view, next);
          return (t) => apply(i(t));
        });
    }

    node.on("click", (event, d) => {
      event.stopPropagation();
      zoom(d);
      if (d.data.topic) setPicked(d.data.topic);
    });
    svg.on("click", () => {
      zoom(root);
      setPicked(null);
    });
    apply(view);

    return () => {
      svg.on("click", null);
      node.on("click", null);
    };
  }, [data]);

  const waiting = !data && status.includes("loading");

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <div className="pointer-events-none absolute left-3 top-3 z-10 text-xs text-zinc-500">
        {status}
        {data?.degraded?.length ? ` · ${data.degraded.join(" · ")}` : ""}
      </div>
      {waiting ? (
        <div className="flex h-full items-center justify-center gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-full bg-zinc-800"
              style={{ width: 40 + i * 8, height: 40 + i * 8 }}
            />
          ))}
        </div>
      ) : null}
      <svg ref={svgRef} className="h-full w-full" />
      {picked ? (
        <aside className="absolute right-0 top-0 z-20 h-full w-80 overflow-y-auto border-l border-white/10 bg-[#0a0e14]/95 p-4 text-sm">
          <div className="text-base font-medium text-zinc-100">{picked.label}</div>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-orange-400">
            {[
              ...picked.platforms.hn.posts,
              ...picked.platforms.reddit.posts,
              ...picked.platforms.x.posts,
            ]
              .slice(0, 3)
              .map((p) => (
                <li key={p.url}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-400 underline-offset-2 hover:underline"
                  >
                    {p.title}
                  </a>
                </li>
              ))}
          </ol>
        </aside>
      ) : null}
    </div>
  );
}
