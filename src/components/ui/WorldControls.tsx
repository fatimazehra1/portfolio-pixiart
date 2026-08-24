"use client";

import { AnimatePresence, motion } from "framer-motion";
import { contentFor } from "@/data/chapters";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The identity mark, the hint, and the way back.
 *
 * Three small things that share one file because they are one decision: how
 * much interface is allowed on screen at once. The answer is a name in one
 * corner, a hint in another, and a back button that only exists when there is
 * somewhere to go back to. Everything else is the world.
 *
 * The hint earns its place — a map you can drag and zoom looks identical to a
 * static picture until you try, and a first-time visitor should not have to
 * guess. It fades once you have actually moved the camera, because at that
 * point it is telling you something you have just done.
 */

export default function WorldControls() {
  const isReady = useWorldStore((s) => s.isReady);
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);

  if (!isReady) return null;

  const inside = view === "inside" || view === "entering";
  const content = chapterId ? contentFor(chapterId) : undefined;

  return (
    <>
      {/* Identity. Always present, deliberately quiet. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute top-5 left-5 font-sans select-none"
      >
        <p
          className="text-[0.9375rem] leading-none font-semibold tracking-tight"
          style={{ color: "var(--ui-text)" }}
        >
          Fatima Shakeel
        </p>
        <p
          className="mt-1.5 text-[0.75rem] leading-none"
          style={{ color: "var(--ui-muted)" }}
        >
          Software engineer — a career, as a universe
        </p>
      </motion.div>

      {/* The way back. Only while there is somewhere to come back from. */}
      <AnimatePresence>
        {inside && (
          <motion.button
            type="button"
            key="back"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            onClick={() => getWorld()?.leaveChapter()}
            className="ui-panel absolute top-20 left-5 flex cursor-pointer items-center gap-2 px-3 py-2 font-sans text-[0.8125rem] font-medium transition-colors hover:bg-white/8"
          >
            <span aria-hidden>←</span>
            <span>Back to the universe</span>
            <kbd
              className="ml-1 rounded border px-1.5 py-0.5 text-[0.625rem] tracking-wide"
              style={{ borderColor: "var(--ui-border)", color: "var(--ui-faint)" }}
            >
              ESC
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Where you are, once you are somewhere. */}
      <AnimatePresence>
        {inside && content && (
          <motion.div
            key="where"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="ui-panel absolute top-5 right-5 max-w-[16rem] px-3.5 py-2.5 font-sans"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.875rem] leading-none font-semibold tracking-tight">
                {content.title}
              </span>
              <span
                className="text-[0.6875rem] tabular-nums"
                style={{ color: "var(--ui-faint)" }}
              >
                {content.period}
              </span>
            </div>
            {content.stack.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {content.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded border px-1.5 py-0.5 text-[0.625rem] leading-none"
                    style={{
                      borderColor: "var(--ui-border)",
                      color: "var(--ui-muted)",
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
            {content.projects.length > 0 && (
              <ul
                className="mt-2.5 space-y-1.5 border-t pt-2.5"
                style={{ borderColor: "var(--ui-border)" }}
              >
                {content.projects.map((project) => (
                  <li key={project.name} className="text-[0.75rem] leading-snug">
                    <span style={{ color: "var(--ui-text)" }}>{project.name}</span>
                    {project.summary && (
                      <span style={{ color: "var(--ui-faint)" }}> — {project.summary}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The hint. Overview only. */}
      <AnimatePresence>
        {view === "overview" && (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="absolute right-5 bottom-5 font-sans text-[0.6875rem] tracking-wide select-none"
            style={{ color: "var(--ui-faint)" }}
          >
            Scroll to zoom · drag to pan · click a world to enter
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
