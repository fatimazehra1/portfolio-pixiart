"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useWorldStore } from "@/stores/worldStore";

/**
 * Framer Motion loading veil shown until the world reports ready
 * (worldStore.isLoaded). Target: no load longer than 3s (DESIGN.md §Performance).
 */
export default function LoadingScreen() {
  const isLoaded = useWorldStore((s) => s.isLoaded);

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--sky-night)] text-[var(--parchment)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="font-display text-3xl tracking-widest">THE WATERFRONT</h1>
          <motion.p
            className="mt-3 font-sans text-sm opacity-80"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            Setting the tide…
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
