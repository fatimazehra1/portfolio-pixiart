"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeedbackState } from "@/data/feedback";
import { REACTIONS, SUGGESTIONS } from "@/data/feedback";

/**
 * The guestbook, from your side. Not linked from anywhere.
 *
 * Enter the key (the `FEEDBACK_ADMIN_KEY` environment variable on Netlify)
 * once; it is kept for this browser tab only. Then every note, hidden ones
 * included, with Hide, Show and Delete. Delete asks twice, because it is the
 * one thing here that cannot be undone.
 */

const KEY_STORE = "portfolio.guestbook.admin";

interface AdminNote {
  id: string;
  text: string;
  at: string;
  hidden?: boolean;
}

export default function GuestbookAdmin() {
  const [key, setKey] = useState("");
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<AdminNote[] | null>(null);
  const [totals, setTotals] = useState<FeedbackState | null>(null);
  const [visitors, setVisitors] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (secret: string) => {
    setError(null);
    const response = await fetch("/api/feedback/moderate", {
      headers: { "x-admin-key": secret },
      cache: "no-store",
    });
    if (!response.ok) {
      setNotes(null);
      setError(
        response.status === 404
          ? "FEEDBACK_ADMIN_KEY is not set on this site yet."
          : "That key is not right."
      );
      return false;
    }
    setNotes((await response.json()).notes);
    const publicState = await fetch("/api/feedback", { cache: "no-store" });
    if (publicState.ok) setTotals(await publicState.json());
    const visits = await fetch("/api/visits", { cache: "no-store" });
    if (visits.ok) setVisitors((await visits.json()).total);
    return true;
  }, []);

  // Pick the key back up for this tab.
  useEffect(() => {
    let saved = "";
    try {
      saved = window.sessionStorage.getItem(KEY_STORE) ?? "";
    } catch {
      // No storage: ask each time.
    }
    if (!saved) return;
    const timer = window.setTimeout(() => {
      setKey(saved);
      void load(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const signIn = async () => {
    if (!(await load(draft))) return;
    setKey(draft);
    try {
      window.sessionStorage.setItem(KEY_STORE, draft);
    } catch {
      // Fine.
    }
  };

  const act = async (action: "hide" | "show" | "delete", id: string) => {
    setBusy(id);
    const response = await fetch("/api/feedback/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify({ action, id }),
    });
    setBusy(null);
    setConfirm(null);
    if (response.ok) setNotes((await response.json()).notes);
    else setError("That did not go through. Try again.");
  };

  return (
    <main
      className="min-h-dvh px-4 py-8 font-sans"
      style={{ background: "var(--ui-panel-strong)", color: "var(--ui-text)" }}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-[1.5rem] font-semibold tracking-wide">Guestbook</h1>
        <p className="mt-1 text-[0.875rem]" style={{ color: "var(--ui-muted)" }}>
          Private. Hide a note to take it off the site (you can show it again), or delete it for good.
        </p>

        {!notes && (
          <form
            className="mt-6 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void signIn();
            }}
          >
            <input
              type="password"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Admin key"
              aria-label="Admin key"
              autoComplete="current-password"
              className="min-h-11 flex-1 border-2 px-3 text-[0.9375rem] outline-none"
              style={{ borderColor: "var(--ui-border)", background: "var(--ui-panel)", color: "var(--ui-text)" }}
            />
            <button
              type="submit"
              className="min-h-11 cursor-pointer border-2 px-4 font-semibold"
              style={{ borderColor: "var(--accent)", background: "var(--accent)", color: "#1a1208" }}
            >
              Open
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 text-[0.875rem]" style={{ color: "#e5836b" }} role="alert">
            {error}
          </p>
        )}

        {notes && totals && (
          <section className="ui-panel mt-6 p-4">
            <h2 className="text-[0.75rem] tracking-wider uppercase" style={{ color: "var(--ui-faint)" }}>
              So far
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem]">
              <span>
                Visitors <strong>{visitors ?? "…"}</strong>
              </span>
              <span>
                Rating{" "}
                <strong>{totals.rating?.count ? totals.rating.average.toFixed(1) : "none yet"}</strong>
                {totals.rating?.count ? ` from ${totals.rating.count}` : ""}
              </span>
              {REACTIONS.map((option) => (
                <span key={option.id}>
                  {option.icon} {option.label} <strong>{totals.reactions[option.id] ?? 0}</strong>
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem]" style={{ color: "var(--ui-muted)" }}>
              More of:
              {SUGGESTIONS.map((option) => (
                <span key={option.id}>
                  {option.label} <strong style={{ color: "var(--ui-text)" }}>{totals.suggestions[option.id] ?? 0}</strong>
                </span>
              ))}
            </div>
          </section>
        )}

        {notes && (
          <section className="mt-6">
            <h2 className="text-[0.75rem] tracking-wider uppercase" style={{ color: "var(--ui-faint)" }}>
              Notes ({notes.length})
            </h2>
            {notes.length === 0 && (
              <p className="mt-2 text-[0.875rem]" style={{ color: "var(--ui-muted)" }}>
                No notes yet.
              </p>
            )}
            <ul className="mt-2 space-y-2">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="ui-panel flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
                  style={{ opacity: note.hidden ? 0.6 : 1 }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.9375rem] leading-snug break-words">{note.text}</p>
                    <p className="mt-0.5 text-[0.75rem]" style={{ color: "var(--ui-faint)" }}>
                      {new Date(note.at).toLocaleString()}
                      {note.hidden && " · hidden from the site"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <AdminButton
                      disabled={busy === note.id}
                      onClick={() => void act(note.hidden ? "show" : "hide", note.id)}
                    >
                      {note.hidden ? "Show" : "Hide"}
                    </AdminButton>
                    {confirm === note.id ? (
                      <>
                        <AdminButton danger disabled={busy === note.id} onClick={() => void act("delete", note.id)}>
                          Delete for good
                        </AdminButton>
                        <AdminButton onClick={() => setConfirm(null)}>Cancel</AdminButton>
                      </>
                    ) : (
                      <AdminButton onClick={() => setConfirm(note.id)}>Delete</AdminButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

function AdminButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-9 cursor-pointer border-2 px-3 text-[0.8125rem] font-semibold disabled:opacity-50"
      style={{
        borderColor: danger ? "#c9573f" : "var(--ui-border)",
        background: danger ? "#c9573f" : undefined,
        color: danger ? "#ffffff" : "var(--ui-text)",
      }}
    >
      {children}
    </button>
  );
}
