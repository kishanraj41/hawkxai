import type { Metadata } from "next";
import ArchitectureDesk from "@/components/architecture/ArchitectureDesk";

export const metadata: Metadata = {
  title: "HawkxAI · Architecture",
  description: "Vercel, Cloud SQL, and the collect-then-predict path.",
};

export default function ArchitecturePage() {
  return <ArchitectureDesk />;
}
