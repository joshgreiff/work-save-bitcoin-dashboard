import { DailyVsBitcoin } from "@/components/DailyVsBitcoin";
import { LiveBtcCard } from "@/components/LiveBtcCard";
import { LiveTrailingValuationCharts } from "@/components/LiveTrailingValuationCharts";
import { OverviewMarketSummary } from "@/components/OverviewMarketSummary";
import {
  Disclaimer,
  formatUsdFromCents,
  TextLink,
} from "@/components/ui/primitives";
import { lastConfirmedBenchmarkPrices } from "@/lib/accounting/live-chart-trail";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

export default function HomePage() {
  const data = buildPublicDashboard();
  const series = data.valuationHistory.series;
  const officialClose =
    data.marketObservations.latestOfficialClose?.portfolioValueCents ??
    data.portfolio.currentPortfolioValueCents;
  const officialCloseAt =
    data.marketObservations.latestOfficialClose?.timestamp ??
    data.portfolio.currentValuationAt;

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

      <LiveBtcCard />

      <OverviewMarketSummary
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
        officialCloseCents={officialClose}
        officialCloseAt={officialCloseAt}
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

      <DailyVsBitcoin marketObservations={data.marketObservations} />

      <section className="grid gap-4 lg:grid-cols-2">
        <LiveTrailingValuationCharts
          valueChart={valueChart}
          cashFlowChart={cashFlowChart}
          lastBenchmarkPrices={lastBenchmarkPrices}
        />
      </section>

      <p className="text-xs text-[var(--muted)]">
        Chart history keeps inception and official market-close observations as published. During
        regular hours the trailing point is the live mark. Latest official close:{" "}
        {formatEtTimestamp(officialCloseAt)}.
      </p>

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
              <TextLink href="/bitcoin-exposure">Bitcoin exposure & sats/share history</TextLink>
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
        performance. Live regular-session marks assume published share weights are unchanged until a
        later transaction is entered.
      </Disclaimer>
    </div>
  );
}
