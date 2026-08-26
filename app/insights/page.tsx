import type { Metadata } from "next";
import InsightsDesk from "@/components/insights/InsightsDesk";

export const metadata: Metadata = {
  title: "HawkxAI · Insights",
  description: "Look up a campaign or product. Live occurrence and receipts fill the board.",
};

export default function InsightsPage() {
  return <InsightsDesk />;
}
