"use client";

import Link from "next/link";
import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CHAPTER_TIMELINE, PROFILE } from "@/data/chapters";
import { WRITTEN_PAGES } from "@/data/pages";
import { SECRET_CAT } from "@/engine/cats";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The hub's own panel: who this is, the shape of the career in three numbers,
 * and every world in the order it happened.
 *
 * # Hub-only, on purpose
 * This replaces the identity text and the bottom timeline strip, both of
 * which used to show everywhere. A sidebar this size sitting over a zoomed
 * scene would cover the one thing "do not modify the zoomed scenes" is
 * protecting, so it fades out the moment you leave the overview and back in
 * the moment you return — the scene list belongs to the map, not to a world
 * you are already standing in.
 *
 * # Why it looks like this
 * A hard-edged board in the world's palette (`.ui-panel`), headings in the
 * same bitmap face the signage in the world is lettered with, and a square
 * marker per scene instead of a round status dot. The body copy stays in the
 * text face at a size and contrast that can be read at a glance — the pixel
 * treatment is the *frame*, and the moment it reaches the sentences it is
 * costing the visitor something.
 */

/** One colour per status, and the marker takes the same one it labels with. */
const STATUS_COLOR: Record<string, string> = {
  current: "var(--ui-current)",
  past: "var(--ui-past)",
  ongoing: "var(--ui-ongoing)",
};

export default function Sidebar() {
  const isReady = useWorldStore((s) => s.isReady);
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);
  const findCat = useWorldStore((s) => s.findCat);

  /**
   * The secret cat: five presses on the name.
   *
   * The counter is a ref rather than state because nothing on screen changes
   * until the fifth one, and re-rendering the sidebar four times to count to
   * four would be four renders for nothing.
   */
  const presses = useRef(0);
  const countLogoPress = () => {
    presses.current += 1;
    if (presses.current < SECRET_CAT.clicks) return;
    presses.current = 0;
    findCat(SECRET_CAT.id, SECRET_CAT.name);
  };

  // Straight from PROFILE, and no longer with a technology count appended.
  // Three numbers about scale and ownership — years, things shipped, tenants
  // depending on them — say more than a tally of tools, and the fourth column
  // was the one nobody was reading.
  const stats = PROFILE.stats;

  if (!isReady) return null;


  const go = (id: string) => {
    const world = getWorld();
    if (!world) return;
    if (world.state.mode === "inside") world.leaveChapter();
    world.enterChapter(id);
  };

  return (
    <AnimatePresence>
      {view === "overview" && (
        <motion.aside
          key="sidebar"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="ui-panel ui-scroll absolute top-5 bottom-5 left-5 flex w-64 flex-col gap-4 overflow-y-auto p-4 font-sans"
          aria-label="Career overview"
        >
          <div>
            {/*
              The name is the closest thing this site has to a logo, which is
              why the one cat that belongs to no world is behind it. Pressing
              it five times finds it; pressing it once, or twenty times,
              changes nothing else. It stays a heading: no cursor change, no
              hover state, nothing that would make a visitor think it is a
              control they were supposed to use.
            */}
            <p
              className="font-display text-[1.125rem] leading-none font-semibold tracking-wide"
              style={{ color: "var(--ui-text)" }}
              onClick={countLogoPress}
            >
              {PROFILE.name}
            </p>
            <p className="mt-2 text-[0.8125rem] leading-snug" style={{ color: "var(--ui-muted)" }}>
              {PROFILE.tagline}
            </p>
            {/* What to do with the map you are looking at. The tagline is the
                positioning; this is the instruction. */}
            <p className="mt-1.5 text-[0.75rem] leading-snug" style={{ color: "var(--ui-faint)" }}>
              {PROFILE.subline}
            </p>
          </div>

          <dl
            className="grid grid-cols-3 gap-2 border-y-2 py-3"
            style={{ borderColor: "var(--ui-border)" }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt
                  className="text-[0.625rem] tracking-wider uppercase"
                  style={{ color: "var(--ui-faint)" }}
                >
                  {stat.label}
                </dt>
                <dd
                  // Figures stay in the text face. Pixelify's 5 and its S are a
                  // stroke apart at this size, and "3.5+ years" is a claim that has
                  // to be read correctly the first time.
                  className="mt-0.5 text-[1.0625rem] leading-tight font-semibold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <div>
            <p
              className="font-display mb-1.5 text-[0.8125rem] tracking-wider uppercase"
              style={{ color: "var(--ui-faint)" }}
            >
              Scenes
            </p>

            <ol className="flex flex-col">
              {CHAPTER_TIMELINE.map((content) => {
                const active = chapterId === content.id;
                const color = STATUS_COLOR[content.status] ?? "var(--ui-faint)";
                return (
                  <li key={content.id}>
                    <button
                      type="button"
                      onClick={() => go(content.id)}
                      onPointerEnter={() => getWorld()?.universe.hover(content.id)}
                      onPointerLeave={() => getWorld()?.universe.hover(null)}
                      className="flex w-full cursor-pointer items-center gap-2.5 border-2 border-transparent px-2 py-1.5 text-left transition-colors hover:border-[var(--ui-border)] hover:bg-[#182640]"
                      aria-current={active ? "true" : undefined}
                    >
                      {/* Square, hollow, and filled for wherever you are:
                          one shape doing the job the dot and the highlight
                          used to split between them. */}
                      <span
                        className={`pixel-mark${active ? " pixel-mark-on" : ""}`}
                        style={{ color }}
                        aria-hidden
                      />
                      <span
                        className="flex-1 truncate text-[0.8125rem] leading-none"
                        style={{ color: active ? "var(--ui-text)" : "var(--ui-muted)" }}
                      >
                        {content.title}
                      </span>
                      <span
                        className="shrink-0 text-[0.6875rem] leading-none tabular-nums"
                        style={{ color: "var(--ui-faint)" }}
                      >
                        {content.startYear < 2100 ? content.startYear : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* The written pages.
              The map is a canvas, and a canvas is unreadable to a crawler and
              slow for a visitor who did not come here to explore. These are the
              same career as text, and they are real links so that both of them
              can find it. */}
          <nav aria-label="Written pages">
            <p
              className="font-display mb-1.5 text-[0.8125rem] tracking-wider uppercase"
              style={{ color: "var(--ui-faint)" }}
            >
              Read
            </p>
            <ul className="flex flex-col">
              {WRITTEN_PAGES.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    prefetch
                    className="flex w-full items-center gap-2.5 border-2 border-transparent px-2 py-1.5 text-left transition-colors hover:border-[var(--ui-border)] hover:bg-[#182640]"
                  >
                    <span className="pixel-mark" style={{ color: "var(--accent)" }} aria-hidden />
                    <span
                      className="flex-1 truncate text-[0.8125rem] leading-none"
                      style={{ color: "var(--ui-muted)" }}
                    >
                      {page.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
