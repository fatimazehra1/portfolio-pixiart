"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * A panel on a phone: a sheet from the bottom edge, full width, over a dimmed
 * page, with a title and a close button.
 *
 * A popover hung off a button works on a desktop, where the button is in a
 * corner with room around it. In the phone's top bar the buttons sit in a row,
 * so a panel anchored to one of them ran off the side of the screen. A sheet
 * does not depend on where its button is, and sits where a thumb already is.
 *
 * Render inside `AnimatePresence`. `onClose` is called by the backdrop, the
 * close button and Escape.
 */
export default function PhoneSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "rgb(6 9 15 / 0.55)" }}
        aria-hidden
      />
      <motion.div
        key="sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="ui-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col border-x-0 border-b-0 font-sans"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="flex shrink-0 items-center justify-between border-b-2 px-4 py-2"
          style={{ borderColor: "var(--ui-border)" }}
        >
          <span className="font-display text-[1rem] tracking-wide" style={{ color: "var(--ui-text)" }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center text-[1.375rem] leading-none"
            style={{ color: "var(--ui-muted)" }}
          >
            ×
          </button>
        </div>
        <div className="ui-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </motion.div>
    </>
  );
}
