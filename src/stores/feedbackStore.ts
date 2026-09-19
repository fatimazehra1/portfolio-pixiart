import { create } from "zustand";
import { EMPTY_FEEDBACK } from "@/data/feedback";
import type { FeedbackState } from "@/data/feedback";

/**
 * The guestbook, on the client. One copy, shared by the corner button and the
 * Contact island, so a tap in one shows up in the other straight away.
 *
 * What this browser has already tapped is remembered in localStorage, so a
 * visitor sees their own choices lit when they come back and cannot pile up
 * taps on one reaction. It is a courtesy, not a lock; the server has its own
 * limit.
 */

const MINE_KEY = "portfolio.guestbook.mine";

type Mine = { reactions: string[]; suggestions: string[]; notes: number; rating: number | null };

function readMine(): Mine {
  try {
    const raw = window.localStorage.getItem(MINE_KEY);
    if (raw) return { reactions: [], suggestions: [], notes: 0, rating: null, ...JSON.parse(raw) };
  } catch {
    // Private mode, blocked storage: start empty.
  }
  return { reactions: [], suggestions: [], notes: 0, rating: null };
}

function writeMine(mine: Mine) {
  try {
    window.localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  } catch {
    // Nothing to do; the tap still counted.
  }
}

interface FeedbackStore {
  data: FeedbackState;
  status: "idle" | "loading" | "ready" | "error";
  mine: Mine;
  load: () => Promise<void>;
  tap: (type: "reaction" | "suggestion", id: string) => Promise<void>;
  /** One rating per visitor, 1 to 10. */
  rate: (value: number) => Promise<void>;
  /** Resolves to an error message, or null when the note is up. */
  note: (text: string) => Promise<string | null>;
}

const ERRORS: Record<string, string> = {
  "no links": "Links aren't allowed, sorry.",
  "too long": "A little shorter, please.",
  empty: "Say a word or two first.",
  "slow down": "That's plenty for now. Thank you!",
};

async function post(body: unknown): Promise<{ ok: boolean; data?: FeedbackState; error?: string }> {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    return response.ok ? { ok: true, data: json } : { ok: false, error: json.error };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  data: EMPTY_FEEDBACK,
  status: "idle",
  mine: { reactions: [], suggestions: [], notes: 0, rating: null },

  load: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", mine: readMine() });
    try {
      const response = await fetch("/api/feedback", { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      set({ data: await response.json(), status: "ready" });
    } catch {
      set({ status: "error" });
    }
  },

  tap: async (type, id) => {
    const group = type === "reaction" ? "reactions" : "suggestions";
    const { mine, data } = get();
    if (mine[group].includes(id)) return;

    // Optimistic: lit and counted now, corrected by the server's answer.
    const nextMine = { ...mine, [group]: [...mine[group], id] };
    writeMine(nextMine);
    set({
      mine: nextMine,
      data: { ...data, [group]: { ...data[group], [id]: (data[group][id] ?? 0) + 1 } },
    });

    const result = await post({ type, id });
    if (result.ok && result.data) set({ data: result.data });
  },

  rate: async (value) => {
    const { mine, data } = get();
    if (mine.rating !== null) return;

    // Optimistic, as with taps: the average moves now, the server corrects it.
    const nextMine = { ...mine, rating: value };
    writeMine(nextMine);
    const count = data.rating.count + 1;
    const average = Math.round(((data.rating.average * data.rating.count + value) / count) * 10) / 10;
    set({ mine: nextMine, data: { ...data, rating: { count, average } } });

    const result = await post({ type: "rating", value });
    if (result.ok && result.data) set({ data: result.data });
  },

  note: async (text) => {
    const result = await post({ type: "note", text });
    if (!result.ok) return ERRORS[result.error ?? ""] ?? "Couldn't post that. Try again in a bit.";
    const mine = { ...get().mine, notes: get().mine.notes + 1 };
    writeMine(mine);
    set({ mine, data: result.data ?? get().data });
    return null;
  },
}));
