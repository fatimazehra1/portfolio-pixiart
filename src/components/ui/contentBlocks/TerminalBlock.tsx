"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { TerminalBlock as Block } from "@/data/contentBlocks";
import { HIT_STYLE, useHotspot } from "./primitives";

/**
 * A terminal window. Always dark, whatever the panel's tone, because it is a
 * screen on the wall rather than part of the plaque.
 *
 * With `animate`, the lines arrive one after another the first time the panel
 * opens. Reduced motion gets them all at once.
 */
export default function TerminalBlock({ block }: { block: Block }) {
  const reduce = useReducedMotion();
  const { hit, ref } = useHotspot(block.hotspots);
  const step = block.animate && !reduce ? 0.45 : 0;

  return (
    <figure ref={ref as React.Ref<HTMLElement>} style={hit ? HIT_STYLE : undefined}>
      <div className="border-2" style={{ borderColor: "#06090f", background: "#0e1217" }}>
        <div
          className="flex items-center gap-1 border-b-2 px-2 py-1"
          style={{ borderColor: "#06090f", background: "#1a2029" }}
        >
          <span className="h-1.5 w-1.5" style={{ background: "#c96f5a" }} aria-hidden />
          <span className="h-1.5 w-1.5" style={{ background: "#d9b25a" }} aria-hidden />
          <span className="h-1.5 w-1.5" style={{ background: "#7dbb7f" }} aria-hidden />
          {block.title && (
            <span className="ml-1.5 font-mono text-[0.625rem]" style={{ color: "#8ea0ba" }}>
              {block.title}
            </span>
          )}
        </div>
        <div className="space-y-1 px-2.5 py-2 font-mono text-[0.71875rem] leading-snug">
          {block.lines.map((line, index) => (
            <motion.div
              key={line.cmd + index}
              initial={step ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ delay: index * step, duration: 0.15 }}
            >
              <p style={{ color: "#e6ebf2" }}>
                <span style={{ color: "#d9b25a" }}>$ </span>
                {line.cmd}
              </p>
              {line.out && (
                <motion.p
                  initial={step ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * step + step * 0.55, duration: 0.15 }}
                  style={{ color: "#8fd19e" }}
                >
                  {"  "}→ {line.out}
                </motion.p>
              )}
            </motion.div>
          ))}
          <motion.span
            aria-hidden
            className="inline-block h-3 w-1.5 align-middle"
            style={{ background: "#8fd19e" }}
            animate={reduce ? undefined : { opacity: [1, 0, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
      {block.caption && (
        <figcaption className="mt-1 text-[0.75rem] leading-snug" style={{ color: "var(--plaque-muted)" }}>
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}
