"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { motionDuration, motionTokens } from "@/lib/motionTokens";
import { totalScore } from "@/lib/ui-helpers";
import { PLATFORMS, type Platform, type Topic } from "@/lib/types";

const INK = "#f4f1ea";
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
  hoverId: string | null;
  onSelect: (topic: Topic | null) => void;
  onHover: (id: string | null) => void;
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
      const slices = PLATFORMS.filter((p) => (topic.platforms[p]?.score ?? 0) > 0);
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
  hoverId,
  onSelect,
  onHover,
}: TrendMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const rootRef = useRef<d3.HierarchyCircularNode<PackDatum> | null>(null);
  const hoverIdRef = useRef<string | null>(hoverId);
  const selectedIdRef = useRef(selectedId);
  const highlightedIdsRef = useRef(highlightedIds);
  const hadSelectionRef = useRef(Boolean(selectedId));
  const onHoverRef = useRef(onHover);
  const [sweepOn, setSweepOn] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tip, setTip] = useState<{ topic: Topic; x: number; y: number } | null>(null);

  selectedIdRef.current = selectedId;
  highlightedIdsRef.current = highlightedIds;
  hoverIdRef.current = hoverId;
  onHoverRef.current = onHover;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setSweepOn(false);
      return;
    }
    setSweepOn(true);
    const timer = window.setTimeout(() => setSweepOn(false), 1800);
    return () => window.clearTimeout(timer);
  }, [topics]);

  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    if (!container || !svgEl || topics.length === 0) return;

    const width = size.w || container.clientWidth;
    const height = size.h || container.clientHeight;
    if (width < 32 || height < 32) return;
    const reduce = prefersReducedMotion();
    const hoverMs = reduce ? 0 : 180;

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

    const orb = defs.append("radialGradient").attr("id", "orb-fill");
    orb.append("stop").attr("offset", "0%").attr("stop-color", "#ffb24d").attr("stop-opacity", "0.9");
    orb.append("stop").attr("offset", "38%").attr("stop-color", "#ff7a18").attr("stop-opacity", "0.28");
    orb.append("stop").attr("offset", "100%").attr("stop-color", "#0a0a0a").attr("stop-opacity", "0.05");

    const core = defs.append("radialGradient").attr("id", "core-fill");
    core.append("stop").attr("offset", "0%").attr("stop-color", "#fff").attr("stop-opacity", "0.95");
    core.append("stop").attr("offset", "55%").attr("stop-color", "#ffb24d").attr("stop-opacity", "0.55");
    core.append("stop").attr("offset", "100%").attr("stop-color", "#ff7a18").attr("stop-opacity", "0");

    const g = svg.append("g");
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(width, height) * 0.7;
    const grid = g.append("g").attr("class", "radar-grid");
    for (let r = 72; r < maxR; r += 72) {
      grid
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "rgba(148,163,184,0.05)")
        .attr("stroke-width", 1);
    }
    grid
      .append("line")
      .attr("x1", cx - maxR)
      .attr("x2", cx + maxR)
      .attr("y1", cy)
      .attr("y2", cy)
      .attr("stroke", "rgba(148,163,184,0.05)");
    grid
      .append("line")
      .attr("x1", cx)
      .attr("x2", cx)
      .attr("y1", cy - maxR)
      .attr("y2", cy + maxR)
      .attr("stroke", "rgba(148,163,184,0.05)");

    const packed = d3.pack<PackDatum>().size([width, height]).padding(4);
    const root = packed(
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
    const topicNodes = nodes.filter((d) => Boolean(d.data.topic));

    if (topicNodes.length >= 3 && typeof d3.Delaunay?.from === "function") {
      const mesh = g.append("g").attr("class", "terrain-mesh").attr("pointer-events", "none");
      const delaunay = d3.Delaunay.from(topicNodes.map((d) => [d.x, d.y] as [number, number]));
      const { triangles } = delaunay;
      for (let i = 0; i < triangles.length; i += 3) {
        const a = topicNodes[triangles[i]];
        const b = topicNodes[triangles[i + 1]];
        const c = topicNodes[triangles[i + 2]];
        const edges: [typeof a, typeof b][] = [
          [a, b],
          [b, c],
          [c, a],
        ];
        for (const [p, q] of edges) {
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist > 220) continue;
          mesh
            .append("line")
            .attr("x1", p.x)
            .attr("y1", p.y)
            .attr("x2", q.x)
            .attr("y2", q.y)
            .attr("stroke", "rgba(255,178,77,0.22)")
            .attr("stroke-width", 0.8);
        }
      }
    }

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
      .attr("fill", (d) => fillFor(d))
      .attr("fill-opacity", (d) => fillOpacityFor(d, selectedIdRef.current))
      .attr("stroke", (d) =>
        strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, hoverIdRef.current),
      )
      .attr("stroke-width", (d) =>
        strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, hoverIdRef.current),
      )
      .attr("stroke-dasharray", (d) => dashFor(d))
      .attr("filter", (d) => (d.data.topic?.velocity === "rising" ? "url(#rising-glow)" : null))
      .attr("opacity", (d) => (d.data.topic?.velocity === "fading" ? 0.45 : 1));

    node
      .filter((d) => Boolean(d.data.topic) && d.r > 22)
      .append("line")
      .attr("class", "stem")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", (d) => -d.r)
      .attr("y2", (d) => -d.r - 26)
      .attr("stroke", "rgba(255,255,255,0.45)")
      .attr("stroke-width", 0.75)
      .attr("pointer-events", "none");

    node
      .filter((d) => Boolean(d.data.topic) && d.r > 22)
      .append("text")
      .attr("class", "flag")
      .attr("text-anchor", "middle")
      .attr("y", (d) => -d.r - 30)
      .attr("fill", "#fff")
      .attr("font-size", 10)
      .attr("letter-spacing", "0.08em")
      .attr("pointer-events", "none")
      .text((d) => totalScore(d.data.topic!).toFixed(0));

    node
      .filter((d) => Boolean(d.data.topic))
      .append("circle")
      .attr("class", "core")
      .attr("r", (d) => Math.max(3, d.r * 0.14))
      .attr("fill", (d) => (d.data.topic?.velocity === "rising" ? AMBER : "#fff"))
      .attr("opacity", 0.95)
      .attr("pointer-events", "none");

    node
      .attr("fill", "transparent")
      .attr("stroke", "none")
      .attr("r", (d) => Math.max(d.r, 18));

    circles
      .attr("opacity", 0)
      .transition()
      .duration(reduce ? 0 : 420)
      .delay((_, i) => (reduce ? 0 : i * 50))
      .ease(d3.easeCubicOut)
      .attr("r", (d) => d.r)
      .attr("opacity", 1);

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
      .attr("opacity", 0);

    const labelDelay = reduce ? 0 : 1800 + 200;
    g.selectAll("text")
      .transition()
      .delay(labelDelay)
      .duration(reduce ? 0 : 180)
      .attr("opacity", 0.92);

    node
      .filter((d) => Boolean(d.data.topic))
      .on("mouseenter", function (event, d) {
        if (!d.data.topic) return;
        hoverIdRef.current = d.data.topic.id;
        onHoverRef.current(d.data.topic.id);
        const host = containerRef.current;
        if (host) {
          const rect = host.getBoundingClientRect();
          setTip({
            topic: d.data.topic,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
        d3.select(this)
          .select("circle.viz")
          .transition()
          .duration(hoverMs)
          .attr("stroke", strokeFor(d, selectedIdRef.current, highlightedIdsRef.current, d.data.topic!.id))
          .attr("stroke-width", strokeWidthFor(d, selectedIdRef.current, highlightedIdsRef.current, d.data.topic!.id));
        d3.select(this).raise();
      })
      .on("mousemove", (event, d) => {
        if (!d.data.topic) return;
        const host = containerRef.current;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        setTip({
          topic: d.data.topic,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      })
      .on("mouseleave", function (_event, d) {
        hoverIdRef.current = null;
        onHoverRef.current(null);
        setTip(null);
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
      onHoverRef.current(null);
      setTip(null);
      onSelect(null);
      zoomToNode(svg, zoom, root, width, height);
    });

    const pingTimers: number[] = [];
    if (!reduce) {
      const rising = node
        .filter((d) => d.data.topic?.velocity === "rising")
        .nodes()
        .slice(0, 6);
      rising.forEach((el, i) => {
        const host = d3.select(el);
        const datum = host.datum() as d3.HierarchyCircularNode<PackDatum>;
        const fire = () => {
          host
            .append("circle")
            .attr("class", "ping")
            .attr("r", datum.r)
            .attr("fill", "none")
            .attr("stroke", AMBER)
            .attr("stroke-width", 1.25)
            .attr("opacity", 0.85)
            .style("pointer-events", "none")
            .transition()
            .duration(3000)
            .ease(d3.easeCubicOut)
            .attr("r", datum.r * 2.2)
            .attr("opacity", 0)
            .remove();
        };
        const start = window.setTimeout(() => {
          fire();
          pingTimers.push(window.setInterval(fire, 3000));
        }, i * 400);
        pingTimers.push(start);
      });
    }

    return () => {
      svg.on("click", null);
      pingTimers.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
    };
  }, [topics, onSelect, size.w, size.h]);

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
  }, [selectedId, highlightedIds, hoverId]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg ref={svgRef} className="h-full w-full" role="img" aria-label="HawkAI trend map" />
      {sweepOn ? <div className="signal-sweep" aria-hidden /> : null}
      {tip ? <MapQuote topic={tip.topic} x={tip.x} y={tip.y} /> : null}
    </div>
  );
}

function MapQuote({ topic, x, y }: { topic: Topic; x: number; y: number }) {
  const score = totalScore(topic);
  return (
    <div
      className="pointer-events-none absolute z-20 w-56 rounded-lg border border-white/12 bg-[#0c0d10]/95 p-2.5"
      style={{ left: Math.min(x + 12, 9999), top: Math.max(8, y - 8), transform: "translateY(-100%)" }}
    >
      <p className="line-clamp-2 text-[12px] leading-snug text-white">{topic.label}</p>
      <p className="mt-1 font-mono text-[10px] tabular-nums text-white/55">
        {Math.round(score)} · {topic.velocity} · {topic.platforms.x?.score ?? 0} X · {topic.platforms.reddit?.score ?? 0} Reddit · {topic.platforms.hn?.score ?? 0} HN · {topic.platforms.public?.score ?? 0} APIs
      </p>
    </div>
  );
}

function fillFor(d: d3.HierarchyCircularNode<PackDatum>): string {
  if (d.data.topic) return "url(#orb-fill)";
  if (d.data.platform) return "url(#core-fill)";
  return "rgba(255,255,255,0.06)";
}

function fillOpacityFor(
  d: d3.HierarchyCircularNode<PackDatum>,
  selectedId: string | null,
): number {
  if (!selectedId) return d.data.platform ? 0.95 : 0.82;
  const id = d.data.topic?.id ?? d.parent?.data.topic?.id;
  if (id === selectedId) return 1;
  return 0.38;
}

function dashFor(d: d3.HierarchyCircularNode<PackDatum>): string | null {
  if (d.data.platform === "x") return null;
  if (d.data.platform === "reddit") return "5 3";
  if (d.data.platform === "hn") return "1.5 2.4";
  if (d.data.platform === "public") return "2 3";
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
  if (d.data.platform) return "rgba(255,255,255,0.35)";
  if (id && highlightedIds.includes(id)) return AMBER;
  if (id && id === hoverId) return "#fff";
  if (topic?.velocity === "rising") return AMBER_HOT;
  if (id && id === selectedId) return "#fff";
  return "rgba(255,255,255,0.28)";
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

  svg.selectAll("text").interrupt().attr("opacity", 0);
  const zoomMs = prefersReducedMotion() ? 0 : 650;
  svg
    .transition()
    .duration(zoomMs)
    .ease(d3.easeCubicOut)
    .on("end", () => {
      svg
        .selectAll("text")
        .transition()
        .delay(prefersReducedMotion() ? 0 : 200)
        .duration(prefersReducedMotion() ? 0 : 180)
        .attr("opacity", 0.92);
    })
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

  svg.selectAll("text").interrupt().attr("opacity", 0);
  const zoomMs = prefersReducedMotion() ? 0 : 650;
  svg
    .transition()
    .duration(zoomMs)
    .ease(d3.easeCubicOut)
    .on("end", () => {
      svg
        .selectAll("text")
        .transition()
        .delay(prefersReducedMotion() ? 0 : 200)
        .duration(prefersReducedMotion() ? 0 : 180)
        .attr("opacity", 0.92);
    })
    .call(zoom.transform, transform);
}
