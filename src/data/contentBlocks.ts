/**
 * The island panels, as blocks.
 *
 * A panel is an ordered list of blocks, and a block is one kind of thing a
 * plaque can say: a hook, a timeline, a terminal, a wall of cards. Islands
 * compose these from `data/panelContent/`, so two islands can read completely
 * differently without either one needing a component of its own.
 *
 * # Two tiers
 * The first nine are the general vocabulary, used anywhere. The rest are
 * the island patterns: each exists because one island's story has a shape a
 * list cannot carry (a competition board, a server room, an ERP branching into
 * versions, a client conversation, a studio blueprint, a desk). They are
 * still data, still reusable, and still rendered by the same one switch.
 *
 * # Nothing essential behind a click
 * Anything expandable keeps its one-line summary visible while closed. What
 * opens is the detail, never the fact.
 *
 * # Hotspots
 * The buildings in the world open panel sections by name (`section` on each
 * building's hotspot). A block, a timeline node or a project card lists the
 * names it answers to in `hotspots`, and the panel opens or scrolls to it.
 *
 * # House style
 * First person, plain, no em dashes. See `data/chapters.ts`.
 */

/** The five groups a stack is shown in, plus the room it runs in. */
export type StackGroup =
  | "frontend"
  | "backend"
  | "database"
  | "integrations"
  | "architecture"
  | "infrastructure";

export type Stack = Partial<Record<StackGroup, readonly string[]>>;

/** Anything a building's hotspot can open or scroll to. */
interface Targetable {
  hotspots?: readonly string[];
}

// --- General vocabulary --------------------------------------------------------

/** One memorable line, always at the top. `small` for a second hook lower down. */
export interface HookBlock {
  type: "hook";
  text: string;
  small?: boolean;
}

/** Two or three sentences. */
export interface SummaryBlock {
  type: "summary";
  text: string;
}

/** The stack, grouped. Never one flat row of tags. */
export interface TechStackBlock extends Targetable {
  type: "techStack";
  title?: string;
  stack: Stack;
}

/** Ordered nodes on a rail. Each keeps its line visible and opens for detail. */
export interface TimelineBlock {
  type: "timeline";
  title?: string;
  nodes: readonly TimelineNode[];
}

export interface TimelineNode extends Targetable {
  title: string;
  /** Always visible. The node's whole point in one line. */
  line: string;
  /** Shown open: what happened, in a few short lines. */
  detail?: readonly string[];
  /** A line set apart, for the moment that made the node matter. */
  milestone?: string;
  /** Closing thought, after the detail. */
  takeaway?: string;
  /** Flat tags for a small node. */
  tech?: readonly string[];
  /** Grouped stack for a big one. */
  stack?: Stack;
  /** Drawn larger on the rail. One per timeline, at most. */
  major?: boolean;
}

/** One build: what it is, in what, and what I actually did. */
export interface ProjectCardBlock {
  type: "projectCard";
  title?: string;
  cards: readonly ProjectCard[];
}

export interface ProjectCard extends Targetable {
  name: string;
  descriptor: string;
  tech?: readonly string[];
  did?: readonly string[];
  /** An award it won, pinned to the card. */
  award?: string;
  /** A small aside about what it taught. */
  note?: string;
}

/** Awards and milestones, on a shelf. `major` ones are drawn as trophies. */
export interface BadgeBlock {
  type: "badge";
  badges: readonly Badge[];
}

export interface Badge {
  title: string;
  detail: string;
  major?: boolean;
}

/** A monospace block. `animate` types the lines out once, on open. */
export interface TerminalBlock extends Targetable {
  type: "terminal";
  title?: string;
  lines: readonly TerminalLine[];
  caption?: string;
  animate?: boolean;
}

export interface TerminalLine {
  cmd: string;
  out?: string;
}

/** A small personal aside. Lighter than everything around it. */
export interface MemoryBlock {
  type: "memory";
  text: string;
}

/** A wall of explored topics. Each card flips for the honest line. */
export interface SkillCardBlock extends Targetable {
  type: "skillCard";
  cards: readonly SkillCard[];
}

export interface SkillCard {
  name: string;
  line: string;
  /** Explored is the default; `built` made something, `now` is in progress. */
  status?: "explored" | "built" | "now";
}

// --- Island patterns -----------------------------------------------------------

/** A board of timed contests, and what they taught between them. */
export interface CompetitionBlock extends Targetable {
  type: "competition";
  intro: string;
  entries: readonly { name: string; text: string }[];
  lessons: readonly string[];
}

/** A moment, set apart. */
export interface MilestoneBlock {
  type: "milestone";
  label: string;
  text: string;
}

/** A short labelled fact that is not a memory: a reference, a boundary. */
export interface NoteBlock {
  type: "note";
  label: string;
  text: string;
}

/** A spec sheet: where the work happened, row by row. */
export interface SpecsBlock extends Targetable {
  type: "specs";
  title: string;
  rows: readonly { key: string; value: string }[];
  note?: string;
}

/** Two columns set against each other. */
export interface LedgerBlock extends Targetable {
  type: "ledger";
  columns: readonly [LedgerColumn, LedgerColumn];
}

export interface LedgerColumn {
  title: string;
  items: readonly string[];
  note?: string;
}

/** A way of seeing, before and after. */
export interface ShiftBlock {
  type: "shift";
  text: string;
  from: readonly string[];
  to: readonly string[];
}

/** One system at the centre, the versions it branched into, and what is next. */
export interface SystemBlock extends Targetable {
  type: "system";
  core: { name: string; line: string; modules: readonly string[]; footnote: string };
  branches: readonly { name: string; line: string }[];
  next?: { name: string; line: string };
}

/** A conversation: what the client asked, what I did, and the lesson in it. */
export interface ExchangeBlock extends Targetable {
  type: "exchange";
  caption: string;
  turns: readonly { from: "client" | "me"; text: string; lesson?: string }[];
}

/** A company drawn as a plan, with a status stamp. */
export interface BlueprintBlock extends Targetable {
  type: "blueprint";
  stamp: string;
  rooms: readonly { label: string; text: string }[];
}

/** Experiments, left out on a desk. */
export interface DeskBlock extends Targetable {
  type: "desk";
  items: readonly { name: string; line: string }[];
  caption?: string;
}

/** A named break inside one panel, for an island that holds two places. */
export interface DividerBlock {
  type: "divider";
  label: string;
}

/** A way across to another island. */
export interface JumpBlock {
  type: "jump";
  text: string;
  chapterId: string;
}

export type ContentBlock =
  | HookBlock
  | SummaryBlock
  | TechStackBlock
  | TimelineBlock
  | ProjectCardBlock
  | BadgeBlock
  | TerminalBlock
  | MemoryBlock
  | SkillCardBlock
  | CompetitionBlock
  | MilestoneBlock
  | NoteBlock
  | SpecsBlock
  | LedgerBlock
  | ShiftBlock
  | SystemBlock
  | ExchangeBlock
  | BlueprintBlock
  | DeskBlock
  | DividerBlock
  | JumpBlock;

/** One island's panel. */
export interface Panel {
  /** Matches `ChapterContent.id`. */
  id: string;
  /**
   * The body's register. `server` swaps the paper for a dark steel body:
   * Vaulsys is meant to feel more serious than everywhere else.
   */
  tone?: "paper" | "server";
  /** One line for the timeline view and the mobile sheet. No clicking needed. */
  glance: string;
  /** The chapter's beats, in order, for the timeline view. */
  steps?: readonly string[];
  blocks: readonly ContentBlock[];
}
