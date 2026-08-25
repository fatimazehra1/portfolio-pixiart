"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CHAPTER_CONTENT, CHAPTER_TIMELINE } from "@/data/chapters";
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
 */

const DOT: Record<string, string> = {
  current: "var(--ui-current)",
  past: "var(--ui-past)",
  ongoing: "var(--ui-ongoing)",
};

export default function Sidebar() {
  const isReady = useWorldStore((s) => s.isReady);
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);

  const stats = useMemo(() => {
    const projects = CHAPTER_CONTENT.reduce((sum, c) => sum + c.projects.length, 0);
    const stacks = new Set(CHAPTER_CONTENT.flatMap((c) => c.stack));
    const startYears = CHAPTER_CONTENT.map((c) => c.startYear).filter((y) => y < 2100);
    const years = Math.max(1, new Date().getFullYear() - Math.min(...startYears));
    return { projects, stacks: stacks.size, years };
  }, []);

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
          className="ui-panel absolute top-5 bottom-5 left-5 flex w-60 flex-col gap-4 overflow-y-auto p-4 font-sans"
          aria-label="Career overview"
        >
          <div>
            <p
              className="text-[0.9375rem] leading-none font-semibold tracking-tight"
              style={{ color: "var(--ui-text)" }}
            >
              Fatima Shakeel
            </p>
            <p className="mt-1.5 text-[0.75rem] leading-snug" style={{ color: "var(--ui-muted)" }}>
              Software engineer — a career, as a universe
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-2 border-y py-3" style={{ borderColor: "var(--ui-border)" }}>
            {[
              { label: "Projects", value: stats.projects },
              { label: "Years", value: stats.years },
              { label: "Stacks", value: stats.stacks },
            ].map((stat) => (
              <div key={stat.label}>
                <dt
                  className="text-[0.625rem] tracking-wide uppercase"
                  style={{ color: "var(--ui-faint)" }}
                >
                  {stat.label}
                </dt>
                <dd
                  className="text-[1.0625rem] leading-tight font-semibold tabular-nums"
                  style={{ color: "var(--ui-text)" }}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <ol className="flex flex-col gap-0.5">
            {CHAPTER_TIMELINE.map((content) => {
              const active = chapterId === content.id;
              return (
                <li key={content.id}>
                  <button
                    type="button"
                    onClick={() => go(content.id)}
                    onPointerEnter={() => getWorld()?.universe.hover(content.id)}
                    onPointerLeave={() => getWorld()?.universe.hover(null)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/8"
                    aria-current={active ? "true" : undefined}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: DOT[content.status] ?? "var(--ui-faint)" }}
                      aria-hidden
                    />
                    <span
                      className="flex-1 truncate text-[0.8125rem] leading-none font-medium"
                      style={{ color: active ? "var(--ui-text)" : "var(--ui-muted)" }}
                    >
                      {content.title}
                    </span>
                    <span
                      className="shrink-0 text-[0.625rem] leading-none tabular-nums"
                      style={{ color: "var(--ui-faint)" }}
                    >
                      {content.startYear < 2100 ? content.startYear : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
