"use client";

import type { ReactNode } from "react";
import { MermaidDiagram } from "@/components/architecture/MermaidDiagram";
import { ARCHITECTURE_SECTIONS } from "@/lib/architecture-diagrams";

function ArchitectureFrame({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12">
      {children}
    </main>
  );
}

function ArchitectureHeader() {
  return (
    <header className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--mute)]">HawkxAI</p>
      <h1 className="text-2xl font-medium text-[var(--ink)]">Runtime architecture</h1>
      <p className="max-w-2xl text-sm leading-6 text-[var(--mute-strong)]">
        Next.js 14 on Vercel <code className="text-[var(--ink)]">iad1</code>, Cloud SQL
        Postgres in <code className="text-[var(--ink)]">us-east4</code>, ten category
        databases. Hobby egress is temporarily allowed from any IP; replace that with
        Static IPs later.
      </p>
    </header>
  );
}

function ArchitectureSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-[var(--ink)]">{title}</h2>
        <p className="text-sm leading-6 text-[var(--mute-strong)]">{caption}</p>
      </div>
      {children}
    </section>
  );
}

export default function ArchitectureDesk() {
  return (
    <ArchitectureFrame>
      <ArchitectureHeader />
      {ARCHITECTURE_SECTIONS.map((section) => (
        <ArchitectureSection key={section.id} title={section.title} caption={section.caption}>
          <MermaidDiagram chart={section.chart} />
        </ArchitectureSection>
      ))}
    </ArchitectureFrame>
  );
}
