import type { Metadata } from "next";
import { Inter, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { PROFILE, SITE } from "@/data/chapters";

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

/**
 * Site metadata.
 *
 * One positioning, stated once in `SITE` and used by the tab, the search
 * result, the link preview, the sitemap and the robots file — a title that
 * says the role before the poetry, and a description under the ~155 characters
 * Google renders. The interactive map is the portfolio; `/resume` is the page
 * that will actually rank, and it carries its own title, description and
 * Person schema.
 *
 * `metadataBase` resolves the relative URLs below into the absolute ones
 * crawlers require. Set NEXT_PUBLIC_SITE_URL at deploy time; the localhost
 * fallback keeps development honest rather than silently pointing previews at
 * a domain that is not serving them.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.title,
  description: SITE.description,
  applicationName: SITE.title,
  authors: [{ name: PROFILE.name }],
  creator: PROFILE.name,
  keywords: [...SITE.keywords],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    siteName: `${PROFILE.name} — ${PROFILE.jobTitle}`,
    url: "/",
    type: "profile",
    locale: "en_GB",
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        // The preview is the hub itself, so the alt text describes what a
        // reader would see if the image loaded — not the page it links to.
        alt: `The interactive career map of ${PROFILE.name}: pixel-art islands, one per role, from Aptech through Planet01, Vaultsys and NatureTech.`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
    images: [SITE.ogImage],
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
