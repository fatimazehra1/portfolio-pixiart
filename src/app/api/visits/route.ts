import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { guestbook } from "../feedback/store";

/**
 * The visitor counter.
 *
 *   GET  /api/visits   { total }
 *   POST /api/visits   { total, you }   counts this visitor, once, ever
 *
 * A visitor is a hash of their address (never the address itself). The first
 * POST from a new one creates their entry with a conditional "only if new"
 * write, so two tabs opening at once still count once, and hands them their
 * number. Every later POST just returns the number they already have.
 *
 * It lives in the same Blobs store as the guestbook.
 */

export const dynamic = "force-dynamic";

const COUNTER = "visits";
const VISITOR_PREFIX = "visitors/";

export async function GET() {
  try {
    const total = (await guestbook().getJSON<{ total: number }>(COUNTER))?.data.total ?? 0;
    return NextResponse.json({ total }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[visits] read failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const store = guestbook();
    const address =
      request.headers.get("x-nf-client-connection-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "local";
    const visitor = createHash("sha256").update(`visits:${address}`).digest("hex").slice(0, 24);
    const key = VISITOR_PREFIX + visitor;

    const known = await store.getJSON<{ n: number }>(key);
    if (known) {
      const total = (await store.getJSON<{ total: number }>(COUNTER))?.data.total ?? known.data.n;
      return NextResponse.json({ total, you: known.data.n });
    }

    // New: take the next number, then claim this visitor's entry with it.
    const you = await next(store);
    const claimed = await store.createJSON(key, { n: you, at: new Date().toISOString() });
    // Lost a race with another tab of the same visitor: the counter moved one
    // extra, which is harmless; report the number that tab got.
    const mine = claimed ? you : ((await store.getJSON<{ n: number }>(key))?.data.n ?? you);
    return NextResponse.json({ total: you, you: mine });
  } catch (error) {
    console.error("[visits] write failed", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

/** Add one to the total with a conditional write, and return the new total. */
async function next(store: ReturnType<typeof guestbook>): Promise<number> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await store.getJSON<{ total: number }>(COUNTER);
    const total = (current?.data.total ?? 0) + 1;
    const written = current
      ? await store.setJSON(COUNTER, { total }, current.etag)
      : await store.createJSON(COUNTER, { total });
    if (written) return total;
  }
  throw new Error("counter stayed busy");
}
