"use client";

import dynamic from "next/dynamic";
import ChapterOverlay from "@/components/ui/ChapterOverlay";
import Sidebar from "@/components/ui/Sidebar";
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
export default function WorldStage() {
  return (
    <>
      <PixiCanvas />
      <div className="ui-layer absolute inset-0 z-10">
        <ChapterOverlay />
        <WorldControls />
        <Sidebar />
      </div>
    </>
  );
}
