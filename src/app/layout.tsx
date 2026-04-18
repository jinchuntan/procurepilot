import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProcurePilot",
  description:
    "ProcurePilot is an AI-powered crisis-aware procurement copilot for SMEs sourcing under disruption.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-[family-name:var(--font-sans)] text-slate-950">{children}</body>
    </html>
  );
}
