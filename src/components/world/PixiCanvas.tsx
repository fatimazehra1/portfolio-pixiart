"use client";

import { useEffect, useRef } from "react";
import { Engine } from "@/engine";
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
    let cancelled = false;

    (async () => {
      const instance = new Engine({ host, onResize: setViewport });
      await instance.init();

      if (cancelled) {
        instance.destroy();
        return;
      }

      engine = instance;
      host.appendChild(instance.canvas);
      setViewport(instance.viewport);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      setReady(false);
      if (engine) {
        engine.destroy();
        engine = null;
      }
    };
  }, [setReady, setViewport]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
