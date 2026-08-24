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
  title: "Fatima Shakeel — a career, as a universe",
  description:
    "An interactive career universe: each chapter of Fatima's software engineering journey is its own small pixel-art world, explored by zooming in from a map of them all.",
  openGraph: {
    title: "Fatima Shakeel — a career, as a universe",
    description:
      "An interactive career universe. Explore the worlds, or head straight to the resume.",
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
