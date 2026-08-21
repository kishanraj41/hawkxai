import type { Metadata } from "next";
import { FootprintDesk } from "@/components/HawkxAIApp";

export const metadata: Metadata = {
  title: "HawkxAI · Footprint",
  description: "Look up a campaign or phrase. See its footprint on the internet.",
};

export default function FootprintPage() {
  return <FootprintDesk />;
}
