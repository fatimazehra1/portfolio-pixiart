"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CHAPTER_TIMELINE, PROFILE, contentFor } from "@/data/chapters";
import { WRITTEN_PAGES } from "@/data/pages";
import { panelFor } from "@/data/panelContent";
import { SECRET_CAT } from "@/engine/cats";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";
import CatBucket from "./CatBucket";
import RecruiterPath from "./RecruiterPath";
import SkyControls from "./SkyControls";
import GuestbookButton from "./GuestbookButton";

/**
 * The whole interface, on a phone. Designed for the phone first, not the
 * desktop layout squeezed down.
 *
 * # Two states, two layouts
 *  - **On the map**, the world fills the screen under a slim top bar, and an
 *    island dock at the bottom names the island you are looking at, says what
 *    it was in one line, and has one big button to go in. Arrows step through
 *    the islands in order; dragging the map updates the dock too. Nothing about
 *    where to go depends on finding a building by eye.
 *  - **Inside an island**, the screen splits: the world on top, framed on its
 *    own (the canvas really is shorter, so the building is composed for the
 *    space it has instead of hiding behind a card), and the panel underneath as
 *    a normal page you scroll. See `MobilePanel`.
 *
 * # Tap, and nothing else
 * No long-press, no double-tap, no swipe to open anything. Every control here
 * responds to one tap. The one gesture that is not a tap is dragging the map.
 */

/** Where the first-run hint records that it has been shown. */
const HINT_KEY = "portfolio.mobile-hint";

/** Every island, in the order the career happened. */
const ORDER = CHAPTER_TIMELINE.map((content) => content.id);

export default function MobileShell() {
  const view = useWorldStore((s) => s.view);
  const menuOpen = useWorldStore((s) => s.menuOpen);
  const setMenuOpen = useWorldStore((s) => s.setMenuOpen);

  return (
    <>
      <TopBar onMenu={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} />

      <AnimatePresence>{view === "overview" && <IslandDock key="dock" />}</AnimatePresence>

      <AnimatePresence>{menuOpen && <Menu onClose={() => setMenuOpen(false)} />}</AnimatePresence>

      <FirstRunHint />
    </>
  );
}

/**
 * The top bar: who, the sky, the cats, the resume, and the menu. The resume is
 * here rather than floating over the world, so it is in the same place in
 * every state and never covers the building.
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
      className="ui-panel absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between gap-2 border-x-0 border-t-0 px-3"
      style={{ boxShadow: "0 2px 0 0 var(--ui-edge)" }}
    >
      <span
        className="font-display text-[1rem] leading-none font-semibold tracking-[0.12em]"
        style={{ color: "var(--ui-text)" }}
        onClick={countPress}
      >
        {initials}
      </span>

      <div className="flex items-center gap-1.5">
        <SkyControls placement="down" />
        <GuestbookButton placement="down" />
        <div className="relative flex">
          <CatBucket />
        </div>
        <Link
          href="/resume"
          prefetch
          className="ui-panel ui-button font-display flex h-[2.375rem] items-center px-2.5 text-[0.8125rem] tracking-wide"
          style={{ color: "var(--ui-text)" }}
        >
          Resume
        </Link>
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
 * The island dock: which island is in front of you, what it was, and the way
 * in. Follows the map as you drag it; the arrows glide the map to the previous
 * or next island in the order the career happened.
 */
function IslandDock() {
  const [current, setCurrent] = useState<string>("naturetech");
  // While a glide the dock started is running, the map is not where the dock
  // says yet; do not let the follower overwrite the choice mid-glide.
  const heldUntil = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (Date.now() < heldUntil.current) return;
      const id = getWorld()?.nearestChapter();
      if (id) setCurrent(id);
    }, 350);
    return () => window.clearInterval(timer);
  }, []);

  const index = Math.max(0, ORDER.indexOf(current));
  const content = contentFor(current);
  const glance = panelFor(current)?.glance ?? content?.roleLine ?? "";
  const isContact = current === "lighthouse";

  const step = (by: number) => {
    const next = ORDER[(index + by + ORDER.length) % ORDER.length];
    heldUntil.current = Date.now() + 1400;
    setCurrent(next);
    getWorld()?.lookAtChapter(next);
  };

  if (!content) return null;

  return (
    <motion.section
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="ui-panel absolute inset-x-3 bottom-3 z-20 p-3 font-sans"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      aria-label="Islands"
    >
      <div className="flex items-center gap-2">
        <DockArrow label="Previous island" onClick={() => step(-1)}>
          ‹
        </DockArrow>
        <div className="min-w-0 flex-1 text-center">
          <p
            className="font-display truncate text-[1.0625rem] leading-tight font-semibold tracking-wide"
            style={{ color: "var(--ui-text)" }}
          >
            {isContact ? "Contact" : content.title}
          </p>
          <p className="mt-0.5 text-[0.6875rem] tabular-nums" style={{ color: "var(--ui-faint)" }}>
            {isContact ? "Get in touch" : content.period} · {index + 1} of {ORDER.length}
          </p>
        </div>
        <DockArrow label="Next island" onClick={() => step(1)}>
          ›
        </DockArrow>
      </div>

      <p
        className="mt-2 line-clamp-2 min-h-[2.5em] text-[0.8125rem] leading-snug"
        style={{ color: "var(--ui-muted)" }}
      >
        {glance}
      </p>

      <button
        type="button"
        onClick={() => getWorld()?.goToChapter(current)}
        className="font-display mt-2.5 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 text-[0.9375rem] tracking-wide"
        style={{ background: "var(--accent)", color: "#1a1208" }}
      >
        {isContact ? "Open contact" : `Enter ${content.title}`} →
      </button>
    </motion.section>
  );
}

function DockArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 text-[1.25rem] leading-none"
      style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}
    >
      {children}
    </button>
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
  const setTimelineOpen = useWorldStore((s) => s.setTimelineOpen);
  const go = (id: string) => {
    const world = getWorld();
    onClose();
    if (!world) return;
    world.goToChapter(id);
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

      <div className="mt-5 border-y-2 py-4" style={{ borderColor: "var(--ui-border)" }}>
        <RecruiterPath withContact />
      </div>

      <p
        className="mt-6 text-[0.6875rem] tracking-[0.14em] uppercase"
        style={{ color: "var(--ui-faint)" }}
      >
        Explore
      </p>
      <button
        type="button"
        onClick={() => {
          onClose();
          setTimelineOpen(true);
        }}
        className="mt-2 flex min-h-11 w-full cursor-pointer items-center border-b-2 py-2.5 text-left text-[0.9375rem]"
        style={{ borderColor: "var(--ui-border)", color: "var(--accent)" }}
      >
        The whole timeline, in order
      </button>
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
      className="ui-panel pointer-events-none absolute bottom-[11.5rem] left-1/2 z-20 -translate-x-1/2 px-3 py-2 text-center font-sans text-[0.8125rem] opacity-0 transition-opacity duration-300"
      style={{ color: "var(--ui-text)" }}
      role="status"
    >
      Drag the map, or use the arrows below.
    </p>
  );
}
