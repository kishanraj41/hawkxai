import type { ArtifactKind, DeskCategory } from "./types";

export const CATEGORY_INK: Record<DeskCategory, string> = {
  all: "#d4d4d8",
  markets: "#34d399",
  news: "#7dd3fc",
  weather: "#38bdf8",
  tech: "#c4b5fd",
  sports: "#fb923c",
  health: "#f472b6",
  security: "#f87171",
  campaigns: "#e8a23a",
  culture: "#e4e4e7",
};

export interface SvgPath {
  d: string;
  fill?: string;
  stroke?: string;
  sw?: number;
  lc?: "round" | "butt" | "square";
  lj?: "round" | "miter" | "bevel";
}

function fill(d: string): SvgPath {
  return { d, fill: "currentColor", stroke: "none" };
}

function hole(d: string): SvgPath {
  return { d, fill: "rgba(12,13,16,0.82)", stroke: "none" };
}

function ink(d: string, sw = 2.2): SvgPath {
  return { d, fill: "none", stroke: "currentColor", sw, lc: "round", lj: "round" };
}

export const STICK_PIN: SvgPath = {
  d: "M8 1.1c-2.9 0-5.25 2.28-5.25 5.1 0 3.7 4.5 9.95 5.25 10.95.75-1 5.25-7.25 5.25-10.95C13.25 3.38 10.9 1.1 8 1.1z",
  fill: "currentColor",
};

/** White silhouettes in the pin head (16×16 space, drawn around 8,6.4). */
const STICK: Record<DeskCategory, SvgPath[]> = {
  all: [fill("M5.1 4.4h1.8v1.8H5.1zm4 0h1.8v1.8H9.1zM5.1 8.3h1.8v1.8H5.1zm4 0h1.8v1.8H9.1z")],
  markets: [fill("M5 10.6V6.4h1.7v4.2zm2.6 0V5.1h1.7v5.5zm2.6 0V7.2h1.7v3.4z")],
  news: [fill("M4.4 3.9h7.2v8.2H4.4z"), hole("M5.6 5.4h4.6v.9H5.6zm0 1.7h3.6v.9H5.6zm0 1.7h2.8v.9H5.6z")],
  weather: [fill("M5.3 9.6c-1.15 0-2.05-.9-2.05-2 0-.92.64-1.7 1.52-1.92.28-1.35 1.5-2.35 2.95-2.35 1.5 0 2.75 1.05 3.05 2.48.9.12 1.58.88 1.58 1.8 0 1-.85 1.99-1.95 1.99H5.3z")],
  tech: [fill("M5 5h6v6H5zM7.2 3.6h1.6v1.4H7.2zM7.2 11h1.6v1.4H7.2zM3.6 7.2H5v1.6H3.6zM11 7.2h1.4v1.6H11z")],
  sports: [fill("M8 3.7a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z")],
  health: [fill("M7.1 3.9h1.8v8.2H7.1zM3.9 7.1h8.2v1.8H3.9z")],
  security: [fill("M8 3.4 4.2 4.9v2.7c0 2.4 1.65 3.95 3.8 4.6 2.15-.65 3.8-2.2 3.8-4.6V4.9L8 3.4z")],
  campaigns: [fill("M4.3 5.8v4.2l7.2-2.1V3.7L4.3 5.8zM4.3 10v2.1h1.5V9.6z")],
  culture: [fill("M8 3.3l1.3 2.6 2.9.42-2.1 2.05.5 2.88L8 9.85 5.4 11.25l.5-2.88-2.1-2.05 2.9-.42z")],
};

const TREND: Record<DeskCategory, SvgPath[][]> = {
  all: [
    [fill("M10.2 5h3.6v14h-3.6zM5 10.2h14v3.6H5z")],
    [fill("M6 7h12v2.2H6zm0 4h12v2.2H6zm0 4h8v2.2H6z")],
    [fill("M12 5.2 19 18.5H5z")],
    [fill("M6.2 6.2h4.6v4.6H6.2zm7 0h4.6v4.6H13.2zM6.2 13.2h4.6v4.6H6.2zm7 0h4.6v4.6H13.2z")],
  ],
  markets: [
    [fill("M5.5 18V10h3.2v8zm5 0V6h3.2v12zm5 0v-5h3.2v5z")],
    [fill("M12 5.4a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2z"), hole("M10.6 11.1h2.8v1.8h-2.8zM11.1 9h1.8v6h-1.8z")],
    [fill("M4.8 16.2 9.6 11l3.2 2.6 6.4-7.4h-3.6v-2H22v6.4h-2V8.4z")],
    [fill("M5 17.6V9.2h3.4v8.4zm5.2 0V6.4h3.4v11.2zm5.2 0v-6h3.4v6z")],
  ],
  news: [
    [fill("M5.2 4.8h13.6v14.4H5.2z"), hole("M7.4 7.4h9.2v1.6H7.4zm0 3.2h7.2v1.6H7.4zm0 3.2h5.4v1.6H7.4z")],
    [fill("M4.4 6.2h15.2v2.2H4.4zm0 4.6h12v2.2H4.4zm0 4.6h8.4v2.2H4.4z")],
    [fill("M12 4.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4z"), hole("M11.1 7.2h1.8v5.2h-1.8zM8.4 13.6h7.2v1.8H8.4z")],
    [fill("M6.4 5.2h11.2v3.2H6.4zm0 4.6h11.2v9H6.4z")],
  ],
  weather: [
    [fill("M8.1 16.4c-2.2 0-4-1.7-4-3.8 0-1.7 1.2-3.2 2.9-3.6.5-2.5 2.7-4.4 5.4-4.4 2.8 0 5.1 2 5.6 4.7 1.7.3 3 1.8 3 3.5 0 2-1.7 3.6-3.8 3.6H8.1z")],
    [fill("M12 6.2a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8z"), fill("M11.1 3.2h1.8v2.2h-1.8zM11.1 18.6h1.8v2.2h-1.8zM3.2 11.1h2.2v1.8H3.2zm15.4 0h2.2v1.8h-2.2z")],
    [fill("M8.4 13.2c-2 0-3.6-1.5-3.6-3.4s1.6-3.4 3.6-3.4c.5-1.9 2.2-3.3 4.3-3.3 2.2 0 4 1.5 4.4 3.6 1.5.2 2.6 1.5 2.6 3 0 1.7-1.4 3.1-3.1 3.1H8.4z"), fill("M9 14.6h1.7v4.2H9zm3.1 0h1.7v5.2h-1.7zm3.1 0h1.7v4.2h-1.7z")],
    [fill("M13.8 4.4 7.2 13.4h4.8L9.6 19.6l6.6-9h-4.8z")],
  ],
  tech: [
    [fill("M7.2 7.2h9.6v9.6H7.2zM11.1 4.4h1.8v2.8h-1.8zm0 12.4h1.8v2.8h-1.8zM4.4 11.1h2.8v1.8H4.4zm12.4 0h2.8v1.8h-2.8z")],
    [fill("M6 6.4a2.2 2.2 0 1 1 0 .04zm12 0a2.2 2.2 0 1 1 0 .04zM12 15.4a2.2 2.2 0 1 1 0 .04z"), fill("M7.6 8.2 10.4 14.2h1.9L9.4 8.2zm6.8 0h1.8l-2.8 6h-1.9z")],
    [fill("M6.2 7.2 12 12l-5.8 4.8V7.2zm7.4 8.2H18v2.2h-4.4z")],
    [fill("M7.4 14.8a4.6 4.6 0 1 1 9.2 0H7.4zM11.1 6.2h1.8v5.2h-1.8zM8.4 6.8h7.2v1.8H8.4z")],
  ],
  sports: [
    [fill("M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z"), hole("M11.2 7.2h1.6v9.6h-1.6zM6.4 11.2h11.2v1.6H6.4z")],
    [fill("M8.4 6.2h7.2l2.2 6.2-5.8 6.4-5.8-6.4z")],
    [fill("M5.4 16.8V8.4h13.2v8.4zM5.4 5.6h13.2v2.8H5.4z")],
    [fill("M7.6 10.2h8.8v3.6c0 1.5-2 2.6-4.4 2.6s-4.4-1.1-4.4-2.6zM9.8 7.2h4.4v3H9.8z")],
  ],
  health: [
    [fill("M10.4 5.2h3.2v13.6h-3.2zM5.2 10.4h13.6v3.2H5.2z")],
    [ink("M4.6 12h3.4l1.7-3.6 2.9 7.6 1.9-4H19.4", 2.4)],
    [fill("M12 6.2c1.4 0 2.5.8 3.2 1.9.7-1.1 1.8-1.9 3.2-1.9 1.8 0 3.2 1.5 3.2 3.4 0 4.1-6.4 8.4-6.4 8.4S5.6 13.7 5.6 9.6c0-1.9 1.4-3.4 3.2-3.4z")],
    [fill("M8.6 7.4h6.8v4c0 2.6-1.5 5.2-3.4 6.6-1.9-1.4-3.4-4-3.4-6.6z")],
  ],
  security: [
    [fill("M12 4.4 5.4 7v4.4c0 3.8 2.7 6.2 6.6 7.4 3.9-1.2 6.6-3.6 6.6-7.4V7L12 4.4z")],
    [fill("M8.2 11.2V9.2a3.8 3.8 0 0 1 7.6 0v2h1.6v6.8H6.6v-6.8z")],
    [fill("M12 5.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6z"), hole("M11.1 9.6h1.8v3.2h-1.8zM11.1 14.2h1.8v1.8h-1.8z")],
    [fill("M4.4 12s3.2-6.2 7.6-6.2S19.6 12 19.6 12s-3.2 6.2-7.6 6.2S4.4 12 4.4 12z"), hole("M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z")],
  ],
  campaigns: [
    [fill("M5.6 8.6v6.6L18.4 12V6.2L5.6 8.6zM5.6 15.2v2.8h2V14.6z")],
    [fill("M6.4 5.2h2v13.6h-2zm2 0h9.6l-2.6 3.8 2.6 3.8H8.4z")],
    [fill("M6.4 6.4h4.4v4.4H6.4zm6.8 0h4.4v4.4h-4.4zM6.4 13.2h4.4v4.4H6.4zm6.8 1.8h4.4v2.6h-4.4z")],
    [fill("M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z"), hole("M12 9.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z")],
  ],
  culture: [
    [fill("M7.4 7.2c0-1.8 1.2-3.2 2.7-3.2s2.7 1.4 2.7 3.2c0 2.8-2.7 4.2-2.7 6.6H7.4c0-2.4-2.7-3.8-2.7-6.6 0-1.8 1.2-3.2 2.7-3.2zm7.2 0c0-1.8 1.2-3.2 2.7-3.2s2.7 1.4 2.7 3.2c0 2.8-2.7 4.2-2.7 6.6h-2.7c0-2.4-2.7-3.8-2.7-6.6z"), fill("M6.8 16.2h11.6v2H6.8z")],
    [fill("M9.4 16.8a2.4 2.4 0 1 1 0 .04zm7.2-2.2a2.4 2.4 0 1 1 0 .04z"), fill("M11.4 16.8V7.2l7.2-1.6v9.2z")],
    [fill("M5.6 6.4h12.8v11.2H5.6z"), fill("M5.6 10.2h12.8v1.8H5.6zM9.8 6.4h1.8v3.8H9.8z")],
    [fill("M7.6 5.2h9.6v13.6H7.6zM5.8 7.2c-1.1 0-2 .9-2 2v7.6h2z")],
  ],
};

export function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function categoryStickMark(category: DeskCategory): SvgPath[] {
  return STICK[category];
}

export function categoryGlyph(category: DeskCategory): SvgPath[] {
  return TREND[category][0];
}

export function trendPictogram(category: DeskCategory, seed: string): SvgPath[] {
  const set = TREND[category];
  return set[hashSeed(seed) % set.length];
}

export const ARTIFACT_INK: Record<ArtifactKind, string> = {
  hashtag: "#e8a23a",
  qr: "#e8a23a",
  url: "#7dd3fc",
  phrase: "#e4e4e7",
  ticker: "#34d399",
};

const ARTIFACT: Record<ArtifactKind, SvgPath[]> = {
  hashtag: [
    ink("M9 5.2 7.4 18.8"),
    ink("M16.6 5.2 15 18.8"),
    ink("M5.2 9.4h13.6"),
    ink("M4.8 14.6h13.6"),
  ],
  qr: [
    fill("M5.2 5.2h5.2v5.2H5.2zm8.4 0h5.2v5.2h-5.2zM5.2 13.6h5.2v5.2H5.2zm8.4 2.6h2.2v2.6h-2.2zm3 0h2.2v2.6h-2.2zm-3-2.6h5.2v2h-5.2z"),
    hole("M7 7h1.6v1.6H7zm8.4 0h1.6v1.6h-1.6zM7 15.4h1.6v1.6H7z"),
  ],
  url: [
    ink("M8.6 15.4 7.2 16.8a3.4 3.4 0 1 1-4.8-4.8l1.4-1.4"),
    ink("M15.4 8.6l1.4-1.4a3.4 3.4 0 1 1 4.8 4.8l-1.4 1.4"),
    ink("M9.6 14.4 14.4 9.6"),
  ],
  phrase: [
    fill("M6.2 6.4h4.2v4.8c0 2.4-1.4 4.2-4.2 5.2v-2.4c1.2-.6 1.8-1.5 1.8-2.8H6.2zm7.4 0H18v4.8c0 2.4-1.4 4.2-4.2 5.2v-2.4c1.2-.6 1.8-1.5 1.8-2.8h-2z"),
  ],
  ticker: [
    fill("M12 5.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6z"),
    hole("M10.6 8.4h4.2v1.6h-1.2v1.2h1.8v1.6h-1.8v1.6h1.2v1.6h-4.2v-1.6h1.2v-1.6H9.4v-1.6h1.2V10H9.4V8.4h1.2z"),
  ],
};

export function artifactPictogram(kind: ArtifactKind): SvgPath[] {
  return ARTIFACT[kind];
}
