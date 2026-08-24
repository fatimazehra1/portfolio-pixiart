"use client";

import { useEffect, useRef } from "react";

export default function IsoTestPage() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let app: import("pixi.js").Application | null = null;

    (async () => {
      const [{ Application, Sprite }, { generateIsoIsland }] = await Promise.all([
        import("pixi.js"),
        import("@/engine/universe/IsoIslandFactory"),
      ]);

      const island = generateIsoIsland({
        size: 44,
        topPalette: [0xe8d9a8, 0xd4bc7a, 0xb89a58, 0x8f7640],
        rockPalette: [0x9a8a72, 0x776a55, 0x574d3d, 0x3a3327],
        edgeSeed: 0x1234,
        undersideLength: 46,
      });

      if (destroyed) return;

      const instance = new Application();
      await instance.init({
        width: island.width * 6 + 80,
        height: island.height * 6 + 80,
        background: 0x1c2230,
        antialias: false,
      });
      if (destroyed) {
        instance.destroy();
        return;
      }
      app = instance;
      host.appendChild(instance.canvas);

      const sprite = new Sprite(island.texture);
      sprite.scale.set(6);
      sprite.texture.source.scaleMode = "nearest";
      sprite.x = 40;
      sprite.y = 40;
      instance.stage.addChild(sprite);
    })();

    return () => {
      destroyed = true;
      app?.destroy(true, { children: true, texture: true });
      app = null;
    };
  }, []);

  return <div ref={hostRef} className="flex min-h-screen items-center justify-center bg-neutral-900" />;
}
