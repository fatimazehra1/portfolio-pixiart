"use client";

import Link from "next/link";
import { PROFILE } from "@/data/chapters";

/**
 * The way out of the map and into the document.
 *
 * Persistent on purpose — it is on screen on the hub and inside a world, at
 * every zoom, because the one visitor who cannot afford to explore is exactly
 * the one who most needs to find this. Bottom right, small, and out of the
 * way of the sidebar (left) and the scene panel (top right).
 *
 * It does not place itself: `WorldStage` puts it in the bottom-right cluster
 * alongside the speaker, so the two cannot drift apart or overlap.
 */
export default function ResumeLink() {
  return (
    <Link
      href="/resume"
      prefetch
      className="ui-panel ui-button font-display flex items-center px-3 py-2 text-[0.875rem] tracking-wide transition-colors"
      style={{ color: "var(--ui-text)" }}
      aria-label={`Read the full resume of ${PROFILE.name}`}
    >
      Resume
    </Link>
  );
}
