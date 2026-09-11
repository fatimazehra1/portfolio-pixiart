"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getAudio } from "@/engine/audio";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The speaker, and the only thing that ever turns the sound on.
 *
 * Off by default and remembered per visitor, because a portfolio that makes a
 * noise at somebody who did not ask for one is a portfolio they close. The
 * choice is stored rather than reset each visit — a visitor who turned it on
 * once meant it.
 *
 * # Why the effects are triggered here
 * `AmbientAudio` knows nothing about islands or doors, and the engine knows
 * nothing about sound. This component is where the two meet: it watches the
 * two pieces of world state the store already publishes — which island is
 * under the pointer, and whether the camera is flying into one — and calls the
 * matching sound. Nothing new has to be threaded through the engine for it,
 * and deleting this file deletes the entire feature.
 */
const STORAGE_KEY = "portfolio.sound";

export default function SoundToggle() {
  const audio = getAudio();
  // The audio system is the state, not a copy of it in React. Off is also the
  // server's answer, which is the only honest one: the server has no
  // localStorage, and a button that renders "on" and then corrects itself is a
  // hydration mismatch.
  const on = useSyncExternalStore(
    audio.subscribe,
    audio.getSnapshot,
    () => false
  );
  const hovered = useWorldStore((s) => s.hoveredChapterId);
  const view = useWorldStore((s) => s.view);

  // Restore the stored choice after mount. The context will be created
  // suspended, having no gesture behind it, and comes up on the visitor's
  // first click anywhere — which is why `setEnabled` resumes as well as fades.
  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "on") getAudio().setEnabled(true);
  }, []);

  useEffect(() => () => getAudio().setEnabled(false), []);

  // The pointer finding an island. Skipped on the way *off* an island, and on
  // the first run, so mounting does not tick.
  const firstHover = useRef(true);
  useEffect(() => {
    if (firstHover.current) {
      firstHover.current = false;
      return;
    }
    if (hovered) getAudio().hover();
  }, [hovered]);

  // The door. `entering` is the moment the camera commits and the door swings
  // fully open, which is the moment the sound belongs to.
  useEffect(() => {
    if (view === "entering") getAudio().door();
  }, [view]);

  const toggle = () => {
    const next = !on;
    // Inside the click, which is the gesture the audio context needs.
    getAudio().setEnabled(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  };

  return (
    // `self-stretch` rather than a height of its own: the speaker is the same
    // block as the Resume button beside it, and a corner where two panels are
    // a pixel out of line is worse than no speaker at all.
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      title={on ? "Sound on" : "Sound off"}
      className="ui-panel ui-button flex w-[2.625rem] cursor-pointer items-center justify-center self-stretch transition-colors"
      style={{ color: on ? "var(--ui-text)" : "var(--ui-faint)" }}
    >
      <Speaker on={on} />
    </button>
  );
}

/**
 * The icon, drawn on a 16-pixel grid.
 *
 * `shapeRendering="crispEdges"` and whole-number coordinates only: an icon
 * with an antialiased edge sitting on a panel next to pixel art is the one
 * thing on screen that would look like a mistake.
 */
function Speaker({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {/* The cone: a stem and a flare, in two rectangles and a step. */}
      <path d="M2 6h2v4H2z M4 6h1V5h1V4h1v8H6v-1H5v-1H4z" fill="currentColor" />
      {on ? (
        // Two arcs, as steps. Nearer is shorter, which is what makes it read
        // as sound leaving rather than as brackets.
        <path
          d="M9 6h1v4H9z M11 4h1v8h-1z M12 5h1v6h-1z"
          fill="currentColor"
          opacity="0.85"
        />
      ) : (
        // A cross, not a slash: a diagonal on this grid is a staircase, and a
        // staircase over a speaker reads as damage rather than as "muted".
        <path d="M10 6h1v1h-1z M11 7h1v1h-1z M12 8h1v1h-1z M12 6h1v1h-1z M11 8h1v1h-1z M10 9h1v1h-1z" fill="currentColor" />
      )}
    </svg>
  );
}
