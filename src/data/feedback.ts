/**
 * The guestbook: what a visitor can leave with one tap.
 *
 * Shared by the API route (which only accepts these ids) and the interface
 * (which draws them). Adding a reaction is one line here; the counts for an
 * id nobody has tapped yet simply read as zero.
 */

export interface FeedbackOption {
  id: string;
  /** A single glyph, drawn in the pixel face. */
  icon?: string;
  label: string;
}

/** One tap, public count. */
export const REACTIONS: readonly FeedbackOption[] = [
  { id: "love", icon: "♥", label: "Love it" },
  { id: "work", icon: "★", label: "Great work" },
  { id: "explore", icon: "◆", label: "Fun to explore" },
  { id: "hire", icon: "✓", label: "Would hire" },
];

/** "I'd like to see more of…", one tap each, public count. */
export const SUGGESTIONS: readonly FeedbackOption[] = [
  { id: "screenshots", label: "Screenshots" },
  { id: "casestudies", label: "Case studies" },
  { id: "code", label: "The code" },
  { id: "world", label: "The pixel world" },
];

/** "Rate it, 1 to 10": one tap, one rating per visitor, public average. */
export const RATING_MAX = 10;

/** A note: short, anonymous, no links. */
export const NOTE_MAX = 140;

export interface FeedbackNote {
  id: string;
  text: string;
  /** ISO time it was left. */
  at: string;
}

export interface FeedbackState {
  reactions: Record<string, number>;
  suggestions: Record<string, number>;
  /** How many ratings, and their average (0 when there are none). */
  rating: { count: number; average: number };
  /** Newest first. Hidden ones are never sent. */
  notes: readonly FeedbackNote[];
}

export const EMPTY_FEEDBACK: FeedbackState = {
  reactions: {},
  suggestions: {},
  rating: { count: 0, average: 0 },
  notes: [],
};
