"use client";

import { useEffect, useRef } from "react";
import { World } from "@/engine";
import { useWorldStore } from "@/stores/worldStore";
import { setWorld } from "./worldHandle";

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

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Assigned only after create() resolves. Under React StrictMode the effect
    // mounts → cleans up → re-mounts synchronously; keeping it null until ready
    // means cleanup never tears down a half-initialised world.
    let world: World | null = null;
    let cancelled = false;

    const { setCamera, setTimeSnapshot, setUniverse } = useWorldStore.getState();

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
      });

      if (cancelled) {
        instance.destroy();
        return;
      }

      world = instance;
      // Published for the React interface, which calls into it for world screen
      // positions. See `worldHandle` for why this is not context or store.
      setWorld(instance);
      (window as unknown as Record<string, unknown>).__world = instance; // TEMP(verify)
      host.appendChild(instance.canvas);
      setViewport(instance.viewport);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      setReady(false);
      setWorld(null);
      world?.destroy();
      world = null;
    };
  }, [setReady, setViewport]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
