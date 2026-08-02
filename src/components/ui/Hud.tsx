"use client";

import { useWorldStore } from "@/stores/worldStore";
import { audio } from "@/components/audio/audioManager";

/**
 * Persistent heads-up UI. Resume must be reachable in one click from anywhere
 * (DESIGN.md §UI Principles). Buttons feel like adventure-game buttons: pixel
 * borders, no rounded corners.
 */
export default function Hud() {
  const isMuted = useWorldStore((s) => s.isMuted);
  const toggleMute = useWorldStore((s) => s.toggleMute);
  const openDialogue = useWorldStore((s) => s.openDialogue);

  const onToggleMute = () => {
    // First gesture also unlocks audio (browser autoplay policy).
    audio.unlock();
    audio.setMuted(!isMuted);
    toggleMute();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* Top bar */}
      <div className="pointer-events-auto absolute right-4 top-4 flex gap-2">
        <a
          href="/resume"
          className="border-2 border-[var(--ink)] bg-[var(--parchment)] px-3 py-2 font-display text-sm text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] hover:bg-[var(--accent)]"
        >
          Resume
        </a>
        <button
          onClick={onToggleMute}
          aria-pressed={isMuted}
          className="border-2 border-[var(--ink)] bg-[var(--parchment)] px-3 py-2 font-display text-sm text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] hover:bg-[var(--accent)]"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Demo interaction — remove once real NPCs exist */}
      <div className="pointer-events-auto absolute bottom-4 left-4">
        <button
          onClick={() => openDialogue("lighthouse")}
          className="border-2 border-[var(--ink)] bg-[var(--parchment)] px-3 py-2 font-display text-sm text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] hover:bg-[var(--accent)]"
        >
          Talk to the Keeper
        </button>
      </div>
    </div>
  );
}
