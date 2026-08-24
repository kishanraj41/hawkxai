import { CATEGORY_LABEL, classifyTopic } from "./desk";
import { totalScore } from "./metrics";
import type {
  BoosterTopicBrief,
  DeskCategory,
  LeafForecast,
  MindGraph,
  MindLink,
  MindNode,
  Topic,
} from "./types";

const MAX_TOPICS = 12;
const MAX_LEAVES = 4;

export function buildMindMap(
  topics: Topic[],
  briefs: BoosterTopicBrief[] = [],
  category: DeskCategory = "all",
  hub?: { label: string; detail?: string },
  forecasts: LeafForecast[] = [],
): MindGraph {
  const briefById = new Map(briefs.map((b) => [b.topicId, b]));
  const scoped =
    category === "all"
      ? topics
      : topics.filter((t) => {
          const brief = briefById.get(t.id);
          return (brief?.category ?? classifyTopic(t, brief?.artifacts ?? [])) === category;
        });
  const ranked = [...scoped].toSorted((a, b) => totalScore(b) - totalScore(a)).slice(0, MAX_TOPICS);

  const hubId = hub ? "hub:phrase" : `hub:${category}`;
  const nodes: MindNode[] = [
    {
      id: hubId,
      kind: "hub",
      label: hub?.label ?? CATEGORY_LABEL[category],
      weight: ranked.length,
      detail: hub?.detail ?? `${ranked.length} prints in this plug`,
    },
  ];
  const links: MindLink[] = [];
  const artifactIndex = new Map<string, string[]>();

  for (const topic of ranked) {
    const topicId = `topic:${topic.id}`;
    const brief = briefById.get(topic.id);
    const cat = brief?.category ?? classifyTopic(topic, brief?.artifacts ?? []);
    nodes.push({
      id: topicId,
      kind: "topic",
      label: topic.label.slice(0, 42),
      topicId: topic.id,
      weight: Math.max(8, totalScore(topic)),
      detail: `${topic.velocity} · ${cat}`,
    });
    links.push({ source: hubId, target: topicId, kind: "branch" });

    const leaves: MindNode[] = [];
    const artifacts = (brief?.artifacts ?? []).slice(0, 3);
    for (const art of artifacts) {
      const key = `${art.kind}:${art.value.toLowerCase()}`;
      const ids = artifactIndex.get(key) ?? [];
      ids.push(topic.id);
      artifactIndex.set(key, ids);
      leaves.push({
        id: `${topicId}:art:${key}`,
        kind: "artifact",
        label: art.value.slice(0, 28),
        topicId: topic.id,
        weight: art.mentions,
        detail: `${art.kind} · ${art.mentions} mention${art.mentions === 1 ? "" : "s"}`,
        artifactKind: art.kind,
      });
    }

    const first = brief?.causation.firstPlatform;
    if (first) {
      leaves.push({
        id: `${topicId}:src:${first}`,
        kind: "source",
        label: `first ${first}`,
        topicId: topic.id,
        weight: 10,
        detail: brief?.causation.firstAt ?? "first print",
      });
    }

    const driver = brief?.causation.drivers[0];
    if (driver && leaves.length < MAX_LEAVES) {
      leaves.push({
        id: `${topicId}:drv:${driver.id}`,
        kind: "driver",
        label: driver.label.slice(0, 28),
        topicId: topic.id,
        weight: driver.weight,
        detail: driver.evidence,
      });
    }

    for (const leaf of leaves.slice(0, MAX_LEAVES)) {
      nodes.push(leaf);
      links.push({ source: topicId, target: leaf.id, kind: "branch" });
    }
  }

  let bridges = 0;
  for (const [key, topicIds] of artifactIndex) {
    const unique = [...new Set(topicIds)];
    if (unique.length < 2) continue;
    const label = key.split(":").slice(1).join(":") || key;
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        links.push({
          source: `topic:${unique[i]}`,
          target: `topic:${unique[j]}`,
          kind: "shared",
          label,
        });
        bridges += 1;
      }
    }
  }

  const forecastById = new Map(forecasts.map((f) => [f.leafId, f]));
  for (const node of nodes) {
    const forecast = forecastById.get(node.id);
    if (forecast) node.forecast = forecast;
  }

  return { hubId, nodes, links, bridges };
}

export function leavesOf(graph: MindGraph, topicId: string): MindNode[] {
  return graph.nodes.filter((n) => n.topicId === topicId && n.kind !== "topic");
}

/** Amber-dash neighbors only. Never invents a bridge. */
export function sharedWith(
  graph: MindGraph,
  topicId: string,
): { topicId: string; via: string }[] {
  const prefix = `topic:${topicId}`;
  const out: { topicId: string; via: string }[] = [];
  for (const link of graph.links) {
    if (link.kind !== "shared") continue;
    const via = link.label ?? "shared artifact";
    if (link.source === prefix) out.push({ topicId: link.target.replace(/^topic:/, ""), via });
    if (link.target === prefix) out.push({ topicId: link.source.replace(/^topic:/, ""), via });
  }
  return out;
}
