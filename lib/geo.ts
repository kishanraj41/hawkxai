export type CityId = "all" | "austin" | "sf" | "nyc";

export interface GeoQuery {
  city: CityId;
  label: string | null;
  redditSubs: string[];
  log: string;
}

const DEFAULT_REDDIT = [
  "technology",
  "wallstreetbets",
  "news",
  "artificial",
];

const CITIES: Record<Exclude<CityId, "all">, { label: string; sub: string }> = {
  austin: { label: "Austin", sub: "Austin" },
  sf: { label: "San Francisco", sub: "sanfrancisco" },
  nyc: { label: "NYC", sub: "nyc" },
};

export const CITY_OPTIONS: { id: CityId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "austin", label: "Austin" },
  { id: "sf", label: "SF" },
  { id: "nyc", label: "NYC" },
];

/** Rewrite collection queries for a city. No maps API, no geocoding. */
export function geoAgent(raw?: string | null): GeoQuery {
  const key = (raw ?? "all").toLowerCase();
  const city: CityId =
    key === "austin" || key === "sf" || key === "nyc" ? key : "all";

  if (city === "all") {
    return {
      city,
      label: null,
      redditSubs: [...DEFAULT_REDDIT],
      log: "geo: all",
    };
  }
  const spec = CITIES[city];
  return {
    city,
    label: spec.label,
    redditSubs: [...DEFAULT_REDDIT, spec.sub],
    log: `geo: ${city} r/${spec.sub}+defaults`,
  };
}

export function trendsCacheKey(raw?: string | null): string {
  return `trends:v1:${geoAgent(raw).city}`;
}
