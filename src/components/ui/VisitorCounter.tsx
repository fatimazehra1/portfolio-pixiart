"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

/**
 * The visitor counter: an old-web odometer, in the world's pixels.
 *
 * Digit tiles that roll up to the total when the page opens, a small
 * "Visitors" label, and underneath, your own number. It counts each visitor
 * once (see `/api/visits`), and this browser remembers its number so it only
 * asks to be counted the first time.
 *
 * `size` is `"md"` for the desktop corner and `"sm"` for the phone's map.
 */

const MINE_KEY = "portfolio.visitor";
/** Always at least this many tiles, like a real counter. */
const MIN_DIGITS = 5;

export default function VisitorCounter({ size = "md" }: { size?: "sm" | "md" }) {
  const [total, setTotal] = useState<number | null>(null);
  const [you, setYou] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const reduce = useReducedMotion();

  // Counted once per browser, ever; after that, only the total is read.
  useEffect(() => {
    let saved: number | null = null;
    try {
      const raw = window.localStorage.getItem(MINE_KEY);
      saved = raw ? Number(raw) || null : null;
    } catch {
      // No storage: the server's own check still stops a double count.
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/visits", {
          method: saved ? "GET" : "POST",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data: { total: number; you?: number } = await response.json();
        if (cancelled) return;
        setTotal(data.total);
        const mine = data.you ?? saved;
        setYou(mine);
        if (data.you) {
          try {
            window.localStorage.setItem(MINE_KEY, String(data.you));
          } catch {
            // Fine.
          }
        }
      } catch {
        // Offline or unavailable: the counter simply does not appear.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Roll the digits up to the total.
  useEffect(() => {
    if (total === null) return;
    if (reduce) {
      const timer = window.setTimeout(() => setShown(total), 0);
      return () => window.clearTimeout(timer);
    }
    const controls = animate(0, total, {
      duration: Math.min(1.8, 0.6 + total / 400),
      ease: "easeOut",
      onUpdate: (value) => setShown(Math.round(value)),
    });
    return () => controls.stop();
  }, [total, reduce]);

  if (total === null) return null;

  const digits = String(shown).padStart(Math.max(MIN_DIGITS, String(total).length), "0").split("");
  const small = size === "sm";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`ui-panel font-sans ${small ? "px-2 py-1.5" : "px-2.5 py-2"}`}
      aria-label={`${total} visitors so far${you ? `. You are visitor number ${you}` : ""}`}
      role="status"
    >
      <div className="flex items-center gap-2">
        <span
          className={`font-display tracking-wider uppercase ${small ? "text-[0.5625rem]" : "text-[0.625rem]"}`}
          style={{ color: "var(--ui-faint)" }}
          aria-hidden
        >
          Visitors
        </span>
        <span className="flex gap-[2px]" aria-hidden>
          {digits.map((digit, index) => (
            <span
              key={index}
              className={`font-display flex items-center justify-center tabular-nums ${
                small ? "h-5 w-3.5 text-[0.75rem]" : "h-6 w-[1.125rem] text-[0.875rem]"
              }`}
              style={{
                background: "#06090f",
                color: "var(--accent)",
                // A hairline across the middle, like a split-flap tile.
                backgroundImage:
                  "linear-gradient(transparent calc(50% - 0.5px), rgb(255 255 255 / 0.08) calc(50% - 0.5px), rgb(255 255 255 / 0.08) calc(50% + 0.5px), transparent calc(50% + 0.5px))",
                boxShadow: "inset 0 0 0 1px var(--ui-border)",
              }}
            >
              {digit}
            </span>
          ))}
        </span>
      </div>
      {you && (
        <p
          className={`mt-1 text-right leading-none ${small ? "text-[0.5625rem]" : "text-[0.625rem]"}`}
          style={{ color: "var(--ui-muted)" }}
          aria-hidden
        >
          You&apos;re visitor <span style={{ color: "var(--accent)" }}>#{you.toLocaleString()}</span>
        </p>
      )}
    </motion.div>
  );
}
