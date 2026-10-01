import type {
  AllocationIllustrationRow,
  ResearchIssuerMetrics,
} from "@/lib/accounting/research-issuer";
import { formatPercent, formatSats, formatUsdFromCents } from "@/lib/accounting/format";
import { formatViewerDate } from "@/lib/market/session";
import type { ResearchIssuerSnapshot } from "@/lib/schemas/research-snapshots";
import { DataTable, MetricCard } from "@/components/ui/primitives";

const usd = (dollars: number) => formatUsdFromCents(Math.round(dollars * 100));
const compactUsd = (dollars: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 3,
  }).format(dollars);
const wholeUsd = (dollars: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
const subCentUsd = (dollars: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(dollars);
const shareCount = (count: number) =>
  count >= 1e9 ? `${(count / 1e9).toFixed(3)}B` : `${Math.round(count / 1e6)}M`;

export type IssuerSnapshotView = {
  snapshot: ResearchIssuerSnapshot;
  metrics: ResearchIssuerMetrics;
  illustration: AllocationIllustrationRow[];
};

function snapshotDate(snapshot: ResearchIssuerSnapshot) {
  return formatViewerDate(snapshot.asOf);
}

export function IssuerSnapshotMetrics({ view }: { view: IssuerSnapshotView }) {
  const { snapshot, metrics } = view;
  return (
    <section
      aria-labelledby="issuer-snapshot-heading"
      className="space-y-4 border border-[var(--border)] bg-[var(--surface-elevated)] p-5"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Derived from reported figures · research only
        </p>
        <h3 id="issuer-snapshot-heading" className="mt-1 text-lg font-medium">
          {snapshot.ticker} Bitcoin per share as of {snapshotDate(snapshot)}
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Basic sats / share"
          value={metrics.basicSatsPerShare.toFixed(0)}
          hint={`${snapshot.bitcoinHoldings.toLocaleString("en-US")} BTC ÷ ${shareCount(snapshot.commonSharesOutstanding)} reported common shares`}
        />
        <MetricCard
          label="Sats / share incl. dilutive awards"
          value={metrics.dilutedSatsPerShare.toFixed(0)}
          hint={`Adds ${shareCount(snapshot.potentiallyDilutiveAwards)} potentially dilutive share-based awards`}
        />
        <MetricCard
          label="BTC value / share"
          value={subCentUsd(metrics.btcValuePerShareUsd)}
          hint={`${compactUsd(snapshot.bitcoinFairValueUsd)} reported fair value ÷ reported common shares`}
        />
        <MetricCard
          label="BTC share of market value"
          value={formatPercent(metrics.btcShareOfMarketValue, { digits: 3 })}
          hint={`vs. approx. ${compactUsd(metrics.approximateMarketValueUsd)} at the ${usd(snapshot.sharePrice.closeUsd)} close`}
          tone="accent"
        />
      </div>
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        Separately disclosed: {shareCount(snapshot.conditionalPerformanceAwards)} conditional
        performance awards were excluded from the 10-Q dilution table because their performance and
        market conditions were not met. Including them as well would give about{" "}
        {metrics.dilutedWithConditionalSatsPerShare.toFixed(0)} sats per share.
      </p>
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
        Historical snapshot: the {subCentUsd(metrics.btcValuePerShareUsd)} of Bitcoin per share is
        synchronized to {snapshotDate(snapshot)}. Its dollar value changes with Bitcoin’s price,
        while sats per share changes only when {snapshot.displayName}’s Bitcoin holdings or diluted
        share count changes.
      </p>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Holdings, shares, and awards as of {snapshotDate(snapshot)} (Form 10-Q). Price:{" "}
        {snapshot.sharePrice.sourceName}, session{" "}
        {formatViewerDate(snapshot.sharePrice.sessionDate)}. {snapshot.sharePrice.note} Not live
        data. Not part of the Fiat Freedom Portfolio or its look-through totals.
      </p>
    </section>
  );
}

export function AllocationIllustration({ view }: { view: IssuerSnapshotView }) {
  const { snapshot, illustration } = view;
  const { portfolioValueUsd, equityMove, bitcoinMove } = snapshot.allocationIllustration;
  const equityPct = formatPercent(equityMove, { digits: 0 });
  const bitcoinPct = formatPercent(bitcoinMove, { digits: 0 });
  const headers = [
    "Allocation",
    `${snapshot.ticker} position`,
    "Look-through sats",
    "BTC value inside",
    "Same $ in BTC",
    `Portfolio if ${snapshot.ticker} ±${equityPct}`,
    `Portfolio $ if BTC +${bitcoinPct} (via treasury only)`,
  ];
  const rows = illustration.map((row) => [
    formatPercent(row.allocation, { digits: 0 }),
    usd(row.positionUsd),
    formatSats(row.lookThroughSats),
    usd(row.btcValueInPositionUsd),
    formatSats(row.directBitcoinSats),
    `±${formatPercent(row.portfolioChangeOnEquityMove, { digits: 1 })}`,
    `+${usd(row.portfolioChangeOnBitcoinMoveUsd)}`,
  ]);
  return (
    <section
      aria-labelledby="allocation-illustration-heading"
      className="space-y-3 border border-[var(--border)] bg-[var(--surface-elevated)] p-5"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Hypothetical illustration · not a recommendation
        </p>
        <h3 id="allocation-illustration-heading" className="mt-1 text-lg font-medium">
          {snapshot.ticker} in a hypothetical {wholeUsd(portfolioValueUsd)} portfolio
        </h3>
      </div>
      <div className="hidden sm:block">
        <DataTable headers={headers} rows={rows} />
      </div>
      <ul className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <li key={row[0]} className="border border-[var(--border)] p-3">
            <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
              {headers.map((header, index) => (
                <div key={header} className="contents">
                  <dt className="text-xs text-[var(--muted)]">{header}</dt>
                  <dd className="text-right tabular-nums">{row[index]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Uses the {formatViewerDate(snapshot.asOf)} close, sats per share including potentially
        dilutive awards, and the Bitcoin price implied by {snapshot.displayName}’s reported fair
        value ({usd(view.metrics.impliedBtcPriceUsd)}). Ignores taxes, fees, and later price
        changes. A hypothetical model, separate from the actual Fiat Freedom Portfolio’s
        performance.
      </p>
    </section>
  );
}
