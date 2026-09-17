import {
  AllocationChart,
  BenchmarkReturnChart,
  CashFlowMatchedChart,
  PortfolioValueChart,
} from "@/components/charts/Charts";
import {
  AsOf,
  Disclaimer,
  formatBtcFromSats,
  formatPercent,
  formatSats,
  formatUsdFromCents,
  MetricCard,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export default function HomePage() {
  const data = buildPublicDashboard();
  const pnl = data.portfolio.performance.investmentPnLCents;
  const ret = data.portfolio.performance.returnSinceInception;
  const series = data.valuationHistory.series;

  const valueChart = series.map((row) => ({
    label: row.label,
    value: row.portfolio,
  }));

  const allocation = data.portfolio.positions
    .filter((p) => p.marketValueCents != null)
    .map((p) => ({
      name: p.ticker,
      value: (p.marketValueCents as number) / 100,
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
        <AsOf value={data.portfolio.currentValuationAt} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Actual portfolio value"
          value={formatUsdFromCents(data.portfolio.currentPortfolioValueCents)}
          asOf={data.portfolio.currentValuationAt}
          hint={
            data.portfolio.dataQuality === "confirmed"
              ? "Official 4:00 p.m. ET regular-market close"
              : data.portfolio.dataQuality === "seed"
                ? "Opening seed"
                : undefined
          }
        />
        <MetricCard
          label="Investment gain / loss"
          value={formatUsdFromCents(pnl, { showSign: true })}
          tone={pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral"}
          hint="Excludes outside contributions"
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Return since inception"
          value={formatPercent(ret, { showSign: true })}
          asOf={data.portfolio.currentValuationAt}
        />
        <MetricCard
          label="Look-through BTC exposure"
          value={
            data.lookThrough.totalLookThroughSats == null
              ? "Unavailable"
              : formatSats(data.lookThrough.totalLookThroughSats)
          }
          hint="Requires confirmed diluted sats/share"
          asOf={data.lookThrough.asOf}
        />
        <MetricCard
          label="WSB Bitcoin Reserve"
          value={formatBtcFromSats(data.reserve.summary.currentReserveSats)}
          hint={formatSats(data.reserve.summary.currentReserveSats)}
          asOf={data.reserve.asOf}
          tone="accent"
        />
        <MetricCard
          label="Modeled monthly income"
          value={formatUsdFromCents(data.incomeModel.result.monthlyIncomeCents)}
          hint={
            data.incomeModel.result.configured
              ? "Hypothetical conversion"
              : "Income model not configured yet"
          }
          asOf={data.incomeModel.asOf}
        />
      </section>

      {data.portfolio.afterHours ? (
        <section className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">After-hours (informational only)</p>
          <p className="mt-2">
            {formatUsdFromCents(data.portfolio.afterHours.portfolioValueCents)} as of{" "}
            {data.portfolio.afterHours.asOf}. Not used for official performance or benchmarks.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <PortfolioValueChart data={valueChart} />
        <AllocationChart data={allocation} />
        <CashFlowMatchedChart data={cashFlowChart} />
        <div className="space-y-3">
          <BenchmarkReturnChart data={returnChart} seriesKeys={returnSeriesKeys} />
          {!data.valuationHistory.hasBenchmarkPrices ? (
            <p className="text-xs text-[var(--muted)]">
              BTC/SPY/GLD session prices are still pending confirmation in{" "}
              <code className="text-[var(--accent)]">data/valuation-history.json</code>. Portfolio
              open/close marks are live.
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
              <TextLink href="/portfolio">Actual portfolio details</TextLink>
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
        performance.
      </Disclaimer>
    </div>
  );
}
