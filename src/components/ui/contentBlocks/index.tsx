"use client";

import type { ContentBlock, Panel } from "@/data/contentBlocks";
import BadgeBlock from "./BadgeBlock";
import ProjectCardBlock from "./ProjectCardBlock";
import SkillCardBlock from "./SkillCardBlock";
import TerminalBlock from "./TerminalBlock";
import TimelineBlock from "./TimelineBlock";
import {
  Blueprint,
  Competition,
  Desk,
  Exchange,
  Ledger,
  Shift,
  Specs,
  System,
  TechStack,
} from "./PatternBlocks";
import { Divider, Hook, Jump, Memory, Milestone, Note, Summary } from "./TextBlocks";

/** One block, whatever it is. The only place that knows every block type. */
export function renderBlock(block: ContentBlock) {
  switch (block.type) {
    case "hook":
      return <Hook block={block} />;
    case "summary":
      return <Summary block={block} />;
    case "techStack":
      return <TechStack block={block} />;
    case "timeline":
      return <TimelineBlock block={block} />;
    case "projectCard":
      return <ProjectCardBlock block={block} />;
    case "badge":
      return <BadgeBlock block={block} />;
    case "terminal":
      return <TerminalBlock block={block} />;
    case "memory":
      return <Memory block={block} />;
    case "skillCard":
      return <SkillCardBlock block={block} />;
    case "competition":
      return <Competition block={block} />;
    case "milestone":
      return <Milestone block={block} />;
    case "note":
      return <Note block={block} />;
    case "specs":
      return <Specs block={block} />;
    case "ledger":
      return <Ledger block={block} />;
    case "shift":
      return <Shift block={block} />;
    case "system":
      return <System block={block} />;
    case "exchange":
      return <Exchange block={block} />;
    case "blueprint":
      return <Blueprint block={block} />;
    case "desk":
      return <Desk block={block} />;
    case "divider":
      return <Divider block={block} />;
    case "jump":
      return <Jump block={block} />;
  }
}

/**
 * The `server` tone: the same tokens, redefined as dark steel. Every block
 * reads the plaque's variables, so the whole body changes with no block
 * knowing it is in the server room.
 */
const SERVER_TONE = {
  "--plaque-paper": "#171c24",
  "--plaque-ink": "#e4eaf1",
  "--plaque-muted": "#9aa9bb",
  "--plaque-line": "#3a4658",
  "--plaque-frame": "#7d8da3",
  "--plaque-brass": "#8fb2d8",
  background: "var(--plaque-paper)",
} as React.CSSProperties;

/**
 * A panel's body: the role it was, then its blocks in order, in its tone.
 * `children` is the plaque's own footer (the link to a longer page).
 */
export function PanelBody({
  panel,
  eyebrow,
  lead,
  children,
}: {
  panel: Panel;
  eyebrow?: string;
  /**
   * Interface that belongs near the top but after the hook and summary: the
   * building's own parts, so the hook stays the first thing read.
   */
  lead?: React.ReactNode;
  children?: React.ReactNode;
}) {
  // After the opening hook and summary, wherever the first other block starts.
  const leadAt = Math.max(
    1,
    panel.blocks.findIndex((block) => block.type !== "hook" && block.type !== "summary")
  );

  return (
    <div className="px-3.5 py-3" style={panel.tone === "server" ? SERVER_TONE : undefined}>
      {eyebrow && (
        <p
          className="mb-1.5 text-[0.6875rem] tracking-wider uppercase"
          style={{ color: "var(--plaque-muted)" }}
        >
          {eyebrow}
        </p>
      )}
      <div className="space-y-3.5">
        {panel.blocks.map((block, index) => (
          <div key={index}>
            {index === leadAt && lead && <div className="mb-3.5">{lead}</div>}
            {renderBlock(block)}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}
