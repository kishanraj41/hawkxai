import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "HAWKAI — Live trend intelligence",
  description: "Live cross-platform trend intelligence map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} min-h-screen bg-[#0a0a0a] font-sans antialiased text-white`}>
        {children}
      </body>
    </html>
  );
}
