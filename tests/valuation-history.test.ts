import { describe, expect, it } from "vitest";
import {
  buildValuationChartSeries,
  valuationHistoryHasBenchmarkPrices,
} from "@/lib/accounting/valuation-history";
import { loadValuationHistory, loadTransactions } from "@/lib/data/load";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import type { ValuationHistoryPoint } from "@/lib/schemas/valuation-history";

const openCloseSeed: ValuationHistoryPoint[] = [
  {
    id: "vh-test-open",
    asOf: "2026-09-16T09:30:00-04:00",
    session: "open",
    portfolioValueCents: 199991,
    prices: { BTCUSD: null, SPY: null, GLD: null },
    sourceName: null,
    sourceUrl: null,
    retrievedAt: null,
    manual: true,
    note: null,
  },
  {
    id: "vh-test-close",
    asOf: "2026-09-16T16:00:00-04:00",
    session: "close",
    portfolioValueCents: 199692,
    prices: { BTCUSD: null, SPY: null, GLD: null },
    sourceName: null,
    sourceUrl: null,
    retrievedAt: null,
    manual: true,
    note: null,
  },
];

describe("valuation history series", () => {
  it("builds open/close portfolio dollars and contribution-adjusted returns", () => {
    const series = buildValuationChartSeries({
      points: openCloseSeed,
      transactions: loadTransactions().transactions,
    });

    expect(series).toHaveLength(2);
    expect(series[0]?.label).toMatch(/Sep 16 open/i);
    expect(series[1]?.label).toMatch(/Sep 16 close/i);
    expect(series[0]?.portfolio).toBe(1999.91);
    expect(series[1]?.portfolio).toBe(1996.92);
    expect(series[0]?.portfolioReturn).toBe(0);
    expect(series[1]?.portfolioReturn).toBeCloseTo(-299 / 199991, 10);
    expect(series[0]?.btc).toBeNull();
    expect(series[1]?.cashFlowBtc).toBeNull();
    expect(valuationHistoryHasBenchmarkPrices(openCloseSeed)).toBe(false);
  });

  it("surfaces benchmark returns only after confirmed prices exist", () => {
    const withPrices: ValuationHistoryPoint[] = [
      {
        ...openCloseSeed[0]!,
        prices: {
          BTCUSD: 11_500_000_00,
          SPY: 65_000,
          GLD: 25_000,
        },
      },
      {
        ...openCloseSeed[1]!,
        prices: {
          BTCUSD: 11_400_000_00,
          SPY: 64_800,
          GLD: 25_100,
        },
      },
    ];

    const series = buildValuationChartSeries({
      points: withPrices,
      transactions: loadTransactions().transactions,
    });

    expect(valuationHistoryHasBenchmarkPrices(withPrices)).toBe(true);
    expect(series[0]?.btcReturn).toBe(0);
    expect(series[1]?.btcReturn).toBeCloseTo(11_400_000_00 / 11_500_000_00 - 1, 10);
    expect(series[1]?.cashFlowBtc).not.toBeNull();
  });
});

describe("valuation history data wiring", () => {
  it("loads seed open/close points and exposes them on the public dashboard", () => {
    const file = loadValuationHistory();
    expect(file.points).toHaveLength(2);
    expect(file.points[0]?.portfolioValueCents).toBe(199991);
    expect(file.points[1]?.portfolioValueCents).toBe(199692);

    const dashboard = buildPublicDashboard();
    expect(dashboard.valuationHistory.series).toHaveLength(2);
    expect(dashboard.valuationHistory.hasBenchmarkPrices).toBe(false);
    expect(dashboard.valuationHistory.series[1]?.portfolio).toBe(1996.92);
  });
});
