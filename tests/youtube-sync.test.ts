import { describe, expect, it } from "vitest";
import {
  draftEpisodeFromVideo,
  parseYoutubeAtomFeed,
  selectCloseForPublish,
  slugifyEpisodeTitle,
  unmatchedSeriesVideos,
  videoIdFromYoutubeUrl,
} from "@/lib/youtube/sync-episodes";
import type { SynchronizedMarketObservation } from "@/lib/schemas/market-observations";
import type { YoutubeFeedFile } from "@/lib/schemas/youtube-feed";

const feed: YoutubeFeedFile = {
  channelId: "UCmsCaqPm1ELIPxBL7WSNQvQ",
  channelUrl: "https://www.youtube.com/@WorkSaveBitcoin",
  seriesStartPublishedAt: "2026-09-16T00:00:00-04:00",
  retrievedAt: "2026-09-22T14:40:00.000Z",
  sourceUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UCmsCaqPm1ELIPxBL7WSNQvQ",
  videos: [
    {
      videoId: "oldvid00001",
      title: "Older non-series video",
      youtubeUrl: "https://www.youtube.com/watch?v=oldvid00001",
      thumbnailUrl: "https://i.ytimg.com/vi/oldvid00001/hqdefault.jpg",
      publishedAt: "2026-08-01T12:00:00.000Z",
    },
    {
      videoId: "newvid00002",
      title: "New Series Video!",
      youtubeUrl: "https://www.youtube.com/watch?v=newvid00002",
      thumbnailUrl: "https://i.ytimg.com/vi/newvid00002/hqdefault.jpg",
      publishedAt: "2026-09-20T12:00:00.000Z",
    },
  ],
  notes: [],
};

function close(partial: Partial<SynchronizedMarketObservation> & { timestamp: string; portfolioValueCents: number }): SynchronizedMarketObservation {
  return {
    id: partial.id ?? `mo-${partial.timestamp}`,
    timezone: "America/New_York",
    valuationType: "market_close",
    prices: {
      BTCUSD: 100,
      MSTR: 10000,
      ASST: 2000,
      MPJPY: 150,
      SPY: 50000,
      GLD: 30000,
      ...(partial.prices ?? {}),
    },
    sources: {
      BTCUSD: null,
      MSTR: null,
      ASST: null,
      MPJPY: null,
      SPY: null,
      GLD: null,
    },
    netExternalContributionsCents: 199991,
    note: undefined,
    ...partial,
  };
}

describe("youtube episode sync helpers", () => {
  it("extracts video ids and slugifies titles", () => {
    expect(videoIdFromYoutubeUrl("https://www.youtube.com/watch?v=Y6O_zij1X4w")).toBe(
      "Y6O_zij1X4w",
    );
    expect(slugifyEpisodeTitle(4, "My Bitcoin Stock Portfolio Is Up 26% in One Week")).toContain(
      "episode-4-",
    );
  });

  it("parses Atom feed entries", () => {
    const xml = `<?xml version="1.0"?>
    <feed>
      <entry>
        <yt:videoId>abc12345678</yt:videoId>
        <title>Hello Episode</title>
        <published>2026-09-21T18:33:47+00:00</published>
      </entry>
    </feed>`;
    expect(parseYoutubeAtomFeed(xml)).toEqual([
      {
        videoId: "abc12345678",
        title: "Hello Episode",
        publishedAt: "2026-09-21T18:33:47+00:00",
      },
    ]);
  });

  it("lists only unmatched series videos after the series start", () => {
    const missing = unmatchedSeriesVideos({
      feed,
      episodes: [
        {
          episodeNumber: 1,
          slug: "episode-1",
          title: "Ep1",
          youtubeUrl: "https://www.youtube.com/watch?v=alreadyhave",
          thumbnailUrl: null,
          publishedAt: "2026-09-16T08:00:00-04:00",
          valuationAt: "2026-09-16T08:00:00-04:00",
          portfolioValueCents: 199991,
          cashBalanceCents: 0,
          cumulativeContributionsCents: 199991,
          cumulativeWithdrawalsCents: 0,
          cumulativeIncomeCents: 0,
          investmentPnLCents: 0,
          positions: [],
          benchmarks: [],
        },
      ],
    });
    expect(missing).toHaveLength(1);
    expect(missing[0]?.videoId).toBe("newvid00002");
  });

  it("selects the latest official close at or before publish", () => {
    const selected = selectCloseForPublish({
      publishedAt: "2026-09-18T09:16:46-04:00",
      closes: [
        close({ timestamp: "2026-09-16T16:00:00-04:00", portfolioValueCents: 199692 }),
        close({ timestamp: "2026-09-17T16:00:00-04:00", portfolioValueCents: 208235 }),
        close({ timestamp: "2026-09-18T16:00:00-04:00", portfolioValueCents: 237627 }),
      ],
    });
    expect(selected?.portfolioValueCents).toBe(208235);
  });

  it("drafts an episode from a video + close without inventing missing closes", () => {
    const drafted = draftEpisodeFromVideo({
      video: feed.videos[1]!,
      episodeNumber: 5,
      close: close({
        timestamp: "2026-09-18T16:00:00-04:00",
        portfolioValueCents: 237627,
        prices: {
          BTCUSD: 8105526,
          MSTR: 15392,
          ASST: 3009,
          MPJPY: 167,
          SPY: 76169,
          GLD: 40117,
        },
      }),
      positions: [
        {
          ticker: "MSTR",
          shares: 12.12,
          priceCents: null,
          marketValueCents: null,
          assetClass: "common_equity",
          lookThroughEligible: true,
        },
      ],
    });
    expect(drafted.episodeNumber).toBe(5);
    expect(drafted.portfolioValueCents).toBe(237627);
    expect(drafted.positions[0]?.priceCents).toBe(15392);
    expect(drafted.notes?.[0]).toContain("Auto-drafted");
  });
});
