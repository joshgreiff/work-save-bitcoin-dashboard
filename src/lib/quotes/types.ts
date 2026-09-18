export type LiveQuoteSymbol =
  | "BTCUSD"
  | "MSTR"
  | "ASST"
  | "MPJPY"
  | "SPY"
  | "GLD"
  | "STRF"
  | "STRC"
  | "STRK"
  | "STRD"
  | "SATA"
  | "IBIT";

export type LiveQuote = {
  symbol: LiveQuoteSymbol;
  priceCents: number;
  asOf: string;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  currency: "USD";
};

export type LivePositionMark = {
  ticker: string;
  shares: number;
  priceCents: number | null;
  marketValueCents: number | null;
};

export type LivePortfolioMark = {
  asOf: string | null;
  retrievedAt: string;
  cashBalanceCents: number;
  portfolioValueCents: number | null;
  positions: LivePositionMark[];
  missingSymbols: string[];
  complete: boolean;
};

export type LiveQuotesResponse = {
  quotes: LiveQuote[];
  errors: { symbol: string; message: string }[];
  mark: LivePortfolioMark;
  disclaimer: string;
  marketOpen?: boolean;
};
