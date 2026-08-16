import type { Metadata } from "next";
import ResearchDesk from "@/components/research/ResearchDesk";

export const metadata: Metadata = {
  title: "HawkAI · Research",
  description: "Deep topic research across Wikipedia, the open web, HN, Reddit, and X.",
};

export default function ResearchPage() {
  return <ResearchDesk />;
}
