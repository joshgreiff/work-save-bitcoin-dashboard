"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NewsletterSignup } from "@/components/learn/NewsletterSignup";
import type { NewsletterConfig } from "@/lib/schemas/learn";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/learn", label: "Learn" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/episodes", label: "Episodes" },
  { href: "/bitcoin-exposure", label: "BTC Exposure" },
  { href: "/reserve", label: "BTC Reserve" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/income-model", label: "Income Model" },
  { href: "/methodology", label: "Methodology" },
  { href: "/resources", label: "Resources" },
];

/** Pages that already render an inline newsletter block. */
function pageHasInlineNewsletter(pathname: string): boolean {
  return (
    pathname === "/learn" ||
    pathname === "/learn/resources" ||
    pathname === "/learn/save-your-time"
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            Work Save Bitcoin
          </p>
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] md:hidden"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
        <nav
          id="primary-nav"
          className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-full z-20 flex-col border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 md:static md:flex md:flex-row md:flex-wrap md:items-center md:gap-1 md:border-0 md:bg-transparent md:p-0`}
        >
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`min-h-11 px-3 py-3 text-sm md:py-2 ${
                  active
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({
  newsletter,
  newsletterSignupEnabled,
}: {
  newsletter: NewsletterConfig;
  newsletterSignupEnabled: boolean;
}) {
  const pathname = usePathname();
  const showNewsletter = !pageHasInlineNewsletter(pathname);

  return (
    <footer className="mt-auto border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        {showNewsletter ? (
          <NewsletterSignup
            config={newsletter}
            sourcePage="footer"
            signupEnabled={newsletterSignupEnabled}
          />
        ) : null}
        <div className="flex flex-col gap-2 text-sm text-[var(--muted)]">
          <p>Work Save Bitcoin — Fiat Freedom Portfolio dashboard and Bitcoin education.</p>
          <p>
            Educational content only. Not investment, tax, or legal advice. The Bitcoin Reserve is
            separate from the securities portfolio.
          </p>
          <p className="flex flex-wrap gap-3">
            <Link href="/learn" className="text-[var(--accent)] underline-offset-2 hover:underline">
              Learn
            </Link>
            <Link href="/privacy" className="text-[var(--accent)] underline-offset-2 hover:underline">
              Privacy
            </Link>
            <Link
              href="/learn/rss.xml"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              RSS
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
