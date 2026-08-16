"use client";

interface EmptyStageProps {
  eyebrow: string;
  title: string;
  copy: string;
  shortcut?: string;
  primaryLabel: string;
  onPrimary: () => void;
  suggestions: { id: string; label: string }[];
  onSuggest: (label: string) => void;
}

export default function EmptyStage({
  eyebrow,
  title,
  copy,
  shortcut = "⌘K",
  primaryLabel,
  onPrimary,
  suggestions,
  onSuggest,
}: EmptyStageProps) {
  return (
    <section className="empty-stage">
      <div className="empty-stage__head">
        <div>
          <p className="empty-stage__eyebrow">{eyebrow}</p>
          <p className="mt-1 text-xs text-white/45">Receipts only — never an invented WHY.</p>
        </div>
        <p className="desk-shortcut font-mono text-[11px] tabular-nums text-white/40">{shortcut}</p>
      </div>
      <div className="empty-stage__body">
        <h1 className="empty-stage__title">{title}</h1>
        <p className="empty-stage__copy">{copy}</p>
        <div className="empty-stage__actions">
          <button type="button" onClick={onPrimary} className="btn-primary">
            {primaryLabel}
          </button>
        </div>
        <div className="empty-stage__actions">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSuggest(s.label)}
              className="empty-stage__chip"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
