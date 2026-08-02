import type { Metadata } from "next";
import Link from "next/link";

// A plain, server-rendered, SEO-visible resume. Content must work even if the
// world canvas never loads (DESIGN.md §UI Principles). Reachable in one click.
export const metadata: Metadata = {
  title: "Resume — Fatima Shakeel",
  description: "Software engineer. Resume and experience.",
};

export default function ResumePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-8">
        <h1 className="font-display text-4xl text-[var(--ink)]">Fatima Shakeel</h1>
        <p className="mt-1 font-sans text-[var(--ink)]/70">Software Engineer</p>
        <Link
          href="/"
          className="mt-4 inline-block border-2 border-[var(--ink)] bg-[var(--parchment)] px-3 py-1.5 font-display text-sm shadow-[3px_3px_0_0_var(--ink)] hover:bg-[var(--accent)]"
        >
          ← Enter the Waterfront
        </Link>
      </header>

      <section className="prose-none space-y-6 font-sans leading-7 text-[var(--ink)]">
        <p>
          Placeholder resume content. Replace with real experience, projects, and
          skills. Keep it selectable, semantic, and fast — recruiters (especially
          on mobile) should reach this instantly.
        </p>
      </section>
    </div>
  );
}
