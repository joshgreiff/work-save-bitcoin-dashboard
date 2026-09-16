import { LookThroughChart } from "@/components/charts/Charts";
import {
  AsOf,
  DataTable,
  Disclaimer,
  formatBtcFromSats,
  formatSats,
  formatShares,
  MetricCard,
  SectionIntro,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Bitcoin Exposure",
  description: "Look-through Bitcoin exposure for treasury common-equity positions.",
};

export default function BitcoinExposurePage() {
  const data = buildPublicDashboard();

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Look-through analysis"
        title="Bitcoin exposure"
        description="Diluted sats per share is the primary comparison metric. Preferred securities, ETFs, cash, and issuers without usable disclosures are excluded or marked unavailable."
      />

      <MetricCard
        label="Total look-through exposure"
        value={
          data.lookThrough.totalLookThroughSats == null
            ? "Unavailable"
            : `${formatSats(data.lookThrough.totalLookThroughSats)} (${formatBtcFromSats(data.lookThrough.totalLookThroughSats)})`
        }
        asOf={data.lookThrough.asOf}
        hint="Sum of eligible positions with confirmed diluted sats/share"
      />

      <DataTable
        headers={[
          "Ticker",
          "Shares owned",
          "Diluted sats/share",
          "Look-through sats",
          "Status",
          "Source",
        ]}
        rows={data.lookThrough.positions.map((pos) => {
          const metric = data.lookThrough.metrics.find((m) => m.ticker === pos.ticker);
          return [
            pos.ticker,
            formatShares(pos.shares),
            pos.dilutedSatsPerShare == null ? "—" : pos.dilutedSatsPerShare,
            pos.lookThroughSats == null ? "—" : formatSats(pos.lookThroughSats),
            pos.available ? "Available" : pos.reason ?? "Unavailable",
            metric?.sourceUrl ?? "Pending",
          ];
        })}
      />

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Issuer metrics</h2>
        <DataTable
          headers={[
            "Ticker",
            "Metric date",
            "Total BTC (sats)",
            "Basic shares",
            "Diluted shares",
            "Basic sats/share",
            "Diluted sats/share",
            "Source",
          ]}
          rows={data.lookThrough.metrics.map((m) => [
            m.ticker,
            m.metricDate,
            m.totalBtcSats == null ? "—" : formatSats(m.totalBtcSats),
            m.basicSharesOutstanding ?? "—",
            m.dilutedSharesOutstanding ?? "—",
            m.basicSatsPerShare ?? "—",
            m.dilutedSatsPerShare ?? "—",
            m.sourceUrl ?? "Pending confirmation",
          ])}
        />
        <AsOf value={data.lookThrough.asOf} />
      </section>

      <LookThroughChart
        data={data.episodes.map((ep) => ({
          label: `Ep ${ep.episodeNumber}`,
          sats: null,
        }))}
      />

      <Disclaimer>
        Look-through Bitcoin exposure is an analytical measure. Shareholders do not directly own or
        have a claim on the issuer’s Bitcoin. The calculation does not fully account for debt,
        preferred obligations, liabilities, operating businesses, dilution, custody risk, or other
        features of the capital structure.
      </Disclaimer>
    </div>
  );
}
