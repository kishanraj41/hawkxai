import { NextRequest, NextResponse } from "next/server";
import { validatorAgent } from "@/lib/agents";
import { plugTopicFromPosts } from "@/lib/cluster";
import { inferQueryIntent, toQueryInsight } from "@/lib/query";
import { buildSentiment } from "@/lib/sentiment";
import type { Post, TrendsPayload } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type FleetSnap = {
  phrase?: string;
  channels?: string[];
  tools?: string[];
  count?: number;
  posts?: unknown[];
  uri?: string;
  note?: string;
  agent?: string;
};

function asPost(raw: unknown): Post | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const platform = p.platform;
  if (platform !== "hn" && platform !== "public" && platform !== "reddit" && platform !== "x") {
    return null;
  }
  const title = String(p.title ?? "").trim();
  const url = String(p.url ?? "").trim();
  if (!title || !url) return null;
  const post: Post = {
    platform,
    title,
    url,
    score: Number(p.score) || 0,
    createdAt: String(p.createdAt ?? ""),
  };
  const parsed = Date.parse(post.createdAt);
  if (Number.isNaN(parsed)) post.createdAt = "";
  else post.createdAt = new Date(parsed).toISOString();
  if (typeof p.sourceApi === "string" && p.sourceApi) post.sourceApi = p.sourceApi;
  if (typeof p.tool === "string" && p.tool) post.tool = p.tool;
  if (typeof p.collectedAt === "string" && p.collectedAt) post.collectedAt = p.collectedAt;
  return post;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { phrase?: string };
  const phrase = (body.phrase ?? "").trim();
  if (phrase.length < 2) {
    return NextResponse.json({ error: "phrase too short" }, { status: 400 });
  }

  const fleetUrl = (process.env.FLEET_URL ?? "").replace(/\/$/, "");
  if (!fleetUrl) {
    return NextResponse.json(
      { error: "FLEET_URL missing — Footprint ingest needs the Cloud Run fleet" },
      { status: 503 },
    );
  }

  const upstream = await fetch(`${fleetUrl}/v1/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phrase }),
  });
  const raw = await upstream.text();
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `fleet ingest failed (${upstream.status})`, detail: raw.slice(0, 800) },
      { status: 502 },
    );
  }

  let snap: FleetSnap;
  try {
    snap = JSON.parse(raw) as FleetSnap;
  } catch {
    return NextResponse.json({ error: "fleet returned non-JSON" }, { status: 502 });
  }

  const posts = (snap.posts ?? []).map(asPost).filter((p): p is Post => Boolean(p));
  const intent = inferQueryIntent(phrase);
  const clustered = plugTopicFromPosts(phrase, posts, intent);
  const validated = validatorAgent(clustered);
  const lead = validated.topics[0] ?? null;
  const sentiment = lead ? buildSentiment(lead) : null;

  const hn = posts.filter((p) => p.platform === "hn");
  const pub = posts.filter((p) => p.platform === "public");
  const sources = { x: false, reddit: false, hn: hn.length > 0, public: pub.length > 0 };
  const degraded: string[] = [];
  if (!sources.hn) degraded.push("hn offline");
  if (!sources.public) degraded.push("public offline");

  const apis = [...new Set(pub.map((p) => p.sourceApi).filter((n): n is string => Boolean(n)))];
  const payload: TrendsPayload = {
    topics: validated.topics,
    updatedAt: new Date().toISOString(),
    sources,
    degraded,
    pipeline: `fleet ADK ${snap.agent ?? "hawkxai_ingest"} → ${(snap.tools ?? []).join(",")} → ${snap.uri ?? "snapshot"} → ${validated.log}`,
    publicApis: {
      catalog: 3,
      live: apis.length,
      attempted: 3,
      categories: ["Reference", "News", "Vehicle"],
      sources: apis,
      topic: phrase,
    },
    plugged: phrase,
    query: toQueryInsight(intent, validated.topics, sentiment),
  };

  return NextResponse.json(payload);
}
