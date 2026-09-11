"use client";

import { useEffect, useRef } from "react";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The name of whatever part of a building the pointer is on.
 *
 * Two or three words on a small panel, hanging over the marked rectangle. It
 * is the missing half of a hotspot: the marker in the world says *something is
 * here*, and this says what, which is the difference between a facade you can
 * poke at and a facade that tells you the fourth floor was the rider dashboard.
 *
 * # Why it is DOM and not drawn
 * Text. The world has a bitmap face and can letter a sign with it, but a label
 * that has to stay legible at every zoom, wrap sensibly, and read to a screen
 * reader is a piece of interface, and DESIGN.md keeps interface on this side of
 * the seam. It gets the panel styling everything else here has.
 *
 * # Why it does not re-render as it moves
 * The same rule `ChapterOverlay` follows, for the same reason: the camera keeps
 * moving after the pointer stops, so the label has to be repositioned every
 * frame, and sixty React renders a second behind a canvas doing real work is
 * how an overlay becomes the thing that drops the frame rate. React owns
 * *which* label exists; a `requestAnimationFrame` loop owns where it is.
 */

/** Gap between the top of the marked rectangle and the bottom of the label. */
const GAP = 10;
/** Kept this far inside the window, so a spot near an edge is still readable. */
const EDGE = 12;

export default function HotspotLabel() {
  const hotspot = useWorldStore((s) => s.hotspot);
  const node = useRef<HTMLDivElement | null>(null);

  // The world position, readable from inside the loop without restarting it.
  const at = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    at.current = hotspot ? { x: hotspot.x, y: hotspot.y } : null;
  }, [hotspot]);

  useEffect(() => {
    if (!hotspot) return;

    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);

      const element = node.current;
      const world = getWorld();
      const target = at.current;
      if (!element || !world || !target) return;

      const point = world.insideScreen(target.x, target.y);
      if (!point) {
        // No world open: the label belongs to a building that is no longer on
        // screen, so it goes quiet rather than sitting at the last place it was.
        element.style.opacity = "0";
        return;
      }

      const width = element.offsetWidth;
      const height = element.offsetHeight;
      const x = Math.round(
        Math.min(window.innerWidth - EDGE - width / 2, Math.max(EDGE + width / 2, point.x))
      );
      const y = Math.round(Math.max(EDGE + height, point.y - GAP));

      element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      element.style.opacity = "1";
    };

    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [hotspot]);

  if (!hotspot) return null;

  return (
    <div
      ref={node}
      // Starts invisible at the origin: the first frame of the loop moves it
      // where it belongs, and a label that flashed in the top-left corner
      // first would be the only thing anybody noticed about it.
      className="ui-panel pointer-events-none absolute top-0 left-0 px-2 py-1 font-sans text-[0.75rem] whitespace-nowrap opacity-0"
      style={{ color: "var(--ui-text)", willChange: "transform" }}
      role="status"
    >
      {hotspot.label}
    </div>
  );
}
