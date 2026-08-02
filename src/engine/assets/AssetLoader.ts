import { Assets } from "pixi.js";
import type { AssetsManifest, UnresolvedAsset } from "pixi.js";

/**
 * Thin wrapper around Pixi's global Assets system (CLAUDE.md §Assets: lazy-load,
 * reuse textures, destroy unused). Systems load through here so the engine has a
 * single place to track and unload what's in memory.
 *
 * Pixel-perfect note: the engine sets the global default scale mode to "nearest"
 * at init, so textures loaded through here stay crisp without per-call config.
 *
 * No assets are loaded today — this is the reusable loading surface only.
 */
export class AssetLoader {
  private initialised = false;
  private readonly loaded = new Set<string>();

  /** Initialise Pixi Assets, optionally with a manifest of bundles. Idempotent. */
  async init(manifest?: AssetsManifest): Promise<void> {
    if (this.initialised) return;
    await Assets.init(manifest ? { manifest } : undefined);
    this.initialised = true;
  }

  /** Register a named bundle for later `loadBundle`. */
  addBundle(name: string, assets: Record<string, UnresolvedAsset | string>): void {
    Assets.addBundle(name, assets);
  }

  /** Load a single asset (URL or registered alias) and cache it. */
  async load<T = unknown>(src: string): Promise<T> {
    const asset = await Assets.load<T>(src);
    this.loaded.add(src);
    return asset;
  }

  /** Load a registered bundle. Reports progress 0–1 via the optional callback. */
  async loadBundle<T = Record<string, unknown>>(
    name: string,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const bundle = await Assets.loadBundle(name, onProgress);
    this.loaded.add(`bundle:${name}`);
    return bundle as T;
  }

  /** Retrieve an already-loaded asset by alias/URL without triggering a load. */
  get<T = unknown>(src: string): T {
    return Assets.get<T>(src);
  }

  /** Free a single asset from the cache/GPU. */
  async unload(src: string): Promise<void> {
    if (!this.loaded.has(src)) return;
    await Assets.unload(src);
    this.loaded.delete(src);
  }

  /** Free everything this loader has loaded. */
  async unloadAll(): Promise<void> {
    await Promise.all([...this.loaded].map((src) => Assets.unload(src)));
    this.loaded.clear();
  }
}
