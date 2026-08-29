import type { Metadata } from "next";
import { Inter, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { PROFILE } from "@/data/chapters";

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

const TITLE = `${PROFILE.name} — a career, as a universe`;
const DESCRIPTION = `${PROFILE.tagline} An interactive career universe: every chapter is its own pixel-art world, explored by zooming in from a map of them all. The full resume is one click away.`;

/**
 * `metadataBase` resolves the relative URLs Next generates for the icon and the
 * OG image into the absolute ones crawlers require. Set NEXT_PUBLIC_SITE_URL at
 * deploy time; the localhost fallback keeps development honest rather than
 * silently pointing previews at a domain that is not serving them.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [{ name: PROFILE.name }],
  keywords: [
    "full-stack developer",
    "Laravel",
    "Vue",
    "Next.js",
    "Java",
    "portfolio",
    PROFILE.name,
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
