"use client";

import { useEffect, useRef } from "react";
import { Engine, Ground, Ocean, SkySystem } from "@/engine";
import { useWorldStore } from "@/stores/worldStore";

/**
 * React mount point for the rendering engine. This is the ONLY bridge between
 * React and PixiJS: it creates the Engine, appends its canvas, syncs viewport +
 * ready state to the store, and destroys everything on unmount.
 *
 * The engine itself is framework-agnostic — no React or gameplay lives in it.
 */
export default function PixiCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const setReady = useWorldStore((s) => s.setReady);
  const setViewport = useWorldStore((s) => s.setViewport);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // `engine` is assigned only after init() resolves. Under React StrictMode the
    // effect mounts → cleans up → re-mounts synchronously; keeping it null until
    // ready means cleanup never tears down a half-initialised Application.
    let engine: Engine | null = null;
    let sky: SkySystem | null = null;
    let ocean: Ocean | null = null;
    let ground: Ground | null = null;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    // DESIGN.md §Animation: calm by default, still when asked. 0 stops the drift
    // and makes time-of-day changes instant without flattening the art.
    const motionScale = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1;

    (async () => {
      const instance = new Engine({
        host,
        onResize: (size) => {
          setViewport(size);
          sky?.resize(size.width, size.height);
          ocean?.resize(size.width, size.height);
          ground?.resize(size.width, size.height);
        },
      });
      await instance.init();

      if (cancelled) {
        instance.destroy();
        return;
      }

      engine = instance;

      // The sky is a backdrop, not world geometry, so it mounts *outside* the
      // camera container — panning the town must not slide the sky off-screen.
      // Depth comes from SkySystem.setViewOffset instead, once the camera moves.
      const { width, height } = instance.viewport;
      sky = new SkySystem({
        width,
        height,
        timeOfDay: useWorldStore.getState().timeOfDay,
        motionScale,
      });
      instance.app.stage.addChildAt(sky.container, 0);

      // The ocean shares the sky's pixel scale so both land on one grid — a
      // mismatch is what would make the horizon seam obvious. It mounts in
      // front of the sky and behind everything else still to come.
      ocean = new Ocean({
        width,
        height,
        timeOfDay: useWorldStore.getState().timeOfDay,
        pixelScale: sky.pixelScale,
        motionScale,
      });
      instance.app.stage.addChildAt(ocean.container, 1);

      // The land sits in front of the water, on the same shared pixel grid.
      ground = new Ground({
        width,
        height,
        timeOfDay: useWorldStore.getState().timeOfDay,
        pixelScale: sky.pixelScale,
        motionScale,
      });
      instance.app.stage.addChildAt(ground.container, 2);

      instance.onUpdate((ticker) => {
        const delta = ticker.deltaMS / 1000;
        sky?.update(delta);
        ocean?.update(delta);
        ground?.update(delta);
      });

      // Subscribing directly (rather than via an effect) keeps time-of-day
      // changes off React's render path entirely.
      unsubscribe = useWorldStore.subscribe((state, prev) => {
        if (state.timeOfDay === prev.timeOfDay) return;
        sky?.setTimeOfDay(state.timeOfDay);
        ocean?.setTimeOfDay(state.timeOfDay);
        ground?.setTimeOfDay(state.timeOfDay);
      });

      host.appendChild(instance.canvas);
      setViewport(instance.viewport);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      setReady(false);
      unsubscribe?.();
      unsubscribe = null;
      // Destroy the world systems first so their generated textures are freed
      // deterministically.
      ground?.destroy();
      ground = null;
      ocean?.destroy();
      ocean = null;
      sky?.destroy();
      sky = null;
      if (engine) {
        engine.destroy();
        engine = null;
      }
    };
  }, [setReady, setViewport]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
