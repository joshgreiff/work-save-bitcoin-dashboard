import {
  AllocationChart,
  BenchmarkReturnChart,
  CashFlowMatchedChart,
  PortfolioValueChart,
} from "@/components/charts/Charts";
import {
  AsOf,
  DataTable,
  EmptyState,
  formatPercent,
  formatShares,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Actual Portfolio",
  description: "Holdings, contributions, transactions, and contribution-adjusted performance.",
};

export default function PortfolioPage() {
  const data = buildPublicDashboard();
  const c = data.portfolio.contributions;
  const p = data.portfolio.performance;

  const episodeChart = [
    ...data.episodes.map((ep) => ({
      label: `Ep ${ep.episodeNumber} open`,
      value: ep.portfolioValueCents / 100,
    })),
    {
      label: "Sep 16 close",
      value: data.portfolio.currentPortfolioValueCents / 100,
    },
  ];

  const allocation = data.portfolio.positions
    .filter((pos) => pos.marketValueCents != null)
    .map((pos) => ({
      name: pos.ticker,
      value: (pos.marketValueCents as number) / 100,
    }));

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Actual securities portfolio"
        title="Fiat Freedom Portfolio"
        description="A real portfolio of Bitcoin treasury equities. Contributions are separated from investment results."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Starting value"
          value={formatUsdFromCents(data.portfolio.startingPortfolioValueCents)}
          asOf={data.portfolio.inceptionValuationAt}
        />
        <MetricCard
          label="Current value"
          value={formatUsdFromCents(data.portfolio.currentPortfolioValueCents)}
          asOf={data.portfolio.currentValuationAt}
          hint="Official 4:00 p.m. ET regular-market close"
        />
        <MetricCard
          label="Cash balance"
          value={formatUsdFromCents(data.portfolio.cashBalanceCents)}
          asOf={data.portfolio.currentValuationAt}
          hint="Confirmed cash figure pending; buying power excluded"
        />
        <MetricCard
          label="Investment P&L"
          value={formatUsdFromCents(p.investmentPnLCents, { showSign: true })}
          tone={p.investmentPnLCents === 0 ? "neutral" : p.investmentPnLCents > 0 ? "positive" : "negative"}
          asOf={data.portfolio.currentValuationAt}
        />
      </div>

      {data.portfolio.afterHours ? (
        <aside className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">After-hours mark (not official)</p>
          <p className="mt-2">
            {formatUsdFromCents(data.portfolio.afterHours.portfolioValueCents)} at{" "}
            {data.portfolio.afterHours.asOf}. Position values below are after-hours only and are not
            used for close, benchmarks, or returns.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-4">Ticker</th>
                  <th className="py-2 pr-4">Shares</th>
                  <th className="py-2">After-hours value</th>
                </tr>
              </thead>
              <tbody>
                {data.portfolio.afterHours.positions.map((pos) => (
                  <tr key={pos.ticker} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-4">{pos.ticker}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatShares(pos.shares)}</td>
                    <td className="py-2 tabular-nums">{formatUsdFromCents(pos.marketValueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total external contributions" value={formatUsdFromCents(c.totalExternalContributionsCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Initial funding" value={formatUsdFromCents(c.initialFundingCents)} asOf={data.portfolio.currentValuationAt} hint="Opening deposit establishing the portfolio" />
        <MetricCard label="Personal contributions" value={formatUsdFromCents(c.personalCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Channel-income contributions" value={formatUsdFromCents(c.channelIncomeCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Viewer-support contributions" value={formatUsdFromCents(c.viewerSupportCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Withdrawals (external)" value={formatUsdFromCents(c.externalWithdrawalsCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Dividends received" value={formatUsdFromCents(p.dividendsReceivedCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Options income" value={formatUsdFromCents(p.optionsIncomeReceivedCents)} asOf={data.portfolio.currentValuationAt} />
        <MetricCard label="Return since inception" value={formatPercent(p.returnSinceInception, { showSign: true })} asOf={data.portfolio.currentValuationAt} />
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
          headers={["Ticker", "Shares", "Asset class", "Underlying", "Price", "Market value", "Look-through"]}
          rows={data.portfolio.positions.map((pos) => [
            pos.ticker,
            formatShares(pos.shares),
            pos.assetClass,
            pos.underlyingTicker
              ? `${pos.underlyingTicker}${pos.adrRatio ? ` (${pos.adrRatio}:1 ADR)` : ""}`
              : "—",
            formatUsdFromCents(pos.priceCents),
            formatUsdFromCents(pos.marketValueCents),
            pos.lookThroughEligible ? "Eligible" : "Excluded",
          ])}
        />
        <AsOf value={data.portfolio.currentValuationAt} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortfolioValueChart data={episodeChart} />
        <AllocationChart data={allocation} />
        <BenchmarkReturnChart data={[]} seriesKeys={[]} />
        <CashFlowMatchedChart
          data={[
            {
              label: "Current",
              portfolio: data.portfolio.currentPortfolioValueCents / 100,
              btc: null,
              spy: null,
              gld: null,
            },
          ]}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Transaction history</h2>
        {data.transactions.length === 0 ? (
          <EmptyState message="No transactions recorded." />
        ) : (
          <DataTable
            headers={["Timestamp", "Category", "Ticker", "Shares", "Amount", "External flow", "Note"]}
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
