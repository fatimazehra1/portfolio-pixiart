"use client";

import { AnimatePresence, motion } from "framer-motion";
import { contentFor } from "@/data/chapters";
import InfoCard from "./InfoCard";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The hint and the way back.
 *
 * Two small things that share one file because they are one decision: how
 * much interface is allowed on screen at once. The identity mark used to live
 * here too — it now lives in `Sidebar`, which owns the hub's left edge, so
 * this file no longer has to fade in and out with it or fight it for the same
 * corner.
 *
 * The hint earns its place — a map you can drag and zoom looks identical to a
 * static picture until you try, and a first-time visitor should not have to
 * guess. It fades once you have actually moved the camera, because at that
 * point it is telling you something you have just done.
 */

export default function WorldControls() {
  const isReady = useWorldStore((s) => s.isReady);
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);

  if (!isReady) return null;

  const inside = view === "inside" || view === "entering";
  const content = chapterId ? contentFor(chapterId) : undefined;

  return (
    <>
      {/* The way back. Only while there is somewhere to come back from. */}
      <AnimatePresence>
        {inside && (
          <motion.button
            type="button"
            key="back"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={() => getWorld()?.leaveChapter()}
            className="ui-panel absolute top-20 left-5 flex cursor-pointer items-center gap-2 px-3 py-2 font-sans text-[0.8125rem] font-medium transition-colors hover:bg-white/8"
          >
            <span aria-hidden>←</span>
            <span>Back to the universe</span>
            <kbd
              className="ml-1 rounded border px-1.5 py-0.5 text-[0.625rem] tracking-wide"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-faint)" }}
            >
              ESC
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Where you are, once you are somewhere. */}
      <AnimatePresence>
        {inside && content && (
          <motion.div
            key="where"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            // Tall content, a short screen: the panel scrolls inside itself
            // rather than growing past the viewport it is floating over.
            className="ui-panel absolute top-5 right-5 max-h-[calc(100dvh-2.5rem)] w-[19rem] overflow-y-auto px-3.5 py-3 font-sans"
          >
            <InfoCard content={content} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* The hint. Overview only. */}
      <AnimatePresence>
        {view === "overview" && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 font-sans text-[0.6875rem] tracking-wide select-none"
            style={{ color: "var(--ui-faint)" }}
          >
            Scroll or ± to zoom · drag or arrows to pan · click a world to enter
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
