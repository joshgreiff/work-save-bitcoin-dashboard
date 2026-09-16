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
import type { IssuerMetric } from "@/lib/schemas/issuer-metrics";
import {
  loadEpisodes,
  loadIncomeModel,
  loadIssuerMetrics,
  loadMarketPrices,
  loadPortfolio,
  loadReserve,
  loadSiteConfig,
  loadTransactions,
} from "./load";

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
  const incomeModel = loadIncomeModel();

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
        episodeNumber: tx.episodeNumber,
        publicNote: tx.publicNote,
      })),
    },
    incomeModel: {
      asOf: incomeModel.asOf,
      wholeSharesOnly: incomeModel.wholeSharesOnly,
      notes: incomeModel.notes,
      result: income,
    },
    benchmarks: {
      asOf: portfolio.currentValuationAt,
      cashFlowMatched,
      prices: marketPrices.prices,
    },
    episodes,
    latestEpisode,
    transactions: transactionsFile.transactions,
  };
}

export type PublicDashboard = ReturnType<typeof buildPublicDashboard>;
