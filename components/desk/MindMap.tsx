"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { MindGraph, MindNode, Topic } from "@/lib/types";

interface TreeDatum {
  id: string;
  node: MindNode;
  children?: TreeDatum[];
}

interface MindMapChartProps {
  graph: MindGraph;
  topics: Topic[];
  selectedId: string | null;
  hoverId: string | null;
  inspectId?: string | null;
  onSelect: (topic: Topic | null) => void;
  onHover: (id: string | null) => void;
  onInspect?: (node: MindNode | null) => void;
}

const FILL: Record<MindNode["kind"], string> = {
  hub: "#e8a23a",
  topic: "#f4f4f5",
  artifact: "#7dd3fc",
  driver: "rgba(244,244,245,0.45)",
  source: "#34d399",
};

function toTree(graph: MindGraph): TreeDatum | null {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const kids = new Map<string, string[]>();
  for (const link of graph.links) {
    if (link.kind !== "branch") continue;
    const list = kids.get(link.source) ?? [];
    list.push(link.target);
    kids.set(link.source, list);
  }
  const walk = (id: string): TreeDatum | null => {
    const node = byId.get(id);
    if (!node) return null;
    return {
      id,
      node,
      children: (kids.get(id) ?? []).flatMap((cid) => {
        const child = walk(cid);
        return child ? [child] : [];
      }),
    };
  };
  return walk(graph.hubId);
}

function topicIdOf(node: MindNode): string | null {
  return node.kind === "hub" ? null : node.topicId ?? null;
}

export default function MindMapChart({
  graph,
  topics,
  selectedId,
  hoverId,
  inspectId = null,
  onSelect,
  onHover,
  onInspect,
}: MindMapChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const topicById = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const tree = useMemo(() => toTree(graph), [graph]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || !tree) return;

    const apply = () => {
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (width < 40 || height < 40) return;

      const svg = d3.select(svgEl);
      svg.selectAll("*").remove();
      svg.attr("viewBox", `0 0 ${width} ${height}`);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(48, Math.min(width, height) / 2 - 56);
      const root = d3.hierarchy(tree);
      d3.tree<TreeDatum>().size([2 * Math.PI, radius])(root);
      const inspectNode = inspectId ? graph.nodes.find((n) => n.id === inspectId) : undefined;
      const expandTopic = inspectNode?.topicId ?? selectedId;
      if (expandTopic) {
        (root.descendants() as d3.HierarchyPointNode<TreeDatum>[]).forEach((d) => {
          const tid = topicIdOf(d.data.node);
          if (tid === expandTopic && d.data.node.kind !== "hub") {
            d.y += Math.min(36, radius * 0.14);
          }
        });
      }

      const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

      const project = (d: d3.HierarchyPointNode<TreeDatum>) => {
        const a = d.x - Math.PI / 2;
        return { x: Math.cos(a) * d.y, y: Math.sin(a) * d.y };
      };

      const radial = d3
        .linkRadial<d3.HierarchyPointLink<TreeDatum>, d3.HierarchyPointNode<TreeDatum>>()
        .angle((d) => d.x)
        .radius((d) => d.y);

      const points = new Map<string, { x: number; y: number }>();
      root.descendants().forEach((d) => {
        const p = project(d as d3.HierarchyPointNode<TreeDatum>);
        points.set(d.data.id, p);
      });

      const activeTopic = selectedId ?? inspectNode?.topicId ?? hoverId;
      const lit = new Set<string>();
      if (inspectId) lit.add(inspectId);
      if (activeTopic) {
        lit.add(graph.hubId);
        lit.add(`topic:${activeTopic}`);
        for (const n of graph.nodes) {
          if (n.topicId === activeTopic) lit.add(n.id);
        }
      }

      g.append("g")
        .selectAll("path")
        .data(root.links() as d3.HierarchyPointLink<TreeDatum>[])
        .join("path")
        .attr("d", radial)
        .attr("fill", "none")
        .attr("stroke", (d) => {
          const tid = topicIdOf(d.target.data.node);
          if (activeTopic && tid === activeTopic) return "rgba(232,162,58,0.85)";
          return "rgba(255,255,255,0.16)";
        })
        .attr("stroke-width", (d) => (topicIdOf(d.target.data.node) === activeTopic ? 1.6 : 1));

      const shared = graph.links.filter((l) => l.kind === "shared");
      g.append("g")
        .selectAll("path")
        .data(shared)
        .join("path")
        .attr("d", (l) => {
          const a = points.get(l.source);
          const b = points.get(l.target);
          if (!a || !b) return "";
          return `M${a.x},${a.y} Q0,0 ${b.x},${b.y}`;
        })
        .attr("fill", "none")
        .attr("stroke", "#e8a23a")
        .attr("stroke-width", 1.15)
        .attr("stroke-dasharray", "4 3")
        .attr("opacity", (l) => {
          if (!activeTopic) return 0.55;
          return l.source === `topic:${activeTopic}` || l.target === `topic:${activeTopic}` ? 0.95 : 0.18;
        });

      const nodes = g
        .append("g")
        .selectAll("g")
        .data(root.descendants() as d3.HierarchyPointNode<TreeDatum>[])
        .join("g")
        .attr("transform", (d) => {
          const p = project(d);
          return `translate(${p.x},${p.y})`;
        })
        .style("cursor", (d) => (d.data.node.kind === "hub" ? "default" : "pointer"));

      nodes
        .append("circle")
        .attr("r", (d) => {
          if (d.data.node.kind === "hub") return 14;
          if (d.data.node.kind === "topic") return 7 + Math.min(6, d.data.node.weight / 40);
          return 4.5;
        })
        .attr("fill", (d) => FILL[d.data.node.kind])
        .attr("fill-opacity", (d) => {
          if (!activeTopic) return d.data.node.kind === "hub" ? 1 : 0.9;
          return lit.has(d.data.id) ? 1 : 0.22;
        })
        .attr("stroke", (d) => {
          const tid = topicIdOf(d.data.node);
          if (tid && tid === selectedId) return "#e8a23a";
          return "rgba(0,0,0,0.35)";
        })
        .attr("stroke-width", (d) => (topicIdOf(d.data.node) === selectedId ? 2 : 0.6));

      nodes
        .append("text")
        .attr("dy", "0.32em")
        .attr("x", (d) => {
          if (d.data.node.kind === "hub") return 0;
          const left = d.x > Math.PI / 2 && d.x < (3 * Math.PI) / 2;
          return left ? -10 : 10;
        })
        .attr("text-anchor", (d) => {
          if (d.data.node.kind === "hub") return "middle";
          const left = d.x > Math.PI / 2 && d.x < (3 * Math.PI) / 2;
          return left ? "end" : "start";
        })
        .attr("fill", (d) => (d.data.node.kind === "hub" ? "#e8a23a" : "rgba(244,244,245,0.88)"))
        .attr("font-size", (d) => (d.data.node.kind === "hub" ? 12 : d.data.node.kind === "topic" ? 11 : 9))
        .attr("font-family", (d) =>
          d.data.node.kind === "artifact" || d.data.node.kind === "source"
            ? "var(--font-plex), ui-monospace, monospace"
            : "var(--font-inter), Inter, sans-serif",
        )
        .attr("opacity", (d) => {
          if (!activeTopic) return 1;
          return lit.has(d.data.id) ? 1 : 0.28;
        })
        .text((d) => d.data.node.label);

      nodes
        .on("mouseenter", (_event, d) => {
          const tid = topicIdOf(d.data.node);
          if (tid) onHover(tid);
        })
        .on("mouseleave", () => onHover(null))
        .on("click", (event, d) => {
          event.stopPropagation();
          onInspect?.(d.data.node);
          const tid = topicIdOf(d.data.node);
          if (!tid) {
            onSelect(null);
            return;
          }
          onSelect(topicById.get(tid) ?? null);
        });

      svg.on("click", () => {
        onInspect?.(null);
        onSelect(null);
      });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      d3.select(svgEl).on("click", null);
    };
  }, [tree, graph, selectedId, hoverId, inspectId, onHover, onSelect, onInspect, topicById]);

  if (!tree || graph.nodes.length <= 1) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="signal-label">Nearest names are in another plug — try All</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <svg ref={svgRef} className="h-full w-full" role="img" aria-label="Trend correlation mind map" />
    </div>
  );
}
