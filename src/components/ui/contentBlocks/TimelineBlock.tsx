"use client";

import type { TimelineBlock as Block, TimelineNode } from "@/data/contentBlocks";
import { Bullets, Chips, Label, Reveal, StackRows, useOpenable } from "./primitives";

/**
 * A rail of nodes, in order.
 *
 * Every node's title and line are always on the rail, so the whole sequence
 * reads without opening anything. A milestone is on the rail too: it is the
 * reason the node matters. Only the detail waits to be asked for.
 */
export default function TimelineBlock({ block }: { block: Block }) {
  return (
    <div>
      {block.title && <Label className="mb-2">{block.title}</Label>}
      <ol className="relative">
        {/* The rail. */}
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-[5px] w-0.5"
          style={{ background: "var(--plaque-line)" }}
        />
        {block.nodes.map((node) => (
          <Node key={node.title} node={node} />
        ))}
      </ol>
    </div>
  );
}

function Node({ node }: { node: TimelineNode }) {
  const { isOpen, toggle, ref } = useOpenable(node.title, node.hotspots);
  const expandable = Boolean(
    node.detail?.length || node.takeaway || node.tech?.length || node.stack
  );
  const size = node.major ? "h-3.5 w-3.5 -ml-[1px]" : "h-3 w-3";

  const heading = (
    <>
      <span
        aria-hidden
        className={`absolute top-[0.2rem] left-0 border-2 ${size}`}
        style={{
          borderColor: "var(--plaque-frame)",
          background: isOpen || node.major ? "var(--plaque-frame)" : "var(--plaque-paper)",
        }}
      />
      <span className="flex items-baseline gap-2">
        <span
          className={`font-display flex-1 leading-none font-semibold tracking-wide ${
            node.major ? "text-[1.0625rem]" : "text-[0.875rem]"
          }`}
          style={{ color: "var(--plaque-ink)" }}
        >
          {node.title}
        </span>
        {expandable && (
          <span className="text-[0.6875rem]" style={{ color: "var(--plaque-muted)" }} aria-hidden>
            {isOpen ? "less" : "more"}
          </span>
        )}
      </span>
      <span
        className="mt-1 block text-[0.8125rem] leading-snug"
        style={{ color: "var(--plaque-ink)" }}
      >
        {node.line}
      </span>
    </>
  );

  return (
    <li
      ref={ref as React.Ref<HTMLLIElement>}
      className={`relative pl-5 ${node.major ? "my-2 py-2" : "pb-3"}`}
      style={
        node.major
          ? {
              outline: "2px solid var(--plaque-frame)",
              outlineOffset: 0,
              paddingRight: "0.5rem",
              background: "rgb(201 145 63 / 0.1)",
            }
          : undefined
      }
    >
      {expandable ? (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={isOpen}
          className="block w-full cursor-pointer text-left hover:opacity-80"
        >
          {heading}
        </button>
      ) : (
        <div>{heading}</div>
      )}

      {node.milestone && (
        <p
          className="mt-1.5 inline-block px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase"
          style={{ background: "var(--plaque-brass)", color: "#241a10" }}
        >
          Milestone · {node.milestone}
        </p>
      )}

      <Reveal open={isOpen}>
        <div className="space-y-2 pt-2">
          {node.detail && <Bullets items={node.detail} />}
          {node.stack && <StackRows stack={node.stack} />}
          {node.tech && <Chips items={node.tech} label="Tech used" />}
          {node.takeaway && (
            <p
              className="border-l-2 pl-2 text-[0.8125rem] leading-snug"
              style={{ borderColor: "var(--plaque-brass)", color: "var(--plaque-ink)" }}
            >
              {node.takeaway}
            </p>
          )}
        </div>
      </Reveal>
    </li>
  );
}
