"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TimePhase, WeatherMode } from "@/engine";
import { getWorld } from "@/components/world/worldHandle";
import { useWorldStore } from "@/stores/worldStore";

/**
 * The sky, handed to the visitor.
 *
 * Two rows. The hour: let the day run on its loop, or hold it at one of the
 * six phases. The weather: each island's own (`auto`), or one sky everywhere,
 * including rain and a storm. Both are view settings; nothing about a scene
 * changes, and `Loop` and `Auto` put the world back exactly as authored.
 */

const PHASES: readonly { id: TimePhase; label: string }[] = [
  { id: "dawn", label: "Dawn" },
  { id: "morning", label: "Morning" },
  { id: "noon", label: "Noon" },
  { id: "sunset", label: "Sunset" },
  { id: "dusk", label: "Dusk" },
  { id: "night", label: "Night" },
];

const WEATHER: readonly { id: WeatherMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Each island's own" },
  { id: "clear", label: "Clear", hint: "" },
  { id: "rain", label: "Rain", hint: "" },
  { id: "storm", label: "Storm", hint: "" },
  { id: "fog", label: "Fog", hint: "" },
];

export default function SkyControls({ placement }: { placement: "up" | "down" }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const paused = useWorldStore((s) => s.timePaused);
  const phase = useWorldStore((s) => s.timePhase);
  const weather = useWorldStore((s) => s.weatherMode);
  const setWeatherMode = useWorldStore((s) => s.setWeatherMode);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const chooseWeather = (mode: WeatherMode) => {
    getWorld()?.setWeatherMode(mode);
    setWeatherMode(mode);
  };

  const night = phase === "night" || phase === "dusk";

  return (
    <div ref={root} className="relative flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Time of day and weather"
        className={`ui-panel ui-button flex cursor-pointer items-center justify-center gap-1.5 font-sans transition-colors ${
          placement === "down" ? "h-[2.375rem] w-[2.375rem]" : "px-2.5 py-2 text-[0.8125rem]"
        }`}
        style={{ color: "var(--ui-text)" }}
      >
        <SkyIcon night={night} rain={weather === "rain" || weather === "storm"} />
        {placement === "up" && <span className="font-display tracking-wide">Sky</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: placement === "up" ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === "up" ? 8 : -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={`ui-panel absolute z-40 p-3 font-sans ${
              placement === "up"
                ? "right-0 bottom-full mb-2 w-[19rem]"
                : "top-full right-0 mt-2 w-[min(19rem,calc(100vw-1.5rem))]"
            }`}
            role="dialog"
            aria-label="Time of day and weather"
          >
            <Heading>Time of day</Heading>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              <Choice
                active={!paused}
                onClick={() => getWorld()?.loopTime()}
                wide
              >
                ↻ Loop
              </Choice>
              {PHASES.map((item) => (
                <Choice
                  key={item.id}
                  active={paused && phase === item.id}
                  onClick={() => getWorld()?.holdPhase(item.id)}
                >
                  {item.label}
                </Choice>
              ))}
            </div>
            <p className="mt-1 text-[0.6875rem]" style={{ color: "var(--ui-faint)" }}>
              {paused ? "Held. Loop lets the day run again." : "The day runs on a three minute loop."}
            </p>

            <Heading className="mt-3">Weather</Heading>
            <div className="mt-1.5 grid grid-cols-5 gap-1">
              {WEATHER.map((item) => (
                <Choice key={item.id} active={weather === item.id} onClick={() => chooseWeather(item.id)}>
                  {item.label}
                </Choice>
              ))}
            </div>
            <p className="mt-1 text-[0.6875rem]" style={{ color: "var(--ui-faint)" }}>
              {weather === "auto"
                ? "Auto: each island keeps its own weather."
                : "The same sky everywhere. Auto puts each island's back."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[0.625rem] tracking-wider uppercase ${className}`} style={{ color: "var(--ui-faint)" }}>
      {children}
    </p>
  );
}

function Choice({
  active,
  onClick,
  children,
  wide = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-9 cursor-pointer items-center justify-center border-2 px-1 text-[0.75rem] leading-none transition-colors hover:bg-[#182640] ${
        wide ? "col-span-2" : ""
      }`}
      style={{
        borderColor: active ? "var(--accent)" : "var(--ui-border)",
        background: active ? "rgb(224 164 88 / 0.18)" : undefined,
        color: active ? "var(--ui-text)" : "var(--ui-muted)",
      }}
    >
      {children}
    </button>
  );
}

/** A pixel sun, or a moon, with rain under it when it is raining. */
function SkyIcon({ night, rain }: { night: boolean; rain: boolean }) {
  return (
    <svg viewBox="0 0 12 12" className="h-4 w-4" shapeRendering="crispEdges" aria-hidden>
      {night ? (
        <path d="M5 1h3v1H6v1H5v3h1v1h2v1H5V7H4V2h1z" fill="currentColor" />
      ) : (
        <path
          d="M5 0h2v2H5zM5 10h2v2H5zM0 5h2v2H0zM10 5h2v2h-2zM4 3h4v1h1v4H8v1H4V8H3V4h1z"
          fill="currentColor"
        />
      )}
      {rain && <path d="M2 9h1v2H2zM6 9h1v2H6zM10 9h1v2h-1z" fill="#8fb2d8" />}
    </svg>
  );
}
