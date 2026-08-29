"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorldStore } from "@/stores/worldStore";

/** Where the answer is remembered. Bump the suffix to show the hint again. */
const SEEN_KEY = "pixiart:hint-seen:v1";

/**
 * The one instruction the map needs, shown once ever.
 *
 * A picture of nine islands does not announce that the islands are doors, and
 * a visitor who does not try clicking one sees a wallpaper. So: say it once,
 * to someone who has never been here, and never again — a hint that returns on
 * every visit is an interface nagging a visitor about something they already
 * know.
 *
 * `localStorage` can throw outright (private modes, blocked site data), and a
 * hint is not worth a crashed render, so every access is guarded. The failure
 * mode is showing it again, which is the harmless direction.
 */
export default function FirstVisitHint() {
  const isReady = useWorldStore((s) => s.isReady);
  const view = useWorldStore((s) => s.view);
  // Read once, as the initial state rather than in an effect: the answer
  // cannot change while the page is open, and setting it from an effect would
  // render the hint and then immediately take it away again.
  const [show, setShow] = useState(() => {
    try {
      return window.localStorage.getItem(SEEN_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Nothing to do: the visitor sees the hint again next time, which is the
      // harmless half of getting this wrong.
    }
  };

  return (
    <AnimatePresence>
      {show && isReady && view === "overview" && (
        <motion.div
          key="hint"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.5 }}
          className="ui-panel absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-3 px-4 py-2.5 font-sans"
        >
          <span className="text-[0.8125rem]" style={{ color: "var(--ui-text)" }}>
            Click an island to explore
          </span>
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer rounded px-1.5 py-0.5 text-[0.75rem] transition-colors hover:bg-white/10"
            style={{ color: "var(--ui-faint)" }}
            aria-label="Dismiss hint"
          >
            Got it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
