import { describe, expect, it } from "vitest";
import { computeOfficialPortfolioMark } from "@/lib/quotes/official-close";
import {
  buildMarketObservation,
  buildValuationHistoryPoint,
  observationAlreadyExists,
} from "@/lib/quotes/append-market-close";
import {
  etFourPmOffsetStamp,
  etWeekdaysAfterThrough,
  latestCompletedEquitySessionDay,
  previousEtWeekday,
} from "@/lib/market/session-close";
import type { PortfolioData } from "@/lib/schemas/portfolio";
import type { OfficialCloseSnapshot } from "@/lib/quotes/official-close";

const fixturePortfolio: PortfolioData = {
  series: "Fiat Freedom Portfolio",
  inceptionEpisodeNumber: 1,
  inceptionPublishedAt: "2026-09-16T08:00:00-04:00",
  inceptionValuationAt: "2026-09-16T08:00:00-04:00",
  startingPortfolioValueCents: 199991,
  currentValuationAt: "2026-09-21T16:00:00-04:00",
  currentPortfolioValueCents: 256748,
  cashBalanceCents: 0,
  dataQuality: "confirmed",
  notes: [],
  positions: [
    {
      ticker: "MSTR",
      name: "Strategy",
      assetClass: "common_equity",
      shares: 12.12,
      lookThroughEligible: true,
      priceCents: 16850,
      marketValueCents: 204222,
      costBasisCents: null,
    },
    {
      ticker: "ASST",
      name: "Strive",
      assetClass: "common_equity",
      shares: 13.7,
      lookThroughEligible: true,
      priceCents: 3033,
      marketValueCents: 41552,
      costBasisCents: null,
    },
    {
      ticker: "MPJPY",
      name: "Metaplanet ADR",
      assetClass: "adr_common_equity",
      shares: 59,
      lookThroughEligible: true,
      adrRatio: 1,
      priceCents: 186,
      marketValueCents: 10974,
      costBasisCents: null,
    },
  ],
};

describe("official close session helpers", () => {
  it("formats offset stamps matching stored close rows", () => {
    expect(etFourPmOffsetStamp("2026-09-21")).toBe("2026-09-21T16:00:00-04:00");
  });

  it("lists missing weekdays for catch-up", () => {
    expect(etWeekdaysAfterThrough("2026-09-21", "2026-09-23")).toEqual([
      "2026-09-22",
      "2026-09-23",
    ]);
  });

  it("skips weekends when walking backward", () => {
    expect(previousEtWeekday("2026-09-21")).toBe("2026-09-18");
  });

  it("uses prior weekday before the equity close", () => {
    // Wednesday Sep 23, 2026 10:00 a.m. ET
    expect(
      latestCompletedEquitySessionDay(new Date("2026-09-23T14:00:00.000Z")),
    ).toBe("2026-09-22");
    // Wednesday Sep 23, 2026 5:00 p.m. ET
    expect(
      latestCompletedEquitySessionDay(new Date("2026-09-23T21:00:00.000Z")),
    ).toBe("2026-09-23");
  });
});

describe("official portfolio mark", () => {
  it("reconciles Sep 21 fixture shares × closes", () => {
    const mark = computeOfficialPortfolioMark({
      portfolio: fixturePortfolio,
      closes: { MSTR: 16850, ASST: 3033, MPJPY: 186 },
    });
    expect(mark.missing).toEqual([]);
    expect(mark.portfolioValueCents).toBe(256748);
  });

  it("fails closed when a holding close is missing", () => {
    const mark = computeOfficialPortfolioMark({
      portfolio: fixturePortfolio,
      closes: { MSTR: 16850, ASST: 3033 },
    });
    expect(mark.missing).toEqual(["MPJPY"]);
  });

  it("never includes reserve or income capital in the mark", () => {
    const mark = computeOfficialPortfolioMark({
      portfolio: fixturePortfolio,
      closes: { MSTR: 16850, ASST: 3033, MPJPY: 186 },
    });
    expect(mark.portfolioValueCents).toBe(
      Math.round(12.12 * 16850) + Math.round(13.7 * 3033) + Math.round(59 * 186),
    );
  });
});

describe("append builders", () => {
  const snapshot: OfficialCloseSnapshot = {
    sessionDay: "2026-09-22",
    asOf: "2026-09-22T16:00:00-04:00",
    retrievedAt: "2026-09-23T01:00:00.000Z",
    prices: {
      BTCUSD: 8700000,
      MSTR: 17000,
      ASST: 3100,
      MPJPY: 190,
      SPY: 77400,
      GLD: 39900,
    },
    sources: {
      BTCUSD: {
        symbol: "BTCUSD",
        priceCents: 8700000,
        sourceName: "Coinbase Exchange BTC-USD 1-minute candle",
        sourceUrl: "https://api.exchange.coinbase.com/products/BTC-USD/candles",
        observedAt: "2026-09-22T20:00:00.000Z",
        retrievedAt: "2026-09-23T01:00:00.000Z",
        fallbackUsed: false,
        note: "Exact 4:00 p.m. Eastern one-minute candle close $87,000.00",
      },
      MSTR: {
        symbol: "MSTR",
        priceCents: 17000,
        sourceName: "Yahoo Finance chart unadjusted daily close",
        sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/MSTR?interval=1d&range=1mo",
        observedAt: "2026-09-22T16:00:00-04:00",
        retrievedAt: "2026-09-23T01:00:00.000Z",
        fallbackUsed: false,
        note: "Unadjusted regular-session close $170.00",
      },
      ASST: {
        symbol: "ASST",
        priceCents: 3100,
        sourceName: "Yahoo Finance chart unadjusted daily close",
        sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/ASST?interval=1d&range=1mo",
        observedAt: "2026-09-22T16:00:00-04:00",
        retrievedAt: "2026-09-23T01:00:00.000Z",
        fallbackUsed: false,
        note: "Unadjusted regular-session close $31.00",
      },
      MPJPY: {
        symbol: "MPJPY",
        priceCents: 190,
        sourceName: "Yahoo Finance chart unadjusted daily close",
        sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/MPJPY?interval=1d&range=1mo",
        observedAt: "2026-09-22T16:00:00-04:00",
        retrievedAt: "2026-09-23T01:00:00.000Z",
        fallbackUsed: false,
        note: "Unadjusted regular-session close $1.90",
      },
      SPY: {
        symbol: "SPY",
        priceCents: 77400,
        sourceName: "Yahoo Finance chart unadjusted daily close",
        sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1d&range=1mo",
        observedAt: "2026-09-22T16:00:00-04:00",
        retrievedAt: "2026-09-23T01:00:00.000Z",
        fallbackUsed: false,
        note: "Unadjusted regular-session close $774.00",
      },
      GLD: {
        symbol: "GLD",
        priceCents: 39900,
        sourceName: "Yahoo Finance chart unadjusted daily close",
        sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/GLD?interval=1d&range=1mo",
        observedAt: "2026-09-22T16:00:00-04:00",
        retrievedAt: "2026-09-23T01:00:00.000Z",
        fallbackUsed: false,
        note: "Unadjusted regular-session close $399.00",
      },
    },
    portfolioValueCents: 260000,
    netExternalContributionsCents: 199991,
    investmentPnLCents: 60009,
    positionMarks: [
      { ticker: "MSTR", shares: 12.12, priceCents: 17000, marketValueCents: 206040 },
      { ticker: "ASST", shares: 13.7, priceCents: 3100, marketValueCents: 42470 },
      { ticker: "MPJPY", shares: 59, priceCents: 190, marketValueCents: 11210 },
    ],
    reconciliationNote: "Official market-close snapshot.",
  };

  it("marks automated valuation history as manual:false", () => {
    expect(buildValuationHistoryPoint(snapshot).manual).toBe(false);
  });

  it("detects existing observations for idempotency", () => {
    const obs = buildMarketObservation(snapshot);
    expect(observationAlreadyExists([obs], "2026-09-22")).toBe(true);
    expect(observationAlreadyExists([obs], "2026-09-23")).toBe(false);
  });
});
