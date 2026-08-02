"use client";

import dynamic from "next/dynamic";

// The Pixi world is client-only (WebGL/DOM). Dynamic + ssr:false must live inside
// a Client Component in the App Router — hence this boundary.
const PixiCanvas = dynamic(() => import("@/components/world/PixiCanvas"), {
  ssr: false,
});

// Engine-only mount today. UI systems (loading screen, dialogue, HUD) are future
// phases and will be composed in here when built.
export default function WorldStage() {
  return <PixiCanvas />;
}
