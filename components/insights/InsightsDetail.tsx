"use client";

import { divergenceLabel, PLATFORM_LABEL, totalScore, VELOCITY_MARK } from "@/lib/ui-helpers";
import { leadTopic, topicPosts } from "@/lib/watchlist-lookup";
import type { TrendsPayload } from "@/lib/types";

export default function InsightsDetail({ payload }: { payload: TrendsPayload | null }) {
  const lead = leadTopic(payload);
  const posts = topicPosts(lead).slice(0, 8);
  const query = payload?.query ?? null;

  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="signal-label text-center">
          Live facts land here after lookup. Never invented spend.
        </p>
      </div>
    );
  }

  const score = Math.round(totalScore(lead));

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <p className="text-sm font-medium tracking-tight">{lead.label}</p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-white/45">
          {VELOCITY_MARK[lead.velocity]} {lead.velocity}
          {" · "}
          {divergenceLabel(lead)}
          {" · "}
          score {score}
          {query ? ` · ${query.kind}` : ""}
        </p>
      </div>

      {query?.floor ? (
        <p className="text-[12px] leading-relaxed text-white/75">{query.floor}</p>
      ) : (
        <p className="text-[12px] text-white/50">
          Thin tape. Facts stay on receipts — no invented dollar impact.
        </p>
      )}

      {payload?.degraded.length ? (
        <ul className="space-y-1">
          {payload.degraded.map((msg) => (
            <li key={msg} className="signal-label">
              {msg}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="signal-label">Receipts · {posts.length}</p>
        {posts.length === 0 ? (
          <p className="mt-1 text-[12px] text-white/50">No dated receipts yet.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {posts.map((p) => (
              <li key={`${p.url}-${p.createdAt}`}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-md px-1 py-1 hover:bg-white/[0.04]"
                >
                  <span className="line-clamp-2 text-[12px] leading-snug text-white/88">{p.title}</span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-white/40">
                    {PLATFORM_LABEL[p.platform]}
                    {p.sourceApi ? ` · ${p.sourceApi}` : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
