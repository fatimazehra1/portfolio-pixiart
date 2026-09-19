"use client";

import type {
  BlueprintBlock,
  CompetitionBlock,
  DeskBlock,
  ExchangeBlock,
  LedgerBlock,
  ShiftBlock,
  SpecsBlock,
  SystemBlock,
  TechStackBlock,
} from "@/data/contentBlocks";
import { Chips, HIT_STYLE, Label, StackRows, useHotspot } from "./primitives";

/**
 * The island patterns. Each exists because one island's story has a shape a
 * list cannot carry. Still data-driven, still reusable, one switch away.
 */

export function TechStack({ block }: { block: TechStackBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <div ref={ref} style={hit ? HIT_STYLE : undefined}>
      <Label className="mb-1.5">{block.title ?? "Stack"}</Label>
      <StackRows stack={block.stack} />
    </div>
  );
}

/** Aptech: a scoreboard of timed contests, and the lessons under it. */
export function Competition({ block }: { block: CompetitionBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <section
      ref={ref}
      className="border-2"
      style={{ borderColor: "var(--plaque-frame)", ...(hit ? HIT_STYLE : {}) }}
      aria-label="Competition board"
    >
      <p
        className="font-display px-2.5 py-1.5 text-[0.8125rem] tracking-[0.12em] uppercase"
        style={{ background: "var(--plaque-frame)", color: "var(--plaque-paper)" }}
      >
        Competition board
      </p>
      <div className="space-y-2 px-2.5 py-2">
        <p className="text-[0.75rem] leading-snug" style={{ color: "var(--plaque-muted)" }}>
          {block.intro}
        </p>
        <ol className="space-y-1.5">
          {block.entries.map((entry, index) => (
            <li key={entry.name} className="flex gap-2">
              <span
                className="font-display text-[0.875rem] leading-tight tabular-nums"
                style={{ color: "var(--plaque-brass)" }}
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[0.8125rem] leading-snug" style={{ color: "var(--plaque-ink)" }}>
                <span className="font-semibold">{entry.name}. </span>
                {entry.text}
              </span>
            </li>
          ))}
        </ol>
        <div className="border-t-2 border-dashed pt-2" style={{ borderColor: "var(--plaque-line)" }}>
          <Label className="mb-1">What they taught</Label>
          <Chips items={block.lessons} />
        </div>
      </div>
    </section>
  );
}

/** Vaulsys: the room, as a spec sheet with a status light per row. */
export function Specs({ block }: { block: SpecsBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <section ref={ref} style={hit ? HIT_STYLE : undefined}>
      <Label className="mb-1.5">{block.title}</Label>
      <dl className="border-2 font-mono text-[0.71875rem]" style={{ borderColor: "var(--plaque-line)" }}>
        {block.rows.map((row) => (
          <div
            key={row.key}
            className="flex items-baseline gap-2 border-b-2 px-2 py-1 last:border-b-0"
            style={{ borderColor: "var(--plaque-line)" }}
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 self-center" style={{ background: "#7dbb7f" }} />
            <dt className="w-[4.75rem] shrink-0 uppercase" style={{ color: "var(--plaque-muted)" }}>
              {row.key}
            </dt>
            <dd className="leading-snug" style={{ color: "var(--plaque-ink)" }}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {block.note && (
        <p className="mt-2 text-[0.8125rem] leading-snug" style={{ color: "var(--plaque-ink)" }}>
          {block.note}
        </p>
      )}
    </section>
  );
}

/** BBIT: the degree as a ledger. Two columns, a double rule, a balance. */
export function Ledger({ block }: { block: LedgerBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <div
      ref={ref}
      className="grid grid-cols-2 border-2"
      style={{ borderColor: "var(--plaque-frame)", ...(hit ? HIT_STYLE : {}) }}
    >
      {block.columns.map((column, index) => (
        <div
          key={column.title}
          className={`px-2 py-1.5 ${index === 0 ? "border-r-2" : ""}`}
          style={{ borderColor: "var(--plaque-frame)" }}
        >
          <p
            className="font-display border-b-4 border-double pb-1 text-[0.75rem] leading-tight font-semibold"
            style={{ borderColor: "var(--plaque-frame)", color: "var(--plaque-ink)" }}
          >
            {column.title}
          </p>
          <ul className="mt-1">
            {column.items.map((item) => (
              <li
                key={item}
                className="border-b border-dotted py-0.5 text-[0.75rem] leading-snug"
                style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-ink)" }}
              >
                {item}
              </li>
            ))}
          </ul>
          {column.note && (
            <p className="mt-1.5 text-[0.6875rem] leading-snug italic" style={{ color: "var(--plaque-muted)" }}>
              {column.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** The connection: what an ERP looked like before, and after. */
export function Shift({ block }: { block: ShiftBlock }) {
  return (
    <div className="border-l-4 pl-2.5" style={{ borderColor: "var(--plaque-brass)" }}>
      <p className="text-[0.8125rem] leading-snug font-semibold" style={{ color: "var(--plaque-ink)" }}>
        {block.text}
      </p>
      <p className="mt-1.5 text-[0.75rem]" style={{ color: "var(--plaque-muted)" }}>
        Instead of{" "}
        {block.from.map((item, index) => (
          <span key={item}>
            <span className="line-through">{item}</span>
            {index < block.from.length - 1 ? " and " : ""}
          </span>
        ))}
        , I started seeing
      </p>
      <div className="mt-1">
        <Chips items={block.to} />
      </div>
    </div>
  );
}

/**
 * NatureTech: the ERP as the biggest object on the island, with the versions
 * it branched into hanging off it and the next generation drawn dashed.
 */
export function System({ block }: { block: SystemBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  const line = { background: "var(--plaque-frame)" };

  return (
    <section ref={ref} style={hit ? HIT_STYLE : undefined} aria-label={block.core.name}>
      <div className="border-4 px-2.5 py-2" style={{ borderColor: "var(--plaque-frame)" }}>
        <p
          className="font-display text-[1.125rem] leading-none font-semibold tracking-wide"
          style={{ color: "var(--plaque-ink)" }}
        >
          {block.core.name}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-snug font-semibold" style={{ color: "var(--plaque-ink)" }}>
          {block.core.line}
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1">
          {block.core.modules.map((module) => (
            <li
              key={module}
              className="flex items-center gap-1.5 border-2 px-1.5 py-1 text-[0.6875rem] leading-none"
              style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-ink)" }}
            >
              <span aria-hidden className="h-1.5 w-1.5 shrink-0" style={{ background: "var(--plaque-brass)" }} />
              {module}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[0.75rem] leading-snug italic" style={{ color: "var(--plaque-muted)" }}>
          {block.core.footnote}
        </p>
      </div>

      {/* The trunk, then the crossbar the three versions hang from. */}
      <span aria-hidden className="mx-auto block h-3 w-0.5" style={line} />
      <div className="relative grid grid-cols-3 gap-1.5 pt-3">
        <span aria-hidden className="absolute top-0 right-[16.6%] left-[16.6%] h-0.5" style={line} />
        {block.branches.map((branch) => (
          <div
            key={branch.name}
            className="relative border-2 px-1.5 py-1.5"
            style={{ borderColor: "var(--plaque-frame)" }}
          >
            <span aria-hidden className="absolute -top-[14px] left-1/2 h-3 w-0.5 -translate-x-1/2" style={line} />
            <p
              className="font-display text-[0.75rem] leading-tight font-semibold"
              style={{ color: "var(--plaque-ink)" }}
            >
              {branch.name}
            </p>
            <p className="mt-0.5 text-[0.6875rem] leading-snug" style={{ color: "var(--plaque-muted)" }}>
              {branch.line}
            </p>
          </div>
        ))}
      </div>

      {block.next && (
        <>
          <span
            aria-hidden
            className="mx-auto block h-3 w-0 border-l-2 border-dashed"
            style={{ borderColor: "var(--plaque-frame)" }}
          />
          <div className="border-2 border-dashed px-2.5 py-1.5" style={{ borderColor: "var(--plaque-frame)" }}>
            <Label>{block.next.name}</Label>
            <p className="mt-0.5 text-[0.75rem] leading-snug" style={{ color: "var(--plaque-ink)" }}>
              {block.next.line}
            </p>
          </div>
        </>
      )}
    </section>
  );
}

/** Freelance: the request, the reply, and what each one taught. */
export function Exchange({ block }: { block: ExchangeBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <section ref={ref} style={hit ? HIT_STYLE : undefined} aria-label={block.caption}>
      <Label className="mb-1.5">{block.caption}</Label>
      <ol className="space-y-1.5">
        {block.turns.map((turn, index) =>
          turn.from === "client" ? (
            <li key={index} className="flex">
              <p
                className="max-w-[82%] border-2 px-2 py-1 text-[0.8125rem] leading-snug"
                style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-ink)" }}
              >
                <span className="sr-only">Client: </span>
                {turn.text}
              </p>
            </li>
          ) : (
            <li key={index} className="flex flex-col items-end">
              <p
                className="max-w-[82%] px-2 py-1 text-[0.8125rem] leading-snug"
                style={{ background: "var(--plaque-frame)", color: "var(--plaque-paper)" }}
              >
                <span className="sr-only">Me: </span>
                {turn.text}
              </p>
              {turn.lesson && (
                <p
                  className="mt-0.5 flex items-center gap-1 text-[0.6875rem] font-semibold"
                  style={{ color: "var(--plaque-muted)" }}
                >
                  <span aria-hidden className="h-1.5 w-1.5" style={{ background: "var(--plaque-brass)" }} />
                  {turn.lesson}
                </p>
              )}
            </li>
          )
        )}
      </ol>
    </section>
  );
}

/** Loop2Tech: the company as a plan on blueprint paper, stamped. */
export function Blueprint({ block }: { block: BlueprintBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-2 p-2"
      style={{
        borderColor: "#1b3350",
        background:
          "linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px) 0 0 / 10px 10px, linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px) 0 0 / 10px 10px, #274b73",
        ...(hit ? HIT_STYLE : {}),
      }}
      aria-label="Loop2Tech blueprint"
    >
      <span
        className="font-display absolute top-2 right-1.5 rotate-[8deg] border-2 px-1.5 py-0.5 text-[0.625rem] tracking-[0.12em] uppercase"
        style={{ borderColor: "#f0b35a", color: "#f0b35a" }}
      >
        {block.stamp}
      </span>
      <p className="font-mono text-[0.625rem] tracking-wider uppercase" style={{ color: "#bcd4ee" }}>
        Plan · Loop2Tech
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {block.rooms.map((room, index) => (
          <div
            key={room.label}
            className={`border border-dashed px-1.5 py-1.5 ${
              index === block.rooms.length - 1 && block.rooms.length % 2 === 1 ? "col-span-2" : ""
            }`}
            style={{ borderColor: "#bcd4ee" }}
          >
            <p className="font-mono text-[0.625rem] tracking-wider uppercase" style={{ color: "#bcd4ee" }}>
              {room.label}
            </p>
            <p className="mt-0.5 text-[0.75rem] leading-snug" style={{ color: "#f2f6fb" }}>
              {room.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const NOTE_TINTS = ["#f6e7a6", "#dfe9c8", "#f3d6c2", "#d8e3ef"];
const NOTE_TILT = [-2, 1.5, -1, 2, 1, -1.5, 2.5, -2.5];

/** Ideas: experiments left out on a desk, as notes at slight angles. */
export function Desk({ block }: { block: DeskBlock }) {
  const { hit, ref } = useHotspot(block.hotspots);
  return (
    <section ref={ref} style={hit ? HIT_STYLE : undefined} aria-label="Experiments">
      <ul
        className="grid grid-cols-2 gap-2 border-2 p-2"
        style={{ borderColor: "var(--plaque-frame)", background: "#8a6a42" }}
      >
        {block.items.map((item, index) => (
          <li
            key={item.name}
            className="px-1.5 py-1.5 shadow-[2px_2px_0_rgb(0_0_0_/_0.25)] transition-transform hover:rotate-0"
            style={{
              background: NOTE_TINTS[index % NOTE_TINTS.length],
              transform: `rotate(${NOTE_TILT[index % NOTE_TILT.length]}deg)`,
            }}
          >
            <p className="font-display text-[0.75rem] leading-tight font-semibold" style={{ color: "#241c12" }}>
              {item.name}
            </p>
            <p className="mt-0.5 text-[0.6875rem] leading-snug" style={{ color: "#4a3c28" }}>
              {item.line}
            </p>
          </li>
        ))}
      </ul>
      {block.caption && (
        <p className="mt-1.5 text-[0.75rem] leading-snug italic" style={{ color: "var(--plaque-muted)" }}>
          {block.caption}
        </p>
      )}
    </section>
  );
}
