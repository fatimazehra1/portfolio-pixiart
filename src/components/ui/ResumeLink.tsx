"use client";

import Link from "next/link";

/**
 * The way out of the map and into the document.
 *
 * Persistent on purpose — it is on screen on the hub and inside a world, at
 * every zoom, because the one visitor who cannot afford to explore is exactly
 * the one who most needs to find this. Bottom right, small, and out of the
 * way of the sidebar (left) and the scene panel (top right).
 */
export default function ResumeLink() {
  return (
    <Link
      href="/resume"
      prefetch
      className="ui-panel absolute right-5 bottom-5 flex items-center gap-2 px-3 py-2 font-sans text-[0.8125rem] font-medium transition-colors hover:bg-white/8"
      style={{ color: "var(--ui-text)" }}
    >
      <span aria-hidden>📄</span>
      <span>Resume</span>
    </Link>
  );
}
