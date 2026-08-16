export default function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[var(--void)]" />
      <div className="absolute inset-0 opacity-[0.55] signal-void" />
      <div className="ambient-wash" />
      <div className="ambient-vignette" />
    </div>
  );
}
