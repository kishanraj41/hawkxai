"use client";

const STEPS = [
  "Plug a name you own",
  "Click a window on occurrence",
  "Copy / Save the brief — receipts only",
] as const;

export default function DemoWalk() {
  return (
    <ol className="demo-walk" aria-label="Funder walkthrough">
      {STEPS.map((step, i) => (
        <li key={step} className="demo-walk__step">
          <span className="demo-walk__n">{i + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
