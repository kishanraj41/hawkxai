"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { motionDuration, motionTokens } from "@/lib/motionTokens";
import { totalScore } from "@/lib/ui-helpers";
import type { Platform, Topic } from "@/lib/types";

const INK = "#f4f1ea";
const SLATE_STROKE = "#46506b";
const AMBER = "#ffb24d";
const AMBER_HOT = "#ff7a18";

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

function scoreRadius(topics: Topic[]): (score: number) => number {
  const maxScore = d3.max(topics, (t) => totalScore(t)) ?? 1;
  return d3.scaleSqrt<number, number>().domain([0, Math.max(maxScore, 1)]).range([18, 90]);
}

function buildHierarchy(topics: Topic[]): PackDatum {
  const rOf = scoreRadius(topics);
  return {
    children: topics.map((topic) => {
      const tot = Math.max(totalScore(topic), 1);
      const area = rOf(tot) ** 2;
      const slices = (["x", "reddit", "hn"] as Platform[]).filter(
        (p) => topic.platforms[p].score > 0,
      );
      return {
        id: topic.id,
        topic,
        children:
          slices.length > 0
            ? slices.map((p) => ({
                platform: p,
                value: area * (topic.platforms[p].score / tot),
              }))
            : [{ value: area }],
      };
    }),
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
  const hadSelectionRef = useRef(Boolean(selectedId));

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
      .attr("class", "viz")
      .attr("r", 0)
      .attr("fill", (d) => fillFor(d, topics))
      .attr("fill-opacity", (d) => fillOpacityFor(d, selectedIdRef.current))
      .attr("stroke", (d) =>
        strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, hoverIdRef.current),
      )
      .attr("stroke-width", (d) =>
        strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, hoverIdRef.current),
      )
      .attr("stroke-dasharray", (d) => dashFor(d))
      .attr("opacity", (d) => (d.data.topic?.velocity === "fading" ? 0.45 : 1));

    node
      .filter((d) => Boolean(d.data.topic))
      .append("circle")
      .attr("class", "hit")
      .attr("fill", "transparent")
      .attr("stroke", "none")
      .attr("r", (d) => Math.max(d.r, 18));

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
      .attr("fill", INK)
      .attr("fill-opacity", 0.92)
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
          .select("circle.viz")
          .transition()
          .duration(hoverMs)
          .attr("stroke", strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, d.data.topic!.id))
          .attr("stroke-width", strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, d.data.topic!.id));
        d3.select(this).raise();
      })
      .on("mouseleave", function (_event, d) {
        hoverIdRef.current = null;
        d3.select(this)
          .select("circle.viz")
          .transition()
          .duration(hoverMs)
          .attr("stroke", strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, null))
          .attr("stroke-width", strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, null));
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

    g.selectAll<SVGCircleElement, d3.HierarchyCircularNode<PackDatum>>("circle.viz")
      .transition()
      .duration(tMs)
      .ease(d3.easeCubicOut)
      .attr("stroke", (d) => strokeFor(d, selectedId, highlightedIds, hoverIdRef.current))
      .attr("stroke-width", (d) => strokeWidthFor(d, selectedId, highlightedIds, hoverIdRef.current))
      .attr("fill-opacity", (d) => fillOpacityFor(d, selectedId));

    g.selectAll<SVGGElement, d3.HierarchyCircularNode<PackDatum>>("g.node")
      .filter((d) => Boolean(d.data.topic && d.data.topic.id === selectedId))
      .raise();

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
    } else if (hadSelectionRef.current) {
      zoomToNode(svg, zoom, root, width, height);
    }
    hadSelectionRef.current = Boolean(selectedId);
  }, [selectedId, highlightedIds]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg ref={svgRef} className="h-full w-full" role="img" aria-label="HawkAI trend map" />
    </div>
  );
}

function scoreT(d: d3.HierarchyCircularNode<PackDatum>, topics: Topic[]): number {
  const max = Math.max(1, d3.max(topics, (t) => totalScore(t)) ?? 1);
  if (d.data.topic) return totalScore(d.data.topic) / max;
  if (d.data.platform && d.parent?.data.topic) {
    return d.data.topic ? 1 : (d.value ?? 1) / Math.max(1, d.parent.value ?? 1);
  }
  return 0.4;
}

function fillFor(d: d3.HierarchyCircularNode<PackDatum>, topics: Topic[]): string {
  const t = scoreT(d, topics);
  const lift = Math.round(t * 28);
  const r = 42 + lift;
  const g = 50 + lift;
  const b = 69 + lift;
  return `rgb(${r},${g},${b})`;
}

function fillOpacityFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  selectedId: string | null,
): number {
  if (!selectedId) return d.data.platform ? 0.92 : 0.88;
  const id = d.data.topic?.id ?? d.parent?.data.topic?.id;
  if (id === selectedId) return 1;
  return 0.38;
}

function dashFor(d: d3.HierarchyCircularNode<PackDatum>): string | null {
  if (d.data.platform === "x") return null;
  if (d.data.platform === "reddit") return "5 3";
  if (d.data.platform === "hn") return "1.5 2.4";
  return null;
}

function strokeFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  selectedId: string | null,
  highlightedIds: string[],
  hoverId: string | null,
): string {
  const topic = d.data.topic ?? d.parent?.data.topic;
  const id = topic?.id;
  if (d.data.platform) return SLATE_STROKE;
  if (id && highlightedIds.includes(id)) return AMBER;
  if (id && id === hoverId) return INK;
  if (topic?.velocity === "rising") return AMBER_HOT;
  if (id && id === selectedId) return INK;
  return SLATE_STROKE;
}

function strokeWidthFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  selectedId: string | null,
  highlightedIds: string[],
  hoverId: string | null,
): number {
  const id = d.data.topic?.id;
  if (id && highlightedIds.includes(id)) return 2.75;
  if (id && id === selectedId) return 2.4;
  if (id && id === hoverId) return 2.1;
  if (d.data.topic?.velocity === "rising") return 2.2;
  return d.data.topic ? 1.4 : 1.1;
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
    .duration(prefersReducedMotion() ? 0 : 650)
    .ease(d3.easeCubicOut)
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
    .duration(prefersReducedMotion() ? 0 : 650)
    .ease(d3.easeCubicOut)
    .call(zoom.transform, transform);
}
