import {
  DataTable,
  formatUsdFromCents,
  SectionIntro,
  TextLink,
} from "@/components/ui/primitives";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

export const metadata = {
  title: "Episodes",
  description: "Permanent historical snapshots for each Fiat Freedom Portfolio episode.",
};

export default function EpisodesPage() {
  const data = buildPublicDashboard();
  const episodes = [...data.episodes].sort((a, b) => b.episodeNumber - a.episodeNumber);
  const pending = data.youtubeFeed.pendingSeriesVideos;

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Episode archive"
        title="Permanent portfolio snapshots"
        description="Each episode freezes valuation, holdings, and notes at publication. Historical snapshots are never recomputed from current prices. New YouTube uploads are detected automatically; confirmed closes still define official values."
      />

      <ul className="space-y-3">
        {episodes.map((ep) => (
          <li
            key={ep.slug}
            className="grid gap-4 border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[160px_1fr]"
          >
            {ep.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ep.thumbnailUrl}
                alt=""
                className="aspect-video w-full border border-[var(--border)] object-cover sm:w-40"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center border border-dashed border-[var(--border)] text-xs text-[var(--muted)] sm:w-40">
                No thumbnail
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--muted)]">Episode {ep.episodeNumber}</p>
              <h2 className="mt-1 text-lg font-medium">{ep.title}</h2>
              <p className="mt-2 tabular-nums text-sm text-[var(--muted-foreground)]">
                {formatUsdFromCents(ep.portfolioValueCents)} · Published{" "}
                {formatEtTimestamp(ep.publishedAt)} · Valued {formatEtTimestamp(ep.valuationAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <TextLink href={`/episodes/${ep.slug}`}>Open snapshot →</TextLink>
                {ep.youtubeUrl ? (
                  <a
                    className="text-[var(--accent)] underline-offset-4 hover:underline"
                    href={ep.youtubeUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Watch on YouTube
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <DataTable
        headers={["Episode", "Title", "Published", "Portfolio value", "Investment P&L"]}
        rows={episodes.map((ep) => [
          ep.episodeNumber,
          ep.title,
          formatEtTimestamp(ep.publishedAt),
          formatUsdFromCents(ep.portfolioValueCents),
          formatUsdFromCents(ep.investmentPnLCents, { showSign: true }),
        ])}
      />

      {pending.length > 0 ? (
        <section className="space-y-3 border border-dashed border-[var(--border)] p-4">
          <h2 className="text-lg font-medium">Detected on YouTube — snapshot pending</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            These Fiat Freedom Portfolio videos appear in the channel feed but do not yet have a
            confirmed episode snapshot. Run{" "}
            <code className="text-[var(--foreground)]">npm run sync:episodes</code> after storing
            the matching official close.
          </p>
          <ul className="space-y-2 text-sm">
            {pending.map((video) => (
              <li key={video.videoId}>
                <a
                  className="text-[var(--accent)] underline-offset-4 hover:underline"
                  href={video.youtubeUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {video.title}
                </a>
                <span className="text-[var(--muted)]">
                  {" "}
                  · {formatEtTimestamp(video.publishedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          YouTube feed last checked {formatEtTimestamp(data.youtubeFeed.retrievedAt)}. No unmatched
          series videos.
        </p>
      )}
    </div>
  );
}
