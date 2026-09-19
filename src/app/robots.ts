import type { MetadataRoute } from "next";
import { SITE } from "@/data/chapters";

/**
 * Everything is crawlable.
 *
 * There is nothing here to hide and one thing to be careful about: `/resume`
 * must never be excluded. It is where the career is written in text, and the
 * map at `/` is a canvas a crawler cannot read.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    // The guestbook admin is private; the API is not a page.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/guestbook/", "/api/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
