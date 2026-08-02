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

    let app: Application | null = null;
    let destroyed = false;

    (async () => {
      app = new Application();
      await app.init({
        resizeTo: host,
        antialias: false, // pixel art: keep it crisp (DESIGN.md §Art Style)
        // Cap DPR for performance (DESIGN.md §Performance).
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
        background: "#f4a259", // sunset horizon — placeholder
        preference: "webgl",
      });

      // Guard against React StrictMode double-invoke / fast unmount.
      if (destroyed || !host) {
        app.destroy(true);
        return;
      }
      host.appendChild(app.canvas);

      // --- Placeholder scene: a gentle animated ocean band ---
      const ocean = new Graphics();
      app.stage.addChild(ocean);

      let t = 0;
      app.ticker.add((ticker) => {
        t += ticker.deltaTime * 0.02;
        const w = app!.screen.width;
        const h = app!.screen.height;
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
      destroyed = true;
      // destroy(true) also removes the canvas from the DOM.
      app?.destroy(true, { children: true, texture: true });
      app = null;
    };
  }, [setLoaded]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
