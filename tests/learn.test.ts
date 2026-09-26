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
import {
  clearSubstackFeedCache,
  clampSubstackSummary,
  fetchSubstackFeed,
  isSafeSubstackUrl,
  parseSubstackRss,
  SUBSTACK_SUMMARY_MAX_CHARS,
} from "@/lib/learn/substack-feed";

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

  it("lists the Work Save Bitcoin Substack in curated resources", () => {
    const substack = loadLearnResources().resources.find(
      (r) => r.id === "work-save-bitcoin-substack",
    );
    expect(substack?.url).toBe("https://joshgreiff.substack.com");
    expect(substack?.pendingUrlConfirmation).toBe(false);
  });
});

describe("substack feed", () => {
  it("parses Substack RSS items without inventing posts", () => {
    const xml = `<?xml version="1.0"?>
      <rss version="2.0"><channel>
        <title><![CDATA[Work, Save, Bitcoin]]></title>
        <link>https://joshgreiff.substack.com</link>
        <item>
          <title><![CDATA[What If America Never Left the Gold Standard?]]></title>
          <description><![CDATA[celebrating 55 years of fiat currency!]]></description>
          <link>https://joshgreiff.substack.com/p/what-if-america-never-left-the-gold</link>
          <pubDate>Fri, 21 Aug 2026 15:35:18 GMT</pubDate>
        </item>
      </channel></rss>`;
    const parsed = parseSubstackRss(xml);
    expect(parsed.publicationTitle).toBe("Work, Save, Bitcoin");
    expect(parsed.posts).toHaveLength(1);
    expect(parsed.posts[0]?.title).toBe("What If America Never Left the Gold Standard?");
    expect(parsed.posts[0]?.summary).toBe("celebrating 55 years of fiat currency!");
    expect(parsed.posts[0]?.url).toContain("/p/what-if-america-never-left-the-gold");
    expect(parsed.posts[0]?.publishedAt).toBe("2026-08-21T15:35:18.000Z");
  });

  it("sanitizes HTML summaries, clamps length, and rejects unsafe links", () => {
    const longHtml =
      `<p><script>alert(1)</script>${"word ".repeat(80)}extra</p>`;
    const clamped = clampSubstackSummary(longHtml);
    expect(clamped).not.toMatch(/</);
    expect(clamped).not.toMatch(/script/i);
    expect(clamped?.endsWith("…")).toBe(true);
    expect(clamped!.length).toBeLessThanOrEqual(SUBSTACK_SUMMARY_MAX_CHARS);

    const xml = `<?xml version="1.0"?>
      <rss version="2.0"><channel>
        <title>Work, Save, Bitcoin</title>
        <link>https://joshgreiff.substack.com</link>
        <item>
          <title><![CDATA[Safe post]]></title>
          <description><![CDATA[${longHtml}]]></description>
          <link>https://joshgreiff.substack.com/p/safe-post</link>
          <pubDate>Fri, 21 Aug 2026 15:35:18 GMT</pubDate>
        </item>
        <item>
          <title>Bad link</title>
          <description>nope</description>
          <link>javascript:alert(1)</link>
          <pubDate>Fri, 21 Aug 2026 15:35:18 GMT</pubDate>
        </item>
        <item>
          <title>Off-site</title>
          <description>nope</description>
          <link>https://evil.example/phish</link>
          <pubDate>Fri, 21 Aug 2026 15:35:18 GMT</pubDate>
        </item>
      </channel></rss>`;
    const parsed = parseSubstackRss(xml);
    expect(parsed.posts).toHaveLength(1);
    expect(parsed.posts[0]?.summary).not.toMatch(/</);
    expect(parsed.posts[0]?.summary?.length).toBeLessThanOrEqual(SUBSTACK_SUMMARY_MAX_CHARS);
    expect(isSafeSubstackUrl("https://joshgreiff.substack.com/p/x")).toBe(true);
    expect(isSafeSubstackUrl("https://evil.example")).toBe(false);
  });

  it("returns unavailable freshness when the feed fetch fails", async () => {
    clearSubstackFeedCache();
    const result = await fetchSubstackFeed({
      fetchImpl: vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch,
      limit: 3,
    });
    expect(result.freshness).toBe("unavailable");
    expect(result.posts).toEqual([]);
  });
});
