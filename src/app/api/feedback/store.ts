import { getStore } from "@netlify/blobs";

/**
 * Where the guestbook lives: Netlify Blobs, in a store of its own.
 *
 * On Netlify the Next.js runtime wires the Blobs environment up by itself, so
 * `getStore` just works. Anywhere else (`next dev` on a laptop) there is no
 * Blobs environment and `getStore` throws; the guestbook then keeps its data
 * in memory for the life of the dev server, so the feature can be clicked
 * through locally without a Netlify account in the loop.
 */

export interface GuestbookStore {
  getJSON<T>(key: string): Promise<{ data: T; etag?: string } | null>;
  /** Write; with `etag`, only if the entry has not changed since it was read. */
  setJSON(key: string, value: unknown, etag?: string): Promise<boolean>;
  /** Write only if nothing is at `key` yet. */
  createJSON(key: string, value: unknown): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  remove(key: string): Promise<void>;
}

const STORE_NAME = "guestbook";

function netlifyStore(): GuestbookStore {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  return {
    async getJSON(key) {
      const found = await store.getWithMetadata(key, { type: "json" });
      return found ? { data: found.data, etag: found.etag } : null;
    },
    async setJSON(key, value, etag) {
      const result = await store.setJSON(key, value, etag ? { onlyIfMatch: etag } : undefined);
      return result.modified;
    },
    async createJSON(key, value) {
      const result = await store.setJSON(key, value, { onlyIfNew: true });
      return result.modified;
    },
    async list(prefix) {
      const { blobs } = await store.list({ prefix });
      return blobs.map((blob) => blob.key);
    },
    async remove(key) {
      await store.delete(key);
    },
  };
}

/** The laptop fallback. Same contract, one Map, gone on restart. */
const memory = new Map<string, { value: string; etag: string }>();
let version = 0;
const memoryStore: GuestbookStore = {
  async getJSON(key) {
    const hit = memory.get(key);
    return hit ? { data: JSON.parse(hit.value), etag: hit.etag } : null;
  },
  async setJSON(key, value, etag) {
    if (etag && memory.get(key)?.etag !== etag) return false;
    memory.set(key, { value: JSON.stringify(value), etag: String(++version) });
    return true;
  },
  async createJSON(key, value) {
    if (memory.has(key)) return false;
    memory.set(key, { value: JSON.stringify(value), etag: String(++version) });
    return true;
  },
  async list(prefix) {
    return [...memory.keys()].filter((key) => key.startsWith(prefix));
  },
  async remove(key) {
    memory.delete(key);
  },
};

/** No Blobs environment here. Thrown by `getStore` or by the first request. */
const missingEnvironment = (error: unknown) =>
  error instanceof Error && error.name === "MissingBlobsEnvironmentError";

let useMemory = false;

/**
 * The store, with the fallback decided on first contact: Netlify's when there
 * is a Blobs environment, memory when there is not. Any other failure (the
 * network, a bad key) is a real error and is thrown as one.
 */
export function guestbook(): GuestbookStore {
  const attempt =
    <A extends unknown[], R>(pick: (store: GuestbookStore) => (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      if (!useMemory) {
        try {
          return await pick(netlifyStore())(...args);
        } catch (error) {
          if (!missingEnvironment(error)) throw error;
          useMemory = true;
        }
      }
      return pick(memoryStore)(...args);
    };

  return {
    getJSON: attempt((store) => store.getJSON) as GuestbookStore["getJSON"],
    setJSON: attempt((store) => store.setJSON),
    createJSON: attempt((store) => store.createJSON),
    list: attempt((store) => store.list),
    remove: attempt((store) => store.remove),
  };
}
