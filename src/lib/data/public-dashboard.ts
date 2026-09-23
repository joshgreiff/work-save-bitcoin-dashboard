import {
  calculateCashFlowMatchedBenchmark,
  extractExternalCashFlows,
} from "@/lib/accounting/benchmarks";
import { calculateIncomeModel } from "@/lib/accounting/income-model";
import { calculatePositionLookThrough } from "@/lib/accounting/lookthrough";
import {
  calculatePortfolioPerformance,
  summarizeContributions,
} from "@/lib/accounting/portfolio";
import { summarizeReserve } from "@/lib/accounting/reserve";
import {
  buildValuationChartSeries,
  valuationHistoryHasBenchmarkPrices,
} from "@/lib/accounting/valuation-history";
import {
  buildBitcoinLeaderboard,
  buildFiatLeaderboard,
} from "@/lib/schemas/donations";
import type { IssuerMetric } from "@/lib/schemas/issuer-metrics";
import {
  loadDonations,
  loadEpisodes,
  loadIncomeHistory,
  loadIncomeModel,
  loadIncomeSecurities,
  loadIssuerBpsHistory,
  loadIssuerMetrics,
  loadMarketObservations,
  loadMarketPrices,
  loadPortfolio,
  loadReserve,
  loadSiteConfig,
  loadTransactions,
  loadValuationHistory,
  loadYoutubeFeed,
} from "./load";
import { buildSessionComparison } from "@/lib/accounting/session-comparison";
import {
  changeBetweenObservations,
  preferDilutedSatsPerShare,
} from "@/lib/accounting/issuer-bps";
import { unmatchedSeriesVideos } from "@/lib/youtube/sync-episodes";

function latestMetricForTicker(
  metrics: IssuerMetric[],
  ticker: string,
): IssuerMetric | undefined {
  return [...metrics]
    .filter((m) => m.ticker === ticker)
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf))[0];
}

export function buildPublicDashboard() {
  const site = loadSiteConfig();
  const portfolio = loadPortfolio();
  const episodesFile = loadEpisodes();
  const transactionsFile = loadTransactions();
  const marketPrices = loadMarketPrices();
  const issuerMetrics = loadIssuerMetrics();
  const reserve = loadReserve();
  const donations = loadDonations();
  const valuationHistory = loadValuationHistory();
  const marketObservations = loadMarketObservations();
  const issuerBpsHistory = loadIssuerBpsHistory();
  const youtubeFeed = loadYoutubeFeed();
  const incomeModel = loadIncomeModel();
  const incomeSecurities = loadIncomeSecurities();
  const incomeHistory = loadIncomeHistory();
  const catalogByTicker = new Map(
    incomeSecurities.securities.map((s) => [s.ticker, s]),
  );

  const contributions = summarizeContributions(transactionsFile.transactions);
  const performance = calculatePortfolioPerformance({
    currentPortfolioValueCents: portfolio.currentPortfolioValueCents,
    transactions: transactionsFile.transactions,
  });

  const lookThroughInputs = portfolio.positions.map((position) => {
    const metric = latestMetricForTicker(issuerMetrics.metrics, position.ticker);
    return {
      ticker: position.ticker,
      shares: position.shares,
      lookThroughEligible: position.lookThroughEligible,
      dilutedSatsPerShare: metric?.dilutedSatsPerShare ?? null,
    };
  });
  const lookThrough = calculatePositionLookThrough(lookThroughInputs);

  const reserveSummary = summarizeReserve(reserve.transactions);
  const btcPrice = marketPrices.prices.find(
    (p) => p.symbol === "BTCUSD" && p.priceCents != null,
  );
  const reserveValueCents =
    btcPrice?.priceCents != null
      ? Math.round((reserveSummary.currentReserveSats / 100_000_000) * btcPrice.priceCents)
      : null;

  const income = calculateIncomeModel({
    portfolioValueCents: portfolio.currentPortfolioValueCents,
    model: incomeModel,
    catalogByTicker,
  });

  const cashFlows = extractExternalCashFlows(transactionsFile.transactions);
  const benchmarkSymbols = ["BTCUSD", "SPY", "GLD"] as const;
  const cashFlowMatched = benchmarkSymbols.map((symbol) => {
    const prices = marketPrices.prices
      .filter((p) => p.symbol === symbol && p.priceCents != null)
      .map((p) => ({ asOf: p.asOf, priceCents: p.priceCents as number }));
    return calculateCashFlowMatchedBenchmark({
      symbol,
      cashFlows,
      prices,
      asOf: portfolio.currentValuationAt,
    });
  });

  const episodes = [...episodesFile.episodes].sort(
    (a, b) => a.episodeNumber - b.episodeNumber,
  );
  const latestEpisode = episodes[episodes.length - 1] ?? null;
  const pendingYoutubeEpisodes = unmatchedSeriesVideos({
    feed: youtubeFeed,
    episodes,
  });

  const closes = marketObservations.observations
    .filter((o) => o.valuationType === "market_close")
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const opens = marketObservations.observations
    .filter((o) => o.valuationType === "market_open")
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const inception = marketObservations.observations.find(
    (o) => o.valuationType === "inception",
  );
  const latestClose = closes[closes.length - 1] ?? null;
  const previousClose = closes.length >= 2 ? closes[closes.length - 2]! : null;
  const latestOpen = opens[opens.length - 1] ?? null;
  const sessionComparison = buildSessionComparison({
    previous: previousClose,
    latest: latestClose,
  });

  const bpsByTicker = new Map<string, typeof issuerBpsHistory.observations>();
  for (const obs of issuerBpsHistory.observations) {
    const list = bpsByTicker.get(obs.ticker) ?? [];
    list.push(obs);
    bpsByTicker.set(obs.ticker, list);
  }
  const issuerBpsLatest = [...bpsByTicker.entries()].map(([ticker, list]) => {
    const sorted = [...list].sort(
      (a, b) => Date.parse(a.asOf) - Date.parse(b.asOf),
    );
    const latest = sorted[sorted.length - 1]!;
    const previous = sorted.length >= 2 ? sorted[sorted.length - 2]! : null;
    const latestPref = preferDilutedSatsPerShare({
      reportedSatsPerDilutedShare: latest.reportedSatsPerDilutedShare,
      calculatedSatsPerDilutedShare: latest.calculatedSatsPerDilutedShare,
    });
    const previousPref = previous
      ? preferDilutedSatsPerShare({
          reportedSatsPerDilutedShare: previous.reportedSatsPerDilutedShare,
          calculatedSatsPerDilutedShare: previous.calculatedSatsPerDilutedShare,
        })
      : { satsPerShare: null, status: "unavailable" as const };
    const delta = changeBetweenObservations(
      previousPref.satsPerShare,
      latestPref.satsPerShare,
    );
    return {
      ticker,
      issuer: latest.issuer,
      latest,
      previous,
      dilutedSatsPerShare: latestPref.satsPerShare,
      status: latestPref.status,
      change: delta.change,
      changePct: delta.changePct,
      observationCount: sorted.length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    site: {
      siteName: site.siteName,
      siteTitle: site.siteTitle,
      siteDescription: site.siteDescription,
      youtubeChannelUrl: site.youtubeChannelUrl,
      xUrl: site.xUrl,
      timezone: site.timezone,
    },
    portfolio: {
      series: portfolio.series,
      dataQuality: portfolio.dataQuality,
      inceptionValuationAt: portfolio.inceptionValuationAt,
      currentValuationAt: portfolio.currentValuationAt,
      startingPortfolioValueCents: portfolio.startingPortfolioValueCents,
      currentPortfolioValueCents: portfolio.currentPortfolioValueCents,
      cashBalanceCents: portfolio.cashBalanceCents,
      positions: portfolio.positions,
      notes: portfolio.notes,
      contributions,
      performance,
      afterHours: portfolio.afterHours ?? null,
    },
    lookThrough: {
      asOf: portfolio.currentValuationAt,
      totalLookThroughSats: lookThrough.totalLookThroughSats,
      positions: lookThrough.positions,
      metrics: issuerMetrics.metrics,
    },
    reserve: {
      asOf: portfolio.currentValuationAt,
      publicSupportAddress: reserve.publicSupportAddress,
      publicSupportQrUrl: reserve.publicSupportQrUrl,
      summary: reserveSummary,
      estimatedValueCents: reserveValueCents,
      transactions: reserve.transactions.map((tx) => ({
        id: tx.id,
        timestamp: tx.timestamp,
        category: tx.category,
        sats: tx.sats,
        displayName: tx.displayName ?? null,
        episodeNumber: tx.episodeNumber,
        publicNote: tx.publicNote,
      })),
    },
    donations: {
      bitcoin: donations.bitcoin,
      fiat: donations.fiat,
      bitcoinLeaderboard: buildBitcoinLeaderboard(donations.bitcoin),
      fiatLeaderboard: buildFiatLeaderboard(donations.fiat),
    },
    valuationHistory: {
      points: valuationHistory.points,
      series: buildValuationChartSeries({
        points: valuationHistory.points,
        transactions: transactionsFile.transactions,
      }),
      hasBenchmarkPrices: valuationHistoryHasBenchmarkPrices(valuationHistory.points),
    },
    marketObservations: {
      observations: marketObservations.observations,
      notes: marketObservations.notes,
      inception: inception ?? null,
      latestOfficialClose: latestClose,
      latestMarketOpen: latestOpen,
      previousOfficialClose: previousClose,
      sessionComparison,
    },
    issuerBitcoinPerShare: {
      observations: issuerBpsHistory.observations,
      notes: issuerBpsHistory.notes,
      latestByTicker: issuerBpsLatest,
    },
    incomeModel: {
      asOf: incomeModel.asOf,
      wholeSharesOnly: incomeModel.wholeSharesOnly,
      notes: incomeModel.notes,
      illustrativePreset: incomeModel.illustrativePreset,
      scenarioPresets: incomeModel.scenarioPresets,
      mstrDefaults: incomeModel.mstrDefaults ?? null,
      defaultHorizonYears: incomeModel.defaultHorizonYears,
      defaultRiskFreeRate: incomeModel.defaultRiskFreeRate,
      defaultInflationRate: incomeModel.defaultInflationRate,
      minHistoryObservations: incomeModel.minHistoryObservations,
      allocation: incomeModel.securities,
      excludedCashCents: incomeModel.excludedCashCents,
      milestonesMonthlyCents: incomeModel.milestonesMonthlyCents,
      catalog: incomeSecurities,
      history: incomeHistory,
      result: income,
    },
    benchmarks: {
      asOf: portfolio.currentValuationAt,
      cashFlowMatched,
      prices: marketPrices.prices,
    },
    episodes,
    latestEpisode,
    youtubeFeed: {
      retrievedAt: youtubeFeed.retrievedAt,
      channelUrl: youtubeFeed.channelUrl,
      seriesStartPublishedAt: youtubeFeed.seriesStartPublishedAt,
      videos: youtubeFeed.videos,
      pendingSeriesVideos: pendingYoutubeEpisodes,
      notes: youtubeFeed.notes,
    },
    transactions: transactionsFile.transactions,
  };
}

export type PublicDashboard = ReturnType<typeof buildPublicDashboard>;
