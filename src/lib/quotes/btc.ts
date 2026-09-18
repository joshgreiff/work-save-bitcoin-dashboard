import type { LiveQuote } from "./types";
import {
  cacheQuote,
  getBtcCardCache,
  getCachedQuote,
  setBtcCardCache,
} from "./cache";
import { fetchCoinbaseBtcSpot, fetchYahooEquityQuote } from "./providers";
import type { LiveQuoteSymbol } from "./types";

export type BtcCardQuote = {
  priceCents: number;
  change24hCents: number | null;
  change24hPct: number | null;
  asOf: string;
  retrievedAt: string;
  sourceName: string;
  sourceUrl: string;
  freshness: "live" | "last_available";
};

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export async function fetchCoinbaseBtcCard(
  fetchImpl: typeof fetch = fetch,
): Promise<BtcCardQuote> {
  const retrievedAt = new Date().toISOString();
  try {
    const spot = await fetchCoinbaseBtcSpot(fetchImpl);
    cacheQuote(spot);

    let change24hCents: number | null = null;
    let change24hPct: number | null = null;
    try {
      const statsUrl = "https://api.exchange.coinbase.com/products/BTC-USD/stats";
      const statsRes = await fetchImpl(statsUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (statsRes.ok) {
        const stats = (await statsRes.json()) as {
          open?: string;
          last?: string;
        };
        const open = Number(stats.open);
        const last = Number(stats.last ?? spot.priceCents / 100);
        if (Number.isFinite(open) && open > 0 && Number.isFinite(last)) {
          change24hCents = dollarsToCents(last - open);
          change24hPct = last / open - 1;
        }
      }
    } catch {
      // Stats are optional; spot alone is enough for the card.
    }

    const card: BtcCardQuote = {
      priceCents: spot.priceCents,
      change24hCents,
      change24hPct,
      asOf: spot.asOf,
      retrievedAt,
      sourceName: "Coinbase spot",
      sourceUrl: spot.sourceUrl,
      freshness: "live",
    };
    setBtcCardCache(card);
    return card;
  } catch (error) {
    const cached = getBtcCardCache();
    if (cached) {
      return {
        ...cached.value,
        retrievedAt: cached.cachedAt,
        freshness: "last_available",
      };
    }
    throw error;
  }
}

export async function fetchEquityQuoteWithCache(
  symbol: Exclude<LiveQuoteSymbol, "BTCUSD">,
  fetchImpl: typeof fetch = fetch,
): Promise<{ quote: LiveQuote; freshness: "live" | "last_available" }> {
  try {
    const quote = await fetchYahooEquityQuote(symbol, fetchImpl);
    cacheQuote(quote);
    return { quote, freshness: "live" };
  } catch (error) {
    const cached = getCachedQuote(symbol);
    if (cached) {
      return { quote: cached.value, freshness: "last_available" };
    }
    throw error;
  }
}

/**
 * Coinbase Exchange candles: [ time, low, high, open, close, volume ]
 * granularity 60 = one minute.
 */
export async function fetchCoinbaseBtcMinuteCandles(args: {
  startIso: string;
  endIso: string;
  fetchImpl?: typeof fetch;
}): Promise<Array<{ startUnix: number; close: number }>> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const start = Math.floor(Date.parse(args.startIso) / 1000);
  const end = Math.floor(Date.parse(args.endIso) / 1000);
  const url = `https://api.exchange.coinbase.com/products/BTC-USD/candles?start=${start}&end=${end}&granularity=60`;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Coinbase candles HTTP ${response.status}`);
  }
  const rows = (await response.json()) as number[][];
  return rows.map((row) => ({
    startUnix: row[0]!,
    close: row[4]!,
  }));
}
