import sample from "./data/example-poi.json";
import { cacheGet, cachePeek, cacheSet } from "./cache";
import { CITIES, type CityId } from "./geo";
import { stampPosts } from "./lineage";
import { validGeo } from "./trend-geo";
import type { Post } from "./types";

export const EXAMPLE_POI_DATASET = "audiala/audiala-places";
export const EXAMPLE_POI_LICENSE = "cc-by-4.0";
export const EXAMPLE_POI_TOOL = "collect_huggingface_poi";
export const EXAMPLE_POI_SOURCE = "HF:audiala-places";

const HF_META = `https://huggingface.co/api/datasets/${EXAMPLE_POI_DATASET}`;
const CACHE_KEY = "example-poi:v1";
const META_MS = 6_000;

export interface ExamplePoiPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  iso2: string;
  city: string;
  category: string;
  sitelinks: number;
  pagerank: number;
  url: string;
}

export interface ExamplePoiCollect {
  places: ExamplePoiPlace[];
  posts: Post[];
  datasetSha: string | null;
  collectedAt: string;
  liveMeta: boolean;
}

function asPlace(row: ExamplePoiPlace): ExamplePoiPlace | null {
  if (!row.id || !row.name || !validGeo(row.lat, row.lon)) return null;
  const name = row.name.trim().slice(0, 80);
  if (!name) return null;
  return {
    id: row.id,
    name,
    lat: row.lat,
    lon: row.lon,
    country: row.country?.trim() ?? "",
    iso2: (row.iso2 ?? "").trim().toUpperCase(),
    city: row.city?.trim() ?? "",
    category: row.category?.trim() ?? "",
    sitelinks: Number.isFinite(row.sitelinks) ? row.sitelinks : 0,
    pagerank: Number.isFinite(row.pagerank) ? row.pagerank : 0,
    url: row.url || `https://www.wikidata.org/wiki/${row.id}`,
  };
}

/** Hugging Face travel POIs we already sampled — not a geocoder. */
export function loadExamplePoiSample(): ExamplePoiPlace[] {
  const out: ExamplePoiPlace[] = [];
  const seen = new Set<string>();
  for (const raw of sample as ExamplePoiPlace[]) {
    const place = asPlace(raw);
    if (!place || seen.has(place.id)) continue;
    seen.add(place.id);
    out.push(place);
  }
  return out;
}

export function placeToPost(place: ExamplePoiPlace, collectedAt: string): Post {
  const where = [place.city, place.country].filter(Boolean).join(", ");
  return {
    platform: "public",
    title: `Example POI · ${place.name}${place.category ? ` · ${place.category}` : ""}${where ? ` · ${where}` : ""}`,
    url: place.url,
    score: Math.max(1, Math.min(100, place.sitelinks)),
    createdAt: collectedAt,
    sourceApi: EXAMPLE_POI_SOURCE,
    geo: { lat: place.lat, lon: place.lon, label: place.name },
    tool: EXAMPLE_POI_TOOL,
    collectedAt,
  };
}

export function examplePoiPosts(places: ExamplePoiPlace[], collectedAt: string): Post[] {
  return stampPosts(
    places.map((place) => placeToPost(place, collectedAt)),
    EXAMPLE_POI_TOOL,
  );
}

function nearCity(place: ExamplePoiPlace, city: CityId): boolean {
  if (city === "all") return true;
  const spec = CITIES[city];
  const dlat = place.lat - spec.lat;
  const dlon = place.lon - spec.lon;
  return dlat * dlat + dlon * dlon < 64; // ~8° box, not a geocode
}

/** Keep world coverage; when a Place filter is on, float nearby example POIs first. */
export function selectExamplePoi(places: ExamplePoiPlace[], city: CityId = "all"): ExamplePoiPlace[] {
  if (city === "all") return places;
  const near = places.filter((p) => nearCity(p, city));
  const far = places.filter((p) => !nearCity(p, city));
  return [...near, ...far];
}

async function fetchDatasetSha(): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), META_MS);
    const res = await fetch(HF_META, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "HawkxAI-example-poi/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const body = (await res.json()) as { sha?: string };
    return typeof body.sha === "string" && body.sha.length >= 7 ? body.sha : null;
  } catch {
    return null;
  }
}

/** Example POI collect: HF-sampled places + live dataset SHA when Hub answers. */
export async function collectExamplePoi(city: CityId = "all"): Promise<ExamplePoiCollect> {
  const cached = cacheGet<ExamplePoiCollect>(CACHE_KEY);
  if (cached) {
    return { ...cached, places: selectExamplePoi(cached.places, city), posts: examplePoiPosts(selectExamplePoi(cached.places, city), cached.collectedAt) };
  }

  const collectedAt = new Date().toISOString();
  const places = loadExamplePoiSample();
  const datasetSha = await fetchDatasetSha();
  const payload: ExamplePoiCollect = {
    places,
    posts: examplePoiPosts(places, collectedAt),
    datasetSha,
    collectedAt,
    liveMeta: Boolean(datasetSha),
  };
  cacheSet(CACHE_KEY, payload);
  const selected = selectExamplePoi(places, city);
  return {
    ...payload,
    places: selected,
    posts: examplePoiPosts(selected, collectedAt),
  };
}

export function peekExamplePoi(): ExamplePoiCollect | undefined {
  return cachePeek<ExamplePoiCollect>(CACHE_KEY);
}
