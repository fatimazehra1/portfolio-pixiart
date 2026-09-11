import { DOOR, FADE_IN, FADE_OUT, HOVER, MASTER_GAIN, OCEAN } from "./AudioConfig";

/**
 * The world's sound: an ocean, a tick under the pointer, and a door.
 *
 * Off by default, and off until somebody asks for it — which is not politeness.
 * A browser will not give a page an audio context before a gesture, so the
 * context is built inside the click that turns the speaker on and never
 * before. A visitor who never touches the speaker pays nothing: no context, no
 * buffer, no oscillators.
 *
 * # Why it is synthesised
 * See `AudioConfig`. Three sounds' worth of arithmetic instead of three files,
 * and an ocean with no loop point in it.
 *
 * # What it refuses to do
 * It does not know about the map, the camera, or a chapter. It is told `hover`
 * and `door` by whoever is watching those things happen (`SoundToggle`), the
 * same way the renderer is told the hour rather than reading a clock. That is
 * what keeps a sound effect from becoming a reason for the engine to import
 * the interface.
 */
export class AmbientAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private surf: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private on = false;
  /** Context clock of the last hover tick, for the throttle. */
  private lastHover = -Infinity;
  private readonly listeners = new Set<() => void>();

  /** Whether sound is currently on. */
  get isOn(): boolean {
    return this.on;
  }

  /**
   * Be told when the sound goes on or off.
   *
   * Shaped for `useSyncExternalStore`: the speaker button renders from this
   * rather than from a copy of it in React state, so the two can never
   * disagree, and reading the stored preference on mount does not have to be a
   * `setState` inside an effect.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The snapshot half of the same pair. Bound, so it is stable across renders. */
  getSnapshot = (): boolean => this.on;

  /**
   * Turn the world's sound on or off.
   *
   * Must be called from inside a user gesture the first time, or the context
   * is created suspended and nothing is heard until the next click.
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.on) return;
    this.on = enabled;
    for (const listener of this.listeners) listener();

    if (!enabled) {
      this.fade(0, FADE_OUT);
      return;
    }

    const context = this.ensureContext();
    if (!context) return;
    // A context built before the gesture landed, or suspended by a tab going
    // to the background, comes back here rather than staying silent for good.
    if (context.state === "suspended") {
      void context.resume();
      this.unlockOnGesture(context);
    }
    this.fade(MASTER_GAIN, FADE_IN);
  }

  /** The pointer found an island. Throttled, so a sweep across the map is one tick per island. */
  hover(): void {
    const context = this.live();
    if (!context || !this.master) return;

    const now = context.currentTime;
    if (now - this.lastHover < HOVER.throttle) return;
    this.lastHover = now;

    const osc = context.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(HOVER.frequency, now);
    osc.frequency.exponentialRampToValueAtTime(HOVER.endFrequency, now + HOVER.decay);

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(HOVER.gain, now + HOVER.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + HOVER.decay);

    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + HOVER.decay + 0.02);
  }

  /** A door opened. The low body first, the air over the top of it. */
  door(): void {
    const context = this.live();
    if (!context || !this.master) return;

    const now = context.currentTime;

    const body = context.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(DOOR.frequency, now);
    body.frequency.exponentialRampToValueAtTime(DOOR.endFrequency, now + DOOR.decay);

    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(DOOR.gain, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + DOOR.decay);
    body.connect(bodyGain).connect(this.master);
    body.start(now);
    body.stop(now + DOOR.decay + 0.02);

    // The air is the same noise the ocean is made of, swept: a gap opening
    // sounds like a filter opening, because that is most of what it is.
    const air = context.createBufferSource();
    air.buffer = this.noise(context);

    const band = context.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.1;
    band.frequency.setValueAtTime(DOOR.airFrom, now);
    band.frequency.exponentialRampToValueAtTime(DOOR.airTo, now + DOOR.airDecay);

    const airGain = context.createGain();
    airGain.gain.setValueAtTime(DOOR.airGain, now);
    airGain.gain.exponentialRampToValueAtTime(0.0001, now + DOOR.airDecay);

    air.connect(band).connect(airGain).connect(this.master);
    air.start(now);
    air.stop(now + DOOR.airDecay + 0.02);
  }

  /** Stop everything and release the context. Called when the page goes away. */
  dispose(): void {
    this.on = false;
    try {
      this.surf?.stop();
    } catch {
      // Already stopped, which is the state we wanted anyway.
    }
    this.surf = null;
    this.master = null;
    this.noiseBuffer = null;
    void this.context?.close();
    this.context = null;
  }

  // --- Internals -------------------------------------------------------------

  /** The context, but only while sound is actually on. Every effect gates on this. */
  private live(): AudioContext | null {
    return this.on && this.master ? this.context : null;
  }

  /**
   * Wait for the visitor to touch the page, then start the sound.
   *
   * Only ever needed on the return visit: a stored "on" is restored from an
   * effect, which has no gesture behind it, so `resume` is refused and the
   * context sits suspended. Rather than making the visitor find the speaker
   * again to hear what they already asked for, the first click or key on the
   * page — including the one that enters a world — lets it through.
   */
  private unlockOnGesture(context: AudioContext): void {
    const unlock = () => {
      void context.resume();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: false });
    window.addEventListener("keydown", unlock, { once: false });
  }

  private fade(to: number, seconds: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(to, now + seconds);
  }

  /**
   * Build the context, the master gain and the surf, once.
   *
   * The surf runs for the life of the page rather than starting and stopping
   * with the speaker: a looping buffer source cannot be restarted once it has
   * been stopped, and gating it at the master gain costs one multiply and gets
   * the fade for free.
   */
  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined") return null;

    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    const context = new Ctor();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    this.context = context;
    this.master = master;
    this.startSurf(context, master);
    return context;
  }

  private startSurf(context: AudioContext, master: GainNode): void {
    const source = context.createBufferSource();
    source.buffer = this.noise(context);
    source.loop = true;

    const low = context.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = OCEAN.cutoff;
    low.Q.value = 0.6;

    const gain = context.createGain();
    gain.gain.value = OCEAN.gain;

    // Two slow sines on cycles that do not divide into each other: the level
    // swells, the brightness wanders, and they will not line up again for long
    // enough that nobody hears them as a pattern.
    const swell = context.createOscillator();
    swell.frequency.value = 1 / OCEAN.swellSeconds;
    const swellDepth = context.createGain();
    swellDepth.gain.value = OCEAN.gain * OCEAN.gainSwing;
    swell.connect(swellDepth).connect(gain.gain);
    swell.start();

    const wander = context.createOscillator();
    wander.frequency.value = 1 / OCEAN.cutoffSeconds;
    const wanderDepth = context.createGain();
    wanderDepth.gain.value = OCEAN.cutoffSwing;
    wander.connect(wanderDepth).connect(low.frequency);
    wander.start();

    source.connect(low).connect(gain).connect(master);
    source.start();
    this.surf = source;
  }

  /**
   * Pink-ish noise, built once and shared by the surf and the door.
   *
   * White noise sounds like a broken television; surf is weighted toward the
   * bottom end. This is the cheap running-average approximation, which at this
   * level in the mix is indistinguishable from the honest one.
   */
  private noise(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;

    const length = Math.floor(context.sampleRate * OCEAN.bufferSeconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099;
      b1 = 0.963 * b1 + white * 0.2965;
      b2 = 0.57 * b2 + white * 1.0526;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}

/**
 * The one instance.
 *
 * The same argument `worldHandle` makes: there is one page making one noise,
 * and a component that mounts and unmounts must not take the ocean with it.
 */
let shared: AmbientAudio | null = null;

export function getAudio(): AmbientAudio {
  if (!shared) shared = new AmbientAudio();
  return shared;
}
