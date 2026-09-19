"use client";

import Link from "next/link";
import { PROFILE, isRealContact } from "@/data/chapters";
import { RECRUITER } from "@/data/recruiter";

/**
 * The recruiter path, in the dark UI's palette.
 *
 * Role, years, stack, the major work, the enterprise line. No folds and no
 * clicks: the whole point is that nothing here has to be found. `withContact`
 * adds the contact links and the resume, for the places that are the way out.
 */
export default function RecruiterPath({ withContact = false }: { withContact?: boolean }) {
  return (
    <section aria-label="At a glance" className="space-y-2.5 font-sans">
      <div>
        <Heading>Now</Heading>
        <p className="mt-0.5 text-[0.8125rem] leading-snug" style={{ color: "var(--ui-text)" }}>
          {RECRUITER.now}
        </p>
        <p className="mt-0.5 text-[0.75rem] leading-snug" style={{ color: "var(--ui-muted)" }}>
          {RECRUITER.also}
          {RECRUITER.years && ` ${RECRUITER.years} years building software.`}
        </p>
      </div>

      <div>
        <Heading>Stack</Heading>
        <dl className="mt-1 space-y-0.5 text-[0.75rem] leading-snug">
          {Object.entries(RECRUITER.stack).map(([group, items]) => (
            <div key={group} className="flex gap-1.5">
              <dt className="w-[3.75rem] shrink-0" style={{ color: "var(--ui-faint)" }}>
                {group}
              </dt>
              <dd style={{ color: "var(--ui-text)" }}>{items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <Heading>Major work</Heading>
        <ul className="mt-1 space-y-1">
          {RECRUITER.work.map((item) => (
            <li key={item.name} className="text-[0.75rem] leading-snug">
              <span className="font-semibold" style={{ color: "var(--ui-text)" }}>
                {item.name}.{" "}
              </span>
              <span style={{ color: "var(--ui-muted)" }}>{item.line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Heading>ERP and enterprise</Heading>
        <p className="mt-0.5 text-[0.75rem] leading-snug" style={{ color: "var(--ui-muted)" }}>
          {RECRUITER.enterprise}
        </p>
      </div>

      {withContact && (
        <div className="border-t-2 pt-2" style={{ borderColor: "var(--ui-border)" }}>
          <Heading>Contact</Heading>
          <ul className="mt-1 space-y-1">
            {PROFILE.contact.map((link) => (
              <li key={link.label} className="text-[0.8125rem] leading-snug">
                <span style={{ color: "var(--ui-faint)" }}>{link.label} · </span>
                {isRealContact(link.href) ? (
                  <a
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:opacity-70"
                    style={{ color: "var(--ui-text)" }}
                  >
                    {link.value}
                  </a>
                ) : (
                  <span style={{ color: "var(--ui-text)" }}>{link.value}</span>
                )}
              </li>
            ))}
            <li className="text-[0.8125rem] leading-snug">
              <Link
                href="/resume"
                prefetch
                className="font-semibold underline underline-offset-2 hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                Full resume →
              </Link>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.625rem] tracking-wider uppercase" style={{ color: "var(--ui-faint)" }}>
      {children}
    </p>
  );
}
