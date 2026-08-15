"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { motionDuration, motionTokens } from "@/lib/motionTokens";
import { PLATFORM_COLOR, totalScore } from "@/lib/ui-helpers";
import type { Platform, Topic } from "@/lib/types";

interface PackDatum {
  id?: string;
  topic?: Topic;
  platform?: Platform;
  children?: PackDatum[];
  value?: number;
}

interface TrendMapProps {
  topics: Topic[];
  selectedId: string | null;
  highlightedIds: string[];
  onSelect: (topic: Topic | null) => void;
}

function buildHierarchy(topics: Topic[]): PackDatum {
  return {
    children: topics.map((topic) => ({
      id: topic.id,
      topic,
      children: (["x", "reddit", "hn"] as Platform[])
        .filter((p) => topic.platforms[p].score > 0)
        .map((p) => ({
          platform: p,
          value: Math.max(1, topic.platforms[p].score),
        })),
      value: Math.max(1, totalScore(topic)),
    })),
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function TrendMap({
  topics,
  selectedId,
  highlightedIds,
  onSelect,
}: TrendMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rootRef = useRef<d3.HierarchyCircularNode<PackDatum> | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef(selectedId);
  const highlightedIdsRef = useRef(highlightedIds);

  selectedIdRef.current = selectedId;
  highlightedIdsRef.current = highlightedIds;

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || topics.length === 0) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const reduce = prefersReducedMotion();
    const enterMs = reduce ? 0 : motionDuration(motionTokens.duration.slow) * 1000;
    const hoverMs = reduce ? 0 : motionDuration(motionTokens.duration.fast) * 1000;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const defs = svg.append("defs");

    const glow = defs
      .append("filter")
      .attr("id", "rising-glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    const glowMerge = glow.append("feMerge");
    glowMerge.append("feMergeNode").attr("in", "blur");
    glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const hoverGlow = defs
      .append("filter")
      .attr("id", "hover-glow")
      .attr("x", "-80%")
      .attr("y", "-80%")
      .attr("width", "260%")
      .attr("height", "260%");
    hoverGlow.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "blur");
    const hoverMerge = hoverGlow.append("feMerge");
    hoverMerge.append("feMergeNode").attr("in", "blur");
    hoverMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g");

    const root = d3
      .pack<PackDatum>()
      .size([width, height])
      .padding(4)(
      d3
        .hierarchy(buildHierarchy(topics))
        .sum((d) => d.value ?? 0)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    );

    rootRef.current = root;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    const nodes = root.descendants().slice(1);

    const node = g
      .selectAll<SVGGElement, d3.HierarchyCircularNode<PackDatum>>("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", (d) => (d.data.topic ? "pointer" : "default"));

    const circles = node
      .append("circle")
      .attr("r", 0)
      .attr("fill", (d) => {
        if (d.data.platform) return PLATFORM_COLOR[d.data.platform];
        return "rgba(255,255,255,0.05)";
      })
      .attr("stroke", (d) =>
        strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, hoverIdRef.current),
      )
      .attr("stroke-width", (d) =>
        strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, hoverIdRef.current),
      )
      .attr("filter", (d) => filterFor(d, hoverIdRef.current));

    circles
      .transition()
      .duration(enterMs)
      .delay((_, i) => (reduce ? 0 : i * 18))
      .ease(d3.easeCubicOut)
      .attr("r", (d) => d.r);

    node
      .filter((d) => Boolean(d.data.topic) && d.r > 28)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#e4e4e7")
      .attr("font-size", (d) => Math.min(14, d.r / 4))
      .attr("pointer-events", "none")
      .attr("opacity", 0)
      .each(function (d) {
        const label = d.data.topic?.label ?? "";
        const max = Math.floor(d.r / 5);
        const text = label.length > max ? `${label.slice(0, max - 1)}…` : label;
        d3.select(this).text(text);
      })
      .transition()
      .duration(enterMs)
      .delay((_, i) => (reduce ? 0 : 200 + i * 12))
      .attr("opacity", 1);

    node
      .filter((d) => Boolean(d.data.topic))
      .on("mouseenter", function (_event, d) {
        if (!d.data.topic) return;
        hoverIdRef.current = d.data.topic.id;
        d3.select(this)
          .select("circle")
          .transition()
          .duration(hoverMs)
          .attr("stroke", strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, d.data.topic!.id))
          .attr("stroke-width", strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, d.data.topic!.id) + 0.5)
          .attr("filter", filterFor(d, d.data.topic.id));
        d3.select(this).raise();
      })
      .on("mouseleave", function (_event, d) {
        hoverIdRef.current = null;
        d3.select(this)
          .select("circle")
          .transition()
          .duration(hoverMs)
          .attr("stroke", strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, null))
          .attr("stroke-width", strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, null))
          .attr("filter", filterFor(d, null));
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelect(d.data.topic ?? null);
        zoomToNode(svg, zoom, d, width, height);
      });

    svg.on("click", () => {
      hoverIdRef.current = null;
      onSelect(null);
      zoomToNode(svg, zoom, root, width, height);
    });

    return () => {
      svg.on("click", null);
    };
  }, [topics, onSelect]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const root = rootRef.current;
    const zoom = zoomRef.current;
    if (!svgEl || !root || !zoom || !containerRef.current) return;

    const svg = d3.select(svgEl);
    const g = svg.select<SVGGElement>("g");
    if (g.empty()) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const tMs = motionDuration(motionTokens.duration.normal) * 1000;

    g.selectAll<SVGCircleElement, d3.HierarchyCircularNode<PackDatum>>("circle")
      .transition()
      .duration(tMs)
      .ease(d3.easeCubicOut)
      .attr("stroke", (d) => strokeFor(d, selectedId, highlightedIds, hoverIdRef.current))
      .attr("stroke-width", (d) => strokeWidthFor(d, selectedId, highlightedIds, hoverIdRef.current))
      .attr("filter", (d) => filterFor(d, hoverIdRef.current));

    if (highlightedIds.length > 0) {
      const matches = root
        .descendants()
        .filter((d) => d.data.topic && highlightedIds.includes(d.data.topic.id));
      if (matches.length > 0) {
        zoomToNodes(svg, zoom, matches, width, height);
        return;
      }
    }

    if (selectedId) {
      const match = root.descendants().find((d) => d.data.topic?.id === selectedId);
      if (match) zoomToNode(svg, zoom, match, width, height);
    }
  }, [selectedId, highlightedIds]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg ref={svgRef} className="h-full w-full" role="img" aria-label="Trend map" />
    </div>
  );
}

function strokeFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  selectedId: string | null,
  highlightedIds: string[],
  hoverId: string | null,
): string {
  if (d.data.platform) return "rgba(0,0,0,0.35)";
  const id = d.data.topic?.id;
  if (id && id === selectedId) return "rgba(125, 211, 252, 0.95)";
  if (id && highlightedIds.includes(id)) return "#fbbf24";
  if (id && id === hoverId) return "rgba(255,255,255,0.75)";
  if (d.data.topic?.velocity === "rising") return "rgba(96, 165, 250, 0.9)";
  return "rgba(255,255,255,0.14)";
}

function strokeWidthFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  selectedId: string | null,
  highlightedIds: string[],
  hoverId: string | null,
): number {
  const id = d.data.topic?.id;
  if (id && (id === selectedId || highlightedIds.includes(id))) return 3.5;
  if (id && id === hoverId) return 2.5;
  return d.data.topic ? 1.5 : 1;
}

function filterFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  hoverId: string | null,
): string | null {
  const id = d.data.topic?.id;
  if (id && id === hoverId) return "url(#hover-glow)";
  if (d.data.topic?.velocity === "rising") return "url(#rising-glow)";
  return null;
}

function zoomToNode(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
  node: d3.HierarchyCircularNode<PackDatum>,
  width: number,
  height: number,
) {
  const k = Math.min(width, height) / (node.r * 2.15);
  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(k)
    .translate(-node.x, -node.y);

  svg
    .transition()
    .duration(motionDuration(motionTokens.duration.zoom) * 1000)
    .ease(d3.easeCubicInOut)
    .call(zoom.transform, transform);
}

function zoomToNodes(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>,
  nodes: d3.HierarchyCircularNode<PackDatum>[],
  width: number,
  height: number,
) {
  const minX = Math.min(...nodes.map((n) => n.x - n.r));
  const maxX = Math.max(...nodes.map((n) => n.x + n.r));
  const minY = Math.min(...nodes.map((n) => n.y - n.r));
  const maxY = Math.max(...nodes.map((n) => n.y + n.r));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const k = Math.min(width / (maxX - minX), height / (maxY - minY)) * 0.85;

  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(k)
    .translate(-cx, -cy);

  svg
    .transition()
    .duration(motionDuration(motionTokens.duration.zoom) * 1000)
    .ease(d3.easeCubicInOut)
    .call(zoom.transform, transform);
}
