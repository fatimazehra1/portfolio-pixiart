"use client";

import { useEffect, useRef } from "react";
import {
  CameraController,
  DayNightManager,
  Engine,
  Ground,
  Ocean,
  SkySystem,
  TimeManager,
  WORLD_WIDTH,
} from "@/engine";
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
    let camera: CameraController | null = null;
    let time: TimeManager | null = null;
    let cycle: DayNightManager | null = null;
    let cancelled = false;

    const setCamera = useWorldStore.getState().setCamera;
    const setTimeSnapshot = useWorldStore.getState().setTimeSnapshot;

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
          camera?.resize(size.width, size.height);
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

      // The land sits in front of the water, on the same shared pixel grid, and
      // is the one system baked at the width of the whole world — it's what the
      // camera actually travels over, rather than a backdrop it slides against.
      ground = new Ground({
        width,
        height,
        worldWidth: WORLD_WIDTH,
        timeOfDay: useWorldStore.getState().timeOfDay,
        pixelScale: sky.pixelScale,
        motionScale,
      });
      instance.app.stage.addChildAt(ground.container, 2);

      // The camera owns where the view is; the three systems each decide how
      // much of that movement to answer. The ground tracks it one to one, the
      // water and the sky by their own depths, which is where the parallax
      // comes from. Nothing here knows about input, and the controller knows
      // nothing about what it is moving over.
      camera = new CameraController({
        camera: instance.camera,
        host,
        worldWidth: WORLD_WIDTH,
        onMove: (viewLeft, zoom) => {
          sky?.setViewOffset(viewLeft);
          ocean?.setViewOffset(viewLeft);
          ground?.setViewOffset(viewLeft);
          setCamera(viewLeft, zoom);
        },
      });
      camera.resize(width, height);
      camera.snapToStart();

      // The world clock, and the cycle that reads it. The clock is the single
      // source of truth for *when*; the cycle turns that into *how it looks*
      // and pushes it into the three systems. Neither can move the other.
      time = new TimeManager({ onChange: setTimeSnapshot });
      cycle = new DayNightManager({ time: time.time, sky, ocean, ground });

      instance.onUpdate((ticker) => {
        const delta = ticker.deltaMS / 1000;
        // The clock and the camera go first, so the world is drawn at the time
        // and place it has this frame rather than the ones it had last frame.
        time?.update(delta);
        camera?.update(delta);
        sky?.update(delta);
        ocean?.update(delta);
        ground?.update(delta);
      });

      // The store's `timeOfDay` no longer fans out to the three systems: the
      // day/night cycle owns the look now, and two drivers would fight. The
      // systems ignore `setTimeOfDay` once the cycle has hold of them anyway.

      host.appendChild(instance.canvas);
      setViewport(instance.viewport);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      setReady(false);
      // Drop the cycle before the clock it listens to, and both before the
      // systems they drive.
      cycle?.destroy();
      cycle = null;
      // Detach the input listeners before anything they drive goes away.
      time?.destroy();
      time = null;
      camera?.destroy();
      camera = null;
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
