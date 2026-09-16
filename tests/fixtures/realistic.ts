import type { PortfolioTransaction } from "@/lib/schemas/transactions";
import type { IncomeModel } from "@/lib/schemas/income-model";
import type { EpisodeSnapshot } from "@/lib/schemas/episodes";
import type { ReserveTransaction } from "@/lib/schemas/reserve";

export const fixtureTransactions: PortfolioTransaction[] = [
  {
    id: "fx-initial",
    timestamp: "2026-09-16T12:00:00-04:00",
    category: "initial_funding",
    amountCents: 199991,
    externalCashFlow: true,
    episodeNumber: 1,
  },
  {
    id: "fx-buy-mstr",
    timestamp: "2026-09-16T12:05:00-04:00",
    category: "security_purchase",
    ticker: "MSTR",
    shares: 12.12,
    priceCents: 10000,
    amountCents: 121200,
    externalCashFlow: false,
    episodeNumber: 1,
  },
  {
    id: "fx-personal",
    timestamp: "2026-09-17T10:00:00-04:00",
    category: "personal_contribution",
    amountCents: 50000,
    externalCashFlow: true,
    episodeNumber: 2,
  },
  {
    id: "fx-dividend",
    timestamp: "2026-09-17T11:00:00-04:00",
    category: "dividend",
    ticker: "MPJPY",
    amountCents: 2500,
    externalCashFlow: false,
    episodeNumber: 2,
  },
];

export const fixtureReserve: ReserveTransaction[] = [
  {
    id: "fx-reserve-1",
    timestamp: "2026-09-17T12:00:00-04:00",
    category: "contribution_received",
    sats: 25000,
    episodeNumber: 2,
    publicNote: "Channel support",
    affectsPortfolioPerformance: false,
  },
];

export const fixtureIncomeModel: IncomeModel = {
  asOf: "2026-09-17T16:00:00-04:00",
  wholeSharesOnly: false,
  excludedCashCents: 0,
  milestonesMonthlyCents: [1000, 2500, 10000, 50000, 100000],
  securities: [
    {
      ticker: "PFFA",
      targetAllocationBps: 6000,
      priceCents: 2000,
      annualDistributionCentsPerShare: 160,
    },
    {
      ticker: "JEPQ",
      targetAllocationBps: 4000,
      priceCents: 5000,
      annualDistributionCentsPerShare: 450,
    },
  ],
  notes: [],
};

export const fixtureEpisodes: EpisodeSnapshot[] = [
  {
    episodeNumber: 1,
    slug: "episode-1",
    title: "Episode 1",
    publishedAt: "2026-09-16T12:00:00-04:00",
    valuationAt: "2026-09-16T16:00:00-04:00",
    portfolioValueCents: 199991,
    cashBalanceCents: 0,
    cumulativeContributionsCents: 199991,
    cumulativeWithdrawalsCents: 0,
    cumulativeIncomeCents: 0,
    investmentPnLCents: 0,
    positions: [
      {
        ticker: "MSTR",
        shares: 12.12,
        priceCents: 10000,
        marketValueCents: 121200,
        assetClass: "common_equity",
        lookThroughEligible: true,
      },
    ],
    benchmarks: [
      { symbol: "BTCUSD", label: "Bitcoin", priceCents: 6000000, units: 0.033331833, valueCents: 199991 },
      { symbol: "SPY", label: "SPY", priceCents: 50000, units: 3.99982, valueCents: 199991 },
      { symbol: "GLD", label: "GLD", priceCents: 20000, units: 9.99955, valueCents: 199991 },
    ],
  },
  {
    episodeNumber: 2,
    slug: "episode-2",
    title: "Episode 2",
    publishedAt: "2026-09-17T12:00:00-04:00",
    valuationAt: "2026-09-17T16:00:00-04:00",
    portfolioValueCents: 255000,
    cashBalanceCents: 2500,
    cumulativeContributionsCents: 249991,
    cumulativeWithdrawalsCents: 0,
    cumulativeIncomeCents: 2500,
    investmentPnLCents: 5009,
    positions: [
      {
        ticker: "MSTR",
        shares: 12.12,
        priceCents: 11000,
        marketValueCents: 133320,
        assetClass: "common_equity",
        lookThroughEligible: true,
      },
    ],
    benchmarks: [
      { symbol: "BTCUSD", label: "Bitcoin", priceCents: 6100000, units: null, valueCents: null },
      { symbol: "SPY", label: "SPY", priceCents: 50500, units: null, valueCents: null },
      { symbol: "GLD", label: "GLD", priceCents: 20100, units: null, valueCents: null },
    ],
  },
];
