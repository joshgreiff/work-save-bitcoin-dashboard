"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/episodes", label: "Episodes" },
  { href: "/bitcoin-exposure", label: "BTC Exposure" },
  { href: "/reserve", label: "BTC Reserve" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/income-model", label: "Income Model" },
  { href: "/methodology", label: "Methodology" },
  { href: "/resources", label: "Resources" },
];

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

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-[var(--muted)]">
        <p>Work Save Bitcoin — Fiat Freedom Portfolio dashboard.</p>
        <p>
          Educational content only. Not investment, tax, or legal advice. The Bitcoin Reserve is
          separate from the securities portfolio.
        </p>
      </div>
    </footer>
  );
}
