"use client";

import { useState } from "react";
import type { SkillCard, SkillCardBlock as Block } from "@/data/contentBlocks";
import { HIT_STYLE, useHotspot } from "./primitives";

const STATUS = {
  explored: { label: "Explored", color: "var(--plaque-line)" },
  built: { label: "Built something", color: "var(--plaque-brass)" },
  now: { label: "Learning now", color: "#4f9b67" },
} as const;

/**
 * A wall of cards, pinned up in a grid. Each one shows its name and flips to
 * the honest line when pressed. Nothing here is essential information, which
 * is exactly why this is the island allowed to hide things.
 */
export default function SkillCardBlock({ block }: { block: Block }) {
  const { hit, ref } = useHotspot(block.hotspots);
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set());
  const flip = (name: string) =>
    setFlipped((previous) => {
      const next = new Set(previous);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const allOpen = flipped.size === block.cards.length;

  return (
    <div ref={ref} style={hit ? HIT_STYLE : undefined}>
      <ul
        className="grid grid-cols-3 gap-1 border-2 p-1"
        style={{
          borderColor: "var(--plaque-frame)",
          background:
            "repeating-linear-gradient(90deg, rgb(122 90 48 / 0.12) 0 6px, transparent 6px 12px)",
        }}
      >
        {block.cards.map((card) => (
          <Tile
            key={card.name}
            card={card}
            flipped={flipped.has(card.name)}
            onFlip={() => flip(card.name)}
          />
        ))}
      </ul>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((key) => (
          <span
            key={key}
            className="flex items-center gap-1 text-[0.625rem]"
            style={{ color: "var(--plaque-muted)" }}
          >
            <span aria-hidden className="h-2 w-2" style={{ background: STATUS[key].color }} />
            {STATUS[key].label}
          </span>
        ))}
        <button
          type="button"
          onClick={() =>
            setFlipped(allOpen ? new Set() : new Set(block.cards.map((card) => card.name)))
          }
          className="ml-auto cursor-pointer text-[0.6875rem] underline underline-offset-2 hover:opacity-70"
          style={{ color: "var(--plaque-muted)" }}
        >
          {allOpen ? "Flip all back" : "Flip all"}
        </button>
      </div>
    </div>
  );
}

function Tile({ card, flipped, onFlip }: { card: SkillCard; flipped: boolean; onFlip: () => void }) {
  const status = STATUS[card.status ?? "explored"];

  return (
    <li>
      <button
        type="button"
        onClick={onFlip}
        aria-pressed={flipped}
        aria-label={`${card.name}: ${card.line}`}
        className="relative flex h-full min-h-[3.75rem] w-full cursor-pointer flex-col justify-center border-2 px-1.5 py-1.5 text-left transition-transform hover:-translate-y-0.5"
        style={{
          borderColor: flipped ? "var(--plaque-frame)" : "var(--plaque-line)",
          background: flipped ? "var(--plaque-ink)" : "var(--plaque-paper)",
        }}
      >
        <span
          aria-hidden
          className="absolute top-1 right-1 h-1.5 w-1.5"
          style={{ background: status.color }}
        />
        {flipped ? (
          <span className="text-[0.6875rem] leading-snug" style={{ color: "var(--plaque-paper)" }}>
            {card.line}
          </span>
        ) : (
          <span
            className="font-display pr-1.5 text-[0.75rem] leading-tight font-semibold"
            style={{ color: "var(--plaque-ink)" }}
          >
            {card.name}
          </span>
        )}
      </button>
    </li>
  );
}
