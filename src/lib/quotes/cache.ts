import type { LiveQuote } from "./types";

type CacheEntry<T> = {
  value: T;
  cachedAt: string;
};

const quoteCache = new Map<string, CacheEntry<LiveQuote>>();
let btcCardCache: CacheEntry<{
  priceCents: number;
  change24hCents: number | null;
  change24hPct: number | null;
  asOf: string;
  sourceName: string;
  sourceUrl: string;
}> | null = null;

let livePortfolioTransient: CacheEntry<{
  portfolioValueCents: number;
  asOf: string;
  retrievedAt: string;
  positions: Array<{
    ticker: string;
    shares: number;
    priceCents: number;
    marketValueCents: number;
  }>;
}> | null = null;

export function cacheQuote(quote: LiveQuote): void {
  quoteCache.set(quote.symbol, {
    value: quote,
    cachedAt: new Date().toISOString(),
  });
}

export function getCachedQuote(symbol: string): CacheEntry<LiveQuote> | null {
  return quoteCache.get(symbol) ?? null;
}

export function setBtcCardCache(
  value: NonNullable<typeof btcCardCache>["value"],
): void {
  btcCardCache = { value, cachedAt: new Date().toISOString() };
}

export function getBtcCardCache(): typeof btcCardCache {
  return btcCardCache;
}

/** Replace-in-place: only one transient live portfolio mark. */
export function setLivePortfolioTransient(
  value: NonNullable<typeof livePortfolioTransient>["value"],
): void {
  livePortfolioTransient = {
    value,
    cachedAt: new Date().toISOString(),
  };
}

export function getLivePortfolioTransient(): typeof livePortfolioTransient {
  return livePortfolioTransient;
}

export function clearLivePortfolioTransient(): void {
  livePortfolioTransient = null;
}

export function clearQuoteCache(): void {
  quoteCache.clear();
  btcCardCache = null;
}
