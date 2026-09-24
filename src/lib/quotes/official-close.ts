import { selectSynchronizedBtcCandle } from "@/lib/accounting/session-comparison";
import { summarizeContributions } from "@/lib/accounting/portfolio";
import { formatUsdFromCents } from "@/lib/accounting/format";
import {
  etFourPmOffsetStamp,
  latestCompletedEquitySessionDay,
} from "@/lib/market/session-close";
import { etFourPmIso } from "@/lib/market/session";
import { fetchCoinbaseBtcMinuteCandles } from "@/lib/quotes/btc";
import { fetchYahooUnadjustedDailyClose } from "@/lib/quotes/yahoo-daily-close";
import type { PortfolioData } from "@/lib/schemas/portfolio";
import type { PortfolioTransaction } from "@/lib/schemas/transactions";

export const OFFICIAL_CLOSE_EQUITY_SYMBOLS = [
  "MSTR",
  "ASST",
  "MPJPY",
  "SPY",
  "GLD",
] as const;

export type OfficialCloseEquitySymbol =
  (typeof OFFICIAL_CLOSE_EQUITY_SYMBOLS)[number];

export type OfficialClosePrice = {
  symbol: "BTCUSD" | OfficialCloseEquitySymbol;
  priceCents: number;
  sourceName: string;
  sourceUrl: string;
  observedAt: string;
  retrievedAt: string;
  fallbackUsed: boolean;
  note: string;
};

export type OfficialCloseSnapshot = {
  sessionDay: string;
  asOf: string;
  retrievedAt: string;
  prices: Record<"BTCUSD" | OfficialCloseEquitySymbol, number>;
  sources: Record<"BTCUSD" | OfficialCloseEquitySymbol, OfficialClosePrice>;
  portfolioValueCents: number;
  netExternalContributionsCents: number;
  investmentPnLCents: number;
  positionMarks: Array<{
    ticker: string;
    shares: number;
    priceCents: number;
    marketValueCents: number;
  }>;
  reconciliationNote: string;
};

function dollarsNote(cents: number): string {
  return formatUsdFromCents(cents).replace("$", "");
}

export function computeOfficialPortfolioMark(args: {
  portfolio: PortfolioData;
  closes: Partial<Record<string, number>>;
}): {
  portfolioValueCents: number;
  positionMarks: OfficialCloseSnapshot["positionMarks"];
  missing: string[];
} {
  const missing: string[] = [];
  const positionMarks: OfficialCloseSnapshot["positionMarks"] = [];
  let sum = args.portfolio.cashBalanceCents;
  for (const position of args.portfolio.positions) {
    const priceCents = args.closes[position.ticker];
    if (priceCents == null) {
      missing.push(position.ticker);
      continue;
    }
    const marketValueCents = Math.round(position.shares * priceCents);
    positionMarks.push({
      ticker: position.ticker,
      shares: position.shares,
      priceCents,
      marketValueCents,
    });
    sum += marketValueCents;
  }
  return { portfolioValueCents: sum, positionMarks, missing };
}

export async function fetchOfficialCloseSnapshot(args: {
  portfolio: PortfolioData;
  transactions: PortfolioTransaction[];
  sessionDay?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<OfficialCloseSnapshot> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const sessionDay =
    args.sessionDay ?? latestCompletedEquitySessionDay(args.now ?? new Date());
  const asOf = etFourPmOffsetStamp(sessionDay);
  const retrievedAt = new Date().toISOString();
  const fourPmIso = etFourPmIso(sessionDay);

  const equityResults = await Promise.all(
    OFFICIAL_CLOSE_EQUITY_SYMBOLS.map((symbol) =>
      fetchYahooUnadjustedDailyClose({
        symbol,
        sessionDay,
        // Thin ADRs (e.g. MPJPY) may have a session timestamp with a null close.
        allowPriorCloseFallback: true,
        fetchImpl,
      }),
    ),
  );

  const candleStart = new Date(Date.parse(fourPmIso) - 15 * 60 * 1000).toISOString();
  const candleEnd = new Date(Date.parse(fourPmIso) + 5 * 60 * 1000).toISOString();
  const candles = await fetchCoinbaseBtcMinuteCandles({
    startIso: candleStart,
    endIso: candleEnd,
    fetchImpl,
  });
  const btc = selectSynchronizedBtcCandle({
    targetFourPmIso: fourPmIso,
    candles,
  });
  if (btc.priceCents == null || btc.observedAt == null) {
    throw new Error(
      `Synchronized BTC close unavailable for ${sessionDay}: ${btc.note ?? "no candle"}`,
    );
  }

  const sources = {
    BTCUSD: {
      symbol: "BTCUSD" as const,
      priceCents: btc.priceCents,
      sourceName: "Coinbase Exchange BTC-USD 1-minute candle",
      sourceUrl: "https://api.exchange.coinbase.com/products/BTC-USD/candles",
      observedAt: btc.observedAt,
      retrievedAt,
      fallbackUsed: btc.fallbackUsed,
      note: `${btc.note ?? "Coinbase 4:00 p.m. Eastern candle"} $${dollarsNote(btc.priceCents)}`,
    },
    ...Object.fromEntries(
      equityResults.map((row) => [
        row.symbol,
        {
          symbol: row.symbol as OfficialCloseEquitySymbol,
          priceCents: row.priceCents,
          sourceName: row.sourceName,
          sourceUrl: row.sourceUrl,
          observedAt: asOf,
          retrievedAt: row.retrievedAt,
          fallbackUsed: row.fallbackUsed,
          note: row.note,
        } satisfies OfficialClosePrice,
      ]),
    ),
  } as OfficialCloseSnapshot["sources"];

  const prices = {
    BTCUSD: sources.BTCUSD.priceCents,
    MSTR: sources.MSTR.priceCents,
    ASST: sources.ASST.priceCents,
    MPJPY: sources.MPJPY.priceCents,
    SPY: sources.SPY.priceCents,
    GLD: sources.GLD.priceCents,
  };

  const mark = computeOfficialPortfolioMark({
    portfolio: args.portfolio,
    closes: prices,
  });
  if (mark.missing.length > 0) {
    throw new Error(
      `Missing holding closes for official mark: ${mark.missing.join(", ")}`,
    );
  }

  const contributions = summarizeContributions(args.transactions);
  const investmentPnLCents =
    mark.portfolioValueCents - contributions.totalExternalContributionsCents;

  const pieces = mark.positionMarks.map(
    (p) =>
      `${p.shares}×$${dollarsNote(p.priceCents)}`,
  );
  const reconciliationNote = `Official market-close snapshot. Reconciled from published shares × confirmed closes: ${pieces.join(" + ")} = ${formatUsdFromCents(mark.portfolioValueCents)} (cash ${formatUsdFromCents(args.portfolio.cashBalanceCents)}).`;

  return {
    sessionDay,
    asOf,
    retrievedAt,
    prices,
    sources,
    portfolioValueCents: mark.portfolioValueCents,
    netExternalContributionsCents: contributions.totalExternalContributionsCents,
    investmentPnLCents,
    positionMarks: mark.positionMarks,
    reconciliationNote,
  };
}
