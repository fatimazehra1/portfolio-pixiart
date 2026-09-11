"use client";

import { AnimatePresence, motion } from "framer-motion";
import { contentFor } from "@/data/chapters";
import InfoCard from "./InfoCard";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The hint, the plaque, and the way back.
 *
 * Three small things that share one file because they are one decision: how
 * much interface is allowed on screen at once. The answer is deliberately
 * small — a hint while you are on the map, and inside a world exactly two
 * things: what this place is, and one door out of it.
 *
 * # One way in, one way out
 * The map used to carry a floating "Explore ..." button under whichever island
 * was closest *and* a click target on the island *and* a dismissable first-time
 * hint that said the same sentence as the permanent one. Pointing at a world
 * and clicking it is the way in — that is what the labels, the card and the
 * island itself all are, one target. Escape, or this button, is the way out.
 * Everything else was furniture.
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
            className="ui-panel ui-button absolute top-5 left-5 flex cursor-pointer items-center gap-2 px-3 py-2 font-sans text-[0.8125rem] transition-colors"
          >
            <span aria-hidden>←</span>
            <span>Back to the map</span>
            <kbd
              className="ml-1 border-2 px-1.5 py-0.5 text-[0.625rem] tracking-wider"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-faint)" }}
            >
              ESC
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* What this place is, on the wall of it. */}
      <AnimatePresence>
        {inside && content && (
          <motion.div
            key="where"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            // Tall content, a short screen: the plaque scrolls inside itself
            // rather than growing past the viewport it is hanging over.
            className="ui-plaque ui-scroll absolute top-5 right-5 max-h-[calc(100dvh-2.5rem)] w-[20rem] overflow-y-auto"
          >
            <InfoCard content={content} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The hint. Overview only, and the only one on the page. */}
      <AnimatePresence>
        {view === "overview" && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 font-sans text-[0.75rem] tracking-wide select-none"
            style={{ color: "var(--ui-text)", textShadow: "1px 1px 0 var(--ui-edge)" }}
          >
            Click an island to enter it · scroll to zoom · drag to pan
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
