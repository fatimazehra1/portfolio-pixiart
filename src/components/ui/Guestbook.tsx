"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NOTE_MAX, RATING_MAX, REACTIONS, SUGGESTIONS } from "@/data/feedback";
import { useFeedbackStore } from "@/stores/feedbackStore";

/**
 * The guestbook: leave a mark without filling anything in.
 *
 * Three layers, lightest first:
 *  - reactions, one tap each, with the running count everyone sees;
 *  - "more of…" suggestions, one tap each, counted the same way;
 *  - notes, which everyone can read, and which you only type if you want to:
 *    the box stays closed behind "Add a note" until asked for.
 *
 * Shared by the corner button (`GuestbookButton`) and the Contact island, in
 * the dark interface tone or on the plaque's paper.
 */

type Tone = "dark" | "paper";

const TONES = {
  dark: {
    ink: "var(--ui-text)",
    muted: "var(--ui-muted)",
    faint: "var(--ui-faint)",
    line: "var(--ui-border)",
    accent: "var(--accent)",
    on: "rgb(224 164 88 / 0.16)",
    onAccent: "#1a1208",
    field: "var(--ui-panel-strong)",
  },
  paper: {
    ink: "var(--plaque-ink)",
    muted: "var(--plaque-muted)",
    faint: "var(--plaque-muted)",
    line: "var(--plaque-line)",
    accent: "var(--plaque-frame)",
    on: "rgb(201 145 63 / 0.22)",
    onAccent: "#fff7e8",
    field: "rgb(255 255 255 / 0.5)",
  },
} as const;

export default function Guestbook({ tone = "dark" }: { tone?: Tone }) {
  const c = TONES[tone];
  const { data, status, mine, load, tap } = useFeedbackStore();

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  return (
    <section className="space-y-4 font-sans" aria-label="Guestbook">
      {/* One warm bar down the side, in the site's own accent: enough to say
          "this part is for you to do something", without leaving the palette. */}
      <div className="border-l-4 pl-2.5" style={{ borderColor: c.accent }}>
        <p className="font-display text-[1.0625rem] leading-tight font-semibold tracking-wide" style={{ color: c.ink }}>
          Leave a mark
        </p>
        <p className="mt-0.5 text-[0.75rem] leading-snug" style={{ color: c.muted }}>
          Tap one. No forms, no sign in. Everyone sees the results.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {REACTIONS.map((option) => (
          <ReactionTile
            key={option.id}
            icon={option.icon ?? ""}
            label={option.label}
            count={data.reactions[option.id] ?? 0}
            on={mine.reactions.includes(option.id)}
            tone={tone}
            onTap={() => void tap("reaction", option.id)}
          />
        ))}
      </div>

      <Rating tone={tone} />

      <div>
        <Heading tone={tone}>I&apos;d like to see more of</Heading>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((option) => {
            const on = mine.suggestions.includes(option.id);
            return (
              <li key={option.id}>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => void tap("suggestion", option.id)}
                  aria-pressed={on}
                  className="flex min-h-8 cursor-pointer items-center gap-1.5 border-2 px-2 text-[0.75rem] leading-none transition-colors"
                  style={{
                    borderColor: on ? c.accent : c.line,
                    background: on ? c.on : undefined,
                    color: c.ink,
                  }}
                >
                  <span style={{ color: c.accent }}>{on ? "✓" : "+"}</span>
                  {option.label}
                  <span className="tabular-nums" style={{ color: c.faint }}>
                    {data.suggestions[option.id] ?? 0}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </div>

      <Notes tone={tone} />

      {status === "error" && (
        <p className="text-[0.6875rem]" style={{ color: c.faint }}>
          The guestbook is not answering right now. Taps will still try to reach it.
        </p>
      )}
    </section>
  );
}

function Heading({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <p className="text-[0.625rem] font-semibold tracking-wider uppercase" style={{ color: TONES[tone].muted }}>
      {children}
    </p>
  );
}

/**
 * One reaction. Quiet at rest, the site's accent once tapped, and a "+1" that
 * floats up on the press so the tap is clearly received.
 */
function ReactionTile({
  icon,
  label,
  count,
  on,
  tone,
  onTap,
}: {
  icon: string;
  label: string;
  count: number;
  on: boolean;
  tone: Tone;
  onTap: () => void;
}) {
  const c = TONES[tone];
  const [bursts, setBursts] = useState<number[]>([]);

  const press = () => {
    if (!on) setBursts((list) => [...list, Date.now()]);
    onTap();
  };

  return (
    <motion.button
      type="button"
      onClick={press}
      aria-pressed={on}
      aria-label={`${label}, ${count}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className="relative flex min-h-11 cursor-pointer items-center gap-2 border-2 px-2 text-left transition-colors"
      style={{ borderColor: on ? c.accent : c.line, background: on ? c.on : undefined }}
    >
      <motion.span
        key={on ? "on" : "off"}
        initial={on ? { scale: 1.6 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className="text-[1.0625rem] leading-none"
        style={{ color: c.accent }}
        aria-hidden
      >
        {icon}
      </motion.span>
      <span className="flex-1 text-[0.75rem] leading-tight" style={{ color: c.ink }}>
        {label}
      </span>
      <span className="text-[0.75rem] font-semibold tabular-nums" style={{ color: on ? c.accent : c.faint }}>
        {count}
      </span>

      <AnimatePresence>
        {bursts.map((id) => (
          <motion.span
            key={id}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => setBursts((list) => list.filter((other) => other !== id))}
            className="font-display pointer-events-none absolute -top-1 right-2 text-[0.8125rem] font-bold"
            style={{ color: c.accent }}
            aria-hidden
          >
            +1
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * "Rate it, 1 to 10": a row of ten cells. Hovering fills them up to the one
 * under the pointer, so the scale reads like a meter; one tap sets it. After
 * that the row shows your score and the public average.
 */
function Rating({ tone }: { tone: Tone }) {
  const c = TONES[tone];
  const rating = useFeedbackStore((s) => s.data.rating) ?? { count: 0, average: 0 };
  const mine = useFeedbackStore((s) => s.mine.rating);
  const rate = useFeedbackStore((s) => s.rate);
  const [hover, setHover] = useState<number | null>(null);

  const shown = mine ?? hover ?? 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Heading tone={tone}>Rate the portfolio, 1 to 10</Heading>
        {rating.count > 0 && (
          <span className="text-[0.6875rem] tabular-nums" style={{ color: c.muted }}>
            <span className="font-semibold" style={{ color: c.ink }}>
              {rating.average.toFixed(1)}
            </span>{" "}
            avg · {rating.count}
          </span>
        )}
      </div>

      <div
        className="mt-1.5 grid grid-cols-10 gap-1"
        role="radiogroup"
        aria-label="Rate the portfolio from 1 to 10"
        onPointerLeave={() => setHover(null)}
      >
        {Array.from({ length: RATING_MAX }, (_, index) => {
          const value = index + 1;
          const filled = value <= shown;
          return (
            <motion.button
              key={value}
              type="button"
              role="radio"
              aria-checked={mine === value}
              aria-label={`${value} out of ${RATING_MAX}`}
              disabled={mine !== null}
              whileTap={mine === null ? { scale: 0.88 } : undefined}
              onPointerEnter={() => mine === null && setHover(value)}
              onFocus={() => mine === null && setHover(value)}
              onClick={() => void rate(value)}
              className="flex h-8 cursor-pointer items-center justify-center border-2 text-[0.75rem] font-semibold tabular-nums transition-colors disabled:cursor-default"
              style={{
                borderColor: filled ? c.accent : c.line,
                background: filled ? c.accent : undefined,
                color: filled ? c.onAccent : c.muted,
              }}
            >
              {value}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-1 text-[0.6875rem]" style={{ color: c.faint }} role="status">
        {mine !== null
          ? `You gave it ${mine}. Thank you.`
          : hover
            ? `${hover} out of ${RATING_MAX}`
            : "Tap a number."}
      </p>
    </div>
  );
}

/** The wall of notes, newest first, and the optional box to add one. */
function Notes({ tone }: { tone: Tone }) {
  const c = TONES[tone];
  const notes = useFeedbackStore((s) => s.data.notes);
  const post = useFeedbackStore((s) => s.note);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (writing) input.current?.focus();
  }, [writing]);

  const send = async () => {
    if (sending) return;
    setSending(true);
    const error = await post(text);
    setSending(false);
    if (error) {
      setMessage(error);
      return;
    }
    setText("");
    setWriting(false);
    setMessage("Thank you. It's on the wall.");
  };

  const shown = all ? notes : notes.slice(0, 4);

  return (
    <div className="border-t-2 pt-3" style={{ borderColor: c.line }}>
      <div className="flex items-center justify-between">
        <p className="text-[0.625rem] tracking-wider uppercase" style={{ color: c.faint }}>
          Notes from visitors
        </p>
        {!writing && (
          <button
            type="button"
            onClick={() => {
              setWriting(true);
              setMessage(null);
            }}
            className="min-h-8 cursor-pointer border-2 px-2.5 text-[0.75rem] font-semibold transition-colors"
            style={{ borderColor: c.accent, color: c.ink }}
          >
            ✎ Add a note
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {writing && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <div className="mt-2 flex gap-1.5">
              <input
                ref={input}
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, NOTE_MAX))}
                onKeyDown={(event) => event.key === "Escape" && setWriting(false)}
                maxLength={NOTE_MAX}
                placeholder="A line, if you like"
                aria-label="Your note"
                className="min-h-10 min-w-0 flex-1 border-2 px-2 text-[0.8125rem] outline-none"
                style={{ borderColor: c.line, background: c.field, color: c.ink }}
              />
              <button
                type="submit"
                disabled={sending || text.trim().length < 2}
                className="min-h-10 cursor-pointer border-2 px-3 text-[0.8125rem] font-semibold disabled:cursor-default disabled:opacity-50"
                style={{ borderColor: c.accent, color: c.accent }}
              >
                {sending ? "…" : "Post"}
              </button>
            </div>
            <p className="mt-1 flex justify-between text-[0.625rem]" style={{ color: c.faint }}>
              <span>Anonymous, no links. Everyone can read it.</span>
              <span className="tabular-nums">
                {text.length}/{NOTE_MAX}
              </span>
            </p>
          </motion.form>
        )}
      </AnimatePresence>

      {message && (
        <p className="mt-1.5 text-[0.75rem]" style={{ color: c.accent }} role="status">
          {message}
        </p>
      )}

      {notes.length === 0 ? (
        <p className="mt-2 text-[0.75rem] italic" style={{ color: c.muted }}>
          No notes yet. The first one is yours to leave.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {shown.map((note) => (
            <li
              key={note.id}
              className="border-l-2 py-0.5 pl-2 text-[0.8125rem] leading-snug"
              style={{ borderColor: c.accent, color: c.ink }}
            >
              {note.text}
              <span className="ml-1.5 text-[0.625rem] whitespace-nowrap" style={{ color: c.faint }}>
                {ago(note.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 4 && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="mt-1.5 cursor-pointer text-[0.6875rem] underline underline-offset-2"
          style={{ color: c.muted }}
        >
          {all ? "Fewer" : `All ${notes.length}`}
        </button>
      )}
    </div>
  );
}

/** "3d ago", in the fewest characters that still read. */
function ago(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
