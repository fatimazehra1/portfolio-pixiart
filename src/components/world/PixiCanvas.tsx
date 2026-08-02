"use client";

import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { useWorldStore } from "@/stores/worldStore";

/**
 * Mounts the PixiJS world. PixiJS owns everything IN the world (DESIGN.md §Animation):
 * sky, ocean, parallax, weather, character. React owns all UI — never draw UI here.
 *
 * This is a minimal, runnable starter scene (sky gradient + animated ocean band)
 * that proves the Next 16 + Pixi v8 integration. Replace the placeholder art with
 * real pixel scenes as buildings are authored.
 */
export default function PixiCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const setLoaded = useWorldStore((s) => s.setLoaded);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // `app` is assigned ONLY after init() resolves. Under React StrictMode the
    // effect mounts/cleans-up/re-mounts synchronously; if cleanup ran while
    // init() was still pending it would call destroy() on a half-built app
    // (throws `_cancelResize is not a function`). Keeping `app` null until ready
    // means cleanup either destroys a fully-initialized app or defers to the
    // `cancelled` guard below.
    let app: Application | null = null;
    let cancelled = false;

    (async () => {
      const instance = new Application();
      await instance.init({
        resizeTo: host,
        antialias: false, // pixel art: keep it crisp (DESIGN.md §Art Style)
        // Cap DPR for performance (DESIGN.md §Performance).
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        background: "#f4a259", // sunset horizon — placeholder
        preference: "webgl",
      });

      // Effect was cleaned up while we were initializing — tear down and bail.
      if (cancelled) {
        instance.destroy(true, { children: true, texture: true });
        return;
      }

      app = instance;
      host.appendChild(app.canvas);

      // --- Placeholder scene: a gentle animated ocean band ---
      const ocean = new Graphics();
      app.stage.addChild(ocean);

      let t = 0;
      app.ticker.add((ticker) => {
        t += ticker.deltaTime * 0.02;
        const w = instance.screen.width;
        const h = instance.screen.height;
        const waterTop = h * 0.6;

        ocean.clear();
        ocean.rect(0, waterTop, w, h - waterTop).fill(0x1f6f8b);

        // A few sine-wave foam lines to show the ticker is live.
        for (let i = 0; i < 3; i++) {
          const y = waterTop + 12 + i * 18;
          ocean.moveTo(0, y);
          for (let x = 0; x <= w; x += 8) {
            ocean.lineTo(x, y + Math.sin(x * 0.03 + t + i) * 3);
          }
          ocean.stroke({ width: 2, color: 0xcfe8ef, alpha: 0.6 });
        }
      });

      setLoaded(true);
    })();

    return () => {
      cancelled = true;
      // Only destroy once fully initialized. If init() is still pending, the
      // `cancelled` guard above handles teardown after it resolves.
      if (app) {
        app.destroy(true, { children: true, texture: true });
        app = null;
      }
    };
  }, [setLoaded]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
