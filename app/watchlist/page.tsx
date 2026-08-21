import type { Metadata } from "next";
import WatchlistDesk from "@/components/watchlist/WatchlistDesk";

export const metadata: Metadata = {
  title: "HawkxAI · Watch",
  description: "Companies and campaigns you track, scored against public tape.",
};

export default function WatchlistPage() {
  return <WatchlistDesk />;
}
