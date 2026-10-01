"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NewsletterSignup } from "@/components/learn/NewsletterSignup";
import { isNavItemActive, MORE_NAV, PRIMARY_NAV, type NavItem } from "@/lib/navigation";
import type { NewsletterConfig } from "@/lib/schemas/learn";

/** Pages that already render an inline newsletter block. */
function pageHasInlineNewsletter(pathname: string): boolean {
  return (
    pathname === "/learn" ||
    pathname === "/learn/resources" ||
    pathname === "/learn/save-your-time"
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isNavItemActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="nav-link flex min-h-11 items-center px-3 py-2 text-sm"
    >
      {item.label}
    </Link>
  );
}

/** Desktop "More" disclosure: Escape or focus leaving the menu closes it. */
function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const moreActive = MORE_NAV.some((item) => isNavItemActive(pathname, item.href));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="more-nav"
        onClick={() => setOpen((value) => !value)}
        className={`nav-menu-button flex min-h-11 items-center gap-1 px-3 py-2 text-sm ${
          moreActive || open
            ? "text-[var(--accent)]"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        More
        <span aria-hidden="true" className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      <ul
        id="more-nav"
        className={`${open ? "block" : "hidden"} absolute right-0 top-full z-30 mt-1 min-w-48 border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg`}
      >
        {MORE_NAV.map((item) => (
          <li key={item.href}>
            <NavLink item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  return (
    <header className="relative border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
            Work Save Bitcoin
          </p>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} onNavigate={close} />
              </li>
            ))}
            <li>
              <MoreMenu pathname={pathname} />
            </li>
          </ul>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          className="nav-menu-button inline-flex min-h-11 min-w-11 items-center justify-center border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className={`${open ? "block" : "hidden"} absolute left-0 right-0 top-full z-20 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 md:hidden`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              menuButtonRef.current?.focus();
            }
          }}
        >
          <ul>
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} onNavigate={close} />
              </li>
            ))}
          </ul>
          <p
            id="mobile-more-heading"
            className="mt-2 border-t border-[var(--border)] px-3 pt-3 text-xs uppercase tracking-[0.12em] text-[var(--muted)]"
          >
            More
          </p>
          <ul aria-labelledby="mobile-more-heading" className="grid grid-cols-2">
            {MORE_NAV.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} onNavigate={close} />
              </li>
            ))}
          </ul>
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
          <p>Work Save Bitcoin — research, education, and the Fiat Freedom Portfolio public experiment.</p>
          <p>
            Educational content only. Not investment, tax, or legal advice. The Bitcoin Reserve is
            separate from the securities portfolio.
          </p>
          <p className="flex flex-wrap gap-3">
            <Link href="/learn" className="text-[var(--accent)] underline-offset-2 hover:underline">
              Learn
            </Link>
            <Link
              href="/learn/research"
              className="text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Research
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
