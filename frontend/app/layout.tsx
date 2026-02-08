import './globals.css'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaps.ai - Privacy-First LLM Gateway",
  description: "Stop sending customer secrets to AI companies. Automatic PII protection for all LLM calls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased selection:bg-cyan-500/30 selection:text-cyan-200">{children}</body>
    </html>
  );
}
