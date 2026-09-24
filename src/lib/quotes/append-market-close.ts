import { writeFileSync } from "node:fs";
import path from "node:path";
import { formatUsdFromCents } from "@/lib/accounting/format";
import {
  etWeekdaysAfterThrough,
  latestCompletedEquitySessionDay,
} from "@/lib/market/session-close";
import { etCalendarDay } from "@/lib/market/session";
import {
  fetchOfficialCloseSnapshot,
  type OfficialCloseSnapshot,
} from "@/lib/quotes/official-close";
import {
  loadMarketObservations,
  loadMarketPrices,
  loadPortfolio,
  loadTransactions,
  loadValuationHistory,
} from "@/lib/data/load";
import type { PortfolioData } from "@/lib/schemas/portfolio";
import type { SynchronizedMarketObservation } from "@/lib/schemas/market-observations";
import type { ValuationHistoryPoint } from "@/lib/schemas/valuation-history";
import type { MarketPrice } from "@/lib/schemas/market-prices";

const DATA_DIR = path.join(process.cwd(), "data");

function writeJson(filename: string, value: unknown): void {
  writeFileSync(
    path.join(DATA_DIR, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function formatLongDate(sessionDay: string): string {
  const [y, m, d] = sessionDay.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!, 16, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function observationAlreadyExists(
  observations: SynchronizedMarketObservation[],
  sessionDay: string,
): boolean {
  const id = `mo-${sessionDay}-close`;
  return observations.some(
    (o) => o.id === id || (o.valuationType === "market_close" && o.timestamp.startsWith(sessionDay)),
  );
}

export function buildMarketObservation(
  snapshot: OfficialCloseSnapshot,
): SynchronizedMarketObservation {
  return {
    id: `mo-${snapshot.sessionDay}-close`,
    timestamp: snapshot.asOf,
    timezone: "America/New_York",
    valuationType: "market_close",
    prices: {
      BTCUSD: snapshot.prices.BTCUSD,
      MSTR: snapshot.prices.MSTR,
      ASST: snapshot.prices.ASST,
      MPJPY: snapshot.prices.MPJPY,
      SPY: snapshot.prices.SPY,
      GLD: snapshot.prices.GLD,
    },
    sources: {
      BTCUSD: {
        name: snapshot.sources.BTCUSD.sourceName,
        url: snapshot.sources.BTCUSD.sourceUrl,
        observedAt: snapshot.sources.BTCUSD.observedAt,
        retrievedAt: snapshot.sources.BTCUSD.retrievedAt,
        fallbackUsed: snapshot.sources.BTCUSD.fallbackUsed,
        note: snapshot.sources.BTCUSD.note,
      },
      MSTR: {
        name: snapshot.sources.MSTR.sourceName,
        url: snapshot.sources.MSTR.sourceUrl,
        observedAt: snapshot.sources.MSTR.observedAt,
        retrievedAt: snapshot.sources.MSTR.retrievedAt,
        fallbackUsed: snapshot.sources.MSTR.fallbackUsed,
        note: snapshot.sources.MSTR.note,
      },
      ASST: {
        name: snapshot.sources.ASST.sourceName,
        url: snapshot.sources.ASST.sourceUrl,
        observedAt: snapshot.sources.ASST.observedAt,
        retrievedAt: snapshot.sources.ASST.retrievedAt,
        fallbackUsed: snapshot.sources.ASST.fallbackUsed,
        note: snapshot.sources.ASST.note,
      },
      MPJPY: {
        name: snapshot.sources.MPJPY.sourceName,
        url: snapshot.sources.MPJPY.sourceUrl,
        observedAt: snapshot.sources.MPJPY.observedAt,
        retrievedAt: snapshot.sources.MPJPY.retrievedAt,
        fallbackUsed: snapshot.sources.MPJPY.fallbackUsed,
        note: snapshot.sources.MPJPY.note,
      },
      SPY: {
        name: snapshot.sources.SPY.sourceName,
        url: snapshot.sources.SPY.sourceUrl,
        observedAt: snapshot.sources.SPY.observedAt,
        retrievedAt: snapshot.sources.SPY.retrievedAt,
        fallbackUsed: snapshot.sources.SPY.fallbackUsed,
        note: snapshot.sources.SPY.note,
      },
      GLD: {
        name: snapshot.sources.GLD.sourceName,
        url: snapshot.sources.GLD.sourceUrl,
        observedAt: snapshot.sources.GLD.observedAt,
        retrievedAt: snapshot.sources.GLD.retrievedAt,
        fallbackUsed: snapshot.sources.GLD.fallbackUsed,
        note: snapshot.sources.GLD.note,
      },
    },
    portfolioValueCents: snapshot.portfolioValueCents,
    netExternalContributionsCents: snapshot.netExternalContributionsCents,
    note: snapshot.reconciliationNote,
  };
}

export function buildValuationHistoryPoint(
  snapshot: OfficialCloseSnapshot,
): ValuationHistoryPoint {
  return {
    id: `vh-${snapshot.sessionDay}-close`,
    asOf: snapshot.asOf,
    session: "close",
    valuationType: "market_close",
    portfolioValueCents: snapshot.portfolioValueCents,
    prices: {
      BTCUSD: snapshot.prices.BTCUSD,
      SPY: snapshot.prices.SPY,
      GLD: snapshot.prices.GLD,
      MSTR: snapshot.prices.MSTR,
      ASST: snapshot.prices.ASST,
      MPJPY: snapshot.prices.MPJPY,
    },
    sourceName: "Coinbase + Yahoo Finance chart",
    sourceUrl: "https://api.exchange.coinbase.com/products/BTC-USD/candles",
    retrievedAt: snapshot.retrievedAt,
    manual: false,
    note: `Official market-close snapshot. Portfolio ${formatUsdFromCents(snapshot.portfolioValueCents)} reconciled from published shares × confirmed closes.`,
  };
}

export function buildMarketPrices(snapshot: OfficialCloseSnapshot): MarketPrice[] {
  const order = ["BTCUSD", "SPY", "GLD", "MSTR", "ASST", "MPJPY"] as const;
  return order.map((symbol) => {
    const source = snapshot.sources[symbol];
    return {
      symbol,
      asOf: snapshot.asOf,
      priceCents: source.priceCents,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      retrievedAt: source.retrievedAt,
      manual: false,
      note: `${source.note}.`,
    };
  });
}

export function applySnapshotToPortfolio(
  portfolio: PortfolioData,
  snapshot: OfficialCloseSnapshot,
): PortfolioData {
  const byTicker = new Map(
    snapshot.positionMarks.map((p) => [p.ticker, p] as const),
  );
  const longDate = formatLongDate(snapshot.sessionDay);
  const pnl = snapshot.investmentPnLCents;
  const pnlPct =
    snapshot.netExternalContributionsCents === 0
      ? null
      : pnl / snapshot.netExternalContributionsCents;

  return {
    ...portfolio,
    currentValuationAt: snapshot.asOf,
    currentPortfolioValueCents: snapshot.portfolioValueCents,
    dataQuality: "confirmed",
    positions: portfolio.positions.map((position) => {
      const mark = byTicker.get(position.ticker);
      if (!mark) return position;
      return {
        ...position,
        priceCents: mark.priceCents,
        marketValueCents: mark.marketValueCents,
      };
    }),
    notes: [
      `Official current valuation is the ${longDate} 4:00 p.m. Eastern regular-market close: ${formatUsdFromCents(snapshot.portfolioValueCents)}.`,
      snapshot.reconciliationNote.replace(/^Official market-close snapshot\. Reconciled /, "Reconciled "),
      "Episode 1 remains the inception snapshot at $1,999.91 (8:00 a.m. Eastern on September 16).",
      `No new contributions, withdrawals, trades, dividends, or options income recorded through the ${longDate} close.`,
      `Investment P&L at ${longDate} close: ${formatUsdFromCents(pnl, { showSign: true })}${pnlPct == null ? "" : ` (${(pnlPct * 100).toFixed(2)}% vs net external contributions)`}.`,
      "cashBalanceCents remains 0 pending a confirmed regular-session cash figure. Do not treat brokerage buying power as cash.",
    ],
  };
}

export type AppendMarketCloseResult =
  | { status: "skipped"; sessionDay: string; reason: string }
  | {
      status: "appended";
      sessionDay: string;
      snapshot: OfficialCloseSnapshot;
      wrote: boolean;
    };

export async function appendMarketCloseForDay(args: {
  sessionDay: string;
  write: boolean;
  fetchImpl?: typeof fetch;
}): Promise<AppendMarketCloseResult> {
  const observationsFile = loadMarketObservations();
  if (observationAlreadyExists(observationsFile.observations, args.sessionDay)) {
    return {
      status: "skipped",
      sessionDay: args.sessionDay,
      reason: "market_close observation already exists",
    };
  }

  const portfolio = loadPortfolio();
  const transactions = loadTransactions().transactions;
  const snapshot = await fetchOfficialCloseSnapshot({
    portfolio,
    transactions,
    sessionDay: args.sessionDay,
    fetchImpl: args.fetchImpl,
  });

  if (!args.write) {
    return { status: "appended", sessionDay: args.sessionDay, snapshot, wrote: false };
  }

  const valuationHistory = loadValuationHistory();
  const marketPrices = loadMarketPrices();
  const observation = buildMarketObservation(snapshot);
  const historyPoint = buildValuationHistoryPoint(snapshot);
  const updatedPortfolio = applySnapshotToPortfolio(portfolio, snapshot);

  if (valuationHistory.points.some((p) => p.id === historyPoint.id)) {
    return {
      status: "skipped",
      sessionDay: args.sessionDay,
      reason: "valuation-history point already exists",
    };
  }

  writeJson("market-observations.json", {
    ...observationsFile,
    observations: [...observationsFile.observations, observation],
  });
  writeJson("valuation-history.json", {
    ...valuationHistory,
    points: [...valuationHistory.points, historyPoint],
  });
  writeJson("market-prices.json", {
    ...marketPrices,
    prices: buildMarketPrices(snapshot),
  });
  writeJson("portfolio.json", updatedPortfolio);

  return { status: "appended", sessionDay: args.sessionDay, snapshot, wrote: true };
}

export async function appendMarketCloseCatchUp(args: {
  write: boolean;
  throughDay?: string;
  fetchImpl?: typeof fetch;
}): Promise<AppendMarketCloseResult[]> {
  const observations = loadMarketObservations().observations;
  const closes = observations
    .filter((o) => o.valuationType === "market_close")
    .map((o) => etCalendarDay(o.timestamp))
    .sort();
  const lastClose = closes[closes.length - 1];
  if (!lastClose) {
    throw new Error("No existing market_close observation to catch up from");
  }
  const through =
    args.throughDay ?? latestCompletedEquitySessionDay(new Date());
  const days = etWeekdaysAfterThrough(lastClose, through);
  const results: AppendMarketCloseResult[] = [];
  for (const day of days) {
    results.push(
      await appendMarketCloseForDay({
        sessionDay: day,
        write: args.write,
        fetchImpl: args.fetchImpl,
      }),
    );
  }
  return results;
}
