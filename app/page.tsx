"use client";

import dynamic from "next/dynamic";

const TrendMap = dynamic(() => import("@/components/TrendMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-zinc-500">
      drawing map…
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex h-screen flex-col bg-[#0a0e14] text-zinc-200">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4 text-sm">
        <span className="tracking-[0.2em] text-zinc-100">PULSEMAP</span>
        <span className="text-zinc-500">click a circle to zoom</span>
      </header>
      <div className="min-h-0 flex-1">
        <TrendMap />
      </div>
    </main>
  );
}
