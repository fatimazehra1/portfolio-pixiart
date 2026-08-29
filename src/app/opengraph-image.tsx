import { ImageResponse } from "next/og";
import { PROFILE, STACK_COUNT } from "@/data/chapters";

/**
 * The card a link to this site unfurls into.
 *
 * Rendered rather than shipped as a PNG so it cannot drift from the content —
 * it reads the same `PROFILE` the sidebar and the resume do — and generated at
 * build time, since the route is static.
 *
 * Deliberately not a screenshot of the map: a shrunk pixel-art scene at
 * thumbnail size in a feed is mud, and the words are what a reader is deciding
 * on. The sky is the map's own gradient, so it is still recognisably this site.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${PROFILE.name} — ${PROFILE.tagline}`;

export default function OpengraphImage() {
  // Satori, which renders this, requires an explicit `display` on any element
  // holding more than one child — so every line below is a single string.
  const stats = PROFILE.stats
    .map((stat) => `${stat.value} ${stat.label.toLowerCase()}`)
    .concat(`${STACK_COUNT} technologies`)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(160deg, #a88bb0, #e3b79c 45%, #faeacf)",
          color: "#2b2130",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 4, opacity: 0.6 }}>
          A CAREER, AS A UNIVERSE
        </div>
        <div style={{ fontSize: 86, fontWeight: 700, marginTop: 16 }}>{PROFILE.name}</div>
        <div style={{ fontSize: 38, marginTop: 20, opacity: 0.75, maxWidth: 900 }}>
          {PROFILE.tagline}
        </div>
        <div style={{ fontSize: 28, marginTop: 44, opacity: 0.6 }}>
          {stats}
        </div>
      </div>
    ),
    size
  );
}
