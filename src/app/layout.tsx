import type { Metadata } from "next";
import { Inter, Pixelify_Sans } from "next/font/google";
import "./globals.css";

// DESIGN.md §Fonts — Pixelify Sans for titles/dialogue, Inter for descriptions.
const pixelify = Pixelify_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Waterfront — Fatima Shakeel",
  description:
    "An interactive pixel-art harbor telling the story of Fatima's software engineering journey. Each building is a chapter.",
  openGraph: {
    title: "The Waterfront — Fatima Shakeel",
    description:
      "An interactive pixel-art portfolio. Explore the harbor, or head straight to the resume.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pixelify.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
