import type { EpisodeSnapshot } from "@/lib/schemas/episodes";
import type { YoutubeFeedFile, YoutubeFeedVideo } from "@/lib/schemas/youtube-feed";
import type { SynchronizedMarketObservation } from "@/lib/schemas/market-observations";

/** First Fiat Freedom Portfolio episode publish threshold (America/New_York). */
export const FIAT_FREEDOM_SERIES_START = "2026-09-16T00:00:00-04:00";

export function slugifyEpisodeTitle(episodeNumber: number, title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `episode-${episodeNumber}-${base || "untitled"}`;
}

export function videoIdFromYoutubeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace(/^\//, "") || null;
    }
    const v = parsed.searchParams.get("v");
    return v || null;
  } catch {
    return null;
  }
}

export function isFiatFreedomSeriesVideo(
  video: Pick<YoutubeFeedVideo, "publishedAt">,
  seriesStart = FIAT_FREEDOM_SERIES_START,
): boolean {
  return Date.parse(video.publishedAt) >= Date.parse(seriesStart);
}

export function unmatchedSeriesVideos(args: {
  feed: YoutubeFeedFile;
  episodes: EpisodeSnapshot[];
}): YoutubeFeedVideo[] {
  const known = new Set(
    args.episodes
      .map((ep) => videoIdFromYoutubeUrl(ep.youtubeUrl ?? null))
      .filter((id): id is string => Boolean(id)),
  );
  return args.feed.videos
    .filter((video) => isFiatFreedomSeriesVideo(video, args.feed.seriesStartPublishedAt))
    .filter((video) => !known.has(video.videoId))
    .sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
}

/** Prefer the latest official market close at or before the video publish time. */
export function selectCloseForPublish(args: {
  publishedAt: string;
  closes: SynchronizedMarketObservation[];
}): SynchronizedMarketObservation | null {
  const publishMs = Date.parse(args.publishedAt);
  const eligible = args.closes
    .filter((o) => o.valuationType === "market_close")
    .filter((o) => Date.parse(o.timestamp) <= publishMs)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return eligible[0] ?? null;
}

export function draftEpisodeFromVideo(args: {
  video: YoutubeFeedVideo;
  episodeNumber: number;
  close: SynchronizedMarketObservation;
  positions: EpisodeSnapshot["positions"];
}): EpisodeSnapshot {
  const { video, episodeNumber, close, positions } = args;
  const portfolioValueCents = close.portfolioValueCents ?? 0;
  const contributions = close.netExternalContributionsCents ?? portfolioValueCents;
  const priceFor = (ticker: string): number | null => {
    if (ticker === "MSTR" || ticker === "ASST" || ticker === "MPJPY") {
      return close.prices[ticker];
    }
    return null;
  };
  return {
    episodeNumber,
    slug: slugifyEpisodeTitle(episodeNumber, video.title),
    title: video.title,
    youtubeUrl: video.youtubeUrl,
    thumbnailUrl: video.thumbnailUrl,
    publishedAt: video.publishedAt,
    valuationAt: close.timestamp,
    portfolioValueCents,
    cashBalanceCents: 0,
    cumulativeContributionsCents: contributions,
    cumulativeWithdrawalsCents: 0,
    cumulativeIncomeCents: 0,
    investmentPnLCents: portfolioValueCents - contributions,
    positions: positions.map((pos) => {
      const priceCents = priceFor(pos.ticker);
      return {
        ...pos,
        priceCents,
        marketValueCents:
          priceCents == null ? null : Math.round(pos.shares * priceCents),
      };
    }),
    benchmarks: [
      {
        symbol: "BTCUSD",
        label: "Bitcoin",
        priceCents: close.prices.BTCUSD,
        units: null,
        valueCents: null,
      },
      {
        symbol: "SPY",
        label: "S&P 500 (SPY)",
        priceCents: close.prices.SPY,
        units: null,
        valueCents: null,
      },
      {
        symbol: "GLD",
        label: "Gold (GLD)",
        priceCents: close.prices.GLD,
        units: null,
        valueCents: null,
      },
    ],
    notes: [
      `Auto-drafted from YouTube feed video ${video.videoId}.`,
      `Valuation uses the latest official market close at or before publish: ${close.timestamp}.`,
      "Review notes before treating this snapshot as final narration for the episode.",
    ],
  };
}

export function parseYoutubeAtomFeed(xml: string): Array<{
  videoId: string;
  title: string;
  publishedAt: string;
}> {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1] ?? "");
  return entries
    .map((entry) => {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
      const title = entry.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
      const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1]?.trim();
      if (!videoId || !title || !publishedAt) return null;
      return { videoId, title, publishedAt };
    })
    .filter((row): row is { videoId: string; title: string; publishedAt: string } => row != null);
}
