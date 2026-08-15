export default function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <div className="absolute -left-[12%] top-[18%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,178,77,0.16),transparent_68%)] blur-2xl" />
      <div className="absolute -right-[8%] bottom-[8%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] blur-2xl" />
    </div>
  );
}
