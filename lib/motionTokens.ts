export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
    zoom: 0.65,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24,
  },
  stagger: 0.06,
} as const;

export function motionDuration(base: number): number {
  if (typeof window === "undefined") return base;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return 0.01;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowEnd =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    (nav.deviceMemory === undefined && nav.hardwareConcurrency <= 4);
  return lowEnd ? Math.min(base, 0.22) : base;
}
