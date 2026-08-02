"use client";

import dynamic from "next/dynamic";
import Hud from "@/components/ui/Hud";
import DialogueBox from "@/components/dialogue/DialogueBox";
import LoadingScreen from "@/components/ui/LoadingScreen";

// The Pixi world is client-only (WebGL/DOM). Dynamic + ssr:false must live inside
// a Client Component in the App Router — hence this boundary.
const PixiCanvas = dynamic(() => import("@/components/world/PixiCanvas"), {
  ssr: false,
});

export default function WorldStage() {
  return (
    <>
      {/* World (PixiJS) */}
      <PixiCanvas />

      {/* UI (React + Framer Motion) */}
      <Hud />
      <DialogueBox />
      <LoadingScreen />
    </>
  );
}
