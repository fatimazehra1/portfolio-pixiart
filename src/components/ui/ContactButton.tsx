"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import RecruiterPath from "./RecruiterPath";

/**
 * Contact, from anywhere.
 *
 * Sits beside Resume in the bottom-right cluster, which is on screen on the
 * hub and inside every world. One plain click opens the recruiter path with
 * the contact links under it, so role, stack and a way to get in touch are
 * never more than one obvious button away.
 */
export default function ContactButton() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="ui-panel ui-button font-display flex cursor-pointer items-center px-3 py-2 text-[0.875rem] tracking-wide transition-colors"
        style={{ color: "var(--ui-text)" }}
      >
        Contact
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="ui-panel ui-scroll absolute right-0 bottom-full mb-2 max-h-[calc(100dvh-6rem)] w-[19rem] overflow-y-auto p-3.5"
            role="dialog"
            aria-label="At a glance and contact"
          >
            <RecruiterPath withContact />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
