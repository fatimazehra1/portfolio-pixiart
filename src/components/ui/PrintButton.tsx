"use client";

/**
 * Download as PDF, which on every browser worth supporting is the print
 * dialogue with "Save as PDF" already in it.
 *
 * No library and no server route: the page already has a print stylesheet that
 * lays it out on A4 in black on white, so the browser's own PDF writer
 * produces exactly the document this page is describing. Anything else would
 * be a second renderer to keep in agreement with the first.
 *
 * It hides itself in print, because a button is not part of a resume.
 */
export default function PrintButton() {
  return (
    <button type="button" className="print-button" onClick={() => window.print()}>
      Download PDF
    </button>
  );
}
