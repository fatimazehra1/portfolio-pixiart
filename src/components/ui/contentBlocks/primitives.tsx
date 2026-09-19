"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Stack, StackGroup } from "@/data/contentBlocks";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The small parts every block is built from.
 *
 * Colours are the plaque's own tokens, never literals, so a panel with the
 * `server` tone re-colours every block at once by redefining them.
 */

/** A small uppercase label. The plaque's one heading style below the title. */
export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-[0.6875rem] tracking-wider uppercase ${className}`}
      style={{ color: "var(--plaque-muted)" }}
    >
      {children}
    </p>
  );
}

/** Tags, as the square chips used everywhere else on the plaque. */
export function Chips({ items, label }: { items: readonly string[]; label?: string }) {
  return (
    <ul className="flex flex-wrap gap-1" aria-label={label}>
      {items.map((item) => (
        <li
          key={item}
          className="border-2 px-1.5 py-0.5 text-[0.6875rem] leading-none"
          style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-muted)" }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A list with the plaque's pixel bullet. */
export function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-[0.8125rem] leading-snug"
          style={{ color: "var(--plaque-ink)" }}
        >
          <span className="pixel-dot mt-[0.45em]" style={{ color: "var(--plaque-frame)" }} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const GROUP_ORDER: readonly StackGroup[] = [
  "frontend",
  "backend",
  "database",
  "integrations",
  "architecture",
  "infrastructure",
];

/** A stack as labelled rows: frontend, backend, database and so on. */
export function StackRows({ stack }: { stack: Stack }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-2.5 gap-y-1.5">
      {GROUP_ORDER.filter((group) => stack[group]?.length).map((group) => (
        <div key={group} className="contents">
          <dt
            className="text-[0.625rem] tracking-wider uppercase"
            style={{ color: "var(--plaque-muted)" }}
          >
            {group}
          </dt>
          <dd>
            <Chips items={stack[group]!} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Height-animated disclosure body, shared by every expandable block. */
export function Reveal({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * One expandable thing on the panel, keyed into the shared `openSection`.
 *
 * Shared rather than private so a hotspot on the building can open it, and so
 * only one thing on the plaque is open at a time, as before.
 */
export function useOpenable(key: string, hotspots?: readonly string[]) {
  const open = useWorldStore((s) => s.openSection);
  const setOpen = useWorldStore((s) => s.setOpenSection);
  const isOpen = open === key || (open !== null && (hotspots?.includes(open) ?? false));
  const ref = useScrollWhen(open !== null && open !== key && (hotspots?.includes(open) ?? false));
  return { isOpen, toggle: () => setOpen(isOpen ? null : key), ref };
}

/**
 * Whether a building's hotspot is pointing at this block, and a ref that
 * scrolls it into view when it is. For blocks with nothing to open.
 */
export function useHotspot(hotspots?: readonly string[]) {
  const open = useWorldStore((s) => s.openSection);
  const hit = open !== null && (hotspots?.includes(open) ?? false);
  return { hit, ref: useScrollWhen(hit) };
}

function useScrollWhen<T extends HTMLElement = HTMLDivElement>(when: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (when) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [when]);
  return ref;
}

/** The outline a hotspot leaves on the block it pointed at. */
export const HIT_STYLE: React.CSSProperties = {
  outline: "2px solid var(--plaque-brass)",
  outlineOffset: 3,
};
