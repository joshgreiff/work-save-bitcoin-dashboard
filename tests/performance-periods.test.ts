import { describe, expect, it } from "vitest";
import {
  buildPerformancePeriods,
  type PerformanceClose,
} from "@/lib/accounting/performance-periods";
import { loadMarketObservations, loadPortfolio, loadTransactions } from "@/lib/data/load";
import type { PortfolioTransaction } from "@/lib/schemas/transactions";

const TXS: PortfolioTransaction[] = [
  {
    id: "fund",
    timestamp: "2026-09-16T08:00:00-04:00",
    category: "initial_funding",
    amountCents: 100000,
    externalCashFlow: true,
  },
  {
    id: "buy-a",
    timestamp: "2026-09-16T08:00:00-04:00",
    category: "security_purchase",
    ticker: "AAA",
    shares: 10,
    priceCents: null,
    amountCents: null,
    externalCashFlow: false,
  },
  {
    id: "add",
    timestamp: "2026-10-02T14:39:00-04:00",
    category: "personal_contribution",
    amountCents: 5000,
    externalCashFlow: true,
  },
  {
    id: "buy-b",
    timestamp: "2026-10-02T14:39:00-04:00",
    category: "security_purchase",
    ticker: "BBB",
    shares: 1,
    priceCents: 5000,
    amountCents: 5000,
    externalCashFlow: false,
  },
];

function close(timestamp: string, a: number, b: number | null, btc: number): PerformanceClose {
  const value = 10 * a + (b == null ? 0 : b);
  return {
    id: timestamp,
    timestamp,
    portfolioValueCents: value,
    prices: { AAA: a, BBB: b, BTCUSD: btc, SPY: 50000, GLD: 30000 },
  };
}

const CLOSES = [
  close("2026-09-16T16:00:00-04:00", 10000, null, 8000000),
  close("2026-09-25T16:00:00-04:00", 11000, null, 8100000),
  close("2026-09-30T16:00:00-04:00", 12000, null, 8200000),
  close("2026-10-01T16:00:00-04:00", 12500, null, 8300000),
  close("2026-10-02T16:00:00-04:00", 13000, 5200, 8400000),
];
const POSITIONS = [
  { ticker: "AAA", shares: 10 },
  { ticker: "BBB", shares: 1 },
];
const OFFICIAL_END = {
  asOf: CLOSES.at(-1)!.timestamp,
  live: false,
  portfolioValueCents: CLOSES.at(-1)!.portfolioValueCents!,
  prices: CLOSES.at(-1)!.prices,
};

function run(end = OFFICIAL_END) {
  const periods = buildPerformancePeriods({
    closes: CLOSES,
    inception: { asOf: "2026-09-16T08:00:00-04:00", portfolioValueCents: 100000 },
    positions: POSITIONS,
    transactions: TXS,
    end,
  });
  return Object.fromEntries(periods.map((p) => [p.id, p]));
}

describe("time-frame performance", () => {
  it("picks 1 day, 1 week, and month-to-date starts from official closes", () => {
    const p = run();
    expect(p["1d"]!.startAt).toBe("2026-10-01T16:00:00-04:00");
    expect(p["1w"]!.startAt).toBe("2026-09-25T16:00:00-04:00");
    expect(p.mtd!.startAt).toBe("2026-09-30T16:00:00-04:00");
    expect(p.inception!.startAt).toBe("2026-09-16T08:00:00-04:00");
  });

  it("excludes new money from the window return and the dollar change", () => {
    const day = run()["1d"]!;
    // 125000 → 135200 with 5000 of new money: (135200 − 5000) / 125000 − 1
    expect(day.portfolioReturn).toBeCloseTo(130200 / 125000 - 1, 12);
    expect(day.portfolioChangeCents).toBe(5200);
  });

  it("attributes the change to holdings, using purchase price for shares bought in the window", () => {
    const day = run()["1d"]!;
    expect(day.holdings.map((h) => [h.ticker, h.contributionCents, h.boughtInWindow])).toEqual([
      ["AAA", 5000, false],
      ["BBB", 200, true],
    ]);
    expect(day.unattributedCents).toBe(0);
    expect(day.benchmarks.BTCUSD).toBeCloseTo(8400000 / 8300000 - 1, 12);
  });

  it("matches the headline since-inception return and reports the pre-close move as unattributed", () => {
    const all = run().inception!;
    // P&L: 135200 − 105000 contributions
    expect(all.portfolioChangeCents).toBe(30200);
    expect(all.portfolioReturn).toBeCloseTo(30200 / 105000, 12);
    // Holdings from the first close: AAA 10 × (130 − 100) = 30000, BBB 200
    expect(all.unattributedCents).toBe(0);
    expect(all.method).toBe("contribution_adjusted");
  });

  it("adds a live leg after the latest close and counts flows recorded to date", () => {
    const p = run({
      asOf: "2026-10-05T10:30:00-04:00",
      live: true,
      portfolioValueCents: 10 * 13650 + 5100,
      prices: { AAA: 13650, BBB: 5100, BTCUSD: 8484000, SPY: 50500, GLD: 30000 },
    });
    expect(p["1d"]!.startAt).toBe("2026-10-02T16:00:00-04:00");
    expect(p["1d"]!.portfolioReturn).toBeCloseTo(141600 / 135200 - 1, 12);
    expect(p["1w"]!.startAt).toBe("2026-09-25T16:00:00-04:00");
    expect(p["1w"]!.holdings.find((h) => h.ticker === "BBB")?.contributionCents).toBe(100);
  });
});

describe("time-frame performance on published data", () => {
  it("reconciles holdings to the official dollar change in every window", () => {
    const portfolio = loadPortfolio();
    const closes = loadMarketObservations()
      .observations.filter((o) => o.valuationType === "market_close")
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const latest = closes.at(-1)!;
    const periods = buildPerformancePeriods({
      closes,
      inception: {
        asOf: portfolio.inceptionValuationAt,
        portfolioValueCents: portfolio.startingPortfolioValueCents,
      },
      positions: portfolio.positions,
      transactions: loadTransactions().transactions,
      end: {
        asOf: latest.timestamp,
        live: false,
        portfolioValueCents: latest.portfolioValueCents!,
        prices: latest.prices,
      },
    });
    expect(periods.map((p) => p.id)).toEqual(["1d", "1w", "mtd", "inception"]);
    for (const p of periods) {
      const attributed = p.holdings.reduce((s, h) => s + (h.contributionCents ?? 0), 0);
      expect(attributed + (p.unattributedCents ?? 0)).toBe(p.portfolioChangeCents);
      if (p.id !== "inception") expect(Math.abs(p.unattributedCents ?? 0)).toBeLessThanOrEqual(5);
    }
  });
});
