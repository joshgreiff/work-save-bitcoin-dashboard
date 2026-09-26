import { formatViewerDate, formatViewerTimestamp } from "@/lib/market/session";
import type { SubstackFeedResult } from "@/lib/schemas/substack";

export function SubstackReadingList({ feed }: { feed: SubstackFeedResult }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-medium">From the newsletter</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Longer essays from {feed.publicationTitle} on Substack. Opens on Substack — full posts
            stay there.
          </p>
        </div>
        <a
          href={feed.publicationUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Open Substack →
        </a>
      </div>

      {feed.posts.length === 0 ? (
        <p className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          Recent Substack posts will appear here when the feed is available.
        </p>
      ) : (
        <ul className="space-y-3">
          {feed.posts.map((post) => (
            <li
              key={post.url}
              className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
                  {formatViewerDate(post.publishedAt)}
                </p>
                <h3 className="mt-1 text-lg font-medium text-[var(--foreground)]">{post.title}</h3>
                {post.summary ? (
                  <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
                    {post.summary}
                  </p>
                ) : null}
              </div>
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm text-[var(--accent)] underline-offset-2 hover:underline"
              >
                Read on Substack →
              </a>
            </li>
          ))}
        </ul>
      )}

      {feed.freshness === "live" ? (
        <p className="text-xs text-[var(--muted)]">
          Feed checked {formatViewerTimestamp(feed.retrievedAt)}. Titles and summaries link out; we
          do not republish full essays here.
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Substack feed temporarily unavailable. Visit the publication directly for the latest
          posts.
        </p>
      )}
    </section>
  );
}
