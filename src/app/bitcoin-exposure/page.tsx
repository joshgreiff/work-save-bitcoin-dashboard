import { AmplificationEducationCard } from "@/components/AmplificationEducationCard";
import { BitcoinPerShareEducation } from "@/components/BitcoinPerShareEducation";
import { LookThroughChart } from "@/components/charts/Charts";
import { IssuerBpsHistory } from "@/components/IssuerBpsHistory";
import {
  AsOf,
  DataTable,
  Disclaimer,
  formatPercent,
  formatSats,
  formatShares,
  MetricCard,
  SectionIntro,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Bitcoin Exposure",
  description:
    "Look-through Bitcoin exposure and diluted sats-per-share history for treasury common-equity positions.",
};

function formatMetricNumber(value: number | null | undefined): string {
  if (value == null) return "Unavailable";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

export default function BitcoinExposurePage() {
  const data = buildPublicDashboard();
  const lt = data.lookThrough;
  const mstrLatest = data.issuerBitcoinPerShare.latestByTicker.find(
    (r) => r.ticker === "MSTR",
  );
  const mpjpyLatest = data.issuerBitcoinPerShare.latestByTicker.find(
    (r) => r.ticker === "MPJPY",
  );
  const asstMetric = lt.positions.find((p) => p.ticker === "ASST");

  return (
    <div className="space-y-10">
      <SectionIntro
        eyebrow="Analytical exposure"
        title="Bitcoin exposure"
        description="Look-through Bitcoin exposure is an analytical metric. It is not Bitcoin owned directly by Josh and does not give shareholders a legal claim on issuer Bitcoin. It remains separate from securities-portfolio market value, the WSB Strategic Bitcoin Reserve, and the Fiat Freedom Income Model."
      />

      {/* 1. Total look-through Bitcoin exposure */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-xl font-medium">Total look-through Bitcoin exposure</h2>
          <span className="border border-[var(--accent)] px-2 py-0.5 text-xs uppercase tracking-wide text-[var(--accent)]">
            Analytical exposure
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total look-through (sats)"
            value={
              lt.totalLookThroughSats == null
                ? "Unavailable"
                : formatSats(lt.totalLookThroughSats)
            }
            asOf={lt.latestMetricDate}
            hint="Eligible holdings only — excludes WSB Bitcoin Reserve"
            tone="accent"
          />
          <MetricCard
            label="Total look-through (BTC)"
            value={
              lt.totalLookThroughBtc == null
                ? "Unavailable"
                : `${lt.totalLookThroughBtc.toFixed(8)} BTC`
            }
            asOf={lt.latestMetricDate}
          />
          <MetricCard
            label="Latest metric date"
            value={lt.latestMetricDate ?? "Unavailable"}
            hint="Newest issuer metric date among current holdings"
          />
          <MetricCard
            label="Eligible holdings"
            value={String(lt.eligibleHoldingsCount)}
            hint="Positions with confirmed diluted sats/share"
          />
        </div>

        <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Share of total look-through by position
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {lt.positions.map((pos) => (
              <li key={pos.ticker} className="text-sm">
                <span className="font-medium">{pos.ticker}</span>
                <span className="ml-2 tabular-nums text-[var(--muted-foreground)]">
                  {formatPercent(pos.percentOfTotal, { fallback: "Unavailable" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <AsOf value={lt.asOf} />
      </section>

      {/* 2. Exposure by portfolio holding */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Exposure by portfolio holding</h2>
        <DataTable
          headers={[
            "Issuer",
            "Ticker",
            "Shares",
            "ADR",
            "Diluted sats/share",
            "Look-through sats",
            "BTC equiv.",
            "% of total",
            "Metric date",
            "Source",
          ]}
          rows={lt.positions.map((pos) => [
            pos.issuer,
            pos.ticker,
            formatShares(pos.portfolioShares),
            pos.adrRatio === 1 ? "1:1" : String(pos.adrRatio),
            pos.displayedDilutedSatsPerShare == null
              ? "Unavailable"
              : formatMetricNumber(pos.displayedDilutedSatsPerShare),
            pos.lookThroughSats == null
              ? "Unavailable"
              : formatSats(pos.lookThroughSats),
            pos.lookThroughBtc == null
              ? "Unavailable"
              : `${pos.lookThroughBtc.toFixed(8)} BTC`,
            formatPercent(pos.percentOfTotal, { fallback: "Unavailable" }),
            pos.metricDateLabel ?? pos.metricDate ?? "Unavailable",
            pos.sourceUrl ?? "Unavailable",
          ])}
        />
        <LookThroughChart
          data={lt.positions.map((p) => ({
            label: p.ticker,
            sats: p.lookThroughSats,
          }))}
        />
      </section>

      {/* 3. Diluted sats-per-share history */}
      <IssuerBpsHistory
        observations={data.issuerBitcoinPerShare.observations}
        latestByTicker={data.issuerBitcoinPerShare.latestByTicker}
        notes={data.issuerBitcoinPerShare.notes}
      />

      {mstrLatest ? (
        <div className="space-y-2 border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">Strategy (MSTR) recent change</p>
          <p>
            Since June 30, 2026:{" "}
            {formatPercent(mstrLatest.changeSinceJun2026Pct, {
              showSign: true,
              fallback: "Unavailable",
            })}
            . Since December 31, 2025:{" "}
            {formatPercent(mstrLatest.changeSinceDec2025Pct, {
              showSign: true,
              fallback: "Unavailable",
            })}
            .
          </p>
          <p>
            Strategy’s reported Bitcoin holdings remained at 846,000 BTC between June 30 and
            September 20 while its assumed diluted share count increased. As a result, this gross
            diluted Bitcoin-per-share metric declined. This metric alone does not measure the value
            of Strategy’s operating business, financing activity, preferred capital, liabilities or
            future capital-markets activity.
          </p>
        </div>
      ) : null}

      {mpjpyLatest?.changeSinceJun2026Pct != null ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Metaplanet diluted sats/share change since June 30, 2026:{" "}
          {formatPercent(mpjpyLatest.changeSinceJun2026Pct, { showSign: true })}.
        </p>
      ) : null}

      {/* 4. How Bitcoin per share changes */}
      <BitcoinPerShareEducation />
      <AmplificationEducationCard />

      {/* 5. Issuer methodology and dilution notes */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Issuer methodology and dilution notes</h2>
        <DataTable
          headers={[
            "Issuer",
            "BTC holdings",
            "Basic shares",
            "Assumed diluted",
            "Dilution scope",
            "Basic sats/share",
            "Diluted sats/share",
            "Retrieved",
          ]}
          rows={lt.metrics.map((m) => [
            `${m.issuer} (${m.ticker})`,
            m.bitcoinHoldings == null ? "Unavailable" : formatMetricNumber(m.bitcoinHoldings),
            m.basicSharesOutstanding == null
              ? "Unavailable"
              : formatMetricNumber(m.basicSharesOutstanding),
            m.dilutedSharesOutstanding == null
              ? "Unavailable"
              : formatMetricNumber(m.dilutedSharesOutstanding),
            m.dilutionScope ?? "Unavailable",
            m.basicSatsPerShare == null
              ? "Unavailable"
              : formatMetricNumber(m.reportedBasicSatsPerShare ?? Math.round(m.basicSatsPerShare)),
            m.dilutedSatsPerShare == null
              ? "Unavailable"
              : formatMetricNumber(
                  m.reportedDilutedSatsPerShare ?? Math.round(m.dilutedSatsPerShare),
                ),
            m.retrievedAt ?? "Unavailable",
          ])}
        />

        <div className="space-y-3 text-sm leading-relaxed text-[var(--muted-foreground)]">
          <p>
            <span className="font-medium text-[var(--foreground)]">Strategy / MSTR.</span> Assumed
            diluted shares are defined by Strategy as basic shares plus assumed conversion of
            convertible instruments, options, restricted stock units and performance stock units.
            Sources:{" "}
            <a
              className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
              href="https://www.strategy.com/shares"
              target="_blank"
              rel="noreferrer"
            >
              strategy.com/shares
            </a>
            ,{" "}
            <a
              className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
              href="https://www.strategy.com/btc"
              target="_blank"
              rel="noreferrer"
            >
              strategy.com/btc
            </a>
            .
          </p>
          <p>
            <span className="font-medium text-[var(--foreground)]">Strive / ASST.</span>{" "}
            {asstMetric?.note ??
              "Issuer-defined assumed fully diluted includes effective common, options and unvested employee awards."}
            {asstMetric?.excludedTraditionalWarrants != null ? (
              <>
                {" "}
                Excluded traditional warrants:{" "}
                {formatMetricNumber(asstMetric.excludedTraditionalWarrants)}.
              </>
            ) : null}{" "}
            Strive’s assumed fully diluted figure includes effective common shares, options and
            unvested employee awards, but excludes separately disclosed traditional warrants. A
            broader treasury-adjusted dilution calculation could therefore produce a lower
            sats-per-share figure. Source:{" "}
            <a
              className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
              href="https://www.sec.gov/Archives/edgar/data/1920406/000162828026062806/asst-20260921.htm"
              target="_blank"
              rel="noreferrer"
            >
              SEC filing
            </a>
            .
          </p>
          <p>
            <span className="font-medium text-[var(--foreground)]">Metaplanet / MPJPY.</span> MPJPY
            represents Metaplanet ordinary shares at a 1:1 ADR ratio. The analytics tracker labels
            the latest row as “Current”; the stored metric date is the retrieval date and does not
            imply a new corporate action. Look-through uses unrounded holdings ÷ assumed diluted
            shares when raw inputs are available (reported rounded diluted sats/share is 2,866).
            Source:{" "}
            <a
              className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
              href="https://analytics.metaplanet.jp/?tab=shares"
              target="_blank"
              rel="noreferrer"
            >
              analytics.metaplanet.jp
            </a>
            .
          </p>
          <p>
            Position look-through sats = portfolio shares × unrounded issuer diluted sats per share
            × ADR ratio, rounded only at the end to the nearest satoshi. Missing metrics display as
            Unavailable, never as zero.
          </p>
        </div>
      </section>

      {/* 6. Limitations and primary sources */}
      <section className="space-y-4">
        <h2 className="text-xl font-medium">Limitations and primary sources</h2>
        <Disclaimer>
          Look-through Bitcoin exposure is an analytical measure. Shareholders do not directly own
          or have a claim on issuer Bitcoin. It does not fully account for debt, preferred-stock
          claims, operating businesses, taxes, custody risk, dilution, warrants, convertibles,
          financing costs or other liabilities.
        </Disclaimer>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted-foreground)]">
          <li>Sats per share is not the same as net asset value.</li>
          <li>Sats-per-share growth does not guarantee share-price appreciation.</li>
          <li>Historical issuer observations remain append-only.</li>
          <li>Historical values are never replaced with the latest current value.</li>
          <li>Third-party estimates are never used when a usable primary disclosure exists.</li>
          <li>Every metric shows its issuer date and retrieval date.</li>
          <li>
            WSB Strategic Bitcoin Reserve sats never enter this look-through total; look-through
            never enters actual portfolio market value.
          </li>
        </ul>
        <DataTable
          headers={["Issuer", "Metric date", "Retrieved", "Source"]}
          rows={lt.positions.map((pos) => [
            `${pos.issuer} (${pos.ticker})`,
            pos.metricDateLabel ?? pos.metricDate ?? "Unavailable",
            pos.retrievalDate ?? "Unavailable",
            pos.sourceUrl ?? "Unavailable",
          ])}
        />
      </section>
    </div>
  );
}
