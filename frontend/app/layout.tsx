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
      <body>{children}</body>
    </html>
  );
}
