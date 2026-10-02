import {
  BenchmarkReturnChart,
} from "@/components/charts/Charts";
import { LiveMarkPanel } from "@/components/LiveMarkPanel";
import { LiveTrailingValuationCharts } from "@/components/LiveTrailingValuationCharts";
import { PortfolioLiveHeader } from "@/components/PortfolioLiveHeader";
import {
  AsOf,
  DataTable,
  EmptyState,
  formatShares,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
} from "@/components/ui/primitives";
import { PriceCarryForwardNotice } from "@/components/PriceCarryForwardNotice";
import { lastConfirmedBenchmarkPrices } from "@/lib/accounting/live-chart-trail";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

const TRANSACTION_LABEL: Partial<Record<string, string>> = {
  personal_contribution: "Personal contribution",
  security_purchase: "Purchase",
  security_sale: "Sale",
};

export const metadata = {
  title: "Actual Portfolio",
  description: "Holdings, contributions, transactions, and contribution-adjusted performance.",
};

export default function PortfolioPage() {
  const data = buildPublicDashboard();
  const c = data.portfolio.contributions;
  const p = data.portfolio.performance;
  const pending = data.portfolio.transactionsAfterValuation;

  const series = data.valuationHistory.series;

  const valueChart = series.map((row) => ({
    label: row.label,
    value: row.portfolio,
  }));

  const cashFlowChart = series.map((row) => ({
    label: row.label,
    portfolio: row.cashFlowPortfolio,
    btc: row.cashFlowBtc,
    spy: row.cashFlowSpy,
    gld: row.cashFlowGld,
  }));

  const lastBenchmarkPrices = lastConfirmedBenchmarkPrices(series);

  const returnChart = series.map((row) => ({
    label: row.label,
    portfolio: row.portfolioReturn,
    btc: row.btcReturn,
    spy: row.spyReturn,
    gld: row.gldReturn,
  }));

  const returnSeriesKeys = [
    { key: "portfolio", label: "Portfolio", color: "#F7931A" },
    ...(data.valuationHistory.hasBenchmarkPrices
      ? [
          { key: "btc", label: "Bitcoin", color: "#E8E2D6" },
          { key: "spy", label: "SPY", color: "#7A8494" },
          { key: "gld", label: "GLD", color: "#A67C52" },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Actual securities portfolio"
        title="Fiat Freedom Portfolio"
        description="A real portfolio of Bitcoin treasury equities plus a small, long-term experimental operating-company allocation. Contributions are separated from investment results. Current value marks the published share weights to live quotes."
      />

      <PortfolioLiveHeader
        cashBalanceCents={data.portfolio.cashBalanceCents}
        positions={data.portfolio.positions.map((pos) => ({
          ticker: pos.ticker,
          shares: pos.shares,
        }))}
        totalExternalContributionsCents={c.totalExternalContributionsCents}
        netExternalContributionsCents={c.netExternalContributionsCents}
        liveTotalExternalContributionsCents={
          data.portfolio.contributionsToDate.totalExternalContributionsCents
        }
        liveNetExternalContributionsCents={
          data.portfolio.contributionsToDate.netExternalContributionsCents
        }
        startingPortfolioValueCents={data.portfolio.startingPortfolioValueCents}
        inceptionValuationAt={data.portfolio.inceptionValuationAt}
        fallbackValueCents={data.portfolio.currentPortfolioValueCents}
        fallbackAsOf={data.portfolio.currentValuationAt}
      />

      <PriceCarryForwardNotice
        rows={data.marketObservations.priceCarryForwards}
        title="Official close price carry-forward notes"
      />

      <LiveMarkPanel />

      {pending.length > 0 ? (
        <section className="space-y-2 border border-dashed border-[var(--border)] p-4 text-sm">
          <h2 className="font-medium">Recorded after the latest official close</h2>
          <p className="text-[var(--muted-foreground)]">
            These transactions are not yet reflected in the official value, contributions, or P&amp;L
            below (valued {formatEtTimestamp(data.portfolio.currentValuationAt)}). They enter the
            official figures at the next market close. New contributions are never counted as profit.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[var(--muted-foreground)]">
            {pending.map((tx) => (
              <li key={tx.id}>
                {formatEtTimestamp(tx.timestamp)} · {TRANSACTION_LABEL[tx.category] ?? tx.category}
                {tx.ticker ? ` · ${formatShares(tx.shares ?? 0)} ${tx.ticker}` : ""}
                {tx.amountCents != null ? ` · ${formatUsdFromCents(tx.amountCents)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total external contributions"
          value={formatUsdFromCents(c.totalExternalContributionsCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Initial funding"
          value={formatUsdFromCents(c.initialFundingCents)}
          asOf={data.portfolio.currentValuationAt}
          hint="Opening deposit establishing the portfolio"
        />
        <MetricCard
          label="Personal contributions"
          value={formatUsdFromCents(c.personalCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Channel-income contributions"
          value={formatUsdFromCents(c.channelIncomeCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Viewer-support contributions"
          value={formatUsdFromCents(c.viewerSupportCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Withdrawals (external)"
          value={formatUsdFromCents(c.externalWithdrawalsCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Dividends received"
          value={formatUsdFromCents(p.dividendsReceivedCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Options income"
          value={formatUsdFromCents(p.optionsIncomeReceivedCents)}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Unrealized gain/loss"
          value={formatUsdFromCents(p.unrealizedGainLossCents)}
          hint="Requires confirmed cost basis and mark-to-market"
          asOf={data.portfolio.currentValuationAt}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Current holdings</h2>
        <DataTable
          headers={["Ticker", "Shares", "Asset class", "Underlying", "Look-through"]}
          rows={data.portfolio.positions.map((pos) => [
            pos.ticker,
            formatShares(pos.shares),
            pos.assetClass,
            pos.underlyingTicker
              ? `${pos.underlyingTicker}${pos.adrRatio ? ` (${pos.adrRatio}:1 ADR)` : ""}`
              : "—",
            pos.lookThroughEligible ? "Eligible" : "Excluded",
          ])}
        />
        <AsOf value={data.portfolio.currentValuationAt} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <LiveTrailingValuationCharts
          valueChart={valueChart}
          cashFlowChart={cashFlowChart}
          lastBenchmarkPrices={lastBenchmarkPrices}
        />
        <BenchmarkReturnChart data={returnChart} seriesKeys={returnSeriesKeys} />
      </div>
      {!data.valuationHistory.hasBenchmarkPrices ? (
        <p className="text-sm text-[var(--muted)]">
          Benchmark session prices (BTC/SPY/GLD) are pending confirmation. Append them to{" "}
          <code className="text-[var(--accent)]">data/valuation-history.json</code> without inventing
          figures. Historical charts keep stored open/close marks; the trailing point may still show
          the live portfolio mark when the market is open.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Transaction history</h2>
        {data.transactions.length === 0 ? (
          <EmptyState message="No transactions recorded." />
        ) : (
          <DataTable
            headers={[
              "Timestamp",
              "Category",
              "Ticker",
              "Shares",
              "Amount",
              "External flow",
              "Note",
            ]}
            rows={data.transactions.map((tx) => [
              tx.timestamp,
              tx.category,
              tx.ticker ?? "—",
              tx.shares == null ? "—" : formatShares(tx.shares),
              formatUsdFromCents(tx.amountCents, { fallback: "—" }),
              tx.externalCashFlow ? "Yes" : "No",
              tx.note ?? "",
            ])}
          />
        )}
      </section>
    </div>
  );
}
