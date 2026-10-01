import Link from "next/link";
import { formatPercent } from "@/lib/accounting/format";
import { SITE_RESEARCH_LINKS } from "@/lib/learn/content";
import { formatViewerDate } from "@/lib/market/session";

type OperatingExample = {
  displayName: string;
  ticker: string;
  bitcoinHoldings: number;
  btcShareOfMarketValue: number;
  asOf: string;
};

export function SourcesOfEquityReturn({
  operatingExample,
}: {
  operatingExample: OperatingExample | null;
}) {
  return (
    <section
      id="sources-of-equity-return"
      aria-labelledby="sources-of-equity-return-heading"
      className="scroll-mt-24 space-y-4"
    >
      <div>
        <h2 id="sources-of-equity-return-heading" className="text-xl font-medium">
          Sources of equity return
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          A Bitcoin-linked stock can beat or trail Bitcoin for three different reasons. Separate
          them before comparing.
        </p>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        <li className="flex flex-col border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">1</p>
          <h3 className="mt-1 font-medium">Bitcoin-per-share growth</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
            The company adds Bitcoin faster than it adds diluted shares, so each share represents
            more Bitcoin. Tracked above as diluted sats per share.
          </p>
          <a href="#bitcoin-per-share-examples" className="action-link mt-3 text-sm font-medium">
            Issuance examples ↓
          </a>
        </li>
        <li className="flex flex-col border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">2</p>
          <h3 className="mt-1 font-medium">Residual common-equity amplification</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Debt and preferred claims are fixed, so common shareholders absorb a larger percentage
            of each move in the company’s assets — in both directions.
          </p>
          <a href="#amplification-example" className="action-link mt-3 text-sm font-medium">
            Amplification example ↓
          </a>
        </li>
        <li className="flex flex-col border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">3</p>
          <h3 className="mt-1 font-medium">Operating-company growth</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Cash flows from a business other than holding Bitcoin. When Bitcoin is a small part of a
            company’s value, this dominates.
            {operatingExample ? (
              <>
                {" "}
                {operatingExample.displayName}’s{" "}
                {operatingExample.bitcoinHoldings.toLocaleString("en-US")} BTC were about{" "}
                {formatPercent(operatingExample.btcShareOfMarketValue, { digits: 2 })} of its
                approximate market value on {formatViewerDate(operatingExample.asOf)}.
              </>
            ) : null}
          </p>
          <Link
            href={`/learn/research/${SITE_RESEARCH_LINKS.operatingCompanyGrowth}`}
            className="action-link mt-3 text-sm font-medium"
          >
            Research note: Can SpaceX help a Bitcoin portfolio outperform? →
          </Link>
        </li>
      </ol>
      <p className="text-xs text-[var(--muted)]">
        {operatingExample?.ticker ?? "SPCX"} is a research example only. It is not a portfolio
        holding and is excluded from every look-through total on this page.
      </p>
    </section>
  );
}
