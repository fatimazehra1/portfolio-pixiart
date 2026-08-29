"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { screenshotPath } from "@/data/chapters";

/**
 * A chapter's screenshots: two to four thumbnails under its description, and
 * a full-size view when one is clicked.
 *
 * # Empty is a normal state
 * The folders under `public/screenshots/` are real but may be empty, and a
 * chapter's `screenshots` list may be empty too. Both are the *expected*
 * state for work that has no shots yet, so this renders nothing at all rather
 * than a row of broken frames or an empty box with a border. A file that is
 * listed but missing is handled the same way, in `onError` — the thumbnail
 * removes itself instead of showing the browser's torn-image glyph.
 */
export default function ScreenshotGallery({
  id,
  files,
  title,
}: {
  id: string;
  files: readonly string[];
  title: string;
}) {
  const [broken, setBroken] = useState<readonly string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const shown = files.filter((file) => !broken.includes(file));

  const fail = useCallback((file: string) => {
    setBroken((was) => (was.includes(file) ? was : [...was, file]));
  }, []);

  // Escape closes the enlarged view — the same key that leaves a world, and
  // the one every visitor tries first.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  if (shown.length === 0) return null;

  return (
    <>
      <ul
        className="mt-3 grid grid-cols-2 gap-1.5 border-t pt-3"
        style={{ borderColor: "var(--ui-border)" }}
      >
        {shown.map((file, index) => (
          <li key={file}>
            <button
              type="button"
              onClick={() => setOpen(file)}
              className="block w-full cursor-pointer overflow-hidden rounded border transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--ui-border)" }}
              aria-label={`${title} screenshot ${index + 1}, click to enlarge`}
            >
              {/* Plain <img>: these are dropped in by hand at unknown sizes,
                  and next/image would need dimensions this file cannot know. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotPath(id, file)}
                alt={`${title} screenshot ${index + 1}`}
                // Not lazy: a gallery only exists inside an open panel, so
                // every thumbnail here is already on screen, and lazy loading
                // inside a transformed overlay simply never triggers.
                decoding="async"
                className="block h-16 w-full object-cover"
                onError={() => fail(file)}
              />
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {open && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            // Fixed, not absolute: the enlarged shot belongs to the window,
            // not to the scrolling panel the thumbnail sits in.
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 p-8"
            onClick={() => setOpen(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} screenshot`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotPath(id, open)}
              alt={`${title} screenshot, enlarged`}
              className="max-h-full max-w-full rounded shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
