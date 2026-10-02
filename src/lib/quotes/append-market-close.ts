import { writeFileSync } from "node:fs";
import path from "node:path";
import { formatUsdFromCents } from "@/lib/accounting/format";
import {
  etWeekdaysAfterThrough,
  latestCompletedEquitySessionDay,
} from "@/lib/market/session-close";
import { etCalendarDay } from "@/lib/market/session";
import {
  appendCarryForwardClarification,
  equityCarryForwardLabels,
} from "@/lib/quotes/price-carry-forward";
import {
  fetchOfficialCloseSnapshot,
  OFFICIAL_CLOSE_EQUITY_SYMBOLS,
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
import type { PortfolioTransaction } from "@/lib/schemas/transactions";

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

function snapshotCarryForwardLabels(snapshot: OfficialCloseSnapshot): string[] {
  return equityCarryForwardLabels({
    sources: Object.fromEntries(
      Object.entries(snapshot.sources).map(([ticker, source]) => [
        ticker,
        { fallbackUsed: source.fallbackUsed },
      ]),
    ),
  });
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

const SNAPSHOT_SYMBOLS = ["BTCUSD", ...OFFICIAL_CLOSE_EQUITY_SYMBOLS] as const;

export function buildMarketObservation(
  snapshot: OfficialCloseSnapshot,
): SynchronizedMarketObservation {
  return {
    id: `mo-${snapshot.sessionDay}-close`,
    timestamp: snapshot.asOf,
    timezone: "America/New_York",
    valuationType: "market_close",
    prices: { ...snapshot.prices },
    sources: Object.fromEntries(
      SNAPSHOT_SYMBOLS.map((symbol) => {
        const source = snapshot.sources[symbol];
        return [
          symbol,
          {
            name: source.sourceName,
            url: source.sourceUrl,
            observedAt: source.observedAt,
            retrievedAt: source.retrievedAt,
            fallbackUsed: source.fallbackUsed,
            note: source.note,
          },
        ];
      }),
    ) as SynchronizedMarketObservation["sources"],
    portfolioValueCents: snapshot.portfolioValueCents,
    netExternalContributionsCents: snapshot.netExternalContributionsCents,
    note: appendCarryForwardClarification(
      snapshot.reconciliationNote,
      snapshotCarryForwardLabels(snapshot),
    ),
  };
}

export function buildValuationHistoryPoint(
  snapshot: OfficialCloseSnapshot,
): ValuationHistoryPoint {
  const carryLabels = snapshotCarryForwardLabels(snapshot);
  const base = `Official market-close snapshot. Portfolio ${formatUsdFromCents(snapshot.portfolioValueCents)} reconciled from published shares × confirmed closes.`;
  return {
    id: `vh-${snapshot.sessionDay}-close`,
    asOf: snapshot.asOf,
    session: "close",
    valuationType: "market_close",
    portfolioValueCents: snapshot.portfolioValueCents,
    prices: { ...snapshot.prices },
    sourceName: "Coinbase + Yahoo Finance chart",
    sourceUrl: "https://api.exchange.coinbase.com/products/BTC-USD/candles",
    retrievedAt: snapshot.retrievedAt,
    manual: false,
    note: appendCarryForwardClarification(base, carryLabels),
  };
}

export function buildMarketPrices(snapshot: OfficialCloseSnapshot): MarketPrice[] {
  const order = ["BTCUSD", "SPY", "GLD", "MSTR", "ASST", "MPJPY", "SPCX"] as const;
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

const CATEGORY_LABEL: Partial<Record<PortfolioTransaction["category"], string>> = {
  personal_contribution: "personal contribution",
  youtube_revenue_contribution: "YouTube-revenue contribution",
  affiliate_revenue_contribution: "affiliate-revenue contribution",
  sponsorship_revenue_contribution: "sponsorship-revenue contribution",
  viewer_support_contribution: "viewer-support contribution",
  withdrawal: "withdrawal",
  dividend: "dividend",
  options_premium: "options premium",
  interest: "interest",
  fee: "fee",
};

function describeTransaction(tx: PortfolioTransaction): string {
  const day = etCalendarDay(tx.timestamp);
  if (tx.category === "security_purchase" || tx.category === "security_sale") {
    const verb = tx.category === "security_purchase" ? "bought" : "sold";
    const price = tx.priceCents == null ? "" : ` at ${formatUsdFromCents(tx.priceCents)}`;
    return `${verb} ${tx.shares ?? "?"} ${tx.ticker ?? "?"}${price} (${day})`;
  }
  const label = CATEGORY_LABEL[tx.category] ?? tx.category.replace(/_/g, " ");
  const amount = tx.amountCents == null ? "" : ` of ${formatUsdFromCents(Math.abs(tx.amountCents))}`;
  return `${label}${amount} (${day})`;
}

export function portfolioActivityNote(args: {
  transactions: PortfolioTransaction[];
  inceptionAt: string;
  asOf: string;
  longDate: string;
}): string {
  const start = Date.parse(args.inceptionAt);
  const end = Date.parse(args.asOf);
  const activity = args.transactions
    .filter((tx) => Date.parse(tx.timestamp) > start && Date.parse(tx.timestamp) <= end)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  if (activity.length === 0) {
    return `No new contributions, withdrawals, trades, dividends, or options income recorded through the ${args.longDate} close.`;
  }
  return `Recorded since Episode 1 through the ${args.longDate} close: ${activity.map(describeTransaction).join("; ")}. Contributions are excluded from investment P&L.`;
}

export function applySnapshotToPortfolio(
  portfolio: PortfolioData,
  snapshot: OfficialCloseSnapshot,
  transactions: PortfolioTransaction[],
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
  const carryLabels = snapshotCarryForwardLabels(snapshot);

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
      ...carryLabels.map(
        (label) =>
          `${label} The total is still a valid market-close valuation, but one component is estimated from its last available close.`,
      ),
      "Episode 1 remains the inception snapshot at $1,999.91 (8:00 a.m. Eastern on September 16).",
      portfolioActivityNote({
        transactions,
        inceptionAt: portfolio.inceptionValuationAt,
        asOf: snapshot.asOf,
        longDate,
      }),
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
  const updatedPortfolio = applySnapshotToPortfolio(portfolio, snapshot, transactions);

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
