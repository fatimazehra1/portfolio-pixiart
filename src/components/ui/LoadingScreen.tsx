"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PROFILE } from "@/data/chapters";
import { useWorldStore } from "@/stores/worldStore";

/**
 * What there is to look at while the universe is being built.
 *
 * The map is not a page that streams in — nine islands, their buildings and
 * every prop on them are baked as textures in one synchronous pass, and
 * without this the visitor gets a blank frame for the whole of it and no
 * reason to believe anything is coming.
 *
 * The bar is honest: it moves on the three steps `World.create` actually
 * reports (WebGL up, worlds built, first frame) rather than on a timer
 * pretending to be progress. It eases between them, which is presentation,
 * but it never advances past a step that has not finished.
 */
export default function LoadingScreen() {
  const isReady = useWorldStore((s) => s.isReady);
  const progress = useWorldStore((s) => s.loadProgress);
  const label = useWorldStore((s) => s.loadLabel);

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          // Over everything, and above the canvas it is hiding.
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 font-sans"
          // The same warm sky the map fades up into, so the hand-off is a
          // dissolve rather than a cut between two different places.
          style={{ background: "linear-gradient(#a88bb0, #e3b79c 42%, #faeacf)" }}
        >
          <div className="text-center">
            <p className="text-[1.0625rem] font-semibold tracking-tight text-[#2b2130]">
              {PROFILE.name}
            </p>
            <p className="mt-1 text-[0.8125rem] text-[#2b2130]/60">{PROFILE.tagline}</p>
          </div>

          <div
            className="h-1 w-56 overflow-hidden rounded-full"
            style={{ background: "rgb(43 33 48 / 0.15)" }}
            role="progressbar"
            aria-label="Loading the universe"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "#2b2130" }}
              initial={{ width: "4%" }}
              animate={{ width: `${Math.max(4, progress * 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          <p className="text-[0.75rem] tracking-wide text-[#2b2130]/50">
            {label || "Loading"}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
