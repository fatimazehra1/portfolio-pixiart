import type { Metadata } from "next";

/** Private: never indexed, never followed. */
export const metadata: Metadata = {
  title: "Guestbook admin",
  robots: { index: false, follow: false },
};

export default function GuestbookAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
