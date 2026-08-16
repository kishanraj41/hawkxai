import { leavesOf, sharedWith } from "@/lib/mindmap";
import { topPosts, VELOCITY_MARK } from "@/lib/ui-helpers";
import type { BoosterTopicBrief, MindGraph, MindNode, Topic } from "@/lib/types";

interface MindInspectProps {
  node: MindNode;
  graph: MindGraph;
  topics: Topic[];
  brief?: BoosterTopicBrief;
  onClose: () => void;
  onPick: (topic: Topic) => void;
}

const KIND: Record<MindNode["kind"], string> = {
  hub: "Plug",
  topic: "Name",
  artifact: "Artifact",
  driver: "Measured driver",
  source: "First print",
};

export default function MindInspect({
  node,
  graph,
  topics,
  brief,
  onClose,
  onPick,
}: MindInspectProps) {
  const topic = topics.find((t) => t.id === node.topicId) ?? null;
  const leaves = topic ? leavesOf(graph, topic.id) : [];
  const bridges = topic ? sharedWith(graph, topic.id) : [];
  const receipts = topic ? topPosts(topic, 5) : [];
  const labelById = new Map(topics.map((t) => [t.id, t.label]));

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-y-auto border-t border-white/8 bg-[var(--panel-strong)] p-4 max-md:absolute max-md:inset-0 max-md:z-20 max-md:border-t-0 md:relative md:w-[300px] md:border-l md:border-t-0 md:bg-transparent">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="signal-label">{KIND[node.kind]}</p>
          <h2 className="mt-1 text-sm font-medium leading-snug tracking-tight">{node.label}</h2>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost">
          Close
        </button>
      </div>

      {node.detail ? (
        <p className="mt-3 text-[12px] leading-relaxed text-white/70">{node.detail}</p>
      ) : null}

      {topic ? (
        <p className="signal-label mt-4">
          {VELOCITY_MARK[topic.velocity]} {topic.velocity}
          {brief ? ` · ${brief.category}` : ""}
        </p>
      ) : null}

      {leaves.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {leaves.map((leaf) => (
            <li key={leaf.id}>
              <p className="signal-label">{KIND[leaf.kind]}</p>
              <p className="mt-0.5 text-[12px] text-white/85">{leaf.label}</p>
              {leaf.detail ? (
                <p className="mt-0.5 font-mono text-[10px] text-white/45">{leaf.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {bridges.length > 0 ? (
        <div className="mt-4">
          <p className="signal-label">Shared artifacts</p>
          <ul className="mt-2 space-y-1">
            {bridges.map((b) => {
              const neighbor = topics.find((t) => t.id === b.topicId);
              return (
                <li key={`${b.topicId}:${b.via}`}>
                  <button
                    type="button"
                    disabled={!neighbor}
                    onClick={() => neighbor && onPick(neighbor)}
                    className="text-left text-[12px] text-[#e8a23a] hover:underline disabled:text-white/45"
                  >
                    {labelById.get(b.topicId) ?? b.topicId}
                  </button>
                  <span className="ml-2 font-mono text-[10px] text-white/45">{b.via}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : node.kind !== "hub" ? (
        <p className="signal-label mt-4">No shared artifact on two names — no invented bridge.</p>
      ) : null}

      {receipts.length > 0 ? (
        <div className="mt-4">
          <p className="signal-label">Receipts</p>
          <ul className="mt-2 space-y-2">
            {receipts.map((post) => (
              <li key={post.url}>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] leading-snug text-white/85 hover:underline"
                >
                  {post.title}
                </a>
                <p className="signal-label mt-0.5">
                  {post.platform}
                  {post.sourceApi ? ` · ${post.sourceApi}` : ""} · {post.score}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {brief?.sentiment ? (
        <p className="signal-label mt-4">
          Titles {brief.sentiment.lean}
          {brief.sentiment.thin ? " — thin, not a story" : ""}
          {` · ${brief.sentiment.overall.pos} pos / ${brief.sentiment.overall.neg} neg / n=${brief.sentiment.overall.n}`}
        </p>
      ) : null}

      <p className="signal-label mt-4">Evidence only. Nothing here is an invented cause.</p>
    </aside>
  );
}
