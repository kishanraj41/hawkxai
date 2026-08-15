export default function AmbientBackground() {
  return (
    <div className="signal-void pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-[12%] top-[18%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,178,77,0.12),transparent_68%)] blur-2xl" />
      <div className="absolute -right-[8%] bottom-[8%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.08),transparent_70%)] blur-2xl" />
      <div className="absolute left-1/2 top-[58%] h-[240px] w-[80%] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(255,122,24,0.07),transparent_70%)] blur-3xl" />
    </div>
  );
}
