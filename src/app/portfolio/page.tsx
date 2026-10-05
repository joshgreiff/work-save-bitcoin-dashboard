import { BenchmarkReturnChart } from "@/components/charts/Charts";
import { LiveTrailingValuationCharts } from "@/components/LiveTrailingValuationCharts";
import { PortfolioDashboard } from "@/components/portfolio/PortfolioDashboard";
import {
  AsOf,
  EmptyState,
  formatShares,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
  TextLink,
} from "@/components/ui/primitives";
import { PriceCarryForwardNotice } from "@/components/PriceCarryForwardNotice";
import { lastConfirmedBenchmarkPrices } from "@/lib/accounting/live-chart-trail";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

const TRANSACTION_LABEL: Partial<Record<string, string>> = {
  initial_funding: "Initial funding",
  personal_contribution: "Personal contribution",
  youtube_revenue_contribution: "YouTube revenue contribution",
  affiliate_revenue_contribution: "Affiliate revenue contribution",
  sponsorship_revenue_contribution: "Sponsorship revenue contribution",
  viewer_support_contribution: "Viewer-support contribution",
  security_purchase: "Buy",
  security_sale: "Sell",
  dividend: "Dividend",
  options_premium: "Options premium",
  interest: "Interest",
  withdrawal: "Withdrawal",
};

export const metadata = {
  title: "Actual Portfolio",
  description:
    "Holdings, time-frame performance, what is driving returns, contributions, and transactions.",
};

export default function PortfolioPage() {
  const data = buildPublicDashboard();
  const official = data.portfolio.contributions;
  const c = data.portfolio.contributionsToDate;
  const contributionsAsOf = data.portfolio.contributionsToDateAsOf;
  const p = data.portfolio.performance;
  const pending = data.portfolio.transactionsAfterValuation;
  const series = data.valuationHistory.series;

  const valueChart = series.map((row) => ({ label: row.label, value: row.portfolio }));
  const cashFlowChart = series.map((row) => ({
    label: row.label,
    portfolio: row.cashFlowPortfolio,
    btc: row.cashFlowBtc,
    spy: row.cashFlowSpy,
    gld: row.cashFlowGld,
  }));
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

  const otherContributions = [
    { label: "Channel income", cents: c.channelIncomeCents },
    { label: "Viewer support", cents: c.viewerSupportCents },
    { label: "Withdrawals", cents: -c.externalWithdrawalsCents },
  ].filter((row) => row.cents !== 0);
  const incomeReceived = p.totalIncomeReceivedCents;

  return (
    <div className="space-y-10">
      <SectionIntro
        eyebrow="Actual securities portfolio"
        title="Fiat Freedom Portfolio"
        description="A real portfolio of Bitcoin treasury equities plus a small, long-term experimental operating-company allocation. Deposits are tracked separately from investment results."
      />

      <PortfolioDashboard
        cashBalanceCents={data.portfolio.cashBalanceCents}
        positions={data.portfolio.positions.map((pos) => ({
          ticker: pos.ticker,
          name: pos.name ?? pos.ticker,
          shares: pos.shares,
          lookThroughEligible: pos.lookThroughEligible,
        }))}
        totalExternalContributionsCents={official.totalExternalContributionsCents}
        netExternalContributionsCents={official.netExternalContributionsCents}
        liveTotalExternalContributionsCents={c.totalExternalContributionsCents}
        liveNetExternalContributionsCents={c.netExternalContributionsCents}
        adjustedStartingValue={data.portfolio.adjustedStartingValue}
        adjustedStartingValueToDate={data.portfolio.adjustedStartingValueToDate}
        fallbackValueCents={data.portfolio.currentPortfolioValueCents}
        fallbackAsOf={data.portfolio.currentValuationAt}
        closes={data.portfolio.performanceCloses}
        inception={{
          asOf: data.portfolio.inceptionValuationAt,
          portfolioValueCents: data.portfolio.startingPortfolioValueCents,
        }}
        transactions={data.transactions}
      />

      {pending.length > 0 ? (
        <section className="space-y-2 border border-dashed border-[var(--border)] p-4 text-sm">
          <h2 className="font-medium">Recorded after the latest official close</h2>
          <p className="text-[var(--muted-foreground)]">
            The official value and P&amp;L (valued{" "}
            {formatEtTimestamp(data.portfolio.currentValuationAt)}) pick these up at the next market
            close; a live mark includes them now. New contributions are never counted as profit.
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium">History</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <LiveTrailingValuationCharts
            valueChart={valueChart}
            cashFlowChart={cashFlowChart}
            lastBenchmarkPrices={lastConfirmedBenchmarkPrices(series)}
          />
          <div className="lg:col-span-2">
            <BenchmarkReturnChart data={returnChart} seriesKeys={returnSeriesKeys} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Money in</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total deposits"
            value={formatUsdFromCents(c.totalExternalContributionsCents)}
            asOf={contributionsAsOf}
            hint="All recorded external deposits — never counted as profit"
          />
          <MetricCard
            label="Initial funding"
            value={formatUsdFromCents(c.initialFundingCents)}
            asOf={data.portfolio.inceptionValuationAt}
            hint="Opening deposit (Episode 1)"
          />
          <MetricCard
            label="Personal contributions"
            value={formatUsdFromCents(c.personalCents)}
            asOf={contributionsAsOf}
            hint="New personal cash added after inception"
          />
          <MetricCard
            label="Income received"
            value={formatUsdFromCents(incomeReceived)}
            asOf={data.portfolio.currentValuationAt}
            hint={
              incomeReceived === 0
                ? "No dividends, options premium, or interest yet"
                : `Dividends ${formatUsdFromCents(p.dividendsReceivedCents)} · Options ${formatUsdFromCents(p.optionsIncomeReceivedCents)} · Interest ${formatUsdFromCents(p.interestReceivedCents)}`
            }
          />
        </div>
        {otherContributions.length > 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            {otherContributions
              .map((row) => `${row.label}: ${formatUsdFromCents(row.cents, { showSign: true })}`)
              .join(" · ")}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            No channel-income or viewer-support contributions and no withdrawals recorded.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Transactions</h2>
        {data.transactions.length === 0 ? (
          <EmptyState message="No transactions recorded." />
        ) : (
          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface-elevated)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Date (ET)</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Details</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...data.transactions]
                  .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
                  .map((tx) => (
                    <tr key={tx.id} className="border-t border-[var(--border)] align-top">
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                        {formatEtTimestamp(tx.timestamp)}
                      </td>
                      <td className="px-3 py-3">
                        {TRANSACTION_LABEL[tx.category] ?? tx.category}
                        {tx.externalCashFlow ? (
                          <span className="block text-xs text-[var(--muted)]">
                            External deposit
                          </span>
                        ) : null}
                      </td>
                      <td className="min-w-64 px-3 py-3 text-[var(--muted-foreground)]">
                        {tx.ticker ? (
                          <span className="block font-medium text-[var(--foreground)]">
                            {formatShares(tx.shares ?? 0)} {tx.ticker}
                            {tx.priceCents != null ? ` @ ${formatUsdFromCents(tx.priceCents)}` : ""}
                          </span>
                        ) : null}
                        {tx.note ? <span className="block text-xs">{tx.note}</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                        {formatUsdFromCents(tx.amountCents, { fallback: "Pending" })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="space-y-3">
        <PriceCarryForwardNotice
          rows={data.marketObservations.priceCarryForwards}
          title="Official close price carry-forward notes"
        />
        <p className="text-sm">
          <TextLink href="/methodology">How these numbers are calculated →</TextLink>
        </p>
        <AsOf value={data.portfolio.currentValuationAt} />
      </div>
    </div>
  );
}
