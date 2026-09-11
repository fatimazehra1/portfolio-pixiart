import type { MetadataRoute } from "next";
import { SITE } from "@/data/chapters";

/**
 * Five pages, and they are genuinely the only five.
 *
 * Every chapter lives inside the map at `/` rather than at a URL of its own,
 * so listing nine chapter routes would be listing nine 404s. The four written
 * pages carry the priority, because they are the ones with text on them: the
 * map is a canvas a crawler cannot read.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number) => ({
    url: `${SITE.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority,
  });

  return [
    { url: SITE.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    page("/resume", 0.9),
    page("/projects", 0.9),
    page("/what-i-build", 0.8),
    page("/about", 0.8),
  ];
}
