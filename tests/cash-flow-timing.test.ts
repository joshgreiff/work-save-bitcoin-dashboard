import { describe, expect, it } from "vitest";
import { calculateCashFlowMatchedBenchmark, extractExternalCashFlows } from "@/lib/accounting/benchmarks";
import {
  calculateInvestmentPnL,
  capitalAdjustedStartingValue,
  latestExternalCashFlowAt,
  netExternalCashFlowBetween,
  sharesHeldAt,
  summarizeContributions,
  transactionsAfter,
  transactionsThrough,
} from "@/lib/accounting/portfolio";
import {
  buildSessionComparison,
  flowAdjustedPortfolioIndex,
  flowAdjustedPortfolioReturn,
} from "@/lib/accounting/session-comparison";
import { buildValuationChartSeries } from "@/lib/accounting/valuation-history";
import type { SynchronizedMarketObservation } from "@/lib/schemas/market-observations";
import type { PortfolioTransaction } from "@/lib/schemas/transactions";
import type { ValuationHistoryPoint } from "@/lib/schemas/valuation-history";

const FUNDING: PortfolioTransaction = {
  id: "fund",
  timestamp: "2026-09-16T08:00:00-04:00",
  category: "initial_funding",
  amountCents: 200000,
  externalCashFlow: true,
};
const LATER_CONTRIBUTION: PortfolioTransaction = {
  id: "add",
  timestamp: "2026-10-02T14:39:00-04:00",
  category: "personal_contribution",
  amountCents: 15837,
  externalCashFlow: true,
};
const LATER_BUY: PortfolioTransaction = {
  id: "buy",
  timestamp: "2026-10-02T14:39:00-04:00",
  category: "security_purchase",
  ticker: "SPCX",
  shares: 1,
  priceCents: 15837,
  amountCents: 15837,
  externalCashFlow: false,
};
const TXS = [FUNDING, LATER_CONTRIBUTION, LATER_BUY];

function point(id: string, asOf: string, value: number, btc: number): ValuationHistoryPoint {
  return {
    id,
    asOf,
    session: "close",
    valuationType: "market_close",
    portfolioValueCents: value,
    prices: { BTCUSD: btc, SPY: 70000, GLD: 38000 },
    manual: false,
  };
}

function close(id: string, timestamp: string, value: number): SynchronizedMarketObservation {
  return {
    id,
    timestamp,
    timezone: "America/New_York",
    valuationType: "market_close",
    prices: { BTCUSD: 8000000, MSTR: 15000, ASST: 3000, MPJPY: 190, SPY: 70000, GLD: 38000 },
    sources: { BTCUSD: null, MSTR: null, ASST: null, MPJPY: null, SPY: null, GLD: null },
    portfolioValueCents: value,
    netExternalContributionsCents: null,
  };
}

describe("transaction windows", () => {
  it("splits transactions at a valuation timestamp", () => {
    expect(transactionsThrough(TXS, "2026-10-01T16:00:00-04:00")).toEqual([FUNDING]);
    expect(transactionsAfter(TXS, "2026-10-01T16:00:00-04:00")).toEqual([
      LATER_CONTRIBUTION,
      LATER_BUY,
    ]);
    expect(transactionsThrough(TXS, "2026-10-02T16:00:00-04:00")).toHaveLength(3);
  });

  it("sums only external cash flow inside (after, through]", () => {
    expect(
      netExternalCashFlowBetween(TXS, "2026-10-01T16:00:00-04:00", "2026-10-02T16:00:00-04:00"),
    ).toBe(15837);
    expect(netExternalCashFlowBetween(TXS, "2026-10-01T16:00:00-04:00")).toBe(15837);
    expect(
      netExternalCashFlowBetween(TXS, "2026-09-30T16:00:00-04:00", "2026-10-01T16:00:00-04:00"),
    ).toBe(0);
  });

  it("derives shares held at an earlier close from later trades", () => {
    const spcx = { ticker: "SPCX", shares: 1 };
    expect(sharesHeldAt(spcx, TXS, "2026-10-01T16:00:00-04:00")).toBe(0);
    expect(sharesHeldAt(spcx, TXS, "2026-10-02T16:00:00-04:00")).toBe(1);
    expect(sharesHeldAt({ ticker: "MSTR", shares: 12.12 }, TXS, "2026-10-01T16:00:00-04:00")).toBe(
      12.12,
    );
  });
});

describe("capital-adjusted starting value", () => {
  const base = {
    startingPortfolioValueCents: 200000,
    inceptionAt: "2026-09-16T08:00:00-04:00",
    transactions: TXS,
  };

  it("adds net capital after inception without double-counting initial funding", () => {
    expect(capitalAdjustedStartingValue(base)).toEqual({
      startingPortfolioValueCents: 200000,
      netCapitalAddedCents: 15837,
      adjustedStartingValueCents: 215837,
    });
    expect(
      capitalAdjustedStartingValue({ ...base, through: "2026-10-01T16:00:00-04:00" })
        .adjustedStartingValueCents,
    ).toBe(200000);
  });

  it("leaves current value minus adjusted start equal to investment P&L", () => {
    const value = 230000;
    const pnl = calculateInvestmentPnL({
      currentPortfolioValueCents: value,
      totalExternalContributionsCents: summarizeContributions(TXS).totalExternalContributionsCents,
    });
    expect(value - capitalAdjustedStartingValue(base).adjustedStartingValueCents).toBe(pnl);
  });

  it("dates contributions by the latest external cash flow", () => {
    expect(latestExternalCashFlowAt(TXS)).toBe("2026-10-02T14:39:00-04:00");
    expect(latestExternalCashFlowAt([LATER_BUY])).toBeNull();
  });
});

describe("valuation history chart", () => {
  it("does not restate earlier P&L when a later contribution is recorded", () => {
    const points = [
      point("a", "2026-09-30T16:00:00-04:00", 240000, 8000000),
      point("b", "2026-10-02T16:00:00-04:00", 255837, 8000000),
    ];
    const withoutLater = buildValuationChartSeries({ points, transactions: [FUNDING] });
    const withLater = buildValuationChartSeries({ points, transactions: TXS });
    expect(withLater[0]!.portfolioReturn).toBe(withoutLater[0]!.portfolioReturn);
    expect(withLater[0]!.cashFlowBtc).toBe(withoutLater[0]!.cashFlowBtc);
    expect(withLater[1]!.portfolioReturn).toBeCloseTo(40000 / 215837, 10);
  });
});

describe("cash-flow-matched benchmark", () => {
  it("ignores contributions after the valuation timestamp", () => {
    const prices = [
      { asOf: "2026-09-16T08:00:00-04:00", priceCents: 10000 },
      { asOf: "2026-10-01T16:00:00-04:00", priceCents: 12000 },
    ];
    const result = calculateCashFlowMatchedBenchmark({
      symbol: "BTCUSD",
      cashFlows: extractExternalCashFlows(TXS),
      prices,
      asOf: "2026-10-01T16:00:00-04:00",
    });
    expect(result.units).toBe(20);
    expect(result.valueCents).toBe(240000);
  });
});

describe("day-over-day portfolio return", () => {
  it("excludes new money that arrived inside the window", () => {
    expect(flowAdjustedPortfolioReturn(237106, 237106 + 15837, 15837)).toBe(0);
    const comparison = buildSessionComparison({
      previous: close("p", "2026-10-01T16:00:00-04:00", 237106),
      latest: close("l", "2026-10-02T16:00:00-04:00", 237106 + 15837),
      netExternalCashFlowCents: 15837,
    });
    expect(comparison.assets.find((a) => a.symbol === "Actual portfolio")?.sessionReturn).toBe(0);
  });

  it("chain-links a cumulative index that matches raw values when there are no flows", () => {
    const closes = [
      close("a", "2026-09-30T16:00:00-04:00", 200000),
      close("b", "2026-10-01T16:00:00-04:00", 210000),
      close("c", "2026-10-02T16:00:00-04:00", 210000 + 15837),
    ];
    const index = flowAdjustedPortfolioIndex(closes, (after, through) =>
      netExternalCashFlowBetween(TXS, after, through),
    );
    expect(index.get("a")).toBe(0);
    expect(index.get("b")).toBeCloseTo(0.05, 12);
    expect(index.get("c")).toBeCloseTo(0.05, 12);
  });
});
