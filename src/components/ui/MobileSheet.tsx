"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CHAPTER_TIMELINE, contentFor } from "@/data/chapters";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";
import InfoCard from "./InfoCard";
import { MOBILE_WORLD_HEIGHT } from "./layout";

/**
 * Inside an island, on a phone: the world above, the panel below.
 *
 * # A split, not a sheet
 * The old sheet floated over a full-screen world, so the building was framed
 * for the whole screen and then half covered: what was left in view was sky
 * and scaffolding. Now the canvas itself is shortened to `MOBILE_WORLD_HEIGHT`
 * while you are inside (see `PixiCanvas`), the engine frames the building for
 * that strip, and the panel owns the rest of the screen as an ordinary page.
 * Nothing is behind anything.
 *
 * # The header
 * Back to the map, where you are, and the previous and next island in the
 * order the career happened, so reading the islands in sequence is one tap
 * each rather than a trip back to the map.
 */


const ORDER = CHAPTER_TIMELINE.map((content) => content.id);

export default function MobileSheet() {
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);

  const inside = view === "inside" || view === "entering";
  const content = chapterId ? contentFor(chapterId) : undefined;

  return (
    <AnimatePresence>
      {inside && content && (
        <motion.section
          key="panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 36 }}
          className="ui-plaque absolute inset-x-0 bottom-0 z-20 flex flex-col font-sans"
          style={{ top: MOBILE_WORLD_HEIGHT, borderLeft: 0, borderRight: 0, borderBottom: 0 }}
          aria-label={content.title}
        >
          <Header id={content.id} title={content.title} period={content.period} />
          <div className="ui-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <InfoCard content={content} bare />
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function Header({ id, title, period }: { id: string; title: string; period: string }) {
  const index = ORDER.indexOf(id);
  const go = (by: number) => {
    const next = ORDER[(index + by + ORDER.length) % ORDER.length];
    getWorld()?.goToChapter(next);
  };
  const isContact = id === "lighthouse";

  return (
    <header
      className="flex shrink-0 items-center gap-2 px-2 py-1.5"
      style={{ background: "var(--plaque-brass)", borderBottom: "2px solid var(--plaque-frame)", color: "#241a10" }}
    >
      <button
        type="button"
        onClick={() => getWorld()?.leaveChapter()}
        className="flex min-h-11 cursor-pointer items-center gap-1 px-1.5 text-[0.8125rem] font-semibold"
      >
        <span aria-hidden>←</span> Map
      </button>
      <div className="min-w-0 flex-1 text-center">
        <h2 className="font-display truncate text-[1rem] leading-tight font-semibold tracking-wide">
          {isContact ? "Contact" : title}
        </h2>
        <p className="text-[0.625rem] tracking-wider uppercase tabular-nums opacity-80">
          {isContact ? "Get in touch" : period}
        </p>
      </div>
      <div className="flex">
        <HeaderArrow label="Previous island" onClick={() => go(-1)}>
          ‹
        </HeaderArrow>
        <HeaderArrow label="Next island" onClick={() => go(1)}>
          ›
        </HeaderArrow>
      </div>
    </header>
  );
}

function HeaderArrow({
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
      className="flex h-11 w-10 cursor-pointer items-center justify-center text-[1.375rem] leading-none"
    >
      {children}
    </button>
  );
}
