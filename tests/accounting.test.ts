import { describe, expect, it } from "vitest";
import {
  calculateInvestmentPnL,
  calculatePortfolioPerformance,
  summarizeContributions,
} from "@/lib/accounting/portfolio";
import { calculateLookThroughSats, calculatePositionLookThrough } from "@/lib/accounting/lookthrough";
import { summarizeReserve } from "@/lib/accounting/reserve";
import { calculateIncomeModel } from "@/lib/accounting/income-model";
import {
  calculateCashFlowMatchedBenchmark,
  extractExternalCashFlows,
} from "@/lib/accounting/benchmarks";
import { formatSats, formatUsdFromCents } from "@/lib/accounting/format";
import { incomeModelSchema } from "@/lib/schemas/income-model";
import { transactionsFileSchema } from "@/lib/schemas/transactions";
import { episodesFileSchema } from "@/lib/schemas/episodes";
import {
  fixtureEpisodes,
  fixtureIncomeModel,
  fixtureReserve,
  fixtureTransactions,
} from "./fixtures/realistic";

describe("portfolio accounting", () => {
  it("does not treat external contributions as investment profit", () => {
    const contributions = summarizeContributions(fixtureTransactions);
    expect(contributions.totalExternalContributionsCents).toBe(249991);
    const pnl = calculateInvestmentPnL({
      currentPortfolioValueCents: 249991,
      totalExternalContributionsCents: contributions.totalExternalContributionsCents,
    });
    expect(pnl).toBe(0);
  });

  it("treats dividends as portfolio income, not contributions", () => {
    const performance = calculatePortfolioPerformance({
      currentPortfolioValueCents: 252491,
      transactions: fixtureTransactions,
    });
    expect(performance.dividendsReceivedCents).toBe(2500);
    expect(performance.totalExternalContributionsCents).toBe(249991);
    expect(performance.investmentPnLCents).toBe(2500);
  });
});

describe("reserve separation", () => {
  it("never affects portfolio performance math", () => {
    const reserve = summarizeReserve(fixtureReserve);
    expect(reserve.currentReserveSats).toBe(25000);
    const performance = calculatePortfolioPerformance({
      currentPortfolioValueCents: 252491,
      transactions: fixtureTransactions,
    });
    expect(performance.investmentPnLCents).toBe(2500);
  });
});

describe("look-through BTC", () => {
  it("calculates shares × diluted sats per share", () => {
    expect(calculateLookThroughSats(12.12, 100_000)).toBe(1_212_000);
  });

  it("handles missing sats/share safely", () => {
    const result = calculatePositionLookThrough([
      {
        ticker: "MSTR",
        shares: 12.12,
        lookThroughEligible: true,
        dilutedSatsPerShare: null,
      },
      {
        ticker: "MPJPY",
        shares: 59,
        lookThroughEligible: false,
        dilutedSatsPerShare: 50_000,
      },
    ]);
    expect(result.totalLookThroughSats).toBeNull();
    expect(result.positions[0]?.available).toBe(false);
    expect(result.positions[1]?.available).toBe(false);
  });
});

describe("income model", () => {
  it("requires allocations totaling 100%", () => {
    const invalid = {
      ...fixtureIncomeModel,
      securities: [
        {
          ticker: "PFFA",
          targetAllocationBps: 5000,
          priceCents: 2000,
          annualDistributionCentsPerShare: 160,
        },
      ],
    };
    const parsed = incomeModelSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("calculates fractional-share income correctly", () => {
    const result = calculateIncomeModel({
      portfolioValueCents: 200000,
      model: fixtureIncomeModel,
    });
    expect(result.configured).toBe(true);
    expect(result.annualIncomeCents).toBe(16800);
    expect(result.monthlyIncomeCents).toBe(1400);
  });

  it("supports whole-share mode", () => {
    const result = calculateIncomeModel({
      portfolioValueCents: 200000,
      model: { ...fixtureIncomeModel, wholeSharesOnly: true },
    });
    // 60% -> 120000 / 2000 = 60 shares; 40% -> 80000 / 5000 = 16 shares
    expect(result.annualIncomeCents).toBe(60 * 160 + 16 * 450);
  });
});

describe("benchmarks", () => {
  it("calculates cash-flow-matched units", () => {
    const flows = extractExternalCashFlows(fixtureTransactions);
    const series = calculateCashFlowMatchedBenchmark({
      symbol: "BTCUSD",
      cashFlows: flows,
      prices: [
        { asOf: "2026-09-16T16:00:00-04:00", priceCents: 6_000_000 },
        { asOf: "2026-09-17T16:00:00-04:00", priceCents: 6_100_000 },
      ],
      asOf: "2026-09-17T16:00:00-04:00",
    });
    expect(series.available).toBe(true);
    expect(series.valueCents).toBeGreaterThan(0);
  });
});

describe("episode snapshots", () => {
  it("keeps historical values independent of later prices", () => {
    expect(fixtureEpisodes[0]?.portfolioValueCents).toBe(199991);
    expect(fixtureEpisodes[0]?.positions[0]?.priceCents).toBe(10000);
    expect(fixtureEpisodes[1]?.positions[0]?.priceCents).toBe(11000);
    expect(fixtureEpisodes[0]?.positions[0]?.priceCents).not.toBe(
      fixtureEpisodes[1]?.positions[0]?.priceCents,
    );
  });
});

describe("formatting", () => {
  it("formats currency and sats", () => {
    expect(formatUsdFromCents(199991)).toBe("$1,999.91");
    expect(formatSats(25000)).toBe("25,000 sats");
  });
});

describe("validation", () => {
  it("fails duplicate transaction ids", () => {
    const parsed = transactionsFileSchema.safeParse({
      transactions: [fixtureTransactions[0], fixtureTransactions[0]],
    });
    expect(parsed.success).toBe(false);
  });

  it("fails duplicate episode numbers", () => {
    const parsed = episodesFileSchema.safeParse({
      episodes: [fixtureEpisodes[0], { ...fixtureEpisodes[1], episodeNumber: 1, slug: "dup" }],
    });
    expect(parsed.success).toBe(false);
  });
});
