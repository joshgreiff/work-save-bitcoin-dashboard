import type {
  LivePortfolioMark,
  LiveQuote,
  LiveQuoteSymbol,
  LiveQuotesResponse,
} from "./types";
import {
  fetchCoinbaseBtcSpot,
  fetchYahooEquityQuote,
} from "./providers";

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
}): Promise<LiveQuotesResponse> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const quotes: LiveQuote[] = [];
  const errors: { symbol: string; message: string }[] = [];

  const jobs: Array<Promise<void>> = [
    fetchCoinbaseBtcSpot(fetchImpl)
      .then((quote) => {
        quotes.push(quote);
      })
      .catch((error: unknown) => {
        errors.push({
          symbol: "BTCUSD",
          message: error instanceof Error ? error.message : String(error),
        });
      }),
    ...EQUITY_SYMBOLS.map((symbol) =>
      fetchYahooEquityQuote(symbol, fetchImpl)
        .then((quote) => {
          quotes.push(quote);
        })
        .catch((error: unknown) => {
          errors.push({
            symbol,
            message: error instanceof Error ? error.message : String(error),
          });
        }),
    ),
  ];

  await Promise.all(jobs);

  quotes.sort((a, b) => a.symbol.localeCompare(b.symbol));

  return {
    quotes,
    errors,
    mark: buildLivePortfolioMark({
      portfolio: args.portfolio,
      quotes,
    }),
    disclaimer:
      "Live quotes are informational only. They are not the official 4:00 p.m. Eastern close, do not update episode snapshots, and are never used for contribution-adjusted performance or cash-flow-matched benchmarks.",
  };
}
