"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import ChapterOverlay from "@/components/ui/ChapterOverlay";
import Sidebar from "@/components/ui/Sidebar";
import LoadingScreen from "@/components/ui/LoadingScreen";
import CatBucket from "@/components/ui/CatBucket";
import HotspotLabel from "@/components/ui/HotspotLabel";
import MobileSheet from "@/components/ui/MobileSheet";
import MobileShell from "@/components/ui/MobileShell";
import ResumeLink from "@/components/ui/ResumeLink";
import SoundToggle from "@/components/ui/SoundToggle";
import WorldControls from "@/components/ui/WorldControls";
import { getWorld, subscribeWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

// The Pixi world is client-only (WebGL/DOM). Dynamic + ssr:false must live inside
// a Client Component in the App Router — hence this boundary.
const PixiCanvas = dynamic(() => import("@/components/world/PixiCanvas"), {
  ssr: false,
});

/**
 * The two layers, composed, in whichever of the two shells fits the screen.
 *
 * The pixel universe underneath and the modern interface over it — the split
 * DESIGN.md §UI Style draws, made real by this file being the only place the
 * two meet. Nothing in `ui/` imports Pixi and nothing in `engine/` imports
 * React; they are joined here and through `worldHandle`.
 *
 * `.ui-layer` makes the overlay transparent to the pointer so the canvas keeps
 * receiving drags and wheels everywhere except on an actual panel — the map has
 * to stay draggable through the gaps between the cards.
 *
 * # Two shells, one world
 * A narrow screen used to be sent to `/resume`, on the argument that the map
 * was a slideshow on a phone. That was true of *this* layout on a phone: a
 * 256-pixel sidebar and nine islands fitted to 375 pixels. It was never true
 * of the world itself. So the canvas now mounts either way and the shell
 * around it changes — see `MobileShell` for the interface and
 * `World.setMobile` for the camera and the sprite counts, which is the half of
 * the difference that is not layout.
 */

/** Below this width the narrow shell takes over. */
const MOBILE_WIDTH = 768;

export default function WorldStage() {
  const isMobile = useWorldStore((s) => s.isMobile);
  const setMobile = useWorldStore((s) => s.setMobile);

  // One media query for the whole interface. Components read `isMobile` from
  // the store rather than each running their own, so there is no width at
  // which two of them disagree about which shell is on.
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_WIDTH - 1}px)`);
    const decide = () => setMobile(query.matches);
    decide();
    query.addEventListener("change", decide);
    return () => query.removeEventListener("change", decide);
  }, [setMobile]);

  // And the engine is told separately, because what it does with the answer —
  // reframe the map, thin the sprites — is not layout. Subscribed rather than
  // called once: the world is built asynchronously and may not exist yet when
  // the query first answers.
  useEffect(() => {
    getWorld()?.setMobile(isMobile);
    return subscribeWorld((world) => world?.setMobile(isMobile));
  }, [isMobile]);

  return (
    <>
      <PixiCanvas />
      <LoadingScreen />
      <div className="ui-layer absolute inset-0 z-10">
        <HotspotLabel />

        {isMobile ? (
          <>
            <MobileShell />
            <MobileSheet />
          </>
        ) : (
          <>
            <ChapterOverlay />
            <WorldControls />
            <Sidebar />
            {/*
              The bottom-right corner: the bucket, the speaker, then the way
              out to the document. One row so they stay a fixed gap apart at
              every viewport, and so the fast path — land, read, click Resume —
              is never further than the same corner it was on the last screen.
            */}
            <div className="absolute right-5 bottom-5 flex items-stretch gap-2">
              <div className="relative flex">
                <CatBucket />
              </div>
              <SoundToggle />
              <ResumeLink />
            </div>
          </>
        )}
      </div>
    </>
  );
}
