"use client";

import { motion } from "framer-motion";
import { CHAPTER_TIMELINE } from "@/data/chapters";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The world navigation strip.
 *
 * Not a navbar. A navbar is a list of pages and this is a set of *places* — so
 * it reads as a control strip along the bottom of a viewport: chapter markers
 * on a line, in the order the career happened, with the one you are in marked.
 *
 * # Why it is a line and not a menu
 * The chapters have an order, and the order is the story. A dropdown would
 * throw that away and a grid would imply they are alternatives to each other.
 * A line says "these happened, in this sequence", which is the one thing the
 * overview's deliberately non-chronological layout cannot say on its own —
 * the map is composed for looking at, and this is the index to it.
 *
 * Clicking a marker flies to that world from wherever you are.
 */

const DOT: Record<string, string> = {
  current: "var(--ui-current)",
  past: "var(--ui-past)",
  ongoing: "var(--ui-ongoing)",
};

export default function UniverseTimeline() {
  const isReady = useWorldStore((s) => s.isReady);
  const chapterId = useWorldStore((s) => s.chapterId);
  const view = useWorldStore((s) => s.view);

  if (!isReady) return null;

  const go = (id: string) => {
    const world = getWorld();
    if (!world) return;
    // From inside another world, leaving first is the only legal move — the
    // director refuses a second `enter` while one is open, and silently doing
    // nothing would read as a dead button.
    if (world.state.mode === "inside") world.leaveChapter();
    world.enterChapter(id);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
      className="ui-panel absolute bottom-4 left-1/2 hidden -translate-x-1/2 px-2 py-1.5 font-sans sm:block"
      aria-label="Career chapters"
    >
      <ol className="flex items-stretch gap-0.5">
        {CHAPTER_TIMELINE.map((content) => {
          const active = chapterId === content.id && view !== "overview";
          return (
            <li key={content.id}>
              <button
                type="button"
                onClick={() => go(content.id)}
                onPointerEnter={() => getWorld()?.universe.hover(content.id)}
                onPointerLeave={() => getWorld()?.universe.hover(null)}
                className="group flex min-w-[4.25rem] cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/8"
                aria-current={active ? "true" : undefined}
                title={`${content.title} · ${content.period}`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-125"
                  style={{
                    background: DOT[content.status] ?? "var(--ui-faint)",
                    // The world you are in is the only one at full strength.
                    opacity: active || view === "overview" ? 1 : 0.5,
                  }}
                  aria-hidden
                />
                <span
                  className="text-[0.6875rem] leading-none font-medium whitespace-nowrap"
                  style={{ color: active ? "var(--ui-text)" : "var(--ui-muted)" }}
                >
                  {content.title}
                </span>
                <span
                  className="text-[0.625rem] leading-none tabular-nums"
                  style={{ color: "var(--ui-faint)" }}
                >
                  {content.startYear < 2100 ? content.startYear : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </motion.nav>
  );
}
