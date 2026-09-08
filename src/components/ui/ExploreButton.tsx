"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CHAPTER_CONTENT } from "@/data/chapters";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The door, offered once you are standing in front of it.
 *
 * Past a certain closeness the map stops being a map. One island fills the
 * frame, the eight others are off-screen, and the visitor is looking at a
 * place rather than at a diagram of nine — at which point "click a world to
 * enter" is a hint about a screen they are no longer on. This is the same
 * invitation, made where it applies.
 *
 * It does not replace anything. Clicking the island still enters it, the
 * labels still enter it, the sidebar still enters it; this is one more way in,
 * and the only one that appears exactly when the old ones stop being visible.
 *
 * # Why it does not re-render as you pan
 * Same rule as `ChapterOverlay`, and for the same reason: the button has to
 * follow its island through every pan and zoom, and sixty React renders a
 * second behind a canvas already doing the real work is the interface becoming
 * the thing that drops the frame rate. React owns *which* world is on offer;
 * a `requestAnimationFrame` loop owns where the button sits and whether it is
 * visible at all.
 */

/** How far below the island's centre the button sits, in CSS pixels. */
const DROP = 28;

export default function ExploreButton() {
  const isReady = useWorldStore((s) => s.isReady);
  const view = useWorldStore((s) => s.view);

  /** Which world is on offer. The only thing here that is React state. */
  const [target, setTarget] = useState<string | null>(null);
  const node = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<string | null>(null);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    if (!isReady) return;

    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);

      // Asked of the engine rather than decided here, and asked inside the
      // loop rather than in the effect body: this is a frame-rate question,
      // and `dominantChapter` already returns null the moment the map is not
      // what is on screen.
      const world = getWorld();
      const dominant = world?.dominantChapter() ?? null;

      if (!dominant) {
        if (targetRef.current !== null) setTarget(null);
        return;
      }
      if (targetRef.current !== dominant.id) setTarget(dominant.id);

      if (!node.current) return;
      // Under the island rather than over it: everything worth looking at on
      // one of these is above its own ground line, and a panel across the
      // middle of a building is a panel over the reason you came.
      const x = Math.round(dominant.x);
      const y = Math.round(dominant.y + dominant.radius * 0.55 + DROP);
      node.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, 0)`;
    };

    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [isReady]);

  if (!isReady || view !== "overview") return null;

  const content = target ? CHAPTER_CONTENT.find((c) => c.id === target) : undefined;

  return (
    <div ref={node} className="absolute top-0 left-0" style={{ willChange: "transform" }}>
      <AnimatePresence mode="wait">
        {content && (
          <motion.button
            key={content.id}
            type="button"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={() => getWorld()?.enterChapter(content.id)}
            className="ui-panel flex cursor-pointer items-center gap-2 px-3.5 py-2 font-sans text-[0.8125rem] font-medium whitespace-nowrap transition-colors hover:bg-white/8"
            aria-label={`Explore ${content.title}`}
          >
            <span>Explore {content.title}</span>
            <span aria-hidden>→</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
