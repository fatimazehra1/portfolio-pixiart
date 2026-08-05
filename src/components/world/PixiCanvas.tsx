"use client";

import { useEffect, useRef } from "react";
import type { Container } from "pixi.js"; // TEMP(step2-verify)
import {
  AptechBuilding,
  BuildingManager,
  CameraController,
  DayNightManager,
  Engine,
  Environment,
  Ground,
  Lighthouse,
  LightingManager,
  NatureTechBuilding,
  Ocean,
  Planet01Building,
  SkySystem,
  Stars,
  TimeManager,
  VaultsysBuilding,
  WORLD_WIDTH,
} from "@/engine";
import { useWorldStore } from "@/stores/worldStore";

/**
 * Where the shore is, for anything that has to stand on it.
 *
 * Read off the sea and the land themselves rather than recomputed from the same
 * constants — two systems agreeing by coincidence is how a building ends up
 * hovering a pixel above its own beach.
 */
function shoreAnchors(ground: Ground, ocean: Ocean) {
  return {
    horizonY: ocean.topY,
    shorelineY: ground.topY,
    groundHeight: ground.size.height * ground.pixelScale,
  };
}

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
    let environment: Environment | null = null;
    let unbindEnvironment: (() => void) | null = null;
    let lighthouse: Lighthouse | null = null;
    let unbindLighthouse: (() => void) | null = null;
    let buildings: BuildingManager | null = null;
    let unbindBuildings: (() => void) | null = null;
    let camera: CameraController | null = null;
    let time: TimeManager | null = null;
    let cycle: DayNightManager | null = null;
    let lighting: LightingManager | null = null;
    let stars: Stars | null = null;
    let unbindStars: (() => void) | null = null;
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
          // A taller viewport can earn a bigger whole-number scale, and the
          // camera's grid is that scale — re-read it before anything is placed.
          if (sky) {
            instance.camera.setPixelSize(sky.pixelScale);
            instance.stack.setView(instance.camera.getViewLeft(), sky.pixelScale);
          }
          if (sky && stars) stars.resize(sky.size.width, sky.size.height);
          ocean?.resize(size.width, size.height);
          ground?.resize(size.width, size.height);
          // After the land, so anything standing on the shore is re-fitted to
          // where it is now rather than to where it was a moment ago.
          if (ground && ocean) {
            const anchors = shoreAnchors(ground, ocean);
            environment?.resize(size.width, size.height, anchors);
            lighthouse?.resize(size.width, size.height, anchors);
            buildings?.resize(size.width, size.height, anchors);
          }
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
      // The camera renders on a whole-number pixel grid, and this is the number
      // that grid is made of. Set before anything mounts inside it.
      instance.camera.setPixelSize(sky.pixelScale);
      instance.stack.setView(0, sky.pixelScale);

      // Stars mount *inside* the sky, in front of the gradient and behind
      // everything else — so they sit under the clouds and beneath the moon,
      // and inherit the sky's whole-number scale. The sky is untouched by this.
      stars = new Stars({ motionScale });
      stars.mountInto(sky.container);
      stars.resize(sky.size.width, sky.size.height);

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
        // The Environment system grows the planting now, from a seed. Leaving
        // the ground's own hand-placed set on as well would put two rocks on
        // every rock.
        props: false,
      });
      // First system to live inside the camera transform. It no longer offsets
      // itself — the `terrain` layer is world space, so the camera carries it.
      instance.layer("terrain").addChild(ground.container);

      // Everything growing on, standing on or washed up on that land. It holds
      // every prop in the world as data and gives sprites only to the ones on
      // screen, so the shore can be as full as it likes.
      environment = new Environment({
        width,
        height,
        worldWidth: WORLD_WIDTH,
        pixelScale: sky.pixelScale,
        anchors: shoreAnchors(ground, ocean),
        motionScale,
      });
      // World space, in front of the land it grows out of. It still hears about
      // the view — that's what decides which props are worth a sprite.
      instance.layer("props").addChild(environment.container);

      // The lighthouse stands on the shore it was given room for, in front of
      // the land so the tower covers the beach behind it and the beam falls
      // across the open water. It is the last thing in the world and the one
      // visible from all of it (WORLD.md §Overview).
      lighthouse = new Lighthouse({
        width,
        height,
        worldWidth: WORLD_WIDTH,
        pixelScale: sky.pixelScale,
        anchors: shoreAnchors(ground, ocean),
        motionScale,
      });

      // The landmarks of the journey. The manager owns the registry, the cull,
      // the proximity test and the one prompt they share; each building only
      // knows how to stand and how to look.
      buildings = new BuildingManager({
        width,
        height,
        worldWidth: WORLD_WIDTH,
        pixelScale: sky.pixelScale,
        anchors: shoreAnchors(ground, ocean),
        motionScale,
      });
      buildings.add(new AptechBuilding(buildings.context));
      buildings.add(new Planet01Building(buildings.context));
      buildings.add(new VaultsysBuilding(buildings.context));
      buildings.add(new NatureTechBuilding(buildings.context));
      // The tower and the landmarks share a layer: they are the same kind of
      // thing — something built, standing on the shore, sorted by how far down
      // the land it stands.
      instance.layer("structures").addChild(lighthouse.container, buildings.container);

      // Draw order, stated once, back to front. The camera container is itself
      // one entry in the list: everything migrated into the layer stack renders
      // at the position it holds here. Systems still standing outside it are
      // ordered around it until they move in.
      const stage = instance.app.stage;
      stage.removeChildren();
      stage.addChild(sky.container);
      stage.addChild(ocean.container);
      stage.addChild(instance.camera.container); // → terrain, props, structures

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
          // The layer stack moves everything mounted inside the camera.
          instance.stack.setView(viewLeft);
          sky?.setViewOffset(viewLeft);
          ocean?.setViewOffset(viewLeft);
          environment?.setViewOffset(viewLeft);
          buildings?.setViewOffset(viewLeft);
          // Where you are considered to be, until a character exists to be it:
          // the middle of the view, dropped onto the road.
          buildings?.setFocus(viewLeft + instance.viewport.width / (2 * zoom));
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

      // The global lighting reading. It draws nothing — the sky, sea and land
      // are already lit by the cycle above, and lighting them again would be
      // counting the same sun twice. It runs so that the lanterns, windows and
      // beams still to come have one agreed answer to read.
      lighting = new LightingManager({ dayNight: cycle });

      // Stars take their cue straight from the clock: they are out or they are
      // not, which is a question about the hour rather than about colour.
      unbindStars = stars.bindTime(time.time);

      // The beam is a local light source, so it reads the one number the
      // lighting system publishes for exactly that — nothing left over at noon,
      // everything at midnight. The lighthouse never sees the clock.
      unbindLighthouse = lighthouse.bindLighting(lighting);

      // The same seam for the shore's own lights: the lamps come on when the
      // ambient stops doing the work, and the planting is lit by the ambient
      // itself so a bench matches the sand it stands on.
      unbindEnvironment = environment.bindLighting(lighting);

      // And again for the landmarks: sandstone lit by the ambient, windows and
      // signs burning on what it leaves over.
      unbindBuildings = buildings.bindLighting(lighting);

      // One frame of the world, so the harness below can drive it by hand at a
      // fixed step instead of at whatever rate a background tab feels like.
      const step = (delta: number) => {
        // The clock and the camera go first, so the world is drawn at the time
        // and place it has this frame rather than the ones it had last frame.
        time?.update(delta);
        camera?.update(delta);
        sky?.update(delta);
        stars?.update(delta);
        ocean?.update(delta);
        ground?.update(delta);
        environment?.update(delta);
        lighthouse?.update(delta);
        buildings?.update(delta);
      };

      instance.onUpdate((ticker) => step(ticker.deltaMS / 1000));

      // TEMP(step2-verify): removed before step 2 is finished. Drives the world
      // from a deterministic state so a frame can be fingerprinted and compared
      // across a refactor, and so sub-pixel drift can be measured *during*
      // movement rather than only at rest.
      (window as unknown as Record<string, unknown>).__wf = {
        cam: instance.camera,
        ground: () => ground,
        async frame(worldX: number, phase: string, frames = 90) {
          time!.time.setPaused(true);
          time!.time.setPhase(phase as never);
          camera!.snapToStart();
          instance.camera.snapTo(worldX + instance.viewport.width / 2, 0);
          for (let i = 0; i < frames; i += 1) step(1 / 60);
          instance.app.render();
          const url = String(
            instance.app.renderer.extract.canvas(instance.app.stage).toDataURL!()
          );
          const bytes = new TextEncoder().encode(url);
          const digest = await crypto.subtle.digest("SHA-256", bytes);
          return Array.from(new Uint8Array(digest))
            .slice(0, 8)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        },
        /**
         * Pan across `worldX` a pixel at a time and record where the terrain
         * actually landed on screen. Every sample has to be a whole multiple of
         * the pixel scale; anything else is the shimmer we are looking for.
         */
        drift(from: number, to: number, samples = 240) {
          time!.time.setPaused(true);
          const tracked: Record<string, Container> = {
            ground: ground!.container,
            environment: environment!.container,
            lighthouse: lighthouse!.container,
            buildings: buildings!.container,
          };
          const seen: Record<string, number[]> = {};
          for (const k of Object.keys(tracked)) seen[k] = [];

          for (let i = 0; i < samples; i += 1) {
            const x = from + ((to - from) * i) / (samples - 1);
            instance.camera.snapTo(x + instance.viewport.width / 2, 0);
            camera!.update(1 / 60);
            // Where each system actually landed on screen, however it got there.
            for (const [k, c] of Object.entries(tracked)) {
              seen[k].push(c.getGlobalPosition().x);
            }
          }

          const scale = instance.camera.getPixelStep();
          const report: Record<string, unknown> = { scale, samples };
          for (const [k, values] of Object.entries(seen)) {
            const off = values.filter(
              (v) => Math.abs(v / scale - Math.round(v / scale)) > 1e-9
            );
            report[k] = { offGrid: off.length, worst: off[0] ?? null };
          }
          return report;
        },
      };

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
      // Unwind the chain from the far end: lighting listens to the cycle, the
      // cycle listens to the clock, and both feed the systems below.
      lighting?.destroy();
      lighting = null;
      unbindStars?.();
      unbindStars = null;
      cycle?.destroy();
      cycle = null;
      // Destroyed before the sky it is mounted inside, so its textures are
      // freed rather than swept up by the parent's teardown.
      stars?.destroy();
      stars = null;
      // Detach the input listeners before anything they drive goes away.
      time?.destroy();
      time = null;
      camera?.destroy();
      camera = null;
      // Destroy the world systems first so their generated textures are freed
      // deterministically.
      // Detaches the interact listener before anything it could reach goes away.
      unbindBuildings?.();
      unbindBuildings = null;
      buildings?.destroy();
      buildings = null;
      unbindLighthouse?.();
      unbindLighthouse = null;
      lighthouse?.destroy();
      lighthouse = null;
      unbindEnvironment?.();
      unbindEnvironment = null;
      environment?.destroy();
      environment = null;
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
