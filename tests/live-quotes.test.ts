import { describe, expect, it, vi } from "vitest";
import {
  buildLivePortfolioMark,
  fetchLiveQuotes,
} from "@/lib/quotes/fetch-live-quotes";
import type { LiveQuote } from "@/lib/quotes/types";

const portfolio = {
  cashBalanceCents: 50,
  positions: [
    { ticker: "MSTR", shares: 2 },
    { ticker: "ASST", shares: 3 },
    { ticker: "MPJPY", shares: 4 },
  ],
};

describe("buildLivePortfolioMark", () => {
  it("values holdings from live quotes without inventing missing prices", () => {
    const quotes: LiveQuote[] = [
      {
        symbol: "MSTR",
        priceCents: 10000,
        asOf: "2026-09-17T16:00:00.000Z",
        sourceName: "test",
        sourceUrl: "https://example.com",
        retrievedAt: "2026-09-17T16:00:01.000Z",
        currency: "USD",
      },
      {
        symbol: "ASST",
        priceCents: 2000,
        asOf: "2026-09-17T16:00:00.000Z",
        sourceName: "test",
        sourceUrl: "https://example.com",
        retrievedAt: "2026-09-17T16:00:01.000Z",
        currency: "USD",
      },
    ];

    const mark = buildLivePortfolioMark({ portfolio, quotes });
    expect(mark.complete).toBe(false);
    expect(mark.missingSymbols).toEqual(["MPJPY"]);
    expect(mark.portfolioValueCents).toBeNull();
    expect(mark.positions[0]?.marketValueCents).toBe(20000);
    expect(mark.positions[1]?.marketValueCents).toBe(6000);
    expect(mark.positions[2]?.marketValueCents).toBeNull();
  });

  it("sums a complete live mark including cash", () => {
    const quotes: LiveQuote[] = [
      {
        symbol: "MSTR",
        priceCents: 10000,
        asOf: "2026-09-17T16:00:00.000Z",
        sourceName: "test",
        sourceUrl: "https://example.com",
        retrievedAt: "2026-09-17T16:00:01.000Z",
        currency: "USD",
      },
      {
        symbol: "ASST",
        priceCents: 2000,
        asOf: "2026-09-17T16:00:00.000Z",
        sourceName: "test",
        sourceUrl: "https://example.com",
        retrievedAt: "2026-09-17T16:00:01.000Z",
        currency: "USD",
      },
      {
        symbol: "MPJPY",
        priceCents: 150,
        asOf: "2026-09-17T16:00:00.000Z",
        sourceName: "test",
        sourceUrl: "https://example.com",
        retrievedAt: "2026-09-17T16:00:01.000Z",
        currency: "USD",
      },
    ];

    const mark = buildLivePortfolioMark({ portfolio, quotes });
    expect(mark.complete).toBe(true);
    // 2*100 + 3*20 + 4*1.50 + 0.50 = 200 + 60 + 6 + 0.50 = 266.50
    expect(mark.portfolioValueCents).toBe(26650);
  });
});

describe("fetchLiveQuotes", () => {
  it("aggregates provider responses and reports failures", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("coinbase.com")) {
        return new Response(JSON.stringify({ data: { amount: "100000.00" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/chart/MSTR")) {
        return new Response(
          JSON.stringify({
            chart: {
              result: [
                {
                  meta: {
                    symbol: "MSTR",
                    regularMarketPrice: 150,
                    regularMarketTime: 1_700_000_000,
                  },
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("nope", { status: 500 });
    });

    const result = await fetchLiveQuotes({
      portfolio,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.quotes.some((q) => q.symbol === "BTCUSD")).toBe(true);
    expect(result.quotes.some((q) => q.symbol === "MSTR")).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.disclaimer.toLowerCase()).toContain("share weights");
  });
});
