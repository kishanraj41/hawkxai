import { cacheGet, cacheSet } from "./cache";
import type { CityId } from "./geo";
import type { Post, PublicApiIngest } from "./types";

const CATALOG_URL =
  "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";
const UA = "HawkAI/1.0 (+https://github.com/snagaram3/grokhackx)";
const CATALOG_KEY = "public-apis:catalog";
const PER_FEED = 8;
const MAX_POSTS = 80;
const FEED_MS = 8_000;

export interface PublicApiEntry {
  name: string;
  description: string;
  auth: string;
  https: boolean;
  cors: string;
  category: string;
  url: string;
}

export interface PublicApiCollect {
  posts: Post[];
  ingest: PublicApiIngest;
}

interface Feed {
  name: string;
  category: string;
  match: string[];
  run: (city: CityId) => Promise<Post[]>;
}

const CITY_COORDS: Record<Exclude<CityId, "all">, { lat: number; lon: number; label: string }> = {
  austin: { lat: 30.27, lon: -97.74, label: "Austin" },
  sf: { lat: 37.77, lon: -122.42, label: "San Francisco" },
  nyc: { lat: 40.71, lon: -74.01, label: "NYC" },
};

function post(
  title: string,
  url: string,
  score: number,
  sourceApi: string,
  createdAt?: string,
): Post {
  return {
    platform: "public",
    title: title.slice(0, 180),
    url,
    score: Math.max(1, Math.round(score)),
    createdAt: createdAt ?? new Date().toISOString(),
    sourceApi,
  };
}

async function getJson(url: string, ms = FEED_MS): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json, text/plain, */*", "User-Agent": UA },
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function noAuth(auth: string): boolean {
  const a = auth.trim().toLowerCase().replace(/[`*]/g, "");
  return a === "no" || a === "none" || a === "" || a === "null";
}

export function parsePublicApisReadme(md: string): PublicApiEntry[] {
  const entries: PublicApiEntry[] = [];
  let category = "Uncategorized";
  for (const line of md.split("\n")) {
    const heading = line.match(/^###\s+(.+)/);
    if (heading) {
      category = heading[1].trim();
      continue;
    }
    const row = line.match(
      /^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|/,
    );
    if (!row) continue;
    const name = row[1].trim();
    if (!name || name === "API") continue;
    entries.push({
      name,
      url: row[2].trim(),
      description: row[3].trim(),
      auth: row[4].trim(),
      https: /yes/i.test(row[5]),
      cors: row[6].trim(),
      category,
    });
  }
  return entries;
}

export async function loadPublicApiCatalog(): Promise<PublicApiEntry[]> {
  const cached = cacheGet<PublicApiEntry[]>(CATALOG_KEY);
  if (cached?.length) return cached;
  const res = await fetch(CATALOG_URL, {
    cache: "no-store",
    headers: { Accept: "text/plain", "User-Agent": UA },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`public-apis catalog ${res.status}`);
  const entries = parsePublicApisReadme(await res.text());
  cacheSet(CATALOG_KEY, entries);
  return entries;
}

function allowed(feed: Feed, catalog: PublicApiEntry[] | null): boolean {
  if (!catalog?.length) return true;
  const open = catalog.filter((e) => noAuth(e.auth) && e.https);
  const hay = open.map((e) => `${e.name} ${e.description}`.toLowerCase());
  return feed.match.some((m) => hay.some((h) => h.includes(m.toLowerCase())));
}

function utcYmd(daysAgo: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return {
    y: d.getUTCFullYear(),
    m: String(d.getUTCMonth() + 1).padStart(2, "0"),
    day: String(d.getUTCDate()).padStart(2, "0"),
  };
}

const FEEDS: Feed[] = [
  {
    name: "GDELT",
    category: "News",
    match: ["gdelt"],
    run: async () => {
      const data = asRecord(
        await getJson(
          "https://api.gdeltproject.org/api/v2/doc/doc?query=sourcelang:english&mode=ArtList&maxrecords=20&format=json&sort=DateDesc",
        ),
      );
      return asArray(data?.articles)
        .map((row) => {
          const a = asRecord(row);
          if (!a || !str(a.title) || !str(a.url)) return null;
          return post(str(a.title), str(a.url), 70, "GDELT", str(a.seendate) || undefined);
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Wikipedia",
    category: "Open Data",
    match: ["wikipedia"],
    run: async () => {
      const { y, m, day } = utcYmd(1);
      const data = asRecord(
        await getJson(
          `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${day}`,
        ),
      );
      const articles = asArray(asRecord(asArray(data?.items)[0])?.articles);
      return articles
        .map((row) => {
          const a = asRecord(row);
          const title = str(a?.article).replace(/_/g, " ");
          if (!title || /^(Special:|Main Page|Wiki|Portal:|File:)/i.test(title)) return null;
          const views = num(a?.views);
          return post(
            `Wikipedia: ${title}`,
            `https://en.wikipedia.org/wiki/${encodeURIComponent(str(a?.article))}`,
            Math.min(100, Math.log10(views + 1) * 18),
            "Wikipedia",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "CoinGecko",
    category: "Cryptocurrency",
    match: ["coingecko"],
    run: async () => {
      const data = asRecord(await getJson("https://api.coingecko.com/api/v3/search/trending"));
      return asArray(data?.coins)
        .map((row) => {
          const item = asRecord(asRecord(row)?.item);
          if (!item || !str(item.name)) return null;
          const symbol = str(item.symbol);
          return post(
            `${str(item.name)}${symbol ? ` ($${symbol.toUpperCase()})` : ""} trending`,
            `https://www.coingecko.com/en/coins/${str(item.id) || str(item.name)}`,
            90 - num(item.score) * 4,
            "CoinGecko",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "USGS",
    category: "Environment",
    match: ["usgs", "earthquake"],
    run: async () => {
      const data = asRecord(
        await getJson(
          "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
        ),
      );
      return asArray(data?.features)
        .map((row) => {
          const f = asRecord(row);
          const props = asRecord(f?.properties);
          if (!props || !str(props.title)) return null;
          return post(
            str(props.title),
            str(props.url) || "https://earthquake.usgs.gov/",
            Math.min(100, num(props.mag) * 12),
            "USGS",
            num(props.time) ? new Date(num(props.time)).toISOString() : undefined,
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "NASA EONET",
    category: "Science & Math",
    match: ["eonet", "nasa"],
    run: async () => {
      const data = asRecord(await getJson("https://eonet.gsfc.nasa.gov/api/v3/events?limit=12&days=7"));
      return asArray(data?.events)
        .map((row) => {
          const e = asRecord(row);
          if (!e || !str(e.title)) return null;
          const link = str(asRecord(asArray(e.sources)[0])?.url) || str(e.link);
          return post(
            str(e.title),
            link || "https://eonet.gsfc.nasa.gov/",
            65,
            "NASA EONET",
            str(e.geometry ? asRecord(asArray(e.geometry)[0])?.date : "") || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "National Weather Service",
    category: "Weather",
    match: ["national weather service", "weather.gov", "noaa"],
    run: async () => {
      const data = asRecord(
        await getJson("https://api.weather.gov/alerts/active?status=actual&message_type=alert"),
      );
      return asArray(data?.features)
        .map((row) => {
          const props = asRecord(asRecord(row)?.properties);
          if (!props || !str(props.headline)) return null;
          const sev =
            str(props.severity) === "Extreme" ? 95 : str(props.severity) === "Severe" ? 80 : 55;
          const href =
            str(props["@id"]) ||
            str(props.id).replace(/^urn:oid:/, "https://api.weather.gov/alerts/") ||
            "https://www.weather.gov/";
          return post(str(props.headline), href, sev, "NWS", str(props.sent) || undefined);
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Open-Meteo",
    category: "Weather",
    match: ["open-meteo", "open meteo"],
    run: async (city) => {
      const spots =
        city === "all" ? Object.values(CITY_COORDS) : [CITY_COORDS[city]];
      const rows = await Promise.all(
        spots.map(async (c) => {
          const data = asRecord(
            await getJson(
              `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,wind_speed_10m`,
            ),
          );
          const cur = asRecord(data?.current);
          if (!cur) return null;
          return post(
            `${c.label} ${num(cur.temperature_2m)}°C wind ${num(cur.wind_speed_10m)}`,
            `https://open-meteo.com/en/docs#latitude=${c.lat}&longitude=${c.lon}`,
            40,
            "Open-Meteo",
            str(cur.time) || undefined,
          );
        }),
      );
      return rows.filter((p): p is Post => Boolean(p));
    },
  },
  {
    name: "TVMaze",
    category: "Video",
    match: ["tvmaze"],
    run: async () => {
      const rows = asArray(await getJson("https://api.tvmaze.com/schedule?country=US"));
      return rows
        .map((row) => {
          const r = asRecord(row);
          const show = asRecord(r?.show);
          const name = str(show?.name);
          if (!name) return null;
          const ep = str(r?.name);
          return post(
            ep ? `${name}: ${ep}` : name,
            str(show?.url) || "https://www.tvmaze.com/",
            45,
            "TVMaze",
            str(r?.airdate) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Open Library",
    category: "Books",
    match: ["open library"],
    run: async () => {
      const data = asRecord(await getJson("https://openlibrary.org/trending/daily.json"));
      return asArray(data?.works)
        .map((row) => {
          const w = asRecord(row);
          if (!w || !str(w.title)) return null;
          const key = str(w.key);
          return post(
            str(w.title),
            key ? `https://openlibrary.org${key}` : "https://openlibrary.org/",
            Math.min(90, num(w.logged_edition) || 50),
            "Open Library",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Dev.to",
    category: "Development",
    match: ["dev.to", "devto"],
    run: async () => {
      const rows = asArray(await getJson("https://dev.to/api/articles?per_page=12&top=1"));
      return rows
        .map((row) => {
          const a = asRecord(row);
          if (!a || !str(a.title) || !str(a.url)) return null;
          return post(str(a.title), str(a.url), Math.min(100, num(a.positive_reactions_count)), "Dev.to");
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "GitHub",
    category: "Development",
    match: ["github"],
    run: async () => {
      const rows = asArray(await getJson("https://api.github.com/events"));
      const counts = new Map<string, { n: number; url: string }>();
      for (const row of rows) {
        const e = asRecord(row);
        const repo = asRecord(e?.repo);
        const name = str(repo?.name);
        if (!name) continue;
        const prev = counts.get(name) ?? { n: 0, url: `https://github.com/${name}` };
        prev.n += 1;
        counts.set(name, prev);
      }
      return [...counts.entries()]
        .toSorted((a, b) => b[1].n - a[1].n)
        .slice(0, PER_FEED)
        .map(([name, v]) => post(`GitHub: ${name}`, v.url, Math.min(100, v.n * 12), "GitHub"));
    },
  },
  {
    name: "Spaceflight News",
    category: "Science & Math",
    match: ["spaceflight news", "snapi"],
    run: async () => {
      const data = asRecord(
        await getJson("https://api.spaceflightnewsapi.net/v4/articles/?limit=12"),
      );
      return asArray(data?.results)
        .map((row) => {
          const a = asRecord(row);
          if (!a || !str(a.title) || !str(a.url)) return null;
          return post(str(a.title), str(a.url), 60, "Spaceflight News", str(a.published_at) || undefined);
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "FBI Wanted",
    category: "Government",
    match: ["fbi"],
    run: async () => {
      const data = asRecord(await getJson("https://api.fbi.gov/wanted/v1/list?pageSize=10"));
      return asArray(data?.items)
        .map((row) => {
          const i = asRecord(row);
          const title = str(i?.title);
          if (!title) return null;
          return post(
            `FBI Wanted: ${title}`,
            str(i?.url) || "https://www.fbi.gov/wanted",
            50,
            "FBI",
            str(i?.publication) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Disease.sh",
    category: "Health",
    match: ["disease.sh", "disease"],
    run: async () => {
      const rows = asArray(
        await getJson("https://disease.sh/v3/covid-19/countries?sort=todayCases"),
      );
      return rows
        .slice(0, PER_FEED)
        .map((row) => {
          const c = asRecord(row);
          const name = str(c?.country);
          if (!name) return null;
          const today = num(c?.todayCases);
          return post(
            `${name}: ${today} new COVID cases`,
            "https://disease.sh/",
            Math.min(100, Math.log10(today + 1) * 20),
            "Disease.sh",
          );
        })
        .filter((p): p is Post => Boolean(p));
    },
  },
  {
    name: "TheSportsDB",
    category: "Sports & Fitness",
    match: ["thesportsdb", "sportsdb"],
    run: async () => {
      const data = asRecord(
        await getJson("https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=4328"),
      );
      return asArray(data?.events)
        .map((row) => {
          const e = asRecord(row);
          const title = str(e?.strEvent);
          if (!title) return null;
          return post(
            title,
            str(e?.strVideo) || `https://www.thesportsdb.com/event/${str(e?.idEvent)}`,
            55,
            "TheSportsDB",
            str(e?.dateEvent) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "ESPN",
    category: "Sports & Fitness",
    match: ["espn"],
    run: async () => {
      const data = asRecord(
        await getJson("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"),
      );
      return asArray(data?.events)
        .map((row) => {
          const e = asRecord(row);
          const name = str(e?.name);
          if (!name) return null;
          const status = str(asRecord(asRecord(e?.status)?.type)?.description);
          return post(
            status ? `${name} (${status})` : name,
            "https://www.espn.com/nfl/scoreboard",
            58,
            "ESPN",
            str(e?.date) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "SpaceX",
    category: "Science & Math",
    match: ["spacex"],
    run: async () => {
      const rows = asArray(await getJson("https://api.spacexdata.com/v5/launches/upcoming"));
      return rows
        .slice(0, PER_FEED)
        .map((row) => {
          const l = asRecord(row);
          const name = str(l?.name);
          if (!name) return null;
          return post(
            `SpaceX: ${name}`,
            str(asRecord(l?.links)?.webcast) || "https://www.spacex.com/launches/",
            62,
            "SpaceX",
            str(l?.date_utc) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p));
    },
  },
  {
    name: "Frankfurter",
    category: "Currency Exchange",
    match: ["frankfurter"],
    run: async () => {
      const data = asRecord(await getJson("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,INR"));
      const rates = asRecord(data?.rates);
      if (!rates) return [];
      return Object.entries(rates).map(([code, value]) =>
        post(`USD/${code} ${num(value)}`, "https://www.frankfurter.app/", 35, "Frankfurter"),
      );
    },
  },
  {
    name: "CheapShark",
    category: "Shopping",
    match: ["cheapshark"],
    run: async () => {
      const rows = asArray(
        await getJson("https://www.cheapshark.com/api/1.0/deals?pageSize=10&sortBy=Deal%20Rating"),
      );
      return rows
        .map((row) => {
          const d = asRecord(row);
          const title = str(d?.title);
          if (!title) return null;
          const savings = num(d?.savings);
          const dealId = str(d?.dealID);
          return post(
            `${title} −${Math.round(savings)}%`,
            dealId
              ? `https://www.cheapshark.com/redirect?dealID=${dealId}`
              : "https://www.cheapshark.com/",
            Math.min(90, savings),
            "CheapShark",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Jikan",
    category: "Anime",
    match: ["jikan", "myanimelist"],
    run: async () => {
      const data = asRecord(await getJson("https://api.jikan.moe/v4/top/anime?filter=airing&limit=10"));
      return asArray(data?.data)
        .map((row) => {
          const a = asRecord(row);
          const name = str(a?.title);
          if (!name) return null;
          return post(
            name,
            str(a?.url) || "https://myanimelist.net/",
            Math.min(95, num(a?.score) * 10),
            "Jikan",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Carbon Intensity",
    category: "Environment",
    match: ["carbon intensity"],
    run: async () => {
      const data = asRecord(await getJson("https://api.carbonintensity.org.uk/intensity"));
      const row = asRecord(asArray(data?.data)[0]);
      const intensity = asRecord(row?.intensity);
      if (!intensity) return [];
      return [
        post(
          `UK grid ${str(intensity.index)} (${num(intensity.actual) || num(intensity.forecast)} gCO₂/kWh)`,
          "https://carbonintensity.org.uk/",
          str(intensity.index) === "high" || str(intensity.index) === "very high" ? 75 : 40,
          "Carbon Intensity",
          str(row?.from) || undefined,
        ),
      ];
    },
  },
  {
    name: "iTunes",
    category: "Music",
    match: ["itunes", "apple"],
    run: async () => {
      const data = asRecord(
        await getJson("https://rss.applemarketingtools.com/api/v2/us/music/most-played/10/songs.json"),
      );
      const feed = asRecord(data?.feed);
      return asArray(feed?.results)
        .map((row) => {
          const s = asRecord(row);
          const name = str(s?.name);
          if (!name) return null;
          return post(
            `${name} — ${str(s?.artistName)}`,
            str(s?.url) || "https://music.apple.com/",
            48,
            "iTunes",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Mastodon",
    category: "Social",
    match: ["mastodon"],
    run: async () => {
      const rows = asArray(await getJson("https://mastodon.social/api/v1/trends/tags?limit=10"));
      return rows
        .map((row) => {
          const t = asRecord(row);
          const name = str(t?.name);
          if (!name) return null;
          const uses = asArray(t?.history).reduce(
            (sum: number, h) => sum + num(asRecord(h)?.uses),
            0,
          );
          return post(
            `#${name.replace(/^#/, "")}`,
            `https://mastodon.social/tags/${encodeURIComponent(name)}`,
            Math.min(100, Math.log10(uses + 1) * 22),
            "Mastodon",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Lobsters",
    category: "Social",
    match: ["lobsters", "lobste.rs"],
    run: async () => {
      const rows = asArray(await getJson("https://lobste.rs/hottest.json"));
      return rows
        .map((row) => {
          const s = asRecord(row);
          if (!s || !str(s.title) || !str(s.url)) return null;
          return post(str(s.title), str(s.url), Math.min(100, num(s.score) * 4), "Lobsters");
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Open Food Facts",
    category: "Food & Drink",
    match: ["open food facts"],
    run: async () => {
      const data = asRecord(
        await getJson(
          "https://world.openfoodfacts.org/cgi/search.pl?action=process&sort_by=unique_scans_n&page_size=8&json=1",
        ),
      );
      return asArray(data?.products)
        .map((row) => {
          const p = asRecord(row);
          const name = str(p?.product_name);
          if (!name) return null;
          return post(
            name,
            str(p?.url) || `https://world.openfoodfacts.org/product/${str(p?.code)}`,
            Math.min(80, num(p?.unique_scans_n) / 50),
            "Open Food Facts",
          );
        })
        .filter((p): p is Post => Boolean(p))
        .slice(0, PER_FEED);
    },
  },
  {
    name: "Nager.Date",
    category: "Calendar",
    match: ["nager.date", "nager"],
    run: async () => {
      const rows = asArray(await getJson("https://date.nager.at/api/v3/NextPublicHolidaysWorldwide"));
      return rows
        .slice(0, PER_FEED)
        .map((row) => {
          const h = asRecord(row);
          const name = str(h?.name);
          if (!name) return null;
          return post(
            `${str(h?.countryCode)} holiday: ${name}`,
            "https://date.nager.at/",
            30,
            "Nager.Date",
            str(h?.date) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p));
    },
  },
  {
    name: "CISA KEV",
    category: "Security",
    match: ["cisa"],
    run: async () => {
      const data = asRecord(
        await getJson(
          "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
        ),
      );
      return asArray(data?.vulnerabilities)
        .slice(0, PER_FEED)
        .map((row) => {
          const v = asRecord(row);
          const id = str(v?.cveID);
          const name = str(v?.vulnerabilityName);
          if (!id && !name) return null;
          return post(
            `${id} ${name}`.trim(),
            id ? `https://nvd.nist.gov/vuln/detail/${id}` : "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
            72,
            "CISA",
            str(v?.dateAdded) || undefined,
          );
        })
        .filter((p): p is Post => Boolean(p));
    },
  },
];

export async function collectPublicApis(city: CityId = "all"): Promise<PublicApiCollect> {
  let catalog: PublicApiEntry[] | null = null;
  try {
    catalog = await loadPublicApiCatalog();
  } catch (err) {
    console.warn("[public-apis] catalog failed", err instanceof Error ? err.message : err);
  }

  const open = catalog?.filter((e) => noAuth(e.auth) && e.https) ?? [];
  const feeds = FEEDS.filter((f) => allowed(f, catalog));
  const settled = await Promise.allSettled(feeds.map((f) => f.run(city)));
  const posts: Post[] = [];
  const liveNames: string[] = [];
  const categories = new Set<string>();

  settled.forEach((item, i) => {
    const feed = feeds[i];
    if (item.status !== "fulfilled") {
      console.warn(`[public-apis] ${feed.name} fail`, item.reason);
      return;
    }
    if (!item.value.length) return;
    liveNames.push(feed.name);
    categories.add(feed.category);
    posts.push(...item.value.slice(0, PER_FEED));
  });

  const ingest: PublicApiIngest = {
    catalog: catalog?.length ?? 0,
    live: liveNames.length,
    attempted: feeds.length,
    categories: [...categories],
    sources: liveNames,
  };
  console.log(
    `[public-apis] catalog=${ingest.catalog} open=${open.length} live=${ingest.live}/${ingest.attempted} posts=${posts.length}`,
  );
  return { posts: posts.slice(0, MAX_POSTS), ingest };
}
