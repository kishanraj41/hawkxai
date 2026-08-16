"use client";

import type { ReactNode } from "react";

export type DeskId = "trends" | "footprint" | "research";

const DESKS: { id: DeskId; href: string; label: string }[] = [
  { id: "trends", href: "/", label: "Trends" },
  { id: "footprint", href: "/footprint", label: "Footprint" },
  { id: "research", href: "/research", label: "Research" },
];

export function goHome() {
  window.location.assign("/");
}

export function HomeMark() {
  return (
    <a
      href="/"
      aria-label="hawkai home"
      className="group flex shrink-0 items-center gap-2.5"
      onClick={(e) => {
        e.preventDefault();
        goHome();
      }}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/12 bg-white/[0.03] text-white/90 transition-colors duration-150 group-hover:border-white/25 group-hover:text-white">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <polygon
            points="8,1.5 14.5,5 14.5,11 8,14.5 1.5,11 1.5,5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-[15px] font-medium tracking-[-0.02em] text-white">hawkai</span>
        <span className="signal-live" aria-label="Live" />
      </span>
    </a>
  );
}

export function DeskNav({ active }: { active: DeskId }) {
  return (
    <nav className="desk-nav" aria-label="Desks">
      {DESKS.map((desk) => {
        const isActive = desk.id === active;
        if (isActive) {
          return (
            <span key={desk.id} className="desk-nav__item desk-nav__item--active" aria-current="page">
              {desk.label}
            </span>
          );
        }
        return (
          <a
            key={desk.id}
            href={desk.href}
            className="desk-nav__item"
            onClick={
              desk.id === "trends"
                ? (e) => {
                    e.preventDefault();
                    goHome();
                  }
                : undefined
            }
          >
            {desk.label}
          </a>
        );
      })}
    </nav>
  );
}

export function StatusChip({ children }: { children: ReactNode }) {
  return <span className="status-chip">{children}</span>;
}

export function SegmentControl({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="segment" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={`segment__item ${value === opt.id ? "segment__item--active" : ""}`}
        >
          {opt.label}
          {opt.hint ? <kbd className="segment__kbd">{opt.hint}</kbd> : null}
        </button>
      ))}
    </div>
  );
}

export function DeskFrame({
  children,
  toolbar,
  context,
}: {
  children: ReactNode;
  toolbar?: ReactNode;
  context?: ReactNode;
}) {
  return (
    <header className="desk-chrome no-print">
      <div className="desk-chrome__bar">{children}</div>
      {toolbar ? <div className="desk-chrome__toolbar">{toolbar}</div> : null}
      {context ? <div className="desk-chrome__context">{context}</div> : null}
    </header>
  );
}

export function DeskShell({ children }: { children: ReactNode }) {
  return <main className="desk-shell">{children}</main>;
}

export function PrimaryButton({
  children,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} disabled={disabled} className="btn-primary">
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className="btn-ghost">
      {children}
    </button>
  );
}

export function FieldSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field-select">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="field-select__control"
      >
        {children}
      </select>
    </label>
  );
}
