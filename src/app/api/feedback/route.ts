import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { NOTE_MAX, RATING_MAX, REACTIONS, SUGGESTIONS } from "@/data/feedback";
import type { FeedbackNote, FeedbackState } from "@/data/feedback";
import { guestbook } from "./store";

/**
 * The guestbook API.
 *
 *   GET  /api/feedback                          everything public: counts and notes
 *   POST /api/feedback { type: "reaction", id }  one tap
 *   POST /api/feedback { type: "suggestion", id }
 *   POST /api/feedback { type: "rating", value }  1 to 10
 *   POST /api/feedback { type: "note", text }    a short line, shown to everyone
 *
 * # Counts
 * One JSON entry, `tallies`, updated with a conditional write: read it with
 * its etag, add one, write back only if nobody else wrote in between, and try
 * again if they did. No lost taps when two people press at once.
 *
 * # Notes
 * Public, so they are kept safe to show on a portfolio: 140 characters, no
 * links, control characters stripped, a small per-visitor limit, and anything
 * can be hidden afterwards (see `moderate/route.ts`). Each note is its own
 * entry, so two notes never contend.
 *
 * # Limits
 * Per visitor, per hour, keyed on a hash of the connecting IP. The address
 * itself is never stored.
 */

export const dynamic = "force-dynamic";

const TALLIES = "tallies";
const NOTE_PREFIX = "notes/";
/** How many notes the page is sent. Newest first. */
const NOTES_SHOWN = 40;
/** Taps and notes a visitor may leave per hour. */
const LIMITS = { tap: 40, note: 3 } as const;
const HOUR = 60 * 60 * 1000;

interface Tallies {
  reactions: Record<string, number>;
  suggestions: Record<string, number>;
  /** How many visitors gave each score, keyed "1" to "10". */
  ratings?: Record<string, number>;
}

interface StoredNote extends FeedbackNote {
  hidden?: boolean;
}

const REACTION_IDS = new Set(REACTIONS.map((option) => option.id));
const SUGGESTION_IDS = new Set(SUGGESTIONS.map((option) => option.id));

export async function GET() {
  try {
    return NextResponse.json(await readState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[guestbook] read failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { type?: unknown; id?: unknown; text?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    if (body.type === "reaction" || body.type === "suggestion") {
      const id = typeof body.id === "string" ? body.id : "";
      const valid = body.type === "reaction" ? REACTION_IDS.has(id) : SUGGESTION_IDS.has(id);
      if (!valid) return NextResponse.json({ error: "unknown option" }, { status: 400 });
      if (!(await allow(request, "tap"))) return tooMany();

      await bump(body.type === "reaction" ? "reactions" : "suggestions", id);
      return NextResponse.json(await readState());
    }

    if (body.type === "rating") {
      const value = body.value;
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > RATING_MAX) {
        return NextResponse.json({ error: "rating is 1 to 10" }, { status: 400 });
      }
      if (!(await allow(request, "tap"))) return tooMany();
      await bump("ratings", String(value));
      return NextResponse.json(await readState());
    }

    if (body.type === "note") {
      const text = cleanNote(body.text);
      if (typeof text !== "string") return NextResponse.json({ error: text.error }, { status: 400 });
      if (!(await allow(request, "note"))) return tooMany();

      const at = new Date().toISOString();
      // Time first, so a plain listing is already in order.
      const id = `${at.replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
      const note: StoredNote = { id, text, at };
      await guestbook().createJSON(NOTE_PREFIX + id, note);
      return NextResponse.json(await readState());
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (error) {
    console.error("[guestbook] write failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

async function readState(): Promise<FeedbackState> {
  const store = guestbook();
  const tallies = (await store.getJSON<Tallies>(TALLIES))?.data ?? { reactions: {}, suggestions: {} };

  const keys = (await store.list(NOTE_PREFIX)).sort().reverse();
  const notes: FeedbackNote[] = [];
  for (const key of keys) {
    if (notes.length >= NOTES_SHOWN) break;
    const note = (await store.getJSON<StoredNote>(key))?.data;
    if (note && !note.hidden) notes.push({ id: note.id, text: note.text, at: note.at });
  }

  let count = 0;
  let sum = 0;
  for (const [score, times] of Object.entries(tallies.ratings ?? {})) {
    count += times;
    sum += Number(score) * times;
  }
  const rating = { count, average: count ? Math.round((sum / count) * 10) / 10 : 0 };

  return { reactions: tallies.reactions, suggestions: tallies.suggestions, rating, notes };
}

/** Add one, with a conditional write and a few retries if someone else got there first. */
async function bump(group: keyof Tallies, id: string): Promise<void> {
  const store = guestbook();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await store.getJSON<Tallies>(TALLIES);
    const next: Tallies = current?.data ?? { reactions: {}, suggestions: {} };
    const counts = next[group] ?? {};
    next[group] = { ...counts, [id]: (counts[id] ?? 0) + 1 };
    const written = current
      ? await store.setJSON(TALLIES, next, current.etag)
      : await store.createJSON(TALLIES, next);
    if (written) return;
  }
  throw new Error("tallies stayed busy");
}

/** A note safe to put in front of everyone, or the reason it is not. */
function cleanNote(raw: unknown): string | { error: string } {
  if (typeof raw !== "string") return { error: "empty" };
  const text = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 2) return { error: "empty" };
  if (text.length > NOTE_MAX) return { error: "too long" };
  // No links of any kind: the one thing spam always carries.
  if (/(https?:|www\.|\.(com|net|org|io|xyz|ru|info|biz|co)\b|@\w+\.\w)/i.test(text)) {
    return { error: "no links" };
  }
  return text;
}

/** Per visitor, per hour. Keyed on a hash of the address, never the address. */
async function allow(request: Request, kind: keyof typeof LIMITS): Promise<boolean> {
  const address =
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const visitor = createHash("sha256").update(`guestbook:${address}`).digest("hex").slice(0, 24);
  const key = `rate/${kind}/${visitor}`;

  const store = guestbook();
  const now = Date.now();
  const current = await store.getJSON<{ start: number; count: number }>(key);
  const fresh = !current || now - current.data.start > HOUR;
  const next = fresh ? { start: now, count: 1 } : { ...current.data, count: current.data.count + 1 };
  if (next.count > LIMITS[kind]) return false;

  // Best effort: a lost race here lets one extra tap through, which is fine.
  if (current) await store.setJSON(key, next, current.etag);
  else await store.createJSON(key, next);
  return true;
}

function tooMany() {
  return NextResponse.json({ error: "slow down" }, { status: 429 });
}
