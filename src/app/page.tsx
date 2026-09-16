import {
  AllocationChart,
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

  const episodeChart = data.episodes.map((ep) => ({
    label: `Ep ${ep.episodeNumber}`,
    value: ep.portfolioValueCents / 100,
  }));

  const allocation = data.portfolio.positions
    .filter((p) => p.marketValueCents != null)
    .map((p) => ({
      name: p.ticker,
      value: (p.marketValueCents as number) / 100,
    }));

  const cashFlowChart = [
    {
      label: "Current",
      portfolio: data.portfolio.currentPortfolioValueCents / 100,
      btc:
        data.benchmarks.cashFlowMatched.find((b) => b.symbol === "BTCUSD")?.valueCents != null
          ? (data.benchmarks.cashFlowMatched.find((b) => b.symbol === "BTCUSD")!.valueCents as number) /
            100
          : null,
      spy:
        data.benchmarks.cashFlowMatched.find((b) => b.symbol === "SPY")?.valueCents != null
          ? (data.benchmarks.cashFlowMatched.find((b) => b.symbol === "SPY")!.valueCents as number) / 100
          : null,
      gld:
        data.benchmarks.cashFlowMatched.find((b) => b.symbol === "GLD")?.valueCents != null
          ? (data.benchmarks.cashFlowMatched.find((b) => b.symbol === "GLD")!.valueCents as number) / 100
          : null,
    },
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
            data.portfolio.dataQuality === "seed"
              ? "Opening seed — replace with 4:00 p.m. ET closing snapshot after market close"
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
          hint="Separate from securities portfolio"
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

      <section className="grid gap-4 lg:grid-cols-2">
        <PortfolioValueChart data={episodeChart} />
        <AllocationChart data={allocation} />
        <CashFlowMatchedChart data={cashFlowChart} />
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-medium">Performance vs Bitcoin, SPY, GLD</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Benchmark prices for Episode 1 are intentionally unset. Cash-flow-matched and percentage
            comparisons will populate once confirmed BTC/USD, SPY, and GLD prices are added to{" "}
            <code className="text-[var(--accent)]">data/market-prices.json</code>.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {data.benchmarks.cashFlowMatched.map((b) => (
              <li key={b.symbol} className="flex justify-between gap-4 border-t border-[var(--border)] py-2">
                <span>{b.symbol}</span>
                <span className="tabular-nums text-[var(--muted)]">
                  {b.available ? formatUsdFromCents(b.valueCents) : "Awaiting price data"}
                </span>
              </li>
            ))}
          </ul>
          <AsOf value={data.benchmarks.asOf} />
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
