import { describe, expect, it } from "vitest";
import {
  assertAllocationsTotal10000,
  calculateDeployableValue,
  calculateIncomeModel,
  indicatedYieldFromPrice,
  resolveAnnualDistributionCentsPerShare,
} from "@/lib/accounting/income-model";
import { projectBitcoinPrices } from "@/lib/accounting/scenario-btc";
import {
  amplifyCommonEquity,
  projectMstrNav,
} from "@/lib/accounting/scenario-mstr";
import { projectPreferredTotalReturn } from "@/lib/accounting/scenario-preferred";
import {
  calculateRiskMetrics,
  periodTotalReturnsFromPrices,
} from "@/lib/accounting/risk-metrics";
import { calculateInvestmentPnL } from "@/lib/accounting/portfolio";
import { loadIncomeModel, loadIncomeSecurities, loadPortfolio } from "@/lib/data/load";
import { incomeModelSchema } from "@/lib/schemas/income-model";
import { fixtureIncomeModel, fixtureTransactions } from "./fixtures/realistic";
import { summarizeContributions } from "@/lib/accounting/portfolio";

describe("income model lab acceptance", () => {
  it("requires allocations totaling 100%", () => {
    expect(assertAllocationsTotal10000([4000, 4000, 2000])).toBe(true);
    expect(assertAllocationsTotal10000([5000])).toBe(false);
    const invalid = {
      ...fixtureIncomeModel,
      securities: [
        {
          ticker: "STRF",
          targetAllocationBps: 5000,
          priceCents: 10000,
          annualDistributionCentsPerShare: 1000,
        },
      ],
    };
    expect(incomeModelSchema.safeParse(invalid).success).toBe(false);
  });

  it("excludes Bitcoin Reserve from deployable capital", () => {
    const portfolio = loadPortfolio();
    const deployable = calculateDeployableValue(
      portfolio.currentPortfolioValueCents,
      0,
    );
    expect(deployable).toBe(portfolio.currentPortfolioValueCents);
    // Reserve sats are a separate ledger — never added here.
    expect(deployable).toBe(208235);
  });

  it("does not treat external contributions as investment returns", () => {
    const contributions = summarizeContributions(fixtureTransactions);
    const pnl = calculateInvestmentPnL({
      currentPortfolioValueCents: contributions.totalExternalContributionsCents,
      totalExternalContributionsCents: contributions.totalExternalContributionsCents,
    });
    expect(pnl).toBe(0);
  });

  it("amplifies common equity in both directions vs fixed senior claims", () => {
    expect(
      amplifyCommonEquity({ assetValueCents: 20000, fixedSeniorClaimsCents: 5000 }),
    ).toBe(15000);
    expect(
      amplifyCommonEquity({ assetValueCents: 6000, fixedSeniorClaimsCents: 5000 }),
    ).toBe(1000);
  });

  it("lets mNAV contraction underperform Bitcoin even when Bitcoin rises", () => {
    const btc = projectBitcoinPrices({
      startingPriceCents: 10_000_000,
      horizonYears: 1,
      cagr: 0.5,
    });
    const risingBtc = btc.map((p) => p.priceCents);
    const path = projectMstrNav({
      horizonYears: 1,
      bitcoinPricesCents: risingBtc,
      startingBtcPerDilutedShare: 0.001,
      annualBtcPerShareGrowth: 0,
      startingNetSeniorClaimsPerShareCents: 0,
      annualSeniorClaimsGrowth: 0,
      startingCashPerShareCents: 0,
      startingSoftwareValuePerShareCents: 0,
      startingMnav: 2,
      terminalMnav: 1,
    });
    const btcReturn = risingBtc[1]! / risingBtc[0]! - 1;
    const mstrReturn =
      (path[1]!.projectedPriceCents as number) /
        (path[0]!.projectedPriceCents as number) -
      1;
    expect(btcReturn).toBeCloseTo(0.5, 5);
    expect(mstrReturn).toBeLessThan(btcReturn);
  });

  it("keeps BTC-per-share growth independent from Bitcoin-price growth", () => {
    const flatBtc = [10_000_000, 10_000_000];
    const path = projectMstrNav({
      horizonYears: 1,
      bitcoinPricesCents: flatBtc,
      startingBtcPerDilutedShare: 1,
      annualBtcPerShareGrowth: 0.1,
      startingNetSeniorClaimsPerShareCents: 0,
      annualSeniorClaimsGrowth: 0,
      startingCashPerShareCents: 0,
      startingSoftwareValuePerShareCents: 0,
      startingMnav: 1,
      terminalMnav: 1,
    });
    expect(path[1]!.btcPerDilutedShare).toBeCloseTo(1.1, 10);
    expect(path[1]!.bitcoinPriceCents).toBe(10_000_000);
  });

  it("uses STRF stated amount for income and market price for current yield", () => {
    const annual = resolveAnnualDistributionCentsPerShare({
      statedAmountCents: 10000,
      annualDistributionRateBps: 1000,
    });
    expect(annual).toBe(1000);
    const yieldAtPremium = indicatedYieldFromPrice({
      annualDistributionCentsPerShare: annual,
      priceCents: 11000,
    });
    expect(yieldAtPremium).toBeCloseTo(1000 / 11000, 10);
  });

  it("treats STRC variable rate as dated/editable 12% policy input", () => {
    const catalog = loadIncomeSecurities().securities.find((s) => s.ticker === "STRC");
    expect(catalog?.rateKind).toBe("variable");
    expect(catalog?.annualDistributionRateBps).toBe(1200);
    expect(catalog?.annualDistributionCentsPerShare).toBe(1200);
    expect(catalog?.ordinaryCallPriceCents).toBe(10100);
    expect(catalog?.rateAsOf).toContain("2026-07-30");
    const assumed = resolveAnnualDistributionCentsPerShare({
      statedAmountCents: 10000,
      annualDistributionRateBps: 1200,
    });
    expect(assumed).toBe(1200);
  });

  it("does not apply an ordinary par call cap to STRF", () => {
    const catalog = loadIncomeSecurities().securities.find((s) => s.ticker === "STRF");
    expect(catalog?.ordinaryCallable).toBe(false);
    expect(catalog?.cleanUpRedemption).toBe(true);
    expect(catalog?.taxRedemption).toBe(true);
    expect(catalog?.fundamentalChangeRepurchase).toBe(true);
    const open = projectPreferredTotalReturn({
      horizonYears: 5,
      startingPriceCents: 10000,
      annualDistributionCentsPerShare: 1000,
      distributionFrequencyPerYear: 4,
      terminalRequiredYield: 0.05,
      reinvestDistributions: false,
      ordinaryCallable: false,
      ordinaryCallActivated: true,
      ordinaryCallPriceCents: 10000,
    });
    expect(open.terminalPriceCents).toBeGreaterThan(10000);
  });

  it("caps terminal value with ordinary call only when activated", () => {
    const base = {
      horizonYears: 5,
      startingPriceCents: 10000,
      annualDistributionCentsPerShare: 1000,
      distributionFrequencyPerYear: 4,
      terminalRequiredYield: 0.05,
      reinvestDistributions: false,
      ordinaryCallable: true,
      ordinaryCallPriceCents: 10100,
    };
    const open = projectPreferredTotalReturn({ ...base, ordinaryCallActivated: false });
    const called = projectPreferredTotalReturn({ ...base, ordinaryCallActivated: true });
    expect(open.terminalPriceCents).toBeGreaterThan(10100);
    expect(called.terminalPriceCents).toBe(10100);
  });

  it("marks STRD as non-cumulative with fixed 10% terms", () => {
    const catalog = loadIncomeSecurities().securities.find((s) => s.ticker === "STRD");
    expect(catalog?.cumulativeKind).toBe("non_cumulative");
    expect(catalog?.annualDistributionRateBps).toBe(1000);
    expect(catalog?.projectionsEnabled).toBe(false);
  });

  it("catalogs SATA as Strive preferred with dated 13% terms", () => {
    const catalog = loadIncomeSecurities().securities.find((s) => s.ticker === "SATA");
    expect(catalog?.issuer).toBe("Strive, Inc.");
    expect(catalog?.name).toContain("Strive");
    expect(catalog?.annualDistributionRateBps).toBe(1300);
    expect(catalog?.ordinaryCallPriceCents).toBe(11000);
    expect(catalog?.distributionFrequency).toBe("business_daily");
  });

  it("reinvests distributions into fractional shares", () => {
    const result = projectPreferredTotalReturn({
      horizonYears: 1,
      startingPriceCents: 10000,
      annualDistributionCentsPerShare: 1000,
      distributionFrequencyPerYear: 1,
      terminalRequiredYield: 0.1,
      reinvestDistributions: true,
      ordinaryCallable: false,
      ordinaryCallActivated: false,
      ordinaryCallPriceCents: null,
    });
    expect(result.points[1]!.shares).toBeGreaterThan(1);
  });

  it("preserves residual cash in whole-share mode", () => {
    const result = calculateIncomeModel({
      portfolioValueCents: 25000,
      model: {
        ...fixtureIncomeModel,
        wholeSharesOnly: true,
        securities: [
          {
            ticker: "STRF",
            targetAllocationBps: 10000,
            priceCents: 10394,
            annualDistributionCentsPerShare: 1000,
          },
        ],
      },
    });
    expect(result.securities[0]?.modeledShares).toBe(2);
    expect(result.residualCashCents).toBe(25000 - 2 * 10394);
  });

  it("computes historical Sharpe from total returns and risk-free rate", () => {
    const prices = Array.from({ length: 30 }, (_, i) => 10000 + i * 10);
    const dists = prices.map(() => 50);
    const periodReturns = periodTotalReturnsFromPrices({
      pricesCents: prices,
      distributionsCents: dists,
    });
    const metrics = calculateRiskMetrics({
      periodReturns,
      wealthPath: prices,
      minObservations: 24,
      riskFreeRate: 0.04,
      periodsPerYear: 12,
      seriesKind: "historical",
    });
    expect(metrics.available).toBe(true);
    expect(metrics.sharpeRatio).not.toBeNull();
  });

  it("never treats projected assumptions as historical results", () => {
    const metrics = calculateRiskMetrics({
      periodReturns: Array.from({ length: 30 }, () => 0.01),
      minObservations: 24,
      seriesKind: "projected",
    });
    expect(metrics.available).toBe(false);
    expect(metrics.reason).toMatch(/not historical/i);
  });

  it("shows insufficient history when observations are sparse", () => {
    const metrics = calculateRiskMetrics({
      periodReturns: [0.01, 0.02],
      minObservations: 24,
      seriesKind: "historical",
    });
    expect(metrics.reason).toBe("Insufficient history");
  });

  it("handles negative common NAV without crashing", () => {
    const path = projectMstrNav({
      horizonYears: 1,
      bitcoinPricesCents: [1000, 1000],
      startingBtcPerDilutedShare: 0.0001,
      annualBtcPerShareGrowth: 0,
      startingNetSeniorClaimsPerShareCents: 1_000_000,
      annualSeniorClaimsGrowth: 0,
      startingCashPerShareCents: 0,
      startingSoftwareValuePerShareCents: 0,
      startingMnav: 2,
      terminalMnav: 2,
    });
    expect(path[0]?.negativeNav).toBe(true);
    expect(path[0]?.projectedPriceCents).toBe(0);
  });

  it("scenario / income config never mutates actual portfolio data files", () => {
    const before = loadPortfolio().currentPortfolioValueCents;
    const model = loadIncomeModel();
    calculateIncomeModel({
      portfolioValueCents: before,
      model: {
        ...model,
        securities: model.securities.map((s) => ({
          ...s,
          targetAllocationBps: s.targetAllocationBps,
        })),
      },
      deployableValueOverrideCents: 5_000_000,
    });
    expect(loadPortfolio().currentPortfolioValueCents).toBe(before);
  });
});
