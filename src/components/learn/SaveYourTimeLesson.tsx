import type { LearnLessonMeta } from "@/lib/schemas/learn";
import type { TreasuryDebtObservation } from "@/lib/schemas/learn";
import { ClaimBadge } from "@/components/learn/ClaimBadge";
import {
  InflationCalculatorTool,
  SatsCalculator,
  WagePurchasingPowerCalculator,
  WorkToMoneyFlow,
} from "@/components/learn/LearnTools";
import { NewsletterSignup } from "@/components/learn/NewsletterSignup";
import type { NewsletterConfig } from "@/lib/schemas/learn";
import Link from "next/link";
import { formatViewerDate, formatViewerTimestamp } from "@/lib/market/session";

type Props = {
  lesson: LearnLessonMeta;
  debt: TreasuryDebtObservation;
  btc: {
    priceUsd: number | null;
    asOf: string | null;
    sourceName: string | null;
  };
  newsletter: NewsletterConfig;
  newsletterSignupEnabled: boolean;
};

export function SaveYourTimeLesson({
  lesson,
  debt,
  btc,
  newsletter,
  newsletterSignupEnabled,
}: Props) {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Learn · {lesson.category} · {lesson.difficulty} · {lesson.readingMinutes} min
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Save Your Time</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--muted-foreground)]">
          Your labor is paid in time. Money is supposed to carry that time into the future.
        </p>
        {lesson.videoUrl ? (
          <div className="aspect-video w-full max-w-3xl border border-[var(--border)]">
            <iframe
              title={lesson.title}
              src={lesson.videoUrl.replace("watch?v=", "embed/")}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-medium">Three functions of money</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Medium of exchange",
              body: "Money lets you trade your work for the work of others without finding a perfect barter match.",
            },
            {
              title: "Unit of account",
              body: "Money is the measuring stick for prices, wages, and debts — the common language of economic calculation.",
            },
            {
              title: "Store of value",
              body: "Money is supposed to hold purchasing power over time so today’s effort can buy tomorrow’s needs.",
            },
          ].map((item) => (
            <article key={item.title} className="border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-medium">Work-to-money flow</h2>
        <WorkToMoneyFlow />
      </section>

      <WagePurchasingPowerCalculator />
      <InflationCalculatorTool />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-medium">Policy timeline</h2>
          <ClaimBadge kind="verified_fact" />
        </div>
        <ul className="space-y-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          <li className="border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--foreground)]">Early 2020 Federal Reserve balance sheet</p>
            <p className="mt-2">
              Near the beginning of 2020, the Federal Reserve’s balance sheet was approximately{" "}
              <strong className="text-[var(--foreground)]">$4.2 trillion</strong>.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Source: Federal Reserve H.4.1 statistical releases · as-of context: early 2020
            </p>
          </li>
          <li className="border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--foreground)]">June 2020 Federal Reserve balance sheet</p>
            <p className="mt-2">
              By June 2020, the balance sheet was approximately{" "}
              <strong className="text-[var(--foreground)]">$7.2 trillion</strong>.
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Source:{" "}
              <a
                className="text-[var(--accent)] underline-offset-2 hover:underline"
                href="https://www.federalreserve.gov/releases/h41/"
                target="_blank"
                rel="noreferrer"
              >
                Federal Reserve H.4.1
              </a>
            </p>
          </li>
        </ul>
        <p className="text-sm text-[var(--muted-foreground)]">
          Federal Reserve actions are <em>monetary policy</em>. Congressional and Treasury spending
          and taxation are <em>fiscal policy</em>. An increase in the Fed’s balance sheet does not
          translate directly or proportionally into measured consumer-price inflation.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-medium">Federal debt</h2>
          <ClaimBadge kind="verified_fact" />
        </div>
        <article className="border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
            Total public debt outstanding
          </p>
          <p className="mt-2 text-3xl font-medium tabular-nums text-[var(--foreground)]">
            {debt.totalPublicDebtUsd.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Record date {formatViewerDate(debt.recordDate)} · Retrieved{" "}
            {formatViewerTimestamp(debt.retrievedAt)} ·{" "}
            {debt.freshness === "live" ? "Live Treasury feed" : "Last verified observation"}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Source:{" "}
            <a
              href={debt.sourceUrl}
              className="text-[var(--accent)] underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {debt.sourceName}
            </a>
          </p>
        </article>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-medium">Bitcoin supply</h2>
          <ClaimBadge kind="verified_fact" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <article className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
            <p>
              Bitcoin’s protocol targets a maximum supply near{" "}
              <strong className="text-[var(--foreground)]">21 million BTC</strong>.
            </p>
            <p className="mt-2">
              Each bitcoin divides into{" "}
              <strong className="text-[var(--foreground)]">100,000,000 satoshis</strong>, so even a
              $5 weekly habit can accumulate a measurable amount.
            </p>
          </article>
          <article className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
            <p>Issuance follows protocol rules rather than discretionary political expansion.</p>
            <p className="mt-2">
              Existing ownership can still be concentrated, and Bitcoin’s market price remains
              volatile. Fixed supply is not a promise of a stable price.
            </p>
          </article>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Source:{" "}
          <a
            href="https://bitcoin.org/bitcoin.pdf"
            className="text-[var(--accent)] underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Bitcoin whitepaper
          </a>
        </p>
      </section>

      <SatsCalculator
        btcUsdPrice={btc.priceUsd}
        priceAsOf={btc.asOf}
        sourceName={btc.sourceName}
      />

      <section className="space-y-3">
        <h2 className="text-2xl font-medium">Next steps</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
          <li>Learn what a Bitcoin wallet is.</li>
          <li>Understand custodial versus self-custodial ownership.</li>
          <li>Make a small test transaction you can afford to lose while learning.</li>
          <li>Back up recovery information safely, offline.</li>
          <li>
            Never enter seed phrases into this website or any ordinary web form.
          </li>
        </ol>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/learn/glossary" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Open glossary →
          </Link>
          <Link href="/learn/resources" className="text-[var(--accent)] underline-offset-2 hover:underline">
            Browse resources →
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Sources & disclosures</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
          {lesson.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} className="text-[var(--accent)] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                {source.label}
              </a>
              {source.asOf ? ` · as of ${formatViewerDate(source.asOf)}` : null}
              {source.note ? ` — ${source.note}` : null}
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {lesson.disclosures.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <NewsletterSignup
        config={newsletter}
        sourcePage={`/learn/${lesson.slug}`}
        signupEnabled={newsletterSignupEnabled}
      />
    </article>
  );
}
