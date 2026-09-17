import type { LiveQuote, LiveQuoteSymbol } from "./types";

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function unixSecondsToIso(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) {
    return new Date().toISOString();
  }
  return new Date(seconds * 1000).toISOString();
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        fulldayPrice?: number;
      };
    }>;
    error?: { description?: string };
  };
};

const YAHOO_SYMBOLS: Record<Exclude<LiveQuoteSymbol, "BTCUSD">, string> = {
  MSTR: "MSTR",
  ASST: "ASST",
  MPJPY: "MPJPY",
  SPY: "SPY",
  GLD: "GLD",
  STRF: "STRF",
  STRC: "STRC",
  STRK: "STRK",
  STRD: "STRD",
  SATA: "SATA",
  IBIT: "IBIT",
};

export async function fetchYahooEquityQuote(
  symbol: Exclude<LiveQuoteSymbol, "BTCUSD">,
  fetchImpl: typeof fetch = fetch,
): Promise<LiveQuote> {
  const yahooSymbol = YAHOO_SYMBOLS[symbol];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
  const retrievedAt = new Date().toISOString();
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "WorkSaveBitcoinDashboard/1.0 (+https://www.worksavebitcoin.com)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Yahoo chart HTTP ${response.status} for ${yahooSymbol}`);
  }
  const data = (await response.json()) as YahooChartResponse;
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (price == null || !Number.isFinite(price) || price <= 0) {
    throw new Error(
      data.chart?.error?.description ??
        `Yahoo chart missing regularMarketPrice for ${yahooSymbol}`,
    );
  }

  return {
    symbol,
    priceCents: dollarsToCents(price),
    asOf: unixSecondsToIso(meta?.regularMarketTime),
    sourceName: "Yahoo Finance chart",
    sourceUrl: url,
    retrievedAt,
    currency: "USD",
  };
}

export async function fetchCoinbaseBtcSpot(
  fetchImpl: typeof fetch = fetch,
): Promise<LiveQuote> {
  const url = "https://api.coinbase.com/v2/prices/BTC-USD/spot";
  const retrievedAt = new Date().toISOString();
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Coinbase spot HTTP ${response.status}`);
  }
  const data = (await response.json()) as {
    data?: { amount?: string };
  };
  const amount = Number(data.data?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Coinbase spot missing BTC-USD amount");
  }

  return {
    symbol: "BTCUSD",
    priceCents: dollarsToCents(amount),
    asOf: retrievedAt,
    sourceName: "Coinbase spot",
    sourceUrl: url,
    retrievedAt,
    currency: "USD",
  };
}
