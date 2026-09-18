import { describe, expect, it, vi } from "vitest";
import {
  buildLivePortfolioMark,
  fetchLiveQuotes,
} from "@/lib/quotes/fetch-live-quotes";
import {
  clearLivePortfolioTransient,
  clearQuoteCache,
  getLivePortfolioTransient,
} from "@/lib/quotes/cache";
import { isRegularEquitySession } from "@/lib/market/session";
import type { LiveQuote } from "@/lib/quotes/types";

const portfolio = {
  cashBalanceCents: 50,
  positions: [
    { ticker: "MSTR", shares: 2 },
    { ticker: "ASST", shares: 3 },
    { ticker: "MPJPY", shares: 4 },
  ],
};

function equityChartResponse(symbol: string, price: number) {
  return new Response(
    JSON.stringify({
      chart: {
        result: [
          {
            meta: {
              symbol,
              regularMarketPrice: price,
              regularMarketTime: 1_700_000_000,
            },
          },
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function mockProviders(args?: { equityFail?: boolean }) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("coinbase.com")) {
      return new Response(JSON.stringify({ data: { amount: "100000.00" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (args?.equityFail) return new Response("nope", { status: 500 });
    if (url.includes("/chart/MSTR")) return equityChartResponse("MSTR", 150);
    if (url.includes("/chart/ASST")) return equityChartResponse("ASST", 20);
    if (url.includes("/chart/MPJPY")) return equityChartResponse("MPJPY", 1.5);
    if (url.includes("/chart/")) return equityChartResponse("OTHER", 100);
    return new Response("nope", { status: 500 });
  });
}

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

describe("homepage market-session states", () => {
  it("before 9:30 a.m. Eastern: BTC live, no equity marks, no transient portfolio point", async () => {
    clearLivePortfolioTransient();
    expect(isRegularEquitySession(new Date("2026-09-17T09:00:00-04:00"))).toBe(false);

    const result = await fetchLiveQuotes({
      portfolio,
      fetchImpl: mockProviders() as unknown as typeof fetch,
      includeEquities: false,
    });

    expect(result.marketOpen).toBe(false);
    expect(result.quotes.some((q) => q.symbol === "BTCUSD")).toBe(true);
    expect(result.quotes.some((q) => q.symbol === "MSTR")).toBe(false);
    expect(getLivePortfolioTransient()).toBeNull();
    expect(result.disclaimer.toLowerCase()).toContain("official market close");
  });

  it("during regular hours: one replaceable live portfolio mark labeled not historical", async () => {
    clearLivePortfolioTransient();
    expect(isRegularEquitySession(new Date("2026-09-17T11:00:00-04:00"))).toBe(true);

    const first = await fetchLiveQuotes({
      portfolio,
      fetchImpl: mockProviders() as unknown as typeof fetch,
      includeEquities: true,
    });
    expect(first.marketOpen).toBe(true);
    expect(first.mark.complete).toBe(true);
    expect(first.disclaimer.toLowerCase()).toContain("not historical");
    expect(getLivePortfolioTransient()?.value.portfolioValueCents).toBe(
      first.mark.portfolioValueCents,
    );

    const second = await fetchLiveQuotes({
      portfolio,
      fetchImpl: mockProviders() as unknown as typeof fetch,
      includeEquities: true,
    });
    expect(getLivePortfolioTransient()?.value.portfolioValueCents).toBe(
      second.mark.portfolioValueCents,
    );
    expect(getLivePortfolioTransient()).not.toBeNull();
  });

  it("after 4:00 p.m. Eastern: clears transient mark and withholds equity quotes", async () => {
    clearLivePortfolioTransient();
    await fetchLiveQuotes({
      portfolio,
      fetchImpl: mockProviders() as unknown as typeof fetch,
      includeEquities: true,
    });
    expect(getLivePortfolioTransient()).not.toBeNull();
    expect(isRegularEquitySession(new Date("2026-09-17T16:30:00-04:00"))).toBe(false);

    const result = await fetchLiveQuotes({
      portfolio,
      fetchImpl: mockProviders() as unknown as typeof fetch,
      includeEquities: false,
    });

    expect(result.marketOpen).toBe(false);
    expect(result.quotes.some((q) => q.symbol === "MSTR")).toBe(false);
    expect(result.quotes.some((q) => q.symbol === "BTCUSD")).toBe(true);
    expect(getLivePortfolioTransient()).toBeNull();
  });
});

describe("fetchLiveQuotes", () => {
  it("aggregates provider responses and reports failures", async () => {
    clearQuoteCache();
    clearLivePortfolioTransient();

    const result = await fetchLiveQuotes({
      portfolio,
      fetchImpl: mockProviders() as unknown as typeof fetch,
      includeEquities: true,
    });

    clearQuoteCache();
    const mixed = await fetchLiveQuotes({
      portfolio,
      fetchImpl: vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("coinbase.com")) {
          return new Response(JSON.stringify({ data: { amount: "100000.00" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url.includes("/chart/MSTR")) return equityChartResponse("MSTR", 150);
        return new Response("nope", { status: 500 });
      }) as unknown as typeof fetch,
      includeEquities: true,
    });

    expect(result.quotes.some((q) => q.symbol === "BTCUSD")).toBe(true);
    expect(result.quotes.some((q) => q.symbol === "MSTR")).toBe(true);
    expect(mixed.errors.length).toBeGreaterThan(0);
    expect(result.disclaimer.toLowerCase()).toContain("share weights");
  });
});
