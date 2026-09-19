"use client";

import type {
  DividerBlock,
  HookBlock,
  JumpBlock,
  MemoryBlock,
  MilestoneBlock,
  NoteBlock,
  SummaryBlock,
} from "@/data/contentBlocks";
import { getWorld } from "@/components/world/worldHandle";
import { Label } from "./primitives";

/** The line a visitor remembers. Set in the world's own lettering. */
export function Hook({ block }: { block: HookBlock }) {
  return (
    <p
      className={`font-display leading-tight font-semibold tracking-wide ${
        block.small ? "text-[0.9375rem]" : "text-[1.1875rem]"
      }`}
      style={{ color: "var(--plaque-ink)" }}
    >
      {block.text}
    </p>
  );
}

export function Summary({ block }: { block: SummaryBlock }) {
  return (
    <p className="text-[0.8125rem] leading-snug" style={{ color: "var(--plaque-ink)" }}>
      {block.text}
    </p>
  );
}

/** A personal aside: smaller, fainter, and set in from the edge. */
export function Memory({ block }: { block: MemoryBlock }) {
  return (
    <p
      className="ml-2 border-l-2 border-dashed py-0.5 pl-2.5 text-[0.75rem] leading-snug italic"
      style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-muted)" }}
    >
      {block.text}
    </p>
  );
}

/** A plain labelled fact: a reference, a boundary on a claim. */
export function Note({ block }: { block: NoteBlock }) {
  return (
    <p
      className="border-t-2 pt-2 text-[0.75rem] leading-snug"
      style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-ink)" }}
    >
      <span className="font-semibold tracking-wider uppercase" style={{ color: "var(--plaque-muted)" }}>
        {block.label}.{" "}
      </span>
      {block.text}
    </p>
  );
}

export function Milestone({ block }: { block: MilestoneBlock }) {
  return (
    <div className="border-l-4 py-0.5 pl-2.5" style={{ borderColor: "var(--plaque-brass)" }}>
      <Label>{block.label}</Label>
      <p
        className="mt-0.5 text-[0.8125rem] leading-snug font-semibold"
        style={{ color: "var(--plaque-ink)" }}
      >
        {block.text}
      </p>
    </div>
  );
}

/** The seam between two places on one island. */
export function Divider({ block }: { block: DividerBlock }) {
  return (
    <div className="flex items-center gap-2 pt-2" role="separator">
      <span className="h-0.5 flex-1" style={{ background: "var(--plaque-line)" }} />
      <span
        className="font-display text-[0.75rem] tracking-[0.14em] uppercase"
        style={{ color: "var(--plaque-muted)" }}
      >
        {block.label}
      </span>
      <span className="h-0.5 flex-1" style={{ background: "var(--plaque-line)" }} />
    </div>
  );
}

/** Across to a neighbouring island, the same way the sidebar goes there. */
export function Jump({ block }: { block: JumpBlock }) {
  const go = () => {
    const world = getWorld();
    if (!world) return;
    world.goToChapter(block.chapterId);
  };

  return (
    <button
      type="button"
      onClick={go}
      className="cursor-pointer text-left text-[0.8125rem] font-semibold underline underline-offset-2 hover:opacity-70"
      style={{ color: "var(--plaque-ink)" }}
    >
      {block.text} →
    </button>
  );
}
