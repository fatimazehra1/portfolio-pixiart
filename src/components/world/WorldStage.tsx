"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChapterOverlay from "@/components/ui/ChapterOverlay";
import Sidebar from "@/components/ui/Sidebar";
import ResumeLink from "@/components/ui/ResumeLink";
import WorldControls from "@/components/ui/WorldControls";

// The Pixi world is client-only (WebGL/DOM). Dynamic + ssr:false must live inside
// a Client Component in the App Router — hence this boundary.
const PixiCanvas = dynamic(() => import("@/components/world/PixiCanvas"), {
  ssr: false,
});

/**
 * The two layers, composed.
 *
 * The pixel universe underneath and the modern interface over it — the split
 * DESIGN.md §UI Style draws, made real by this file being the only place the
 * two meet. Nothing in `ui/` imports Pixi and nothing in `engine/` imports
 * React; they are joined here and through `worldHandle`.
 *
 * `.ui-layer` makes the overlay transparent to the pointer so the canvas keeps
 * receiving drags and wheels everywhere except on an actual panel — the map has
 * to stay draggable through the gaps between the cards.
 */
/**
 * Below this width the canvas is not the experience — it is a slideshow of a
 * map you cannot pan on a device that will not thank you for a WebGL context.
 * The resume says the same things and says them instantly, so a narrow
 * viewport goes there instead.
 */
const MOBILE_WIDTH = 768;

export default function WorldStage() {
  const router = useRouter();
  // Rendered nothing until the width is known: mounting the canvas and then
  // redirecting would pay for the whole engine on exactly the devices this
  // check exists to spare.
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_WIDTH - 1}px)`);
    const decide = () => {
      if (query.matches) router.replace("/resume");
      else setWide(true);
    };
    decide();
    // A window dragged narrow mid-visit is the same visitor on the same page,
    // so it gets the same answer rather than a canvas it can no longer use.
    query.addEventListener("change", decide);
    return () => query.removeEventListener("change", decide);
  }, [router]);

  if (!wide) return null;

  return (
    <>
      <PixiCanvas />
      <div className="ui-layer absolute inset-0 z-10">
        <ChapterOverlay />
        <WorldControls />
        <Sidebar />
        <ResumeLink />
      </div>
    </>
  );
}
