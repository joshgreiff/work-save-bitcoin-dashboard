import { notFound } from "next/navigation";
import {
  AsOf,
  DataTable,
  Disclaimer,
  formatShares,
  formatUsdFromCents,
  MetricCard,
  SectionIntro,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const data = buildPublicDashboard();
  return data.episodes.map((ep) => ({ slug: ep.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = buildPublicDashboard();
  const episode = data.episodes.find((ep) => ep.slug === slug);
  if (!episode) return { title: "Episode" };
  return {
    title: `Episode ${episode.episodeNumber}: ${episode.title}`,
    description: `Portfolio snapshot for Episode ${episode.episodeNumber}.`,
  };
}

export default async function EpisodeDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = buildPublicDashboard();
  const episodes = [...data.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
  const index = episodes.findIndex((ep) => ep.slug === slug);
  if (index === -1) notFound();
  const episode = episodes[index];
  const prev = index > 0 ? episodes[index - 1] : null;
  const next = index < episodes.length - 1 ? episodes[index + 1] : null;

  const priorNumber = prev?.episodeNumber;
  const txsSincePrior = data.transactions.filter((tx) => {
    if (tx.episodeNumber === episode.episodeNumber) return true;
    if (priorNumber == null) return tx.episodeNumber === episode.episodeNumber;
    return false;
  });

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow={`Episode ${episode.episodeNumber}`}
        title={episode.title}
        description="Immutable historical snapshot. Values below are frozen as published."
      />

      <div className="flex flex-wrap gap-4 text-sm">
        {episode.youtubeUrl ? (
          <a
            className="text-[var(--accent)] underline-offset-4 hover:underline"
            href={episode.youtubeUrl}
            rel="noreferrer"
            target="_blank"
          >
            Watch on YouTube
          </a>
        ) : null}
        {prev ? <TextLink href={`/episodes/${prev.slug}`}>← Episode {prev.episodeNumber}</TextLink> : null}
        {next ? <TextLink href={`/episodes/${next.slug}`}>Episode {next.episodeNumber} →</TextLink> : null}
      </div>

      {episode.thumbnailUrl ? (
        <a href={episode.youtubeUrl ?? undefined} target="_blank" rel="noreferrer" className="block max-w-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={episode.thumbnailUrl}
            alt={`Thumbnail for ${episode.title}`}
            className="w-full border border-[var(--border)]"
          />
        </a>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Portfolio value" value={formatUsdFromCents(episode.portfolioValueCents)} asOf={episode.valuationAt} />
        <MetricCard label="Cash" value={formatUsdFromCents(episode.cashBalanceCents)} asOf={episode.valuationAt} />
        <MetricCard label="Cumulative contributions" value={formatUsdFromCents(episode.cumulativeContributionsCents)} asOf={episode.valuationAt} />
        <MetricCard label="Investment P&L" value={formatUsdFromCents(episode.investmentPnLCents, { showSign: true })} asOf={episode.valuationAt} />
        <MetricCard label="Cumulative withdrawals" value={formatUsdFromCents(episode.cumulativeWithdrawalsCents)} asOf={episode.valuationAt} />
        <MetricCard label="Income received" value={formatUsdFromCents(episode.cumulativeIncomeCents)} asOf={episode.valuationAt} />
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Holdings at snapshot</h2>
        <DataTable
          headers={["Ticker", "Shares", "Price", "Market value", "Class"]}
          rows={episode.positions.map((pos) => [
            pos.ticker,
            formatShares(pos.shares),
            formatUsdFromCents(pos.priceCents),
            formatUsdFromCents(pos.marketValueCents),
            pos.assetClass,
          ])}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Benchmarks at snapshot</h2>
        <DataTable
          headers={["Symbol", "Label", "Price", "Units", "Value"]}
          rows={episode.benchmarks.map((b) => [
            b.symbol,
            b.label,
            formatUsdFromCents(b.priceCents),
            b.units == null ? "—" : b.units,
            formatUsdFromCents(b.valueCents),
          ])}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Notes</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted-foreground)]">
          {(episode.notes ?? []).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Transactions since preceding episode</h2>
        <DataTable
          headers={["Timestamp", "Category", "Ticker", "Amount", "External"]}
          rows={txsSincePrior.map((tx) => [
            tx.timestamp,
            tx.category,
            tx.ticker ?? "—",
            formatUsdFromCents(tx.amountCents),
            tx.externalCashFlow ? "Yes" : "No",
          ])}
        />
      </section>

      <Disclaimer>
        This page stores the published snapshot. Do not backfill prices into historical episode
        records unless correcting a documented error.
      </Disclaimer>
      <AsOf value={episode.valuationAt} />
    </div>
  );
}
