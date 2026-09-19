"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PROFILE, isRealContact } from "@/data/chapters";
import type { ChapterContent, ChapterSection } from "@/data/chapters";
import { useWorldStore } from "@/stores/worldStore";
import { panelFor } from "@/data/panelContent";
import ScreenshotGallery from "./ScreenshotGallery";
import { PanelBody } from "./contentBlocks";
import { SpotChips } from "./BuildingSpots";
import Guestbook from "./Guestbook";

/**
 * One scene's information: what it was, when, in what, and what came out of
 * it, with the detail folded away until it is asked for.
 *
 * # The click layer
 * The second of an island's three layers. The card on the map (`ChapterCard`)
 * names the role in a line; this is the paragraph, the named builds, the
 * bullets and the whole stack. The third layer is `content.href`, which is a
 * written page with a URL of its own, and it appears here as one link rather
 * than as a second copy of everything.
 *
 * # Why the detail is folded
 * The plaque used to print everything at once. On the chapters that have most
 * to say — Planet01 holds four products, NatureTech ten ERP modules — that is
 * a column of text taller than the window, and the visitor met it as a
 * scrollbar: a wall of bullets with no way to tell which of the four things on
 * it was the one worth reading.
 *
 * So what is always on is what answers "what is this and should I care":
 * the role, the paragraph, the one line about scale, the stack. Everything
 * below is a row you can open, named with the heading it already had, and only
 * one is open at a time. Collapsed, the whole plaque fits the shortest window
 * this site is shown on; opened, it scrolls, which is the correct moment for a
 * scrollbar to exist.
 *
 * # Where the open one is kept
 * In the world store, not here — see `openSection`. The other thing that opens
 * a section is a hotspot on the building itself, and a panel that owned this
 * state privately could not be opened from the world it is describing.
 *
 * # A plaque, not a card
 * The visitor reading this is standing inside a workshop, a campus or a
 * lighthouse. So the panel is the thing that would be screwed to its wall: a
 * brass header with the name and the dates lettered in the world's own bitmap
 * face, a paper body underneath, two fixings at the top corners. The frame is
 * drawn by `.ui-plaque`; everything here is what is written on it.
 *
 * Every word comes from `data/chapters.ts`. Nothing here knows a fact.
 */

/** What a chapter with no named builds calls its one group of bullets. */
const HIGHLIGHTS = "Highlights";
/** And what the shots are filed under, for the chapters that have any. */
const SCREENSHOTS = "Screenshots";

export default function InfoCard({
  content,
  bare = false,
}: {
  content: ChapterContent;
  /** Leave out the brass header, for a container that draws its own (the phone panel). */
  bare?: boolean;
}) {
  const isContact = content.id === "lighthouse";
  const external = content.href?.startsWith("http") ?? false;

  const open = useWorldStore((s) => s.openSection);
  const setOpen = useWorldStore((s) => s.setOpenSection);
  const toggle = (title: string) => setOpen(open === title ? null : title);

  // The named builds, or the chapter's own highlights standing in for them.
  // One shape below rather than two branches: a chapter with four products and
  // a chapter with four bullets are the same thing to read.
  const groups: readonly ChapterSection[] =
    content.sections ??
    (content.bullets.length > 0
      ? [{ title: HIGHLIGHTS, descriptor: "", bullets: content.bullets }]
      : []);

  // An island with a composed panel (`data/panelContent/`) reads that instead
  // of the fields below. The lighthouse has none and keeps the contact plaque.
  const panel = panelFor(content.id);

  // The third layer: a page with a URL, where there is one. Never folded, it
  // is the way out of the panel and into the long form.
  const deeper = content.href && (
    <p className="mt-3 border-t-2 pt-3" style={{ borderColor: "var(--plaque-line)" }}>
      {external ? (
        <a
          href={content.href}
          target="_blank"
          rel="noreferrer"
          className="text-[0.8125rem] font-semibold underline underline-offset-2 hover:opacity-70"
          style={{ color: "var(--plaque-ink)" }}
        >
          {content.href.replace(/^https?:\/\//, "")} ↗
        </a>
      ) : (
        <Link
          href={content.href}
          prefetch
          className="text-[0.8125rem] font-semibold underline underline-offset-2 hover:opacity-70"
          style={{ color: "var(--plaque-ink)" }}
        >
          Explore project →
        </Link>
      )}
    </p>
  );

  return (
    <div className="font-sans">
      {!bare && (
      <header className="ui-plaque-head relative px-3.5 py-2.5">
        {/* Two fixings. The cheapest possible cue that this is an object
            hanging on something rather than a rectangle floating over it. */}
        <span
          className="absolute top-1.5 left-1.5 h-1.5 w-1.5"
          style={{ background: "rgb(36 26 16 / 0.55)" }}
          aria-hidden
        />
        <span
          className="absolute top-1.5 right-1.5 h-1.5 w-1.5"
          style={{ background: "rgb(36 26 16 / 0.55)" }}
          aria-hidden
        />
        <h2 className="font-display text-center text-[1.0625rem] leading-none font-semibold tracking-wide">
          {isContact ? PROFILE.invitation.heading : content.title}
        </h2>
        <p className="mt-1.5 text-center text-[0.6875rem] tracking-wider uppercase tabular-nums">
          {isContact ? "Get in touch" : content.period}
        </p>
      </header>
      )}

      {panel ? (
        <PanelBody panel={panel} eyebrow={content.role} lead={<SpotChips />}>
          {deeper}
        </PanelBody>
      ) : (
      <div className="px-3.5 py-3">
        {!isContact && (
          <p
            className="text-[0.6875rem] tracking-wider uppercase"
            style={{ color: "var(--plaque-muted)" }}
          >
            {content.role ?? content.headline}
          </p>
        )}

        <p
          className={`text-[0.8125rem] leading-snug${isContact ? "" : " mt-1.5"}`}
          style={{ color: "var(--plaque-ink)" }}
        >
          {content.summary}
        </p>

        {/* Scale and ownership, given its own line and its own weight. It is
            the sentence the whole plaque exists to deliver, so it is never
            behind a fold. */}
        {content.outcome && (
          <p
            className="mt-2 border-l-4 pl-2 text-[0.8125rem] leading-snug font-semibold"
            style={{ borderColor: "var(--plaque-brass)", color: "var(--plaque-ink)" }}
          >
            {content.outcome}
          </p>
        )}

        {content.stack.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1" aria-label="Tech used">
            {content.stack.map((tech) => (
              <li
                key={tech}
                className="border-2 px-1.5 py-0.5 text-[0.6875rem] leading-none"
                style={{ borderColor: "var(--plaque-line)", color: "var(--plaque-muted)" }}
              >
                {tech}
              </li>
            ))}
          </ul>
        )}

        {/* The detail, one row per named build. Closed until asked for. */}
        {groups.length > 0 && (
          <div
            className="mt-3 border-t-2"
            style={{ borderColor: "var(--plaque-line)" }}
          >
            {groups.map((section) => (
              <Fold
                key={section.title}
                title={section.title}
                count={section.bullets.length}
                isOpen={open === section.title}
                onToggle={() => toggle(section.title)}
              >
                {section.descriptor && (
                  <p
                    className="text-[0.8125rem] leading-snug"
                    style={{ color: "var(--plaque-muted)" }}
                  >
                    {section.descriptor}
                  </p>
                )}
                <ul className={section.descriptor ? "mt-2 space-y-2" : "space-y-2"}>
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-[0.8125rem] leading-snug"
                      style={{ color: "var(--plaque-ink)" }}
                    >
                      <span
                        className="pixel-dot mt-[0.45em]"
                        style={{ color: "var(--plaque-frame)" }}
                        aria-hidden
                      />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Fold>
            ))}

            {/* The shots fold like everything else. Four thumbnails is the
                tallest single thing on the plaque. */}
            {content.screenshots.length > 0 && (
              <Fold
                title={SCREENSHOTS}
                count={content.screenshots.length}
                isOpen={open === SCREENSHOTS}
                onToggle={() => toggle(SCREENSHOTS)}
              >
                <ScreenshotGallery
                  id={content.id}
                  files={content.screenshots}
                  title={content.title}
                />
              </Fold>
            )}
          </div>
        )}

        {deeper}

        {/* The one chapter that is a destination rather than a record. Open,
            always: a visitor who reached the lighthouse came for these. */}
        {isContact && (
          <ul
            className="mt-3 space-y-1.5 border-t-2 pt-3"
            style={{ borderColor: "var(--plaque-line)" }}
          >
            {PROFILE.contact.map((link) => (
              <li key={link.label} className="text-[0.8125rem] leading-snug">
                <span style={{ color: "var(--plaque-muted)" }}>{link.label} · </span>
                {isRealContact(link.href) ? (
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:opacity-70"
                    style={{ color: "var(--plaque-ink)" }}
                  >
                    {link.value}
                  </a>
                ) : (
                  // An unfilled URL is written out as plain text rather than
                  // shipped as a link back to the page it is already on.
                  <span style={{ color: "var(--plaque-ink)" }}>{link.value}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* The lighthouse keeps the guestbook: the place visitors end up is
            the place to leave a mark. The same one the corner button opens. */}
        {isContact && (
          <div className="mt-4 border-t-2 pt-3" style={{ borderColor: "var(--plaque-line)" }}>
            <Guestbook tone="paper" />
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/**
 * One foldable row: a heading you can press, and what is under it.
 *
 * The marker is the same `.pixel-mark` the sidebar uses for a scene — hollow
 * when the row is shut, filled when it is open — because the two are the same
 * gesture and the visitor has already learnt one of them. No chevron: a
 * rotating arrow is a modern-interface animation and this is a brass plaque.
 */
function Fold({
  title,
  count,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b-2 last:border-b-0" style={{ borderColor: "var(--plaque-line)" }}>
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full cursor-pointer items-center gap-2 py-2.5 text-left transition-opacity hover:opacity-70"
        >
          <span
            className={`pixel-mark${isOpen ? " pixel-mark-on" : ""}`}
            style={{ color: "var(--plaque-frame)" }}
            aria-hidden
          />
          <span
            className="font-display flex-1 text-[0.9375rem] leading-none font-semibold tracking-wide"
            style={{ color: "var(--plaque-ink)" }}
          >
            {title}
          </span>
          <span
            className="text-[0.6875rem] tabular-nums"
            style={{ color: "var(--plaque-muted)" }}
          >
            {count}
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pb-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
