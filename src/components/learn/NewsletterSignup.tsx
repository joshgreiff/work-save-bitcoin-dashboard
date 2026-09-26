"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { NewsletterConfig } from "@/lib/schemas/learn";

type Props = {
  config: NewsletterConfig;
  sourcePage: string;
  /** True only when provider is configured and NEWSLETTER_ENDPOINT (or env var) is set. */
  signupEnabled?: boolean;
};

export function NewsletterSignup({
  config,
  sourcePage,
  signupEnabled = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const helper = useMemo(() => {
    if (!signupEnabled) return null;
    return config.doubleOptIn
      ? "If the provider supports it, you will receive a confirmation email before regular messages begin."
      : null;
  }, [config.doubleOptIn, signupEnabled]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            consent,
            sourcePage,
          }),
        });
        const json = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !json.ok) {
          throw new Error(json.message ?? `HTTP ${response.status}`);
        }
        setStatus("success");
        setMessage(json.message ?? "Check your email to confirm your subscription.");
        setEmail("");
        setConsent(false);
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Signup failed.");
      }
    });
  }

  if (!signupEnabled) {
    return (
      <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-medium text-[var(--foreground)]">{config.headline}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {config.description}
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Work Save Bitcoin Weekly is coming soon.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-lg font-medium text-[var(--foreground)]">{config.headline}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {config.description}
      </p>
      <form className="mt-4 space-y-3" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor={`newsletter-email-${sourcePage}`} className="text-sm text-[var(--foreground)]">
            Email
          </label>
          <input
            id={`newsletter-email-${sourcePage}`}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-1"
          />
          <span>
            {config.consentText}{" "}
            <Link href={config.privacyPolicyPath} className="text-[var(--accent)] underline-offset-2 hover:underline">
              Privacy policy
            </Link>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={pending || !consent}
          className="min-h-11 border border-[var(--accent)] px-4 py-2 text-sm text-[var(--accent)] disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Subscribe"}
        </button>
      </form>
      {helper ? <p className="mt-3 text-xs text-[var(--muted)]">{helper}</p> : null}
      {status === "success" ? (
        <p className="mt-3 text-sm text-[var(--positive)]" role="status">
          {message}
        </p>
      ) : null}
      {status === "error" ? (
        <p className="mt-3 text-sm text-[var(--negative)]" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}
