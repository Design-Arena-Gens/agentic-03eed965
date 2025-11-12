import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseCut Studio",
  description:
    "AI-assisted editor that sculpts compelling 60-second videos with smart pacing and cinematic polish."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
