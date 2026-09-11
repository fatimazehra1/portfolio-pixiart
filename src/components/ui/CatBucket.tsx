"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ALL_CAT_IDS, CATS, SECRET_CAT, catName } from "@/engine/cats";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The bucket, the collection, and the cat that flies into it.
 *
 * # The one rule this feature lives under
 * A recruiter must be able to use this site and never notice it. So: no
 * tutorial, no popup, no badge, no arrow pointing at anything. The bucket is a
 * small square in a corner that says one sentence when you hover it, and the
 * panel behind it only opens if you press it. Nothing here ever takes focus,
 * blocks a click, or appears unasked.
 *
 * # Why the arc is DOM and the cat is not
 * The cat lives in the world, on a pixel grid, behind a building. The bucket
 * is a panel in the corner of the interface. There is no coordinate space they
 * share, so the catch is handed over at the seam: the engine reports where the
 * cat was, and a DOM sprite flies from that point to this one. Drawing the arc
 * in the world would mean the engine knowing where a React component rendered.
 */

/** Where the found list is kept. */
const STORAGE_KEY = "portfolio.cats";

/** How long the flying cat takes to reach the bucket. */
const ARC_SECONDS = 0.7;

export default function CatBucket() {
  const found = useWorldStore((s) => s.catsFound);
  const open = useWorldStore((s) => s.catsOpen);
  const setOpen = useWorldStore((s) => s.setCatsOpen);
  const caught = useWorldStore((s) => s.caught);
  const clearCaught = useWorldStore((s) => s.clearCaught);
  const restoreCats = useWorldStore((s) => s.restoreCats);

  const bucket = useRef<HTMLButtonElement | null>(null);

  // Restore on mount, never during render: the server has no localStorage and
  // a bucket that renders full and then empties is a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const ids: unknown = JSON.parse(raw);
      if (Array.isArray(ids)) restoreCats(ids.filter((id): id is string => typeof id === "string"));
    } catch {
      // A corrupt entry is an empty collection, not an error page.
    }
  }, [restoreCats]);

  // Written on every change rather than on every catch, so the secret cat —
  // which is found somewhere else entirely — is saved by the same line.
  useEffect(() => {
    if (found.length === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    } catch {
      // A visitor with storage blocked still gets to collect them; they just
      // do not survive the reload. That is a fine outcome for an easter egg.
    }
  }, [found]);

  // The arc clears itself. Nothing else has to remember to.
  useEffect(() => {
    if (!caught) return;
    const timer = window.setTimeout(() => clearCaught(), ARC_SECONDS * 1000 + 250);
    return () => window.clearTimeout(timer);
  }, [caught, clearCaught]);

  const total = ALL_CAT_IDS.length;
  const fill = total > 0 ? found.length / total : 0;

  return (
    <>
      <FlyingCat caught={caught} target={bucket} />

      <button
        ref={bucket}
        type="button"
        onClick={() => setOpen(!open)}
        // The only words this feature says unprompted, and only on hover.
        title="There are cats around here."
        aria-label="There are cats around here."
        aria-expanded={open}
        // `motion` on the wrapper so the bucket can wiggle when one lands.
        className="ui-panel ui-button relative flex h-[2.625rem] w-[2.625rem] cursor-pointer items-end justify-center overflow-hidden p-0 transition-colors"
      >
        {/* The fill: a flat band rising from the bottom, no gradient. It is
            the only progress indicator on the site and it carries no number. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 transition-[height] duration-500"
          style={{ height: `${Math.round(fill * 100)}%`, background: "var(--accent)", opacity: 0.85 }}
        />
        <span className="relative mb-[0.35rem]" style={{ color: "var(--ui-text)" }}>
          <BucketMark filled={found.length > 0} />
        </span>
      </button>

      <AnimatePresence>
        {open && <CatPanel found={found} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

/**
 * The collection: every cat in the roster, found ones named, the rest as
 * silhouettes.
 *
 * The count is worded as "7 cats discovered" rather than "7 of 10" on purpose.
 * A fraction turns a thing you stumbled on into a task with a completion state,
 * and the moment it has one, a visitor who does not want to play it is being
 * shown something unfinished.
 */
function CatPanel({ found, onClose }: { found: readonly string[]; onClose: () => void }) {
  const word = found.length === 1 ? "cat" : "cats";

  return (
    <motion.div
      key="cats"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="ui-panel ui-scroll absolute right-0 bottom-[3.25rem] max-h-[60dvh] w-[17rem] overflow-y-auto p-3 font-sans"
      role="dialog"
      aria-label="Cats"
    >
      <div className="flex items-baseline justify-between">
        <p
          className="font-display text-[0.9375rem] leading-none font-semibold tracking-wide"
          style={{ color: "var(--ui-text)" }}
        >
          {found.length} {word} discovered
        </p>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-[0.75rem] leading-none hover:opacity-70"
          style={{ color: "var(--ui-faint)" }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2">
        {ALL_CAT_IDS.map((id) => {
          const isFound = found.includes(id);
          // The secret one is listed but never named until it is found. That
          // is the only hint the feature gives: there is one more somewhere.
          const label = isFound ? (catName(id) ?? "Cat") : id === SECRET_CAT.id ? "???" : "???";
          return (
            <li
              key={id}
              className="flex flex-col items-center gap-1 border-2 px-1 py-2"
              style={{
                borderColor: isFound ? "var(--ui-border)" : "var(--ui-edge)",
                background: isFound ? "transparent" : "rgb(6 9 15 / 0.35)",
              }}
            >
              <CatMark found={isFound} />
              <span
                className="text-center text-[0.625rem] leading-tight"
                style={{ color: isFound ? "var(--ui-muted)" : "var(--ui-faint)" }}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

/**
 * The cat that flies from where it was sitting to the bucket.
 *
 * A single arc, seven tenths of a second, and then it is gone. Positioned from
 * the engine's own world-to-screen conversion at the moment it launches — the
 * camera is not moving during a catch, so one reading is enough and a
 * per-frame loop would be three hundred reads for a gesture nobody watches
 * twice.
 */
function FlyingCat({
  caught,
  target,
}: {
  caught: { name: string; x: number; y: number; at: number } | null;
  target: React.RefObject<HTMLButtonElement | null>;
}) {
  if (!caught) return null;

  const from = getWorld()?.insideScreen(caught.x, caught.y);
  const box = target.current?.getBoundingClientRect();
  if (!from || !box) return null;

  const to = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  // The apex sits above both ends, so the path reads as thrown rather than
  // dragged. Framer interpolates x and y independently, which is what makes
  // three keyframes on y and two on x an arc at all.
  const apex = Math.min(from.y, to.y) - 90;

  return (
    <>
      <motion.span
        key={`meow-${caught.at}`}
        className="ui-panel pointer-events-none fixed z-30 px-1.5 py-0.5 font-sans text-[0.6875rem] whitespace-nowrap"
        style={{ color: "var(--ui-text)", left: 0, top: 0 }}
        initial={{ opacity: 0, x: from.x, y: from.y - 14 }}
        animate={{ opacity: [0, 1, 1, 0], y: from.y - 34 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        {caught.name} · meow
      </motion.span>

      <motion.span
        key={`arc-${caught.at}`}
        className="pointer-events-none fixed z-30"
        style={{ left: 0, top: 0, color: "var(--accent)" }}
        initial={{ x: from.x, y: from.y, opacity: 1, scale: 1 }}
        animate={{ x: to.x, y: [from.y, apex, to.y], opacity: [1, 1, 0], scale: 0.6 }}
        transition={{ duration: ARC_SECONDS, ease: "easeInOut" }}
      >
        <CatMark found />
      </motion.span>
    </>
  );
}

/**
 * A cat, on a 12-pixel grid: ears, a body and a tail.
 *
 * Whole-number coordinates and `crispEdges` only. An antialiased icon beside
 * pixel art is the one thing on screen that would look like a mistake.
 */
function CatMark({ found }: { found: boolean }) {
  return (
    <svg width="18" height="14" viewBox="0 0 12 9" shapeRendering="crispEdges" aria-hidden>
      <path
        d="M2 0h1v2H2z M5 0h1v2H5z M2 2h4v2H2z M1 4h7v4H1z M8 5h1v3H8z M9 4h1v1H9z"
        fill="currentColor"
        opacity={found ? 1 : 0.28}
      />
      {found && (
        <path d="M2 2h1v1H2z M5 2h1v1H5z" fill="var(--ui-panel)" opacity="0.9" />
      )}
    </svg>
  );
}

/** The bucket itself: a tapered pail with a handle, in eight pixels. */
function BucketMark({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 10 10" shapeRendering="crispEdges" aria-hidden>
      <path
        d="M2 1h6v1H2z M2 2h1v7H2z M7 2h1v7H7z M3 9h4v1H3z"
        fill="currentColor"
        opacity={filled ? 1 : 0.75}
      />
      <path d="M1 0h1v2H1z M8 0h1v2H8z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

/** How many cats there are, for anything that needs the roster size. */
export const CAT_TOTAL = CATS.length + 1;
