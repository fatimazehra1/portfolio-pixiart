"use client";

import { useEffect, useRef } from "react";
import { World } from "@/engine";
import { useWorldStore } from "@/stores/worldStore";
import { setWorld } from "./worldHandle";
import { MOBILE_TOP_BAR, MOBILE_WORLD_HEIGHT } from "@/components/ui/layout";

/**
 * React mount point for the rendering engine.
 *
 * This is the ONLY bridge between React and PixiJS, and it is now genuinely
 * only a bridge: it builds a `World`, appends its canvas, forwards three values
 * into the store, and tears everything down on unmount.
 *
 * It used to be three hundred lines — every system, its mount order, its
 * subscriptions and its teardown, all written out here. That meant adding a
 * chapter to the waterfront involved editing a React component, which is the
 * last place the composition of a coastline should live. The world is built
 * from `SCENES` now, and `World` knows how; this file knows neither.
 */
export default function PixiCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const setReady = useWorldStore((s) => s.setReady);
  const setViewport = useWorldStore((s) => s.setViewport);
  const split = useWorldStore(
    (s) => s.isMobile && (s.view === "inside" || s.view === "entering")
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Assigned only after create() resolves. Under React StrictMode the effect
    // mounts → cleans up → re-mounts synchronously; keeping it null until ready
    // means cleanup never tears down a half-initialised world.
    let world: World | null = null;
    let cancelled = false;
    let introTimer = 0;

    const { setCamera, setHotspot, setLoadProgress, setTimeSnapshot, setUniverse } =
      useWorldStore.getState();
    // Read through `getState` at call time, not captured: the found list grows
    // while the world is alive and a captured copy would go stale.
    const findCat = (id: string, name: string, x: number, y: number) =>
      useWorldStore.getState().findCat(id, name, x, y);

    // DESIGN.md §Animation: calm by default, still when asked. 0 stops the drift
    // and makes time-of-day changes instant without flattening the art.
    const motionScale = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;

    (async () => {
      const instance = await World.create({
        host,
        timeOfDay: useWorldStore.getState().timeOfDay,
        motionScale,
        onResize: setViewport,
        onCamera: setCamera,
        onTime: setTimeSnapshot,
        onUniverse: setUniverse,
        onHotspot: setHotspot,
        onCat: (event) => findCat(event.id, event.name, event.x, event.y),
        catsFound: () => useWorldStore.getState().catsFound,
        // The opening frame has to be right on the first frame, so the profile
        // is passed in rather than set afterwards. `WorldStage` keeps it in
        // step from there.
        mobile: useWorldStore.getState().isMobile,
        onProgress: setLoadProgress,
      });

      if (cancelled) {
        instance.destroy();
        return;
      }

      world = instance;
      // Published for the React interface, which calls into it for world screen
      // positions. See `worldHandle` for why this is not context or store.
      setWorld(instance);
      // A handle on the engine from the console, for development only. The
      // check is against a literal Next replaces at build time, so the whole
      // branch is dropped from the production bundle rather than merely
      // skipped at runtime.
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as Record<string, unknown>).__world = instance;
        // The store too, so the narrow shell can be driven without a narrow
        // window — see the note in `WorldStage` about testing it.
        (window as unknown as Record<string, unknown>).__store = useWorldStore;
      }
      host.appendChild(instance.canvas);
      setViewport(instance.viewport);
      setLoadProgress(1, "Ready");
      setReady(true);
      // After the curtain, not before: the loading screen dissolves over about
      // half a second, and an establishing shot played behind it is an
      // establishing shot nobody establishes anything with. The world decides
      // whether it has already been seen this session.
      introTimer = window.setTimeout(() => instance.playIntro(), 380);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(introTimer);
      setReady(false);
      setWorld(null);
      world?.destroy();
      world = null;
    };
  }, [setReady, setViewport]);

  // aria-hidden on the host: what it holds is a WebGL canvas with no text in
  // it, and the same career is written out for assistive technology and for
  // crawlers by the fallback in app/page.tsx.
  // On a phone, inside an island, the world gets the top strip and the panel
  // the rest (see `MobileSheet`). The engine watches this element's size, so
  // shortening it is all it takes for the island to be framed for the strip
  // rather than for a screen it only half owns. Shortened as the flight
  // starts, so the island is built at the size it will be seen at.
  return (
    <div
      ref={hostRef}
      className="absolute inset-x-0 w-full"
      style={
        split
          ? { top: MOBILE_TOP_BAR, height: `calc(${MOBILE_WORLD_HEIGHT} - ${MOBILE_TOP_BAR})` }
          : { top: 0, height: "100%" }
      }
      aria-hidden
    />
  );
}
