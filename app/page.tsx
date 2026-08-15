export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#0a0e14] text-zinc-200">
      <header className="flex h-12 items-center justify-between border-b border-white/10 px-4 text-sm">
        <span className="tracking-[0.2em] text-zinc-100">PULSEMAP</span>
        <span className="text-zinc-500">live signals loading…</span>
      </header>
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Map mounts next. Backend: GET /api/trends
      </div>
    </main>
  );
}
