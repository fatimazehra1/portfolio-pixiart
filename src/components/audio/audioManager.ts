import { Howl, Howler } from "howler";
import type { AmbientTrack } from "@/types";

/**
 * Ambient audio manager (DESIGN.md §Audio Rules): one loop at a time,
 * cross-fade between ambiences, muted until the first user gesture.
 *
 * Tracks are lazy-created and expected at /assets/audio/<track>.<ext>.
 * Files are not committed yet — add them under public/assets/audio.
 */
const FADE_MS = 800;

const SOURCES: Record<AmbientTrack, string[]> = {
  ocean: ["/assets/audio/ocean.webm", "/assets/audio/ocean.mp3"],
  wind: ["/assets/audio/wind.webm", "/assets/audio/wind.mp3"],
  birds: ["/assets/audio/birds.webm", "/assets/audio/birds.mp3"],
  rain: ["/assets/audio/rain.webm", "/assets/audio/rain.mp3"],
  forge: ["/assets/audio/forge.webm", "/assets/audio/forge.mp3"],
  construction: ["/assets/audio/construction.webm", "/assets/audio/construction.mp3"],
  night: ["/assets/audio/night.webm", "/assets/audio/night.mp3"],
};

class AudioManager {
  private howls = new Map<AmbientTrack, Howl>();
  private current: AmbientTrack | null = null;
  private volume = 0.7;
  private unlocked = false;

  /** Call once after the first user gesture to satisfy autoplay policies. */
  unlock() {
    this.unlocked = true;
    if (this.current) this.get(this.current).play();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    Howler.volume(this.volume);
  }

  setMuted(muted: boolean) {
    Howler.mute(muted);
  }

  /** Cross-fade to a new ambient loop. No-op if already playing it. */
  crossfadeTo(track: AmbientTrack | null) {
    if (track === this.current) return;

    const prev = this.current;
    if (prev) {
      const p = this.get(prev);
      p.fade(p.volume(), 0, FADE_MS);
      p.once("fade", () => p.pause());
    }

    this.current = track;
    if (!track) return;

    const next = this.get(track);
    if (this.unlocked) {
      next.volume(0);
      if (!next.playing()) next.play();
      next.fade(0, this.volume, FADE_MS);
    }
  }

  private get(track: AmbientTrack): Howl {
    let howl = this.howls.get(track);
    if (!howl) {
      howl = new Howl({ src: SOURCES[track], loop: true, volume: this.volume });
      this.howls.set(track, howl);
    }
    return howl;
  }
}

/** Singleton — audio is inherently global. */
export const audio = new AudioManager();
