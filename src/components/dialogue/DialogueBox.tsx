"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorldStore } from "@/stores/worldStore";
import { getDialogue } from "@/data/dialogue/dialogue";

/**
 * Parchment dialogue window (DESIGN.md §UI Style: parchment, brass accents,
 * pixel borders, NO rounded corners). Framer Motion owns UI animation.
 * Reads the active tree id from the store; content comes from JSON.
 */
export default function DialogueBox() {
  const activeDialogue = useWorldStore((s) => s.activeDialogue);
  const closeDialogue = useWorldStore((s) => s.closeDialogue);
  const tree = activeDialogue ? getDialogue(activeDialogue) : undefined;
  const [selected, setSelected] = useState(0);

  const entry = tree?.questions[selected];

  return (
    <AnimatePresence>
      {tree && entry && (
        <motion.div
          key={activeDialogue}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 sm:p-6"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="w-full max-w-2xl border-4 border-[var(--ink)] bg-[var(--parchment)] text-[var(--ink)] shadow-[6px_6px_0_0_var(--ink)]">
            <header className="flex items-center justify-between border-b-4 border-[var(--ink)] bg-[var(--accent)] px-4 py-2">
              <h2 className="font-display text-lg tracking-wide">
                {tree.speaker ?? "…"}
              </h2>
              <button
                onClick={closeDialogue}
                aria-label="Close dialogue"
                className="font-display text-xl leading-none hover:text-[var(--parchment)]"
              >
                ✕
              </button>
            </header>

            <div className="px-4 py-4">
              <p className="min-h-16 font-sans text-base leading-7">{entry.answer}</p>

              <ul className="mt-4 flex flex-col gap-2">
                {tree.questions.map((q, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setSelected(i)}
                      className={
                        "w-full border-2 border-[var(--ink)] px-3 py-2 text-left font-sans text-sm transition-colors " +
                        (i === selected
                          ? "bg-[var(--ink)] text-[var(--parchment)]"
                          : "bg-transparent hover:bg-[var(--accent)]/40")
                      }
                    >
                      {q.question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
