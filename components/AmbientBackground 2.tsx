export default function AmbientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#07080b]" />
      <div className="absolute inset-0 opacity-40 signal-void" />
    </div>
  );
}
