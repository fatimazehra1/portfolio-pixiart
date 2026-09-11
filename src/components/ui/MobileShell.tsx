"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CHAPTER_TIMELINE, PROFILE } from "@/data/chapters";
import { WRITTEN_PAGES } from "@/data/pages";
import { SECRET_CAT } from "@/engine/cats";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";
import CatBucket from "./CatBucket";
import { SHEET_HEIGHT } from "./MobileSheet";

/**
 * The whole interface, on a phone.
 *
 * # Not the desktop layout, smaller
 * The sidebar is 256 pixels of panel against a 375-pixel screen: scaled down
 * it is a column of unreadable type over two thirds of the map. So it is gone,
 * and what replaces it is the smallest thing that can carry the same three
 * jobs — who this is, where to go, and the way out to the document. A slim bar
 * at the top, a menu behind it, and one floating button.
 *
 * The world underneath is the same world. Only the camera changes, and that is
 * the engine's business (`World.setMobile`), not this file's.
 *
 * # Tap, and nothing else
 * No long-press, no double-tap, no swipe to open anything. Every control here
 * responds to one tap and gives its feedback immediately. The one gesture that
 * is not a tap is dragging the map, which is the map, not a control.
 */

/** Where the first-run hint records that it has been shown. */
const HINT_KEY = "portfolio.mobile-hint";

export default function MobileShell() {
  const view = useWorldStore((s) => s.view);
  const menuOpen = useWorldStore((s) => s.menuOpen);
  const setMenuOpen = useWorldStore((s) => s.setMenuOpen);

  const inside = view === "inside" || view === "entering";

  return (
    <>
      <TopBar onMenu={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} />

      <AnimatePresence>{menuOpen && <Menu onClose={() => setMenuOpen(false)} />}</AnimatePresence>

      {/* The way back out of a world. Under the top bar rather than down by
          the sheet: the sheet already answers a downward swipe, and two ways
          out an inch apart is one too many. */}
      <AnimatePresence>
        {inside && (
          <motion.button
            key="back"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => getWorld()?.leaveChapter()}
            className="ui-panel ui-button absolute top-[3.75rem] left-3 flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 font-sans text-[0.8125rem]"
            style={{ color: "var(--ui-text)" }}
          >
            <span aria-hidden>←</span> Map
          </motion.button>
        )}
      </AnimatePresence>

      {/* Persistent, and deliberately the only thing floating over the world:
          the one visitor who cannot afford to explore needs exactly this. */}
      <Link
        href="/resume"
        prefetch
        className="ui-panel ui-button font-display absolute left-3 flex items-center px-3 py-2 text-[0.8125rem] tracking-wide transition-[bottom] duration-300"
        // Lifted clear of the sheet while one is open, rather than hidden
        // under it. It is the one control that has to be reachable from every
        // state, which is the whole reason it floats.
        style={{
          color: "var(--ui-text)",
          bottom: inside ? `calc(${SHEET_HEIGHT} + 0.75rem)` : "0.75rem",
        }}
      >
        Resume
      </Link>

      <FirstRunHint />
    </>
  );
}

/**
 * The top bar: who, the cats, and the menu.
 *
 * Initials rather than the full name, because "Fatima Zehra Shakeel" at a
 * readable size is most of a 320-pixel bar. The full name is the first line of
 * the menu, which is one tap away and has room for it.
 */
function TopBar({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const findCat = useWorldStore((s) => s.findCat);
  const presses = useRef(0);

  // The same five presses as the sidebar's name. The initials are the logo
  // here, so the secret cat is behind them here.
  const countPress = () => {
    presses.current += 1;
    if (presses.current < SECRET_CAT.clicks) return;
    presses.current = 0;
    findCat(SECRET_CAT.id, SECRET_CAT.name);
  };

  const initials = PROFILE.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <header
      className="ui-panel absolute inset-x-0 top-0 flex h-12 items-center justify-between gap-2 border-x-0 border-t-0 px-3"
      style={{ boxShadow: "0 2px 0 0 var(--ui-edge)" }}
    >
      <span
        className="font-display text-[1rem] leading-none font-semibold tracking-[0.12em]"
        style={{ color: "var(--ui-text)" }}
        onClick={countPress}
      >
        {initials}
      </span>

      <div className="flex items-center gap-2">
        <div className="relative flex">
          <CatBucket />
        </div>
        <button
          type="button"
          onClick={onMenu}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="ui-panel ui-button flex h-[2.375rem] w-[2.375rem] cursor-pointer items-center justify-center"
          style={{ color: "var(--ui-text)" }}
        >
          {/* Three bars, or a cross. Drawn on the pixel grid like every other
              mark here rather than borrowed from an icon font. */}
          <svg width="16" height="16" viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden>
            {menuOpen ? (
              <path
                d="M2 2h2v2H2z M4 4h2v2H4z M6 6h2v2H6z M8 8h2v2H8z M8 2h2v2H8z M6 4h2v2H6z M4 6h2v2H4z M2 8h2v2H2z"
                fill="currentColor"
              />
            ) : (
              <path d="M1 2h10v2H1z M1 5h10v2H1z M1 8h10v2H1z" fill="currentColor" />
            )}
          </svg>
        </button>
      </div>
    </header>
  );
}

/**
 * The menu: everywhere this site goes, as one full-screen list.
 *
 * Full screen rather than a drawer because there are nine worlds plus four
 * pages and a drawer would scroll inside a scroll. Every row is a tap target
 * at least 44 pixels tall, which is the only accessibility number that matters
 * on a device held in one hand.
 */
function Menu({ onClose }: { onClose: () => void }) {
  const go = (id: string) => {
    const world = getWorld();
    onClose();
    if (!world) return;
    if (world.state.mode === "inside") world.leaveChapter();
    world.enterChapter(id);
  };

  return (
    <motion.nav
      key="menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="ui-scroll absolute inset-0 z-20 overflow-y-auto px-4 pt-16 pb-8 font-sans"
      style={{ background: "var(--ui-panel-strong)" }}
      aria-label="Menu"
    >
      <p
        className="font-display text-[1.25rem] leading-tight font-semibold"
        style={{ color: "var(--ui-text)" }}
      >
        {PROFILE.name}
      </p>
      <p className="mt-1.5 text-[0.8125rem] leading-snug" style={{ color: "var(--ui-muted)" }}>
        {PROFILE.tagline}
      </p>

      <p
        className="mt-6 text-[0.6875rem] tracking-[0.14em] uppercase"
        style={{ color: "var(--ui-faint)" }}
      >
        Explore
      </p>
      <ul className="mt-2">
        {CHAPTER_TIMELINE.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => go(entry.id)}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-b-2 py-2.5 text-left"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}
            >
              <span className="text-[0.9375rem]">{entry.title}</span>
              <span className="text-[0.75rem] tabular-nums" style={{ color: "var(--ui-faint)" }}>
                {entry.period}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p
        className="mt-6 text-[0.6875rem] tracking-[0.14em] uppercase"
        style={{ color: "var(--ui-faint)" }}
      >
        Read
      </p>
      <ul className="mt-2">
        {WRITTEN_PAGES.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              prefetch
              onClick={onClose}
              className="flex min-h-11 items-center border-b-2 py-2.5 text-[0.9375rem]"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}
            >
              {page.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/resume"
            prefetch
            onClick={onClose}
            className="flex min-h-11 items-center py-2.5 text-[0.9375rem]"
            style={{ color: "var(--ui-text)" }}
          >
            Resume
          </Link>
        </li>
      </ul>
    </motion.nav>
  );
}

/**
 * One sentence, once, and then never again.
 *
 * It says what the two gestures are and nothing else — no arrows, no overlay
 * to dismiss, no step two. It goes on the visitor's first touch of the screen
 * whatever that touch was, because somebody who has already started dragging
 * has read it by doing it.
 */
function FirstRunHint() {
  const isMobile = useWorldStore((s) => s.isMobile);
  const ready = useWorldStore((s) => s.isReady);
  const node = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!isMobile || !ready) return;

    let seen = true;
    try {
      seen = window.localStorage.getItem(HINT_KEY) === "seen";
    } catch {
      // Storage blocked: show it, and show it again next time. One sentence
      // is not worth failing over.
      seen = false;
    }
    if (seen) return;

    const element = node.current;
    if (!element) return;
    element.style.opacity = "1";

    const dismiss = () => {
      element.style.opacity = "0";
      try {
        window.localStorage.setItem(HINT_KEY, "seen");
      } catch {
        // See above.
      }
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };

    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [isMobile, ready]);

  return (
    <p
      ref={node}
      className="ui-panel pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 text-center font-sans text-[0.8125rem] opacity-0 transition-opacity duration-300"
      style={{ color: "var(--ui-text)" }}
      role="status"
    >
      Drag to explore. Tap a building to enter.
    </p>
  );
}
