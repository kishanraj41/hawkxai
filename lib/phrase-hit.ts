function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `needle` is a whole token in `hay` — Camry ≠ camryn, ≠ camera. */
export function tokenHits(hay: string, needle: string): boolean {
  const n = needle.trim();
  if (n.length < 2) return false;
  if (n.startsWith("#") || n.startsWith("$")) {
    return hay.toLowerCase().includes(n.toLowerCase());
  }
  const inner = escapeRe(n).replace(/\s+/g, "[\\s_-]+");
  return new RegExp(`(?:^|[^a-z0-9])${inner}(?:[^a-z0-9]|$)`, "i").test(hay);
}
