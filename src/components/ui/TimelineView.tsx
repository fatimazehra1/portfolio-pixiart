"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { contentFor } from "@/data/chapters";
import { PANELS } from "@/data/panelContent";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The whole career, in order, without entering a single island.
 *
 * Each chapter is its dates, its role, its one-line glance and its beats,
 * read straight from the same panel data the islands use. Pressing one goes
 * there. Opened from the sidebar and the mobile menu.
 */
export default function TimelineView() {
  const open = useWorldStore((s) => s.timelineOpen);
  const setOpen = useWorldStore((s) => s.setTimelineOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const go = (id: string) => {
    setOpen(false);
    const world = getWorld();
    if (!world) return;
    world.goToChapter(id);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="timeline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto p-3 md:items-center md:p-6"
          style={{ background: "rgb(6 9 15 / 0.6)" }}
          onPointerDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <motion.section
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            exit={{ y: 12 }}
            className="ui-panel ui-scroll relative max-h-full w-full max-w-[34rem] overflow-y-auto p-4 font-sans md:p-5"
            role="dialog"
            aria-modal="true"
            aria-label="Career timeline"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  className="font-display text-[1.25rem] leading-none font-semibold tracking-wide"
                  style={{ color: "var(--ui-text)" }}
                >
                  In order
                </h2>
                <p className="mt-1.5 text-[0.75rem]" style={{ color: "var(--ui-faint)" }}>
                  The whole progression, without the islands. Press one to go there.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ui-button flex min-h-9 cursor-pointer items-center border-2 px-2.5 text-[0.8125rem]"
                style={{ borderColor: "var(--ui-border)", color: "var(--ui-text)" }}
              >
                Close
              </button>
            </div>

            <ol className="relative mt-4">
              <span
                aria-hidden
                className="absolute top-2 bottom-2 left-[5px] w-0.5"
                style={{ background: "var(--ui-border)" }}
              />
              {PANELS.map((panel) => {
                const content = contentFor(panel.id);
                if (!content) return null;
                return (
                  <li key={panel.id} className="relative pb-4 pl-6 last:pb-0">
                    <span
                      aria-hidden
                      className="absolute top-[0.3rem] left-0 h-3 w-3 border-2"
                      style={{
                        borderColor: "var(--accent)",
                        background: content.status === "past" ? "transparent" : "var(--accent)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => go(panel.id)}
                      className="block w-full cursor-pointer text-left hover:opacity-80"
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span
                          className="font-display text-[1rem] leading-tight font-semibold tracking-wide"
                          style={{ color: "var(--ui-text)" }}
                        >
                          {content.title}
                        </span>
                        <span className="text-[0.75rem] tabular-nums" style={{ color: "var(--ui-faint)" }}>
                          {content.period}
                        </span>
                      </span>
                      {content.role && (
                        <span
                          className="mt-0.5 block text-[0.6875rem] tracking-wider uppercase"
                          style={{ color: "var(--accent)" }}
                        >
                          {content.role}
                        </span>
                      )}
                      <span
                        className="mt-1 block text-[0.8125rem] leading-snug"
                        style={{ color: "var(--ui-muted)" }}
                      >
                        {panel.glance}
                      </span>
                    </button>
                    {panel.steps && (
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {panel.steps.map((step) => (
                          <li
                            key={step}
                            className="border-2 px-1.5 py-0.5 text-[0.6875rem] leading-tight"
                            style={{ borderColor: "var(--ui-border)", color: "var(--ui-muted)" }}
                          >
                            {step}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
