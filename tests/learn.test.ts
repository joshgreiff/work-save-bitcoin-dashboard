import { describe, expect, it, vi } from "vitest";
import {
  futureBasketPrice,
  inflationCalculator,
  nominalEarnings,
  purchasingPowerDifference,
  purchasingPowerToday,
  recurringMonthlyUsd,
  satsFromRecurringPurchase,
  usdToSats,
} from "@/lib/learn/calculators";
import {
  clearTreasuryDebtCache,
  fetchTreasuryDebt,
} from "@/lib/learn/treasury-debt";
import {
  loadLearnGlossary,
  loadLearnLessons,
  loadLearnResources,
  loadNewsletterConfig,
  loadTreasuryDebtFallback,
  validateAllDataFiles,
} from "@/lib/data/load";
import { formatViewerDate, formatViewerTimestamp } from "@/lib/market/session";
import { formatAsOf } from "@/lib/accounting/format";

describe("learn calculators", () => {
  it("computes nominal earnings and purchasing power", () => {
    expect(nominalEarnings(20, 100)).toBe(2000);
    expect(purchasingPowerToday({ nominalAmount: 100, annualInflationRate: 0, years: 10 })).toBe(
      100,
    );
    const pp = purchasingPowerDifference({
      nominalAmount: 100,
      annualInflationRate: 0.02,
      years: 10,
    });
    expect(pp.purchasingPower).toBeCloseTo(100 / 1.02 ** 10, 8);
    expect(pp.difference).toBeLessThan(0);
  });

  it("matches the default inflation calculator example", () => {
    const result = inflationCalculator({
      startingAmount: 100,
      annualInflationRate: 0.02,
      years: 10,
    });
    expect(result.futureBasketPrice).toBeCloseTo(futureBasketPrice({
      startingAmount: 100,
      annualInflationRate: 0.02,
      years: 10,
    }), 10);
    expect(result.cashPurchasingPower).toBeCloseTo(100 / 1.02 ** 10, 8);
    expect(result.totalPercentChange).toBeCloseTo(1.02 ** 10 - 1, 10);
  });

  it("converts USD to sats and recurring monthly amounts", () => {
    expect(usdToSats({ usdAmount: 50, btcUsdPrice: 100_000 })).toBe(50_000);
    expect(usdToSats({ usdAmount: 5, btcUsdPrice: 0 })).toBeNull();
    expect(recurringMonthlyUsd({ usdAmount: 5, frequency: "weekly" })).toBeCloseTo(
      5 * (52 / 12),
      10,
    );
    const purchase = satsFromRecurringPurchase({
      usdAmount: 5,
      frequency: "weekly",
      btcUsdPrice: 100_000,
    });
    expect(purchase.satsToday).toBe(5_000);
    expect(purchase.monthlyContributionUsd).toBeCloseTo(5 * (52 / 12), 10);
  });
});

describe("viewer timestamps", () => {
  it("formats America/New_York timestamps without raw ISO", () => {
    const formatted = formatViewerTimestamp("2026-09-26T11:35:00-04:00");
    expect(formatted).toBe("Sep. 26, 2026 at 11:35 a.m. ET");
    expect(formatted).not.toMatch(/T\d{2}:\d{2}/);
    expect(formatViewerTimestamp(null)).toBe("—");
    expect(formatViewerTimestamp("not-a-date")).toBe("—");
  });

  it("formats date-only values for source as-of labels", () => {
    expect(formatViewerDate("2026-09-24")).toBe("Sep. 24, 2026");
  });

  it("keeps MetricCard as-of labels in the same ET style", () => {
    expect(formatAsOf("2026-09-26T11:35:00-04:00")).toBe(
      "As of Sep. 26, 2026 at 11:35 a.m. ET",
    );
  });
});

describe("treasury debt fetch", () => {
  it("returns fallback on provider failure without inventing values", async () => {
    clearTreasuryDebtCache();
    const fallback = loadTreasuryDebtFallback().observation;
    const result = await fetchTreasuryDebt({
      fallback,
      fetchImpl: vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch,
    });
    expect(result.freshness).toBe("last_verified");
    expect(result.totalPublicDebtUsd).toBe(fallback.totalPublicDebtUsd);
    expect(result.recordDate).toBe(fallback.recordDate);
  });

  it("parses a live Treasury response when available", async () => {
    clearTreasuryDebtCache();
    const fallback = loadTreasuryDebtFallback().observation;
    const result = await fetchTreasuryDebt({
      fallback,
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                record_date: "2026-09-24",
                tot_pub_debt_out_amt: "40068807991924.84",
                debt_held_public_amt: "32362728656693.39",
                intragov_hold_amt: "7706079335231.45",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ) as unknown as typeof fetch,
    });
    expect(result.freshness).toBe("live");
    expect(result.totalPublicDebtUsd).toBe(40068807991924.84);
  });
});

describe("learn content validation", () => {
  it("validates learn data files and unique lesson slugs", () => {
    expect(() => validateAllDataFiles()).not.toThrow();
    const lessons = loadLearnLessons().lessons;
    const slugs = lessons.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(lessons.some((l) => l.slug === "save-your-time")).toBe(true);
    expect(loadLearnGlossary().terms.length).toBeGreaterThan(5);
    expect(loadNewsletterConfig().privacyPolicyPath).toBe("/privacy");
  });

  it("keeps River/Strike referral disclosures visible in resources data", () => {
    const resources = loadLearnResources().resources.filter((r) => r.referral);
    expect(resources.length).toBeGreaterThanOrEqual(2);
    for (const resource of resources) {
      expect(resource.referralDisclosure).toBeTruthy();
      expect(resource.url).toBeTruthy();
    }
    const forrest = loadLearnResources().resources.find((r) => r.id === "forresthodl");
    expect(forrest?.pendingUrlConfirmation).toBe(true);
    expect(forrest?.url).toBeNull();
  });

  it("hides save-your-time video while videoUrl is null", () => {
    const lesson = loadLearnLessons().lessons.find((l) => l.slug === "save-your-time");
    expect(lesson?.videoUrl).toBeNull();
  });
});
