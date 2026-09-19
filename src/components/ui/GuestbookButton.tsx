"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useFeedbackStore } from "@/stores/feedbackStore";
import Guestbook from "./Guestbook";
import PhoneSheet from "./PhoneSheet";

/**
 * The guestbook, from the corner.
 *
 * The one filled button in the corner, in the site's own accent, with a count
 * and a soft glow until the visitor has used it. Every other control here is
 * a dark panel because it is navigation; this one is an invitation.
 *
 * Once per visitor, a short while in, a speech bubble says what it is for.
 * It goes away on any tap and is never shown again.
 */

const NUDGE_KEY = "portfolio.guestbook.nudged";
/** Seconds before the bubble appears: long enough to have looked around. */
const NUDGE_AFTER = 12;

export default function GuestbookButton({ placement }: { placement: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const status = useFeedbackStore((s) => s.status);
  const load = useFeedbackStore((s) => s.load);
  const total = useFeedbackStore((s) =>
    Object.values(s.data.reactions).reduce((sum, count) => sum + count, 0)
  );
  const used = useFeedbackStore((s) => s.mine.reactions.length > 0 || s.mine.suggestions.length > 0);

  // Counts on the button from the start, not only once it is opened.
  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  // The one-time bubble.
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(NUDGE_KEY) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const timer = window.setTimeout(() => setNudge(true), NUDGE_AFTER * 1000);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissNudge = () => {
    setNudge(false);
    try {
      window.localStorage.setItem(NUDGE_KEY, "1");
    } catch {
      // Fine: it just may appear once more next visit.
    }
  };

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

  const toggle = () => {
    dismissNudge();
    setOpen(!open);
  };

  const compact = placement === "down";

  return (
    <div ref={root} className="relative flex">
      <motion.button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Leave feedback. ${total} reactions so far`}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
        animate={
          reduce || used || open
            ? undefined
            : { boxShadow: ["0 0 0 0 rgb(224 164 88 / 0.5)", "0 0 0 7px rgb(224 164 88 / 0)"] }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
        className={`font-display relative flex cursor-pointer items-center justify-center gap-1.5 border-2 ${
          compact ? "h-[2.375rem] px-2.5 text-[0.8125rem]" : "px-3 py-2 text-[0.875rem]"
        }`}
        style={{
          // The site's one warm accent, filled: the only filled control in the
          // corner, which is all it takes to read as the one asking for a tap.
          borderColor: "#06090f",
          background: "var(--accent)",
          color: "#1a1208",
          boxShadow: "0 0 0 2px var(--ui-edge)",
        }}
      >
        <span aria-hidden className="text-[1rem] leading-none">
          ♥
        </span>
        {!compact && <span className="tracking-wide">Feedback</span>}
        {total > 0 && (
          <span
            className="min-w-[1.25rem] px-1 font-sans text-[0.6875rem] leading-[1.125rem] font-bold tabular-nums"
            style={{ background: "rgb(26 18 8 / 0.18)" }}
          >
            {total}
          </span>
        )}
      </motion.button>

      {/* The one-time bubble. */}
      <AnimatePresence>
        {nudge && !open && (
          <motion.div
            initial={{ opacity: 0, y: compact ? -6 : 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className={`absolute z-40 w-[12.5rem] border-2 font-sans text-[0.75rem] leading-snug ${
              compact ? "fixed top-[3.625rem] right-3" : "right-0 bottom-full mb-2.5"
            }`}
            style={{ borderColor: "#06090f", background: "#fff7e8", color: "#241c12" }}
            role="status"
          >
            <button type="button" onClick={toggle} className="block w-full cursor-pointer px-3 py-2 pr-6 text-left">
              <span className="font-semibold">Enjoying the islands?</span> Leave a ♥ or a quick
              suggestion. One tap, no forms.
            </button>
            <button
              type="button"
              onClick={dismissNudge}
              aria-label="Dismiss"
              className="absolute top-0.5 right-0.5 flex h-6 w-6 cursor-pointer items-center justify-center text-[0.875rem] leading-none opacity-60 hover:opacity-100"
            >
              ×
            </button>
            {/* The pointer, on a desktop only: on a phone the bubble is pinned to
                the screen edge rather than to the button, so it points at nothing. */}
            {!compact && (
              <span
                aria-hidden
                className="absolute right-5 -bottom-[7px] h-2.5 w-2.5 rotate-45 border-2 border-t-0 border-l-0"
                style={{ borderColor: "#06090f", background: "#fff7e8" }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && compact && (
          <PhoneSheet key="sheet" title="Feedback" onClose={() => setOpen(false)}>
            <Guestbook />
          </PhoneSheet>
        )}
        {open && !compact && (
          <motion.div
            key="popover"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="ui-panel ui-scroll absolute right-0 bottom-full z-40 mb-2 max-h-[calc(100dvh-6rem)] w-[20rem] overflow-y-auto p-3.5"
            role="dialog"
            aria-label="Guestbook"
          >
            <Guestbook />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
