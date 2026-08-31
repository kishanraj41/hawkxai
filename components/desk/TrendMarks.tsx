import type { CSSProperties, ReactNode } from "react";
import { CATEGORY_LABEL, classifyTopic } from "@/lib/desk";
import {
  ARTIFACT_INK,
  CATEGORY_INK,
  STICK_PIN,
  artifactPictogram,
  categoryGlyph,
  categoryStickMark,
  trendPictogram,
  type SvgPath,
} from "@/lib/trend-marks";
import type { ArtifactKind, CapturedArtifact, DeskCategory, Topic } from "@/lib/types";

function PathList({ paths }: { paths: SvgPath[] }) {
  return (
    <>
      {paths.map((p, i) => (
        <path
          key={`${p.d.slice(0, 24)}-${i}`}
          d={p.d}
          fill={p.fill ?? "none"}
          stroke={p.stroke ?? "none"}
          strokeWidth={p.sw}
          strokeLinecap={p.lc}
          strokeLinejoin={p.lj}
        />
      ))}
    </>
  );
}

function StickIcon({
  category,
  size = 14,
  className = "",
}: {
  category: DeskCategory;
  size?: number;
  className?: string;
}) {
  const ink = CATEGORY_INK[category];
  return (
    <svg
      width={size}
      height={Math.round(size * 1.25)}
      viewBox="0 0 16 18"
      className={className}
      aria-hidden
    >
      <path d={STICK_PIN.d} fill={ink} />
      <g transform="translate(3.1,2) scale(0.62)" color="#f4f4f5">
        <PathList paths={categoryStickMark(category)} />
      </g>
    </svg>
  );
}

function GlyphIcon({
  topic,
  category,
  size = 22,
  className = "",
}: {
  topic: Pick<Topic, "id" | "label">;
  category: DeskCategory;
  size?: number;
  className?: string;
}) {
  const ink = CATEGORY_INK[category];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect
        x="1.2"
        y="1.2"
        width="21.6"
        height="21.6"
        rx="5.2"
        fill={ink}
        fillOpacity="0.16"
        stroke={ink}
        strokeOpacity="0.85"
        strokeWidth="1.2"
      />
      <g color={ink}>
        <PathList paths={trendPictogram(category, `${topic.id}:${topic.label}`)} />
      </g>
    </svg>
  );
}

function CategoryGlyph({
  category,
  size = 22,
  className = "",
}: {
  category: DeskCategory;
  size?: number;
  className?: string;
}) {
  const ink = CATEGORY_INK[category];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect
        x="1.2"
        y="1.2"
        width="21.6"
        height="21.6"
        rx="5.2"
        fill={ink}
        fillOpacity="0.18"
        stroke={ink}
        strokeWidth="1.3"
      />
      <g color={ink}>
        <PathList paths={categoryGlyph(category)} />
      </g>
    </svg>
  );
}

function Plug({
  category,
  size = 22,
  className = "",
}: {
  category: DeskCategory;
  size?: number;
  className?: string;
}) {
  const stick = Math.max(11, Math.round(size * 0.5));
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <CategoryGlyph category={category} size={size} />
      <span className="pointer-events-none absolute -bottom-0.5 -right-0.5">
        <StickIcon category={category} size={stick} />
      </span>
    </span>
  );
}

function Tile({
  topic,
  category,
  size = 26,
  className = "",
}: {
  topic: Pick<Topic, "id" | "label">;
  category: DeskCategory;
  size?: number;
  className?: string;
}) {
  const stick = Math.max(11, Math.round(size * 0.48));
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <GlyphIcon topic={topic} category={category} size={size} />
      <span className="pointer-events-none absolute -bottom-0.5 -right-0.5">
        <StickIcon category={category} size={stick} />
      </span>
    </span>
  );
}

/** One-line print name, pinned to the tape frame (not the scrolling tile). */
function Caption({ children }: { children?: ReactNode }) {
  return (
    <span
      className={`block max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-none ${
        children
          ? "border border-white/12 bg-black/75 text-white/90"
          : "border border-transparent text-transparent"
      }`}
    >
      {children ?? "\u00a0"}
    </span>
  );
}

function topicCategory(topic: Topic, artifacts: CapturedArtifact[] = []): DeskCategory {
  return classifyTopic(topic, artifacts);
}

export const TrendMark = {
  Stick: StickIcon,
  Glyph: GlyphIcon,
  Category: CategoryGlyph,
  Plug,
  Tile,
  Caption,
  category: topicCategory,
};

export function categoryCaption(category: DeskCategory): string {
  return CATEGORY_LABEL[category];
}

export function trendAria(topic: Pick<Topic, "label">, category: DeskCategory): string {
  return `${topic.label} · ${CATEGORY_LABEL[category]}`;
}

/** D3 helper: draw a centered tile on an existing <g>. */
export function drawTrendTile(
  group: SVGGElement,
  topic: Pick<Topic, "id" | "label">,
  category: DeskCategory,
  size = 22,
): void {
  const ns = "http://www.w3.org/2000/svg";
  const ink = CATEGORY_INK[category];
  const half = size / 2;

  const tile = document.createElementNS(ns, "g");
  tile.setAttribute("transform", `translate(${-half},${-half})`);

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");

  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", "1.2");
  rect.setAttribute("y", "1.2");
  rect.setAttribute("width", "21.6");
  rect.setAttribute("height", "21.6");
  rect.setAttribute("rx", "5.2");
  rect.setAttribute("fill", ink);
  rect.setAttribute("fill-opacity", "0.16");
  rect.setAttribute("stroke", ink);
  rect.setAttribute("stroke-opacity", "0.85");
  rect.setAttribute("stroke-width", "1.2");
  svg.appendChild(rect);

  const g = document.createElementNS(ns, "g");
  g.setAttribute("color", ink);
  for (const p of trendPictogram(category, `${topic.id}:${topic.label}`)) {
    g.appendChild(svgPathEl(ns, p));
  }
  svg.appendChild(g);
  tile.appendChild(svg);

  const stickSize = Math.max(10, Math.round(size * 0.48));
  const stick = document.createElementNS(ns, "svg");
  stick.setAttribute("width", String(stickSize));
  stick.setAttribute("height", String(Math.round(stickSize * 1.25)));
  stick.setAttribute("viewBox", "0 0 16 18");
  stick.setAttribute("x", String(size - stickSize + 2));
  stick.setAttribute("y", String(size - Math.round(stickSize * 1.15)));

  const pin = document.createElementNS(ns, "path");
  pin.setAttribute("d", STICK_PIN.d);
  pin.setAttribute("fill", ink);
  stick.appendChild(pin);

  const mark = document.createElementNS(ns, "g");
  mark.setAttribute("transform", "translate(3.1,2) scale(0.62)");
  mark.setAttribute("color", "#f4f4f5");
  for (const p of categoryStickMark(category)) {
    mark.appendChild(svgPathEl(ns, p));
  }
  stick.appendChild(mark);
  tile.appendChild(stick);

  group.appendChild(tile);
}

/** D3 helper: draw a centered artifact glyph (hashtag / QR / URL / phrase / ticker). */
export function drawArtifactLeaf(group: SVGGElement, kind: ArtifactKind, size = 16): void {
  const ns = "http://www.w3.org/2000/svg";
  const inkColor = ARTIFACT_INK[kind];
  const half = size / 2;

  const tile = document.createElementNS(ns, "g");
  tile.setAttribute("transform", `translate(${-half},${-half})`);

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");

  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", "1.2");
  rect.setAttribute("y", "1.2");
  rect.setAttribute("width", "21.6");
  rect.setAttribute("height", "21.6");
  rect.setAttribute("rx", "5.2");
  rect.setAttribute("fill", inkColor);
  rect.setAttribute("fill-opacity", "0.16");
  rect.setAttribute("stroke", inkColor);
  rect.setAttribute("stroke-opacity", "0.85");
  rect.setAttribute("stroke-width", "1.2");
  svg.appendChild(rect);

  const g = document.createElementNS(ns, "g");
  g.setAttribute("color", inkColor);
  for (const p of artifactPictogram(kind)) {
    g.appendChild(svgPathEl(ns, p));
  }
  svg.appendChild(g);
  tile.appendChild(svg);
  group.appendChild(tile);
}

function svgPathEl(ns: string, p: SvgPath): SVGPathElement {
  const el = document.createElementNS(ns, "path") as SVGPathElement;
  el.setAttribute("d", p.d);
  el.setAttribute("fill", p.fill ?? "none");
  if (p.stroke && p.stroke !== "none") {
    el.setAttribute("stroke", p.stroke === "currentColor" ? "currentColor" : p.stroke);
    if (p.sw) el.setAttribute("stroke-width", String(p.sw));
    if (p.lc) el.setAttribute("stroke-linecap", p.lc);
    if (p.lj) el.setAttribute("stroke-linejoin", p.lj);
  }
  return el;
}

export function categoryStyle(category: DeskCategory): CSSProperties {
  return { color: CATEGORY_INK[category] };
}
