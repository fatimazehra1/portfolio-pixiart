"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PROFILE } from "@/data/chapters";
import { useWorldStore } from "@/stores/worldStore";

/**
 * What there is to look at while the universe is being built.
 *
 * The map is not a page that streams in: nine islands, their buildings and
 * every prop on them are baked as textures in one synchronous pass, and
 * without this the visitor gets a blank frame for the whole of it.
 *
 * # The same world, before it exists
 * The sky is the clear day the map opens on, so the hand-off is a dissolve
 * into the same air rather than a cut from a splash screen. In the middle, one
 * small island drawn on the same pixel grid, bobbing the way the islands do,
 * under the name on the same dark board the rest of the interface uses.
 *
 * # An honest bar
 * The cells fill on the three steps `World.create` actually reports (WebGL
 * up, worlds built, first frame) and never past a step that has not finished.
 * Cells rather than a smooth line, because this is a pixel world.
 */

const CELLS = 18;

export default function LoadingScreen() {
  const isReady = useWorldStore((s) => s.isReady);
  const progress = useWorldStore((s) => s.loadProgress);
  const label = useWorldStore((s) => s.loadLabel);
  const reduce = useReducedMotion();

  const filled = Math.max(1, Math.round(progress * CELLS));

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          // Over everything, and above the canvas it is hiding.
          className="absolute inset-0 z-40 flex items-center justify-center overflow-hidden px-4 font-sans"
          style={{ background: "linear-gradient(#5f8fca 0%, #86add9 45%, #c4dbee 78%, #e4eef6 100%)" }}
        >
          {/* Drifting cloud banks, far and near. */}
          <Cloud className="absolute top-[12%] left-[6%] w-44 opacity-90" drift={reduce ? 0 : 70} duration={38} />
          <Cloud className="absolute top-[24%] right-[8%] w-32 opacity-75" drift={reduce ? 0 : -60} duration={46} />
          <Cloud className="absolute bottom-[16%] left-[18%] w-28 opacity-60" drift={reduce ? 0 : 50} duration={52} />
          <Cloud className="absolute right-[16%] bottom-[26%] w-20 opacity-50" drift={reduce ? 0 : -40} duration={60} />

          <div className="relative flex w-full max-w-[20rem] flex-col items-center">
            {/* The island, bobbing like the ones it is about to become. */}
            <motion.div
              animate={reduce ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="mb-5"
            >
              <Island />
            </motion.div>

            <div className="ui-panel w-full px-5 py-4 text-center">
              <p
                className="font-display text-[1.25rem] leading-tight font-semibold tracking-wide"
                style={{ color: "var(--ui-text)" }}
              >
                {PROFILE.name}
              </p>
              <p className="mt-1.5 text-[0.75rem]" style={{ color: "var(--accent)" }}>
                {PROFILE.jobTitle}
              </p>

              <div
                className="mt-4 flex gap-[3px] border-2 p-[3px]"
                style={{ borderColor: "var(--ui-border)", background: "var(--ui-panel-strong)" }}
                role="progressbar"
                aria-label="Loading the islands"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                {Array.from({ length: CELLS }, (_, index) => (
                  <motion.span
                    key={index}
                    className="h-2.5 flex-1"
                    initial={false}
                    animate={{ opacity: index < filled ? 1 : 0.12 }}
                    transition={{ duration: 0.15, delay: reduce ? 0 : index * 0.015 }}
                    style={{ background: "var(--accent)" }}
                  />
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between text-[0.6875rem] tracking-wide">
                <span style={{ color: "var(--ui-muted)" }}>{label || "Starting"}</span>
                <span className="tabular-nums" style={{ color: "var(--ui-faint)" }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A floating island in pixels: grass, two layers of earth, a rocky underside,
 * a small tower with a lit window and a flag. Drawn on a 32 by 26 grid and
 * scaled up with crisp edges, like everything else in the world.
 */
function Island() {
  const px = (x: number, y: number, w: number, h: number, fill: string) => (
    <rect key={`${x}-${y}-${w}-${h}-${fill}`} x={x} y={y} width={w} height={h} fill={fill} />
  );

  return (
    <svg
      viewBox="0 0 32 26"
      className="h-[10rem] w-[12.3rem] sm:h-[12rem] sm:w-[14.75rem]"
      shapeRendering="crispEdges"
      aria-hidden
      style={{ filter: "drop-shadow(0 6px 0 rgb(20 32 56 / 0.18))" }}
    >
      {/* Tower */}
      {px(14, 3, 5, 10, "#e9e0cc")}
      {px(14, 3, 5, 1, "#c9bda3")}
      {px(13, 2, 7, 1, "#7a5a30")}
      {px(15, 5, 1, 2, "#35506f")}
      {px(17, 5, 1, 2, "#f4c56a")}
      {px(15, 9, 1, 2, "#35506f")}
      {px(17, 9, 1, 2, "#35506f")}
      {px(16, 11, 1, 2, "#7a5a30")}
      {/* Flag */}
      {px(16, 0, 1, 2, "#5d4c33")}
      {px(17, 0, 2, 1, "#e0a458")}
      {/* Bushes */}
      {px(8, 11, 3, 2, "#4f8a4a")}
      {px(21, 11, 4, 2, "#4f8a4a")}
      {px(9, 10, 1, 1, "#6aa860")}
      {px(22, 10, 2, 1, "#6aa860")}
      {/* Grass top */}
      {px(4, 13, 24, 2, "#6aa860")}
      {px(5, 12, 22, 1, "#7fbf6a")}
      {/* Earth */}
      {px(4, 15, 24, 2, "#a07a4a")}
      {px(5, 17, 22, 2, "#8a6640")}
      {px(7, 19, 18, 2, "#6e5236")}
      {/* Rocky underside */}
      {px(9, 21, 14, 2, "#5a4a3e")}
      {px(12, 23, 8, 1, "#4a3d33")}
      {px(14, 24, 4, 1, "#3d332b")}
      {px(15, 25, 2, 1, "#3d332b")}
      {/* Pebbles and texture */}
      {px(8, 16, 1, 1, "#b8905a")}
      {px(19, 15, 1, 1, "#b8905a")}
      {px(12, 18, 1, 1, "#a07a4a")}
      {px(22, 17, 1, 1, "#a07a4a")}
      {px(16, 20, 1, 1, "#8a6640")}
    </svg>
  );
}

/** A pixel cloud bank that drifts slowly across and back. */
function Cloud({ className, drift, duration }: { className: string; drift: number; duration: number }) {
  return (
    <motion.svg
      viewBox="0 0 24 8"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
      animate={drift ? { x: [0, drift, 0] } : undefined}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="4" y="2" width="8" height="2" fill="#ffffff" />
      <rect x="2" y="4" width="18" height="2" fill="#ffffff" />
      <rect x="10" y="1" width="6" height="3" fill="#ffffff" />
      <rect x="0" y="6" width="24" height="2" fill="#e6eef8" />
      <rect x="16" y="3" width="4" height="1" fill="#ffffff" />
    </motion.svg>
  );
}
