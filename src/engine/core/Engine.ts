import { Application, Container, TextureSource } from "pixi.js";
import type { Ticker } from "pixi.js";
import { Camera } from "../camera/Camera";
import { LayerManager } from "../layers/LayerManager";
import { AssetLoader } from "../assets/AssetLoader";
import type { EngineOptions, LayerName, Size } from "../types";

/**
 * The Waterfront rendering engine — a self-contained PixiJS foundation with no
 * art, no gameplay and no React. It owns the Application, the scene graph, the
 * camera, the render layers and the asset loader, and it handles resize + cleanup.
 *
 * Scene graph:
 *   stage → camera.container → world → { backdrop … foreground }
 *
 * The camera transforms `camera.container`; the world holds the parallax layers
 * that the drawing systems mount into. Live camera state stays here (not in
 * React) so panning never triggers re-renders — only viewport size / ready flags
 * are surfaced to the store.
 */
export class Engine {
  readonly app: Application;
  readonly assets = new AssetLoader();

  // Assigned during init().
  private world!: Container;
  private cameraRef!: Camera;
  private layers!: LayerManager;

  private readonly opts: EngineOptions;
  private resizeObserver: ResizeObserver | null = null;
  private started = false;
  /**
   * Set after construction, when the thing that wants resizes could not exist
   * before the engine did. Takes precedence over `opts.onResize`.
   *
   * The World is built *from* an initialised engine — it needs the viewport and
   * the camera to exist first — so it cannot be passed in as a constructor
   * option. Rather than make every system nullable to accommodate that ordering,
   * the handler arrives a moment later.
   */
  private onResize: ((size: Size) => void) | null = null;

  constructor(opts: EngineOptions) {
    this.opts = opts;
    this.app = new Application();
  }

  // --- Lifecycle -------------------------------------------------------------

  /** Create the renderer and scene graph. Safe to call once. */
  async init(): Promise<this> {
    if (this.started) return this;
    this.started = true;

    // Global pixel-art default: never blur a texture (CLAUDE.md §Pixel Art Rules).
    TextureSource.defaultOptions.scaleMode = "nearest";

    const { host, maxFPS = 60, maxResolution = 2 } = this.opts;

    await this.app.init({
      resizeTo: host,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, maxResolution),
      backgroundColor: this.opts.backgroundColor ?? "#000000",
      backgroundAlpha: this.opts.backgroundAlpha ?? 0, // transparent: empty engine draws nothing
      preference: "webgl",
      powerPreference: "high-performance",
    });

    // Hold a steady 60 FPS target rather than racing high-refresh displays.
    this.app.ticker.maxFPS = maxFPS;

    // Scene graph: camera transforms the world; world holds the layers.
    this.cameraRef = new Camera(this.viewport);
    this.world = new Container();
    this.world.label = "world";
    this.cameraRef.container.addChild(this.world);
    this.app.stage.addChild(this.cameraRef.container);

    this.layers = new LayerManager(this.world);

    // Resize: a ResizeObserver on the host catches both window resizes (the host
    // fills the viewport) and container layout changes. It resizes the renderer
    // (via resizeTo) then syncs the camera + store with the new size.
    this.resizeObserver = new ResizeObserver(() => {
      this.app.resize();
      this.handleResize();
    });
    this.resizeObserver.observe(host);

    return this;
  }

  /** Tear everything down. Idempotent-safe against a partially-initialised engine. */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.started) {
      // destroy(true) removes the canvas; children/texture options free the tree + GPU.
      this.app.destroy(true, { children: true, texture: true });
    }
  }

  // --- Accessors -------------------------------------------------------------

  /** The <canvas> element to mount into the DOM. */
  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  /** Current CSS-pixel viewport size (resolution-independent). */
  get viewport(): Size {
    return { width: this.app.screen.width, height: this.app.screen.height };
  }

  get camera(): Camera {
    return this.cameraRef;
  }

  /** The mount point for a render layer's content. */
  layer(name: LayerName): Container {
    return this.layers.get(name);
  }

  /** The layer stack, for driving parallax. See `LayerManager.setView`. */
  get stack(): LayerManager {
    return this.layers;
  }

  /**
   * Re-place the parallax layers against the camera's current transform.
   *
   * Call every frame, straight after the camera has moved and before anything
   * is drawn. It reads the transform the camera *applied*, not the one it
   * intended, which is what keeps a backdrop from disagreeing with the view by
   * a pixel — so it has to run after `camera.update`, not alongside it.
   */
  syncLayers(): void {
    this.layers.setView(this.cameraRef.getView());
  }

  /** Who to tell about resizes. See the field for why this arrives late. */
  setResizeHandler(handler: ((size: Size) => void) | null): void {
    this.onResize = handler;
  }

  /**
   * Subscribe to the frame loop. The callback receives Pixi's Ticker; drive motion
   * by `ticker.deltaTime` so it's frame-rate independent. Returns an unsubscribe fn.
   */
  onUpdate(callback: (ticker: Ticker) => void): () => void {
    this.app.ticker.add(callback);
    return () => this.app.ticker.remove(callback);
  }

  // --- Internal --------------------------------------------------------------

  private handleResize = (): void => {
    const size = this.viewport;
    this.cameraRef.setViewport(size);
    if (this.onResize) this.onResize(size);
    else this.opts.onResize?.(size);
  };
}
