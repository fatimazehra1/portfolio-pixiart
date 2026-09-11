"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { contentFor } from "@/data/chapters";
import type { ChapterContent } from "@/data/chapters";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";
import InfoCard from "./InfoCard";

/**
 * What a chapter says, on a phone: a sheet across the bottom, and the world
 * still visible above it.
 *
 * # Why not the plaque
 * The plaque is a 320-pixel column that scrolls to the height of whatever is
 * in it. On a phone that is the whole screen, and a visitor who tapped a
 * building to see it gets a wall of text with the building hidden behind it —
 * which is the opposite of the reason they tapped.
 *
 * So the sheet is capped at a little over a third of the screen and carries
 * only what answers "what is this": the paragraph, the tags, and the names of
 * the sections without their contents. Reading the case study is a deliberate
 * second step, and it takes the whole screen when it is asked for, because at
 * that point the visitor has stopped looking at the world.
 *
 * # Swipe down, or the button
 * Dragging the sheet down past a threshold leaves the world, which is the one
 * place a gesture is allowed here — it is the gesture every sheet on every
 * phone already has, so it is not one to learn. The Map button does the same
 * thing for anyone who does not try it.
 */

/**
 * How tall the sheet is.
 *
 * Two fifths of the screen is the intent, and on any phone held upright that
 * is what it comes out as. The floor is there because a percentage stops being
 * a sensible unit below a point: two fifths of a 568-pixel screen is 227
 * pixels, and of a phone turned sideways it is 150 — neither holds a title, a
 * paragraph and a button, and a sheet you cannot read is worse than a sheet
 * that takes a little more room than planned. The ceiling stops the floor from
 * swallowing a short screen whole.
 *
 * Exported because the Resume button has to stand clear of it, and two files
 * agreeing about a height by writing it out twice is two files that will stop
 * agreeing.
 */
export const SHEET_HEIGHT = "max(40dvh, 13.5rem)";
const SHEET_MAX_HEIGHT = "62dvh";
/** How far down it has to be dragged before it counts as leaving. */
const DISMISS_DISTANCE = 90;

export default function MobileSheet() {
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);
  const [expanded, setExpanded] = useState(false);

  const inside = view === "inside" || view === "entering";
  const content = chapterId ? contentFor(chapterId) : undefined;

  // Leaving a world closes the detail view with it, so the next world does not
  // open straight into a full-screen case study.
  if (!inside && expanded) setExpanded(false);

  return (
    <>
      <AnimatePresence>
        {inside && content && !expanded && (
          <Sheet key="sheet" content={content} onExpand={() => setExpanded(true)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inside && content && expanded && (
          <Detail key="detail" content={content} onClose={() => setExpanded(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function Sheet({ content, onExpand }: { content: ChapterContent; onExpand: () => void }) {
  const sections = content.sections?.map((section) => section.title) ?? [];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.55 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > DISMISS_DISTANCE) getWorld()?.leaveChapter();
      }}
      className="ui-plaque ui-scroll absolute inset-x-0 bottom-0 overflow-y-auto font-sans"
      style={{ height: SHEET_HEIGHT, maxHeight: SHEET_MAX_HEIGHT, touchAction: "pan-y" }}
      role="region"
      aria-label={content.title}
    >
      {/* The grab handle. The only thing on the sheet that says it moves. */}
      <div className="sticky top-0 flex justify-center py-2" style={{ background: "var(--plaque-paper)" }}>
        <span
          aria-hidden
          className="h-1 w-10"
          style={{ background: "var(--plaque-line)" }}
        />
      </div>

      <div className="px-4 pb-2">
        <h2
          className="font-display text-[1.0625rem] leading-none font-semibold tracking-wide"
          style={{ color: "var(--plaque-ink)" }}
        >
          {content.title}
        </h2>
        <p
          className="mt-1 text-[0.6875rem] tracking-wider uppercase tabular-nums"
          style={{ color: "var(--plaque-muted)" }}
        >
          {content.period}
        </p>

        <p
          className="mt-2.5 text-[0.875rem] leading-snug"
          style={{ color: "var(--plaque-ink)" }}
        >
          {content.summary}
        </p>

        {content.stack.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1" aria-label="Tech used">
            {content.stack.slice(0, 6).map((tech) => (
              <li
                key={tech}
                className="border-2 px-1.5 py-0.5 text-[0.6875rem] leading-none"
                style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-muted)" }}
              >
                {tech}
              </li>
            ))}
          </ul>
        )}

        {/* Names only. What is under them is the reason the Explore button
            exists, and putting it here would make the button pointless. */}
        {sections.length > 0 && (
          <p className="mt-3 text-[0.8125rem] leading-snug" style={{ color: "var(--plaque-muted)" }}>
            {sections.join(" · ")}
          </p>
        )}

      </div>

      {/*
        Pinned to the foot of the sheet rather than left at the end of the
        copy. On a short screen a long summary pushes it out of the scroll and
        the one action on the panel becomes the one thing you have to go
        looking for.
      */}
      <div
        className="sticky bottom-0 px-4 pt-2 pb-3"
        style={{ background: "var(--plaque-paper)" }}
      >
        <button
          type="button"
          onClick={onExpand}
          className="flex min-h-11 w-full cursor-pointer items-center justify-center border-2 px-3 text-[0.875rem] font-semibold"
          style={{ borderColor: "var(--plaque-frame)", color: "var(--plaque-ink)" }}
        >
          Explore
        </button>
      </div>
    </motion.div>
  );
}

/**
 * The case study, full screen.
 *
 * The same `InfoCard` the desktop plaque uses, folds and all — a phone is not
 * a reason to write the content twice, and the folds are worth more here than
 * anywhere else.
 */
function Detail({ content, onClose }: { content: ChapterContent; onClose: () => void }) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 34 }}
      className="ui-plaque ui-scroll absolute inset-0 z-20 overflow-y-auto font-sans"
      role="dialog"
      aria-label={content.title}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 py-2"
        style={{ background: "var(--plaque-brass)", borderBottom: "2px solid var(--plaque-frame)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 cursor-pointer items-center gap-1.5 text-[0.875rem] font-semibold"
          style={{ color: "#241a10" }}
        >
          <span aria-hidden>←</span> Back
        </button>
        <Link
          href="/resume"
          prefetch
          className="flex min-h-11 items-center text-[0.8125rem] font-semibold underline underline-offset-2"
          style={{ color: "#241a10" }}
        >
          Resume
        </Link>
      </div>

      <InfoCard content={content} />
    </motion.div>
  );
}
