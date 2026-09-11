"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import ChapterCard from "./ChapterCard";
import { CHAPTER_CONTENT } from "@/data/chapters";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The labels and the card, pinned to their worlds.
 *
 * # One card, not nine
 * Nine cards fit on screen and were the first thing built, and they were wrong:
 * they covered the universe, they collided with each other wherever two worlds
 * sat close, and they turned a map into a dashboard. DESIGN.md §UI Style is
 * explicit that the interface never takes the screen, and the brief is explicit
 * that the pixel universe is the hero.
 *
 * So every world carries a **quiet label** — a dot and a name, enough to read
 * the map — and the **full card** belongs to whichever world you are pointing
 * at. That is the same amount of information, revealed when it is asked for
 * rather than all at once, and it leaves the composition visible.
 *
 * # Why this does not re-render
 * A label has to follow its world through every pan and zoom — sixty updates a
 * second. Putting those positions in React state would mean sixty renders a
 * second of ten components *behind a canvas already doing the real work*, and
 * the interface would be the thing that dropped the frame rate.
 *
 * React renders the nodes **once**; a `requestAnimationFrame` loop reads each
 * world's screen position from the engine and writes `transform` and `opacity`
 * straight onto the DOM. React owns *what exists*, the loop owns *where it is*.
 * The only state is what genuinely changes identity: which world is hovered.
 */

/** Gap between a world's edge and its card, in CSS pixels. */
const CARD_GAP = 20;
/**
 * The card's width, matching its CSS. Its *height* is measured rather than
 * declared — the card grew a headline and a row of tags, and a constant that
 * disagrees with the real height clamps it to the wrong place near the edges.
 */
const CARD_WIDTH = 240;
const CARD_FALLBACK_HEIGHT = 150;
/** Rendered zoom at which labels and cards have fully faded. */
const FADE_FROM = 1.2;
const FADE_TO = 1.75;

export default function ChapterOverlay() {
  const view = useWorldStore((s) => s.view);
  const isReady = useWorldStore((s) => s.isReady);
  const hoveredWorld = useWorldStore((s) => s.hoveredChapterId);

  /** What the pointer is on, from either the island or its own label/card. */
  const [pinned, setPinned] = useState<string | null>(null);
  const active = pinned ?? hoveredWorld;

  const labels = useRef(new Map<string, HTMLDivElement>());
  const card = useRef<HTMLDivElement | null>(null);
  const line = useRef<SVGLineElement | null>(null);
  /**
   * The active world, readable from inside the animation loop.
   *
   * A ref rather than the state value directly, so hovering does not tear down
   * and restart the loop sixty times a second — the effect depends on nothing
   * that hover changes. Written in an effect rather than during render, because
   * a render can be discarded and a ref written during one would survive it.
   */
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const setLabelRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) labels.current.set(id, node);
    else labels.current.delete(id);
  }, []);

  // The placement loop. Runs only while the map is on screen — an overlay
  // polling positions nobody can see is a frame budget spent on nothing.
  useEffect(() => {
    if (!isReady || view === "inside") return;

    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      const world = getWorld();
      if (!world) return;

      const { width, height } = world.viewport;
      const zoom = world.camera.zoom;
      const fade = 1 - clamp01((zoom - FADE_FROM) / (FADE_TO - FADE_FROM));
      const current = activeRef.current;

      for (const content of CHAPTER_CONTENT) {
        const label = labels.current.get(content.id);
        if (!label) continue;

        const at = world.chapterScreen(content.id);
        if (!at) {
          label.style.opacity = "0";
          continue;
        }

        const onScreen =
          at.x > -at.radius &&
          at.x < width + at.radius &&
          at.y > -at.radius &&
          at.y < height + at.radius;

        // Above whatever stands tallest on the world, centred — `topY`
        // already accounts for the building or landmark, not just the
        // island's own (much shorter) silhouette, so a five-storey tower
        // doesn't leave the label sitting across its own facade.
        label.style.transform = `translate3d(${Math.round(at.x)}px, ${Math.round(
          at.topY - 10
        )}px, 0) translate(-50%, -100%)`;
        // The hovered world's label stays and brightens rather than stepping
        // aside: the island lifting, the label lighting and the door opening
        // are one gesture, and removing the label mid-gesture takes a third of
        // it away. The card sits out to the side, so the two never overlap.
        // Multiplied by the world's own presence, so during the opening a
        // label arrives with its island rather than hanging over empty sky
        // waiting for it.
        label.style.opacity = String(onScreen ? fade * at.presence : 0);

        const active = current === content.id;
        const button = label.firstElementChild;
        if (button) button.classList.toggle("ui-label-on", active);

        if (current === content.id && card.current) {
          const flip = at.x + at.radius + CARD_GAP + CARD_WIDTH > width;
          const x = flip
            ? at.x - at.radius - CARD_GAP - CARD_WIDTH
            : at.x + at.radius + CARD_GAP;
          const cx = Math.round(Math.max(12, Math.min(width - CARD_WIDTH - 12, x)));
          const cardHeight = card.current.offsetHeight || CARD_FALLBACK_HEIGHT;
          const cy = Math.round(
            Math.max(12, Math.min(height - cardHeight - 12, at.y - cardHeight / 2))
          );

          card.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
          card.current.style.opacity = String(onScreen ? fade * at.presence : 0);

          if (line.current) {
            // From the card's inner edge to the world's rim, not its centre — a
            // line running under the island would read as skewering it.
            line.current.setAttribute("x1", String(flip ? cx + CARD_WIDTH : cx));
            line.current.setAttribute("y1", String(cy + cardHeight / 2));
            line.current.setAttribute(
              "x2",
              String(Math.round(at.x + (flip ? at.radius * 0.45 : -at.radius * 0.45)))
            );
            line.current.setAttribute("y2", String(Math.round(at.y)));
            line.current.style.opacity = String(onScreen ? fade * at.presence * 0.9 : 0);
          }
        }
      }
    };

    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [isReady, view]);

  const hover = useCallback((id: string | null) => {
    setPinned(id);
    // Pushed into the engine too, so the island's own approach ring lights when
    // the pointer is on the *label*. The world and its label are one target.
    getWorld()?.universe.hover(id);
  }, []);

  if (!isReady || view === "inside") return null;

  const content = active ? CHAPTER_CONTENT.find((c) => c.id === active) : undefined;

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
        focusable="false"
      >
        <line
          ref={line}
          stroke="var(--ui-connector)"
          strokeWidth={1}
          style={{ opacity: 0 }}
        />
      </svg>

      {/* The quiet labels. One per world, always, until you point at one. */}
      {CHAPTER_CONTENT.map((item) => (
        <div
          key={item.id}
          ref={(node) => setLabelRef(item.id, node)}
          className="absolute top-0 left-0"
          style={{ opacity: 0, willChange: "transform, opacity" }}
        >
          <button
            type="button"
            onPointerEnter={() => hover(item.id)}
            onPointerLeave={() => hover(null)}
            onFocus={() => hover(item.id)}
            onBlur={() => hover(null)}
            onClick={() => getWorld()?.enterChapter(item.id)}
            className="ui-panel ui-button flex cursor-pointer items-center gap-2 px-2 py-1 transition-colors"
            aria-label={`${item.title}, ${item.period}`}
          >
            <span className="pixel-mark" style={{ color: "var(--accent)" }} aria-hidden />
            <span
              className="font-display text-[0.8125rem] leading-none tracking-wide whitespace-nowrap"
              style={{ color: "var(--ui-text)" }}
            >
              {item.title}
            </span>
          </button>
        </div>
      ))}

      {/* The card. Exactly one, for whatever is being pointed at. */}
      <div
        ref={card}
        className="absolute top-0 left-0"
        style={{ opacity: 0, willChange: "transform, opacity" }}
        onPointerEnter={() => active && hover(active)}
        onPointerLeave={() => hover(null)}
      >
        <AnimatePresence mode="wait">
          {content && (
            <ChapterCard
              key={content.id}
              content={content}
              active
              onEnter={() => getWorld()?.enterChapter(content.id)}
              onHover={(hovering) => hover(hovering ? content.id : null)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
