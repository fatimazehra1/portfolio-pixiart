"use client";

import type { ProjectCard, ProjectCardBlock as Block } from "@/data/contentBlocks";
import { Bullets, Chips, Label, Reveal, useOpenable } from "./primitives";

/**
 * Builds as cards: name, one line, the stack, and what I actually did.
 *
 * The name, the line, the award and the stack are on the card. What I did is
 * the part that opens, because it is the detail, not the fact.
 */
export default function ProjectCardBlock({ block }: { block: Block }) {
  return (
    <div>
      {block.title && <Label className="mb-1.5">{block.title}</Label>}
      <ol className="space-y-2">
        {block.cards.map((card, index) => (
          <Card key={card.name} card={card} index={index} />
        ))}
      </ol>
    </div>
  );
}

function Card({ card, index }: { card: ProjectCard; index: number }) {
  const { isOpen, toggle, ref } = useOpenable(card.name, card.hotspots);
  const expandable = Boolean(card.did?.length || card.note);

  const face = (
    <>
      <span className="flex items-start gap-2">
        <span
          className="font-display pt-0.5 text-[0.6875rem] tabular-nums"
          style={{ color: "var(--plaque-muted)" }}
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1">
          <span
            className="font-display block text-[0.9375rem] leading-tight font-semibold tracking-wide"
            style={{ color: "var(--plaque-ink)" }}
          >
            {card.name}
          </span>
          <span
            className="mt-0.5 block text-[0.8125rem] leading-snug"
            style={{ color: "var(--plaque-muted)" }}
          >
            {card.descriptor}
          </span>
        </span>
        {card.award && (
          <span
            className="shrink-0 px-1.5 py-0.5 text-[0.625rem] leading-tight font-semibold tracking-wide uppercase"
            style={{ background: "var(--plaque-brass)", color: "#241a10" }}
          >
            {card.award}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li
      ref={ref as React.Ref<HTMLLIElement>}
      className="border-2 px-2.5 py-2"
      style={{ borderColor: isOpen ? "var(--plaque-frame)" : "var(--plaque-line)" }}
    >
      {expandable ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="block w-full cursor-pointer text-left hover:opacity-80"
        >
          {face}
        </button>
      ) : (
        <div>{face}</div>
      )}

      {card.tech && (
        <div className="mt-2">
          <Chips items={card.tech} label="Tech used" />
        </div>
      )}

      <Reveal open={isOpen}>
        <div className="space-y-2 pt-2">
          {card.did && (
            <>
              <Label>What I actually did</Label>
              <Bullets items={card.did} />
            </>
          )}
          {card.note && (
            <p className="text-[0.75rem] leading-snug italic" style={{ color: "var(--plaque-muted)" }}>
              {card.note}
            </p>
          )}
        </div>
      </Reveal>

      {expandable && !isOpen && (
        <button
          type="button"
          onClick={toggle}
          className="mt-1.5 cursor-pointer text-[0.6875rem] underline underline-offset-2 hover:opacity-70"
          style={{ color: "var(--plaque-muted)" }}
        >
          What I actually did
        </button>
      )}
    </li>
  );
}
