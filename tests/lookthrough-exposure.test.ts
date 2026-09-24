import { describe, expect, it } from "vitest";
import {
  buildIssuerBpsChartSeries,
  bitcoinCoinsToSats,
  calculateDilutedSatsPerShare,
  calculateDilutedSatsPerShareFromCoins,
  historicalLookThroughSats,
  preferLookThroughDilutedSatsPerShare,
} from "@/lib/accounting/issuer-bps";
import {
  calculateLookThroughSats,
  calculatePositionLookThrough,
  displayDilutedSatsPerShare,
} from "@/lib/accounting/lookthrough";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { loadIssuerBpsHistory, loadIssuerMetrics, loadReserve } from "@/lib/data/load";
import { summarizeReserve } from "@/lib/accounting/reserve";
import { issuerBitcoinPerShareFileSchema } from "@/lib/schemas/issuer-bps-history";

describe("look-through bitcoin exposure (populated issuers)", () => {
  it("1. calculates MSTR current diluted sats per share from raw inputs", () => {
    const satsPerShare = calculateDilutedSatsPerShareFromCoins({
      bitcoinHoldings: 846_000,
      assumedDilutedSharesOutstanding: 450_108_000,
    });
    expect(satsPerShare).toBeCloseTo(187_954.8908, 4);
    expect(displayDilutedSatsPerShare(satsPerShare)).toBe(187_955);
  });

  it("2. calculates ASST issuer-defined assumed diluted sats per share", () => {
    const effectiveCommon = 97_002_649;
    const options = 873_224;
    const unvested = 2_268_840;
    const assumedFullyDiluted = effectiveCommon + options + unvested;
    expect(assumedFullyDiluted).toBe(100_144_713);

    const satsPerShare = calculateDilutedSatsPerShare({
      bitcoinHoldingsSats: bitcoinCoinsToSats(26_355),
      assumedDilutedSharesOutstanding: assumedFullyDiluted,
    });
    expect(satsPerShare).toBeCloseTo(26_316.9160, 4);
    expect(displayDilutedSatsPerShare(satsPerShare)).toBe(26_317);
  });

  it("3. keeps ASST traditional warrants separately disclosed and excluded", () => {
    const metrics = loadIssuerMetrics();
    const asst = metrics.metrics.find((m) => m.ticker === "ASST");
    expect(asst?.dilutionScope).toBe(
      "issuer_assumed_fully_diluted_excluding_traditional_warrants",
    );
    expect(asst?.excludedTraditionalWarrants).toBe(25_810_455);
    expect(asst?.dilutedSharesOutstanding).toBe(100_144_713);
    // Warrants must not be silently added into the issuer-defined denominator.
    expect(asst?.dilutedSharesOutstanding).not.toBe(100_144_713 + 25_810_455);
  });

  it("4. applies MPJPY 1:1 ADR ratio to look-through", () => {
    const diluted = calculateDilutedSatsPerShareFromCoins({
      bitcoinHoldings: 43_000,
      assumedDilutedSharesOutstanding: 1_500_108_824,
    });
    const withAdr = calculateLookThroughSats(59, diluted, 1);
    const withoutExplicitAdr = calculateLookThroughSats(59, diluted, null);
    expect(withAdr).toBe(withoutExplicitAdr);
    expect(withAdr).toBe(169_121);
    expect(
      historicalLookThroughSats({
        sharesHeldAtObservation: 59,
        dilutedSatsPerShareAsOf: diluted,
        adrRatio: 1,
      }),
    ).toBe(169_121);
  });

  it("5. reconciles total look-through exposure from current holdings", () => {
    const dashboard = buildPublicDashboard();
    const byTicker = Object.fromEntries(
      dashboard.lookThrough.positions.map((p) => [p.ticker, p.lookThroughSats]),
    );
    expect(byTicker.MSTR).toBe(2_278_013);
    expect(byTicker.ASST).toBe(360_542);
    expect(byTicker.MPJPY).toBe(169_121);
    expect(dashboard.lookThrough.totalLookThroughSats).toBe(2_807_676);
    expect(dashboard.lookThrough.totalLookThroughBtc).toBeCloseTo(0.02807676, 8);
    expect(dashboard.lookThrough.eligibleHoldingsCount).toBe(3);
    expect(dashboard.lookThrough.label).toBe("Analytical exposure");
  });

  it("6. uses unrounded values internally before final sat rounding", () => {
    const unrounded = 187_954.8908262017;
    const roundedDisplay = displayDilutedSatsPerShare(unrounded);
    expect(roundedDisplay).toBe(187_955);
    // Using the displayed integer would change look-through by more than dust.
    expect(calculateLookThroughSats(12.12, unrounded, 1)).toBe(2_278_013);
    expect(calculateLookThroughSats(12.12, roundedDisplay, 1)).not.toBe(2_278_013);
  });

  it("7. keeps historical rows append-only with distinct dated values", () => {
    const history = loadIssuerBpsHistory();
    const mstr = history.observations
      .filter((o) => o.ticker === "MSTR")
      .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf));
    expect(mstr.length).toBeGreaterThanOrEqual(9);
    const ids = new Set(mstr.map((o) => o.id));
    expect(ids.size).toBe(mstr.length);
    // Earlier rows must not equal the latest current value after a later append.
    const jun = mstr.find((o) => o.id === "mstr-2026-06-30");
    const sep = mstr.find((o) => o.id === "mstr-2026-09-20");
    expect(jun?.reportedSatsPerDilutedShare).toBe(210_824);
    expect(sep?.reportedSatsPerDilutedShare).toBe(187_955);
    expect(jun?.reportedSatsPerDilutedShare).not.toBe(sep?.reportedSatsPerDilutedShare);
    expect(jun?.bitcoinHoldings).toBe(846_000);
    expect(sep?.bitcoinHoldings).toBe(846_000);
  });

  it("8. renders a one-point history series safely", () => {
    const series = buildIssuerBpsChartSeries({
      observations: [
        {
          ticker: "ASST",
          asOf: "2026-09-18T16:00:00-04:00",
          reportedSatsPerDilutedShare: 26_317,
          calculatedSatsPerDilutedShare: 26_316.91600134697,
        },
      ],
      mode: "change",
      formatLabel: (asOf) => asOf.slice(0, 10),
    });
    expect(series).toHaveLength(1);
    expect(series[0]?.ASST).toBe(0);
    expect(series[0]?.asOf).toBe("2026-09-18T16:00:00-04:00");
    expect(series[0]?.label).toBe("2026-09-18");
  });

  it("9. displays unavailable rather than zero for missing metrics", () => {
    const result = calculatePositionLookThrough([
      {
        ticker: "MISSING",
        shares: 10,
        lookThroughEligible: true,
        dilutedSatsPerShare: null,
        adrRatio: 1,
      },
    ]);
    expect(result.totalLookThroughSats).toBeNull();
    expect(result.positions[0]?.lookThroughSats).toBeNull();
    expect(result.positions[0]?.available).toBe(false);
    expect(preferLookThroughDilutedSatsPerShare({
      bitcoinHoldings: null,
      bitcoinHoldingsSats: null,
      assumedDilutedSharesOutstanding: null,
      reportedSatsPerDilutedShare: null,
      calculatedSatsPerDilutedShare: null,
    }).status).toBe("unavailable");
  });

  it("10. never includes reserve sats in look-through exposure", () => {
    const dashboard = buildPublicDashboard();
    const reserve = summarizeReserve(loadReserve().transactions);
    expect(reserve.currentReserveSats).toBeGreaterThan(0);
    expect(dashboard.lookThrough.totalLookThroughSats).toBe(2_807_676);
    expect(dashboard.lookThrough.totalLookThroughSats).not.toBe(
      2_807_676 + reserve.currentReserveSats,
    );
    // Public look-through payload has no reserve fields.
    expect(
      Object.keys(dashboard.lookThrough).some((k) => k.toLowerCase().includes("reserve")),
    ).toBe(false);
  });

  it("11. never lets look-through enter actual portfolio value", () => {
    const dashboard = buildPublicDashboard();
    expect(dashboard.portfolio.currentPortfolioValueCents).toBeGreaterThan(0);
    expect(dashboard.lookThrough.totalLookThroughSats).toBe(2_807_676);
    // Portfolio performance object must not absorb look-through sats as value.
    expect(dashboard.portfolio.performance.investmentPnLCents).not.toBe(
      dashboard.lookThrough.totalLookThroughSats,
    );
    expect(dashboard.portfolio.currentPortfolioValueCents).not.toBe(
      dashboard.lookThrough.totalLookThroughSats,
    );
    // Look-through sats dwarf any plausible early portfolio cents figure.
    expect(dashboard.lookThrough.totalLookThroughSats!).toBeGreaterThan(
      dashboard.portfolio.currentPortfolioValueCents,
    );
  });

  it("12. requires every observation to contain a primary source and date", () => {
    const history = loadIssuerBpsHistory();
    expect(history.observations.length).toBeGreaterThan(0);
    for (const obs of history.observations) {
      expect(obs.sourceUrl, obs.id).toBeTruthy();
      expect(obs.sourceName, obs.id).toBeTruthy();
      expect(obs.asOf, obs.id).toBeTruthy();
      expect(obs.retrievedAt, obs.id).toBeTruthy();
    }
    const parsed = issuerBitcoinPerShareFileSchema.safeParse(history);
    expect(parsed.success).toBe(true);
  });
});

describe("public dashboard look-through API surface", () => {
  it("exposes required public fields without brokerage credentials", () => {
    const dashboard = buildPublicDashboard();
    const pos = dashboard.lookThrough.positions[0]!;
    expect(pos).toMatchObject({
      issuer: expect.any(String),
      ticker: expect.any(String),
      metricDate: expect.any(String),
      retrievalDate: expect.any(String),
      bitcoinHoldings: expect.any(Number),
      basicShares: expect.any(Number),
      assumedDilutedShares: expect.any(Number),
      dilutionScope: expect.any(String),
      basicSatsPerShare: expect.any(Number),
      dilutedSatsPerShare: expect.any(Number),
      sourceUrl: expect.any(String),
      sourceName: expect.any(String),
      portfolioShares: expect.any(Number),
      adrRatio: expect.any(Number),
      lookThroughSats: expect.any(Number),
    });
    const serialized = JSON.stringify(dashboard.lookThrough);
    expect(serialized.toLowerCase()).not.toContain("robinhood");
    expect(serialized.toLowerCase()).not.toContain("password");
    expect(serialized.toLowerCase()).not.toContain("seed");
  });

  it("does not interpolate missing chart observations across dates", () => {
    const series = buildIssuerBpsChartSeries({
      observations: [
        {
          ticker: "MSTR",
          asOf: "2026-06-30T16:00:00-04:00",
          reportedSatsPerDilutedShare: 210_824,
          calculatedSatsPerDilutedShare: null,
        },
        {
          ticker: "ASST",
          asOf: "2026-09-18T16:00:00-04:00",
          reportedSatsPerDilutedShare: 26_317,
          calculatedSatsPerDilutedShare: null,
        },
      ],
      mode: "level",
      formatLabel: (asOf) => asOf.slice(0, 10),
    });
    expect(series).toHaveLength(2);
    expect(series[0]?.MSTR).toBe(210_824);
    expect(series[0]?.ASST).toBeNull();
    expect(series[1]?.ASST).toBe(26_317);
    expect(series[1]?.MSTR).toBeNull();
  });
});
