"use client";

import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import type { CityId } from "@/lib/geo";
import { buildTrendPins, type TrendPin } from "@/lib/trend-geo";
import type { Post, Topic } from "@/lib/types";
import { loadWorldLand, type LandPolygon } from "@/lib/world-land";

interface WorldMapProps {
  topics: Topic[];
  located?: Post[];
  city?: CityId;
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (topic: Topic) => void;
  onHover: (id: string | null) => void;
}

function pinFill(pin: TrendPin, selected: boolean, hovered: boolean): string {
  if (pin.kind === "lens") return "transparent";
  if (selected) return "#e8a23a";
  if (hovered) return "#fff";
  if (/usgs|eonet|quake/i.test(pin.source)) return "#fb7185";
  if (/meteo|weather/i.test(pin.source)) return "#7dd3fc";
  return "#f4f4f5";
}

export default function WorldMap({
  topics,
  located = [],
  city = "all",
  selectedId,
  hoverId,
  onSelect,
  onHover,
}: WorldMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const pinGRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const topicsRef = useRef(topics);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  topicsRef.current = topics;
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;

  const pins = useMemo(() => buildTrendPins(topics, city, located), [topics, city, located]);
  const receipts = pins.filter((p) => p.kind === "receipt");

  // Own the SVG once; rebuild only when the pin set / city lens changes.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();
    const width0 = host.clientWidth || 640;
    const height0 = host.clientHeight || 220;
    const svg = d3
      .select(host)
      .append("svg")
      .attr("class", "world-map__svg")
      .attr("role", "img")
      .attr("aria-label", "World map of located receipts")
      .attr("viewBox", `0 0 ${width0} ${height0}`);
    const meshG = svg.append("g").attr("class", "world-map__mesh");
    const landG = svg.append("g").attr("class", "world-map__land");
    const pinG = svg.append("g").attr("class", "world-map__pins");
    pinGRef.current = pinG;

    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath(projection);
    const graticule = d3.geoGraticule10();

    meshG.append("path").attr("class", "world-map__sphere");
    meshG.append("path").attr("class", "world-map__graticule");

    function layout() {
      const frame = hostRef.current;
      if (!frame) return;
      const width = frame.clientWidth || 640;
      const height = frame.clientHeight || 220;
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      projection.fitExtent(
        [
          [8, 8],
          [width - 8, height - 8],
        ],
        { type: "Sphere" },
      );
      meshG.select("path.world-map__graticule").attr("d", path(graticule) ?? "");
      meshG.select("path.world-map__sphere").attr("d", path({ type: "Sphere" }) ?? "");
      landG.selectAll<SVGPathElement, LandPolygon>("path").attr("d", (d) => path(d) ?? "");
      pinG
        .selectAll<SVGGElement, TrendPin>("g.world-map__pin")
        .attr("transform", (d) => {
          const p = projection([d.lon, d.lat]);
          return p ? `translate(${p[0]},${p[1]})` : "translate(-99,-99)";
        });
    }

    const nodes = pinG
      .selectAll<SVGGElement, TrendPin>("g.world-map__pin")
      .data(pins, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g").attr("class", "world-map__pin");
        g.append("circle").attr("class", "world-map__halo").attr("r", 10);
        g.append("circle").attr("class", "world-map__dot");
        g.append("title");
        return g;
      });

    nodes
      .classed("world-map__pin--lens", (d) => d.kind === "lens")
      .attr("tabindex", (d) => (d.kind === "receipt" ? 0 : null))
      .attr("role", (d) => (d.kind === "receipt" ? "button" : null))
      .attr("aria-label", (d) => `${d.label} · ${d.source}`)
      .on("pointerenter", (_event, d) => onHoverRef.current(d.topicIds[0] ?? null))
      .on("pointerleave", () => onHoverRef.current(null))
      .on("click", (_event, d) => {
        const topic = d.topicIds.map((id) => topicsRef.current.find((t) => t.id === id)).find(Boolean);
        if (topic) onSelectRef.current(topic);
      });

    nodes.select("circle.world-map__dot").attr("r", (d) => (d.kind === "lens" ? 7 : Math.max(3, Math.min(7, 2 + d.weight / 40))));
    nodes.select("title").text((d) => `${d.label} · ${d.source}\n${d.title}`);

    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(host);

    let cancelled = false;
    void loadWorldLand().then((land) => {
      if (cancelled || !land) return;
      landG
        .selectAll("path")
        .data([land])
        .join("path")
        .attr("class", "world-map__continent");
      layout();
    });

    return () => {
      cancelled = true;
      ro.disconnect();
      pinG.on("pointerenter", null).on("pointerleave", null).on("click", null);
      pinGRef.current = null;
      host.replaceChildren();
    };
  }, [pins, city]);

  // Paint selection / hover without tearing down the map.
  useEffect(() => {
    const pinG = pinGRef.current;
    if (!pinG) return;
    pinG
      .selectAll<SVGGElement, TrendPin>("g.world-map__pin")
      .classed("world-map__pin--on", (d) => d.topicIds.includes(selectedId ?? "") || d.id === `lens:${city}`)
      .classed("world-map__pin--hot", (d) => d.topicIds.includes(hoverId ?? ""))
      .select("circle.world-map__dot")
      .attr("fill", (d) => pinFill(d, d.topicIds.includes(selectedId ?? ""), d.topicIds.includes(hoverId ?? "")));
  }, [selectedId, hoverId, city, pins]);

  return (
    <section className="world-map" aria-label="Live world">
      <header className="world-map__head">
        <div>
          <p className="empty-stage__eyebrow">World</p>
          <p className="world-map__lead">Live places on this tape</p>
        </div>
        <p className="signal-label">
          {receipts.length
            ? `${receipts.length} located · receipts only`
            : "No located receipts yet · weather and quakes land here"}
        </p>
      </header>
      <div ref={hostRef} className="world-map__canvas" />
    </section>
  );
}
