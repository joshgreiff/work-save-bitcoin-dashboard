import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  loadEpisodes,
  loadMarketObservations,
  loadPortfolio,
  loadSiteConfig,
} from "../src/lib/data/load";
import { youtubeFeedFileSchema } from "../src/lib/schemas/youtube-feed";
import {
  FIAT_FREEDOM_SERIES_START,
  draftEpisodeFromVideo,
  parseYoutubeAtomFeed,
  unmatchedSeriesVideos,
} from "../src/lib/youtube/sync-episodes";
import { episodesFileSchema } from "../src/lib/schemas/episodes";

const CHANNEL_ID = "UCmsCaqPm1ELIPxBL7WSNQvQ";
const CHANNEL_URL = "https://www.youtube.com/@WorkSaveBitcoin";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const DATA_DIR = path.join(process.cwd(), "data");

function parseArgs(argv: string[]) {
  return {
    apply: argv.includes("--apply"),
    refreshOnly: argv.includes("--refresh-only"),
  };
}

async function fetchFeedXml(fetchImpl: typeof fetch = fetch): Promise<string> {
  const response = await fetchImpl(FEED_URL, {
    headers: { Accept: "application/atom+xml,application/xml,text/xml" },
  });
  if (!response.ok) {
    throw new Error(`YouTube feed HTTP ${response.status}`);
  }
  return response.text();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const retrievedAt = new Date().toISOString();
  const xml = await fetchFeedXml();
  const parsed = parseYoutubeAtomFeed(xml);
  const feed = youtubeFeedFileSchema.parse({
    channelId: CHANNEL_ID,
    channelUrl: CHANNEL_URL,
    seriesStartPublishedAt: FIAT_FREEDOM_SERIES_START,
    retrievedAt,
    sourceUrl: FEED_URL,
    videos: parsed.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
      publishedAt: video.publishedAt,
    })),
    notes: [
      "Cached YouTube Atom feed for the Work Save Bitcoin channel.",
      "Fiat Freedom Portfolio series videos are those published on/after seriesStartPublishedAt.",
      "Official episode snapshots remain append-only confirmed records in episodes.json.",
    ],
  });

  writeFileSync(path.join(DATA_DIR, "youtube-feed.json"), `${JSON.stringify(feed, null, 2)}\n`);
  console.log(`Wrote data/youtube-feed.json (${feed.videos.length} videos).`);

  if (args.refreshOnly) return;

  const episodesFile = loadEpisodes();
  const missing = unmatchedSeriesVideos({
    feed,
    episodes: episodesFile.episodes,
  });

  if (missing.length === 0) {
    console.log("No unmatched Fiat Freedom Portfolio videos.");
    return;
  }

  console.log("Unmatched series videos:");
  for (const video of missing) {
    console.log(`- ${video.publishedAt} | ${video.videoId} | ${video.title}`);
  }

  if (!args.apply) {
    console.log(
      "Dry run only. Re-run with --apply to append draft episode snapshots from the latest official close at or before each publish time.",
    );
    return;
  }

  const closes = loadMarketObservations().observations.filter(
    (o) => o.valuationType === "market_close",
  );
  const portfolio = loadPortfolio();
  let number = Math.max(...episodesFile.episodes.map((ep) => ep.episodeNumber), 0) + 1;
  const drafted = [...episodesFile.episodes];

  for (const video of missing) {
    const close = closes
      .filter((o) => Date.parse(o.timestamp) <= Date.parse(video.publishedAt))
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
    if (!close || close.portfolioValueCents == null) {
      console.warn(
        `Skipping ${video.videoId}: no official market_close at or before publish. Append market-observations first.`,
      );
      continue;
    }
    drafted.push(
      draftEpisodeFromVideo({
        video,
        episodeNumber: number,
        close,
        positions: portfolio.positions.map((p) => ({
          ticker: p.ticker,
          shares: p.shares,
          priceCents: null,
          marketValueCents: null,
          assetClass: p.assetClass,
          lookThroughEligible: p.lookThroughEligible,
          underlyingTicker: p.underlyingTicker,
          adrRatio: p.adrRatio,
        })),
      }),
    );
    number += 1;
  }

  const validated = episodesFileSchema.parse({ episodes: drafted });
  writeFileSync(
    path.join(DATA_DIR, "episodes.json"),
    `${JSON.stringify(validated, null, 2)}\n`,
  );
  console.log(`Appended ${validated.episodes.length - episodesFile.episodes.length} draft episode(s).`);

  const site = loadSiteConfig();
  const seriesResources = validated.episodes
    .filter((ep) => ep.youtubeUrl)
    .map((ep) => ({
      title: `Fiat Freedom Portfolio — Episode ${ep.episodeNumber}`,
      url: ep.youtubeUrl as string,
      note: ep.title,
    }));
  const nonSeries = site.educationalResources.filter(
    (r) => !r.title.startsWith("Fiat Freedom Portfolio — Episode"),
  );
  writeFileSync(
    path.join(DATA_DIR, "site-config.json"),
    `${JSON.stringify({ ...site, educationalResources: [...nonSeries, ...seriesResources] }, null, 2)}\n`,
  );
  console.log("Updated site-config educationalResources episode links.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
