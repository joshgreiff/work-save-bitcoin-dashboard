import { describe, expect, it } from "vitest";
import {
  amplificationMultiple,
  buildEpisodeSummary,
  buildSessionComparison,
  excessReturnPp,
  selectSynchronizedBtcCandle,
  sessionReturn,
} from "@/lib/accounting/session-comparison";
import {
  bitcoinCoinsToSats,
  calculateDilutedSatsPerShare,
  changeBetweenObservations,
  historicalLookThroughSats,
  preferDilutedSatsPerShare,
} from "@/lib/accounting/issuer-bps";
import {
  clearLivePortfolioTransient,
  getLivePortfolioTransient,
  setLivePortfolioTransient,
} from "@/lib/quotes/cache";
import { isRegularEquitySession, etFourPmIso } from "@/lib/market/session";
import { loadMarketObservations, loadValuationHistory } from "@/lib/data/load";
import type { SynchronizedMarketObservation } from "@/lib/schemas/market-observations";

function obs(
  partial: Partial<SynchronizedMarketObservation> &
    Pick<SynchronizedMarketObservation, "id" | "timestamp" | "valuationType">,
): SynchronizedMarketObservation {
  return {
    timezone: "America/New_York",
    prices: {
      BTCUSD: null,
      MSTR: null,
      ASST: null,
      MPJPY: null,
      SPY: null,
      GLD: null,
    },
    sources: {
      BTCUSD: null,
      MSTR: null,
      ASST: null,
      MPJPY: null,
      SPY: null,
      GLD: null,
    },
    portfolioValueCents: null,
    netExternalContributionsCents: null,
    ...partial,
  };
}

describe("valuation behavior", () => {
  it("keeps only one replaceable transient live portfolio mark", () => {
    clearLivePortfolioTransient();
    setLivePortfolioTransient({
      portfolioValueCents: 100,
      asOf: "a",
      retrievedAt: "a",
      positions: [],
    });
    setLivePortfolioTransient({
      portfolioValueCents: 200,
      asOf: "b",
      retrievedAt: "b",
      positions: [],
    });
    expect(getLivePortfolioTransient()?.value.portfolioValueCents).toBe(200);
    clearLivePortfolioTransient();
    expect(getLivePortfolioTransient()).toBeNull();
  });

  it("preserves Episode 1 as an inception observation", () => {
    const markets = loadMarketObservations();
    const inception = markets.observations.find((o) => o.valuationType === "inception");
    expect(inception?.portfolioValueCents).toBe(199991);
    expect(inception?.timestamp).toContain("2026-09-16T08:00:00");
    const history = loadValuationHistory();
    expect(history.points.some((p) => p.valuationType === "inception")).toBe(true);
    expect(history.points.some((p) => p.valuationType === "market_close")).toBe(true);
  });

  it("distinguishes market-open and market-close types", () => {
    const open = obs({
      id: "o",
      timestamp: "2026-09-17T09:30:00-04:00",
      valuationType: "market_open",
    });
    const close = obs({
      id: "c",
      timestamp: "2026-09-17T16:00:00-04:00",
      valuationType: "market_close",
    });
    expect(open.valuationType).not.toBe(close.valuationType);
  });
});

describe("synchronized comparisons", () => {
  it("computes excess return in percentage points", () => {
    expect(excessReturnPp(0.0481, 0.0042)).toBeCloseTo(0.0439, 6);
  });

  it("suppresses amplification when BTC move is small or opposite", () => {
    expect(amplificationMultiple(0.05, 0.001).available).toBe(false);
    expect(amplificationMultiple(0.05, -0.02).available).toBe(false);
    expect(amplificationMultiple(0.1, 0.02).multiple).toBeCloseTo(5, 6);
  });

  it("selects BTC candle at or before 4:00 p.m. ET and never later", () => {
    const target = etFourPmIso("2026-09-16");
    const targetUnix = Math.floor(Date.parse(target) / 1000);
    const result = selectSynchronizedBtcCandle({
      targetFourPmIso: target,
      candles: [
        { startUnix: targetUnix - 120, close: 100 },
        { startUnix: targetUnix - 60, close: 101 },
        { startUnix: targetUnix, close: 102 },
        { startUnix: targetUnix + 60, close: 999 },
      ],
    });
    expect(result.priceCents).toBe(10200);
    expect(result.fallbackUsed).toBe(false);

    const fallback = selectSynchronizedBtcCandle({
      targetFourPmIso: target,
      candles: [
        { startUnix: targetUnix - 60, close: 101 },
        { startUnix: targetUnix + 60, close: 999 },
      ],
    });
    expect(fallback.priceCents).toBe(10100);
    expect(fallback.fallbackUsed).toBe(true);
  });

  it("builds episode wording that matches numbers and direction", () => {
    // Undated illustrative inputs only — never pair a real portfolio date with invented prices.
    const summary = buildEpisodeSummary({
      asOf: "2099-01-02T16:00:00-05:00",
      mstrStart: 5000,
      mstrEnd: 5500,
      mstrReturn: 0.1,
      btcStart: 2000000,
      btcEnd: 2100000,
      btcReturn: 0.05,
      amplification: amplificationMultiple(0.1, 0.05),
    });
    expect(summary.available).toBe(true);
    expect(summary.text).toContain("rose");
    expect(summary.text).toContain("10.00%");
    expect(summary.text).toContain("5.00%");
    expect(summary.text).toContain("percentage points");
    expect(summary.text).not.toContain("September 16, 2026");
  });

  it("builds the real Sep 16–17 synchronized comparison from stored observations", () => {
    const markets = loadMarketObservations();
    const closes = markets.observations
      .filter((o) => o.valuationType === "market_close")
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const comparison = buildSessionComparison({
      previous: closes[0]!,
      latest: closes[1]!,
    });
    expect(comparison.available).toBe(true);
    expect(comparison.btcReturn).toBeCloseTo(7646621 / 7598071 - 1, 10);
    const mstr = comparison.assets.find((a) => a.symbol === "MSTR");
    expect(mstr?.sessionReturn).toBeCloseTo(13225 / 12618 - 1, 10);
    expect(mstr?.excessVsBtcPp).toBeCloseTo(
      13225 / 12618 - 1 - (7646621 / 7598071 - 1),
      10,
    );
    expect(comparison.episodeSummary.text).toContain("September 17, 2026");
    expect(comparison.episodeSummary.text).toContain("$126.18");
    expect(comparison.episodeSummary.text).toContain("$132.25");
    expect(comparison.episodeSummary.text).toContain("percentage points");
  });

  it("returns Exact BTC comparison pending when synchronized prices are missing", () => {
    const previous = obs({
      id: "p",
      timestamp: "2026-09-15T16:00:00-04:00",
      valuationType: "market_close",
      portfolioValueCents: 199991,
    });
    const latest = obs({
      id: "l",
      timestamp: "2026-09-16T16:00:00-04:00",
      valuationType: "market_close",
      portfolioValueCents: 199692,
    });
    const comparison = buildSessionComparison({ previous, latest });
    expect(comparison.available).toBe(false);
    expect(comparison.episodeSummary.text).toBe("Exact BTC comparison pending");
  });

  it("uses Friday-to-Monday style window via stored prior close observations", () => {
    const friday = obs({
      id: "fri",
      timestamp: "2026-09-11T16:00:00-04:00",
      valuationType: "market_close",
      prices: {
        BTCUSD: 1000000,
        MSTR: 10000,
        ASST: null,
        MPJPY: null,
        SPY: null,
        GLD: null,
      },
      portfolioValueCents: 200000,
    });
    const monday = obs({
      id: "mon",
      timestamp: "2026-09-14T16:00:00-04:00",
      valuationType: "market_close",
      prices: {
        BTCUSD: 1010000,
        MSTR: 10500,
        ASST: null,
        MPJPY: null,
        SPY: null,
        GLD: null,
      },
      portfolioValueCents: 205000,
    });
    const comparison = buildSessionComparison({ previous: friday, latest: monday });
    expect(comparison.available).toBe(true);
    expect(comparison.mode).toBe("official_close");
    expect(comparison.btcReturn).toBeCloseTo(0.01, 8);
    expect(sessionReturn(10000, 10500)).toBeCloseTo(0.05, 8);
  });

  it("uses live ending values from the prior official close when liveEnd is set", () => {
    const priorClose = obs({
      id: "close",
      timestamp: "2026-09-17T16:00:00-04:00",
      valuationType: "market_close",
      prices: {
        BTCUSD: 1000000,
        MSTR: 10000,
        ASST: 500,
        MPJPY: 200,
        SPY: null,
        GLD: null,
      },
      portfolioValueCents: 200000,
    });
    const comparison = buildSessionComparison({
      previous: priorClose,
      latest: null,
      liveEnd: {
        asOf: "2026-09-18T11:30:00-04:00",
        prices: {
          BTCUSD: 1020000,
          MSTR: 11000,
          ASST: 510,
          MPJPY: 210,
        },
        portfolioValueCents: 215000,
      },
    });
    expect(comparison.available).toBe(true);
    expect(comparison.mode).toBe("live");
    expect(comparison.endAsOf).toBe("2026-09-18T11:30:00-04:00");
    const mstr = comparison.assets.find((a) => a.symbol === "MSTR");
    expect(mstr?.startCents).toBe(10000);
    expect(mstr?.endCents).toBe(11000);
    expect(mstr?.sessionReturn).toBeCloseTo(0.1, 8);
    expect(comparison.btcReturn).toBeCloseTo(0.02, 8);
    expect(comparison.episodeSummary.text).toContain("live mark");
    expect(comparison.episodeSummary.text).toContain("prior-close-to-live");
    expect(comparison.episodeSummary.text).not.toContain("4:00 p.m.-to-4:00 p.m.");
  });
});

describe("bitcoin-per-share history", () => {
  it("calculates diluted sats/share and prefers reported figures", () => {
    const sats = bitcoinCoinsToSats(500_000);
    const calculated = calculateDilutedSatsPerShare({
      bitcoinHoldingsSats: sats,
      assumedDilutedSharesOutstanding: 250_000_000,
    });
    expect(calculated).toBeCloseTo(200_000, 6);
    expect(
      preferDilutedSatsPerShare({
        reportedSatsPerDilutedShare: 210_000,
        calculatedSatsPerDilutedShare: calculated,
      }).status,
    ).toBe("reported");
  });

  it("does not invent changes without two observations", () => {
    expect(changeBetweenObservations(null, 100).change).toBeNull();
  });

  it("uses historical shares for look-through, never inventing positions", () => {
    expect(
      historicalLookThroughSats({
        sharesHeldAtObservation: null,
        dilutedSatsPerShareAsOf: 1000,
      }),
    ).toBeNull();
    expect(
      historicalLookThroughSats({
        sharesHeldAtObservation: 12.12,
        dilutedSatsPerShareAsOf: 100_000,
        adrRatio: 1,
      }),
    ).toBeCloseTo(1_212_000, 6);
  });
});

describe("session hours helper", () => {
  it("treats weekend as outside regular equity session", () => {
    // 2026-09-19 is a Saturday
    expect(isRegularEquitySession(new Date("2026-09-19T15:00:00-04:00"))).toBe(false);
  });

  it("excludes premarket and after-hours equity windows", () => {
    // Wednesday Sep 16, 2026
    expect(isRegularEquitySession(new Date("2026-09-16T09:00:00-04:00"))).toBe(false);
    expect(isRegularEquitySession(new Date("2026-09-16T09:30:00-04:00"))).toBe(true);
    expect(isRegularEquitySession(new Date("2026-09-16T15:59:00-04:00"))).toBe(true);
    expect(isRegularEquitySession(new Date("2026-09-16T16:00:00-04:00"))).toBe(false);
    expect(isRegularEquitySession(new Date("2026-09-16T20:00:00-04:00"))).toBe(false);
  });
});
