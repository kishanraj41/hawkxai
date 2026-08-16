import { NextRequest, NextResponse } from "next/server";
import { banditSnapshot, recordReward } from "@/lib/rl";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ arms: banditSnapshot() });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    feed?: string;
    feeds?: string[];
    reward?: number;
  };
  const names = [
    ...(body.feed ? [body.feed] : []),
    ...(Array.isArray(body.feeds) ? body.feeds : []),
  ]
    .map((n) => n.trim())
    .filter(Boolean);
  if (!names.length) {
    return NextResponse.json({ error: "feed or feeds required" }, { status: 400 });
  }
  const reward = typeof body.reward === "number" ? body.reward : 1;
  const arms = names.map((name) => recordReward(name, reward));
  return NextResponse.json({ arms });
}
