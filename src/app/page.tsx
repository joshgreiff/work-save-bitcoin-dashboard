import {
  BenchmarkReturnChart,
  CashFlowMatchedChart,
  PortfolioValueChart,
} from "@/components/charts/Charts";
import { OverviewLiveSummary } from "@/components/OverviewLiveSummary";
import {
  Disclaimer,
  formatUsdFromCents,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export default function HomePage() {
  const data = buildPublicDashboard();
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
    <div className="space-y-10">
      <section className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Fiat Freedom Portfolio
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
          Tracking a real portfolio at the intersection of Bitcoin, public markets, and fiat
          income.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--muted-foreground)]">
          Three separate ledgers: the actual securities portfolio, the WSB Strategic Bitcoin
          Reserve, and a hypothetical Fiat Freedom Income Model.
        </p>
      </section>

      <OverviewLiveSummary
        cashBalanceCents={data.portfolio.cashBalanceCents}
        positions={data.portfolio.positions.map((p) => ({
          ticker: p.ticker,
          shares: p.shares,
        }))}
        totalExternalContributionsCents={
          data.portfolio.contributions.totalExternalContributionsCents
        }
        netExternalContributionsCents={
          data.portfolio.contributions.netExternalContributionsCents
        }
        fallbackValueCents={data.portfolio.currentPortfolioValueCents}
        fallbackAsOf={data.portfolio.currentValuationAt}
        lookThrough={{
          totalLookThroughSats: data.lookThrough.totalLookThroughSats,
          asOf: data.lookThrough.asOf,
        }}
        reserve={{
          currentReserveSats: data.reserve.summary.currentReserveSats,
          asOf: data.reserve.asOf,
        }}
        incomeModel={{
          monthlyIncomeCents: data.incomeModel.result.monthlyIncomeCents,
          configured: data.incomeModel.result.configured,
          asOf: data.incomeModel.asOf,
        }}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <PortfolioValueChart data={valueChart} />
        <CashFlowMatchedChart data={cashFlowChart} />
        <div className="space-y-3 lg:col-span-2">
          <BenchmarkReturnChart data={returnChart} seriesKeys={returnSeriesKeys} />
          {!data.valuationHistory.hasBenchmarkPrices ? (
            <p className="text-xs text-[var(--muted)]">
              BTC/SPY/GLD session prices are still pending confirmation in{" "}
              <code className="text-[var(--accent)]">data/valuation-history.json</code>. Historical
              open/close marks remain the chart source of truth.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-medium">Latest episode</h2>
          {data.latestEpisode ? (
            <>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Episode {data.latestEpisode.episodeNumber}
              </p>
              <p className="mt-1 text-base">{data.latestEpisode.title}</p>
              <p className="mt-3 tabular-nums">
                {formatUsdFromCents(data.latestEpisode.portfolioValueCents)}
              </p>
              <div className="mt-4">
                <TextLink href={`/episodes/${data.latestEpisode.slug}`}>View episode →</TextLink>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">No episodes published.</p>
          )}
        </article>
        <article className="border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-medium">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <TextLink href="/portfolio">Portfolio details</TextLink>
            </li>
            <li>
              <TextLink href="/bitcoin-exposure">Look-through Bitcoin exposure</TextLink>
            </li>
            <li>
              <TextLink href="/reserve">WSB Strategic Bitcoin Reserve</TextLink>
            </li>
            <li>
              <TextLink href="/leaderboard">Donation leaderboards</TextLink>
            </li>
            <li>
              <TextLink href="/income-model">Fiat Freedom Income Model</TextLink>
            </li>
            <li>
              <TextLink href="/methodology">Methodology & disclosures</TextLink>
            </li>
          </ul>
        </article>
      </section>

      <Disclaimer>
        Holdings shown are educational documentation of a public series portfolio. They are not a
        recommendation. The WSB Strategic Bitcoin Reserve is not part of securities-portfolio
        performance. Live marks assume the published share weights have not changed.
      </Disclaimer>
    </div>
  );
}
