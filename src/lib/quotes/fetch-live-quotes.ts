import type {
  LivePortfolioMark,
  LiveQuote,
  LiveQuoteSymbol,
  LiveQuotesResponse,
} from "./types";
import { fetchCoinbaseBtcSpot } from "./providers";
import { fetchEquityQuoteWithCache } from "./btc";
import {
  clearLivePortfolioTransient,
  setLivePortfolioTransient,
} from "./cache";
import { isRegularEquitySession } from "@/lib/market/session";

const EQUITY_SYMBOLS = [
  "MSTR",
  "ASST",
  "MPJPY",
  "SPY",
  "GLD",
  "STRF",
  "STRC",
  "STRK",
  "STRD",
  "SATA",
  "IBIT",
] as const;

const HOLDING_SYMBOLS = ["MSTR", "ASST", "MPJPY"] as const;

type LiveMarkPortfolioInput = {
  cashBalanceCents: number;
  positions: Array<{ ticker: string; shares: number }>;
};

export function buildLivePortfolioMark(args: {
  portfolio: LiveMarkPortfolioInput;
  quotes: LiveQuote[];
  retrievedAt?: string;
}): LivePortfolioMark {
  const bySymbol = new Map(args.quotes.map((q) => [q.symbol, q]));
  const missingSymbols: string[] = [];
  let asOf: string | null = null;

  const positions = args.portfolio.positions.map((position) => {
    const quote = bySymbol.get(position.ticker as LiveQuoteSymbol);
    if (!quote) {
      missingSymbols.push(position.ticker);
      return {
        ticker: position.ticker,
        shares: position.shares,
        priceCents: null,
        marketValueCents: null,
      };
    }
    if (asOf == null || Date.parse(quote.asOf) > Date.parse(asOf)) {
      asOf = quote.asOf;
    }
    const marketValueCents = Math.round(position.shares * quote.priceCents);
    return {
      ticker: position.ticker,
      shares: position.shares,
      priceCents: quote.priceCents,
      marketValueCents,
    };
  });

  const complete = missingSymbols.length === 0;
  const securitiesValueCents = complete
    ? positions.reduce((sum, p) => sum + (p.marketValueCents as number), 0)
    : null;

  return {
    asOf,
    retrievedAt: args.retrievedAt ?? new Date().toISOString(),
    cashBalanceCents: args.portfolio.cashBalanceCents,
    portfolioValueCents:
      securitiesValueCents == null
        ? null
        : securitiesValueCents + args.portfolio.cashBalanceCents,
    positions,
    missingSymbols,
    complete,
  };
}

export async function fetchLiveQuotes(args: {
  portfolio: LiveMarkPortfolioInput;
  fetchImpl?: typeof fetch;
  /** When false, skip equity fetches (outside regular session). BTC still fetched. */
  includeEquities?: boolean;
}): Promise<LiveQuotesResponse & { marketOpen: boolean }> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const marketOpen = args.includeEquities ?? isRegularEquitySession();
  const quotes: LiveQuote[] = [];
  const errors: { symbol: string; message: string }[] = [];
  const freshness: Record<string, "live" | "last_available"> = {};

  const jobs: Array<Promise<void>> = [
    fetchCoinbaseBtcSpot(fetchImpl)
      .then((quote) => {
        quotes.push(quote);
        freshness.BTCUSD = "live";
      })
      .catch((error: unknown) => {
        errors.push({
          symbol: "BTCUSD",
          message: error instanceof Error ? error.message : String(error),
        });
      }),
  ];

  if (marketOpen) {
    for (const symbol of EQUITY_SYMBOLS) {
      jobs.push(
        fetchEquityQuoteWithCache(symbol, fetchImpl)
          .then(({ quote, freshness: f }) => {
            quotes.push(quote);
            freshness[symbol] = f;
          })
          .catch((error: unknown) => {
            errors.push({
              symbol,
              message: error instanceof Error ? error.message : String(error),
            });
          }),
      );
    }
  }

  await Promise.all(jobs);
  quotes.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const holdingQuotes = quotes.filter((q) =>
    (HOLDING_SYMBOLS as readonly string[]).includes(q.symbol),
  );
  const mark = buildLivePortfolioMark({
    portfolio: args.portfolio,
    quotes: holdingQuotes,
  });

  if (marketOpen && mark.complete && mark.portfolioValueCents != null) {
    setLivePortfolioTransient({
      portfolioValueCents: mark.portfolioValueCents,
      asOf: mark.asOf ?? mark.retrievedAt,
      retrievedAt: mark.retrievedAt,
      positions: mark.positions.map((p) => ({
        ticker: p.ticker,
        shares: p.shares,
        priceCents: p.priceCents as number,
        marketValueCents: p.marketValueCents as number,
      })),
    });
  } else if (!marketOpen) {
    clearLivePortfolioTransient();
  }

  return {
    quotes,
    errors,
    mark,
    marketOpen,
    disclaimer:
      marketOpen
        ? "Live regular-session portfolio mark — not historical. Assumes published share weights are unchanged until a later transaction is recorded. Never appended to official history."
        : "Outside regular U.S. equity hours. Equity live marks are withheld; use the latest official market close. Bitcoin may still quote continuously as informational.",
  };
}
