import {
  DataTable,
  formatUsdFromCents,
  SectionIntro,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const metadata = {
  title: "Episodes",
  description: "Permanent historical snapshots for each Fiat Freedom Portfolio episode.",
};

export default function EpisodesPage() {
  const data = buildPublicDashboard();
  const episodes = [...data.episodes].sort((a, b) => b.episodeNumber - a.episodeNumber);

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Episode archive"
        title="Permanent portfolio snapshots"
        description="Each episode freezes valuation, holdings, and notes at publication. Historical snapshots are never recomputed from current prices."
      />

      <DataTable
        headers={["Episode", "Title", "Published", "Portfolio value", "Investment P&L", ""]}
        rows={episodes.map((ep) => [
          ep.episodeNumber,
          ep.title,
          ep.publishedAt,
          formatUsdFromCents(ep.portfolioValueCents),
          formatUsdFromCents(ep.investmentPnLCents, { showSign: true }),
          "",
        ])}
      />

      <ul className="space-y-3">
        {episodes.map((ep) => (
          <li key={ep.slug} className="border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <p className="text-xs text-[var(--muted)]">Episode {ep.episodeNumber}</p>
            <h2 className="mt-1 text-lg font-medium">{ep.title}</h2>
            <p className="mt-2 tabular-nums text-sm text-[var(--muted-foreground)]">
              {formatUsdFromCents(ep.portfolioValueCents)} · {ep.publishedAt}
            </p>
            <div className="mt-3">
              <TextLink href={`/episodes/${ep.slug}`}>Open snapshot →</TextLink>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
