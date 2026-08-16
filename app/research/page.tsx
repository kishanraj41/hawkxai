import type { Metadata } from "next";
import ResearchDesk from "@/components/research/ResearchDesk";

export const metadata: Metadata = {
  title: "HawkAI · Research",
  description: "Deep topic research across Wikipedia, PubMed, arXiv, USPTO, web, HN, Reddit, and X.",
};

export default function ResearchPage() {
  return <ResearchDesk />;
}
