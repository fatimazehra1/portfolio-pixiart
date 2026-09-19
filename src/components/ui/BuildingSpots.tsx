"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HOTSPOT_CALLOUTS, calloutKey } from "@/data/hotspots";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";
import type { SpotRef } from "@/stores/worldStore";

/**
 * The buildings, made to answer.
 *
 * Every building has three or four marked parts. Pressing one used to quietly
 * open a section of the plaque, which on most islands looked like nothing
 * happened. Now a part tells its own story: a short card with what happened
 * there, a way to step to the next part (a tour of the facade), and a way into
 * the panel for the rest.
 *
 *  - `SpotChips` lists the parts on the plaque, so they can be found without
 *    sweeping the facade, and on a phone, where a marker is a few pixels, it is
 *    how they are reached at all. On a phone the story opens right there.
 *  - `HotspotCallout` is the desktop card, hanging off the marker itself, plus
 *    the small name label while the pointer is on a marker.
 */

/** Every spot in the open world, re-read when the world or the viewport changes. */
function useSpots(): readonly SpotRef[] {
  const view = useWorldStore((s) => s.view);
  const chapterId = useWorldStore((s) => s.chapterId);
  const viewport = useWorldStore((s) => s.viewport);
  const [spots, setSpots] = useState<readonly SpotRef[]>([]);

  useEffect(() => {
    if (view !== "inside") return;
    const read = () =>
      setSpots(
        (getWorld()?.hotspots() ?? []).map((spot) => ({
          buildingId: spot.buildingId,
          spotId: spot.id,
          label: spot.label,
          section: spot.section,
          x: spot.x,
          y: spot.y,
        }))
      );
    // Now, and once more a beat later: the world finishes laying out just
    // after arrival, and after a resize.
    const first = window.setTimeout(read, 0);
    const again = window.setTimeout(read, 400);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(again);
    };
  }, [view, chapterId, viewport.width, viewport.height]);

  return view === "inside" ? spots : [];
}

const same = (a: SpotRef | null, b: SpotRef | null) =>
  !!a && !!b && a.buildingId === b.buildingId && a.spotId === b.spotId;

/** Keep the building's own marker lit for whichever story is showing. */
function useMarkerSync() {
  const callout = useWorldStore((s) => s.callout);
  useEffect(() => {
    getWorld()?.highlightHotspot(callout?.buildingId ?? null, callout?.spotId ?? null);
  }, [callout]);
}

/** The card itself. Shared by the floating desktop callout and the phone panel. */
export function CalloutCard({
  spot,
  spots,
  tone = "dark",
}: {
  spot: SpotRef;
  spots: readonly SpotRef[];
  tone?: "dark" | "paper";
}) {
  const setCallout = useWorldStore((s) => s.setCallout);
  const setOpenSection = useWorldStore((s) => s.setOpenSection);
  const content = HOTSPOT_CALLOUTS[calloutKey(spot.buildingId, spot.spotId)];
  const index = spots.findIndex((other) => same(other, spot));
  const open = content?.open === undefined ? spot.section : content.open;

  const ink = tone === "dark" ? "var(--ui-text)" : "var(--plaque-ink)";
  const muted = tone === "dark" ? "var(--ui-muted)" : "var(--plaque-muted)";
  const line = tone === "dark" ? "var(--ui-border)" : "var(--plaque-line)";
  const accent = tone === "dark" ? "var(--accent)" : "var(--plaque-frame)";

  const step = (by: number) => {
    if (spots.length === 0) return;
    setCallout(spots[(index + by + spots.length) % spots.length]);
  };

  return (
    <div className="font-sans">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.625rem] tracking-wider uppercase" style={{ color: accent }}>
            {spot.label}
          </p>
          <p
            className="font-display mt-0.5 text-[1rem] leading-tight font-semibold tracking-wide"
            style={{ color: ink }}
          >
            {content?.title ?? spot.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCallout(null)}
          className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-[1rem] hover:opacity-70"
          style={{ color: muted }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {content && (
        <div className="mt-1.5 space-y-1">
          {content.lines.map((text) => (
            <p key={text} className="text-[0.8125rem] leading-snug" style={{ color: ink }}>
              {text}
            </p>
          ))}
        </div>
      )}

      {content?.chips && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {content.chips.map((chip) => (
            <li
              key={chip}
              className="border-2 px-1.5 py-0.5 text-[0.6875rem] leading-none"
              style={{ borderColor: line, color: muted }}
            >
              {chip}
            </li>
          ))}
        </ul>
      )}

      <div
        className="mt-2.5 flex items-center justify-between gap-2 border-t-2 pt-2"
        style={{ borderColor: line }}
      >
        {spots.length > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-2 hover:opacity-70"
              style={{ borderColor: line, color: ink }}
              aria-label="Previous part of the building"
            >
              ‹
            </button>
            <span className="min-w-[2.5rem] text-center text-[0.6875rem] tabular-nums" style={{ color: muted }}>
              {index + 1} of {spots.length}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-2 hover:opacity-70"
              style={{ borderColor: line, color: ink }}
              aria-label="Next part of the building"
            >
              ›
            </button>
          </div>
        ) : (
          <span />
        )}
        {open && (
          <button
            type="button"
            onClick={() => setOpenSection(open)}
            className="cursor-pointer text-[0.75rem] font-semibold underline underline-offset-2 hover:opacity-70"
            style={{ color: accent }}
          >
            Show in the panel
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The parts of this building, as a row on the plaque. On a phone the story
 * opens underneath the row; on a desktop it hangs off the building instead.
 */
export function SpotChips() {
  const spots = useSpots();
  const callout = useWorldStore((s) => s.callout);
  const setCallout = useWorldStore((s) => s.setCallout);
  const isMobile = useWorldStore((s) => s.isMobile);
  useMarkerSync();

  if (spots.length === 0) return null;

  return (
    <div>
      <p className="text-[0.625rem] tracking-wider uppercase" style={{ color: "var(--plaque-muted)" }}>
        On this building · press a part
      </p>
      <ul className="mt-1 flex flex-wrap gap-1">
        {spots.map((spot) => {
          const active = same(spot, callout);
          return (
            <li key={spot.buildingId + spot.spotId}>
              <button
                type="button"
                onClick={() => setCallout(active ? null : spot)}
                aria-pressed={active}
                className="flex min-h-8 cursor-pointer items-center gap-1.5 border-2 px-2 py-1 text-left text-[0.75rem] leading-tight transition-colors"
                style={{
                  borderColor: active ? "var(--plaque-frame)" : "var(--plaque-line)",
                  background: active ? "var(--plaque-frame)" : "transparent",
                  color: active ? "var(--plaque-paper)" : "var(--plaque-ink)",
                }}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0"
                  style={{ background: active ? "var(--plaque-paper)" : "var(--plaque-brass)" }}
                />
                {spot.label}
              </button>
            </li>
          );
        })}
      </ul>

      {isMobile && (
        <AnimatePresence initial={false}>
          {callout && (
            <motion.div
              key={callout.buildingId + callout.spotId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 border-2 px-3 py-2.5" style={{ borderColor: "var(--plaque-frame)" }}>
                <CalloutCard spot={callout} spots={spots} tone="paper" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/** Gap between the marker's top edge and the card or label, in CSS pixels. */
const GAP = 12;
/** Kept this far inside the window. */
const EDGE = 12;
/** How far beside the marker the story card hangs, clear of a narrow facade. */
const SIDE_GAP = 90;

/**
 * Desktop: the hover label and the pressed story, both hanging off the marker.
 *
 * Positioned by a frame loop rather than React, for the reason `ChapterOverlay`
 * gives: the camera keeps moving after the pointer stops.
 */
export function HotspotCallout() {
  const hotspot = useWorldStore((s) => s.hotspot);
  const callout = useWorldStore((s) => s.callout);
  const spots = useSpots();
  const label = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  useMarkerSync();

  // The label is only for a marker whose story is not already open.
  const showLabel = hotspot && !same(hotspot, callout) ? hotspot : null;

  const targets = useRef<{ label: SpotRef | null; card: SpotRef | null }>({ label: null, card: null });
  useEffect(() => {
    targets.current = { label: showLabel, card: callout };
  }, [showLabel, callout]);

  useEffect(() => {
    if (!showLabel && !callout) return;
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      const world = getWorld();
      if (!world) return;
      for (const [node, target] of [
        [label.current, targets.current.label],
        [card.current, targets.current.card],
      ] as const) {
        if (!node || !target) continue;
        const point = world.insideScreen(target.x, target.y);
        if (!point) {
          node.style.opacity = "0";
          continue;
        }
        const w = node.offsetWidth;
        const h = node.offsetHeight;

        if (node === card.current) {
          // The story hangs beside the building, not over it, so the facade
          // it is about stays in view: to the left where there is room (the
          // plaque owns the right), otherwise to the right.
          const left = point.x - SIDE_GAP - w >= EDGE;
          const x = Math.round(left ? point.x - SIDE_GAP - w : point.x + SIDE_GAP);
          const y = Math.round(
            Math.min(window.innerHeight - EDGE - h, Math.max(EDGE, point.y - h / 3))
          );
          node.style.transform = `translate(${x}px, ${y}px)`;
          node.style.opacity = "1";
          continue;
        }

        // The name label: above the marker where there is room, below it where not.
        const above = point.y - GAP - h >= EDGE;
        const x = Math.round(Math.min(window.innerWidth - EDGE - w / 2, Math.max(EDGE + w / 2, point.x)));
        const y = Math.round(above ? point.y - GAP : point.y + GAP + 24);
        node.style.transform = `translate(${x}px, ${y}px) translate(-50%, ${above ? "-100%" : "0"})`;
        node.style.opacity = "1";
      }
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [showLabel, callout]);

  return (
    <>
      {showLabel && (
        <div
          ref={label}
          className="ui-panel pointer-events-none absolute top-0 left-0 px-2 py-1 font-sans text-[0.75rem] whitespace-nowrap opacity-0"
          style={{ color: "var(--ui-text)", willChange: "transform" }}
          role="status"
        >
          {showLabel.label}
          <span style={{ color: "var(--ui-faint)" }}> · click</span>
        </div>
      )}
      {callout && (
        <div
          ref={card}
          key={callout.buildingId + callout.spotId}
          className="ui-panel absolute top-0 left-0 w-[17rem] p-3 opacity-0"
          style={{ willChange: "transform" }}
          role="dialog"
          aria-label={callout.label}
        >
          <CalloutCard spot={callout} spots={spots} />
        </div>
      )}
    </>
  );
}
