import type { PortfolioTransaction } from "@/lib/schemas/transactions";
import { calculateCashFlowMatchedBenchmark, extractExternalCashFlows } from "./benchmarks";
import {
  calculateInvestmentPnL,
  netExternalCashFlowBetween,
  sharesHeldAt,
  summarizeContributions,
  transactionsThrough,
} from "./portfolio";
import { flowAdjustedPortfolioReturn, sessionReturn } from "./session-comparison";

export const PERFORMANCE_BENCHMARKS = ["BTCUSD", "SPY", "GLD"] as const;
export type PerformanceBenchmark = (typeof PERFORMANCE_BENCHMARKS)[number];

export type PeriodId = "1d" | "1w" | "mtd" | "inception";

/** An official market close: portfolio value plus per-symbol close prices (cents). */
export type PerformanceClose = {
  id: string;
  timestamp: string;
  portfolioValueCents: number | null;
  prices: Partial<Record<string, number | null>>;
};

/** The end of every window: the latest official close, or a transient live mark. */
export type PerformanceEnd = {
  asOf: string;
  live: boolean;
  portfolioValueCents: number;
  prices: Partial<Record<string, number | null>>;
};

export type HoldingContribution = {
  ticker: string;
  /** Close price at the window start, or the purchase price for shares bought inside it. */
  startPriceCents: number | null;
  endPriceCents: number | null;
  priceReturn: number | null;
  /** Dollar gain or loss this holding added to the portfolio over the window. */
  contributionCents: number | null;
  endValueCents: number | null;
  boughtInWindow: boolean;
};

export type PeriodPerformance = {
  id: PeriodId;
  startAt: string;
  endAt: string;
  /**
   * Since inception: investment P&L ÷ net external contributions (matches the
   * headline). Shorter windows: chain-linked return excluding new money.
   */
  portfolioReturn: number | null;
  method: "contribution_adjusted" | "time_weighted";
  /** Investment gain or loss over the window, excluding external cash flow. */
  portfolioChangeCents: number | null;
  /**
   * Since inception: cash-flow-matched benchmark return (same deposits, same
   * dates). Shorter windows: price return over the same start and end.
   */
  benchmarks: Record<PerformanceBenchmark, number | null>;
  /** Sorted by contribution, largest gain first. */
  holdings: HoldingContribution[];
  /** Portfolio change not explained by priced holdings (cash, rounding, pre-first-close moves). */
  unattributedCents: number | null;
};

const MS_PER_DAY = 86_400_000;

function etYearMonth(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(timestamp));
}

function priceOf(prices: Partial<Record<string, number | null>>, symbol: string): number | null {
  const value = prices[symbol];
  return value == null ? null : value;
}

function holdingContributions(args: {
  positions: Array<{ ticker: string; shares: number }>;
  transactions: PortfolioTransaction[];
  start: PerformanceClose;
  end: PerformanceEnd;
}): HoldingContribution[] {
  const startMs = Date.parse(args.start.timestamp);
  const endMs = Date.parse(args.end.asOf);
  return args.positions
    .map((position) => {
      const sharesStart = sharesHeldAt(position, args.transactions, args.start.timestamp);
      const sharesEnd = args.end.live
        ? position.shares
        : sharesHeldAt(position, args.transactions, args.end.asOf);
      let boughtCents = 0;
      let boughtShares = 0;
      let soldCents = 0;
      for (const tx of args.transactions) {
        if (tx.ticker !== position.ticker || tx.shares == null) continue;
        const t = Date.parse(tx.timestamp);
        if (t <= startMs || (!args.end.live && t > endMs)) continue;
        const amount = tx.amountCents ?? (tx.priceCents == null ? null : tx.priceCents * tx.shares);
        if (tx.category === "security_purchase") {
          boughtShares += tx.shares;
          boughtCents += amount ?? Number.NaN;
        }
        if (tx.category === "security_sale") soldCents += Math.abs(amount ?? Number.NaN);
      }
      const startPrice = priceOf(args.start.prices, position.ticker);
      const endPrice = priceOf(args.end.prices, position.ticker);
      const boughtInWindow = sharesStart === 0 && boughtShares > 0;
      const referencePrice = boughtInWindow
        ? Math.round(boughtCents / boughtShares)
        : sharesStart > 0
          ? startPrice
          : null;
      const startValue =
        sharesStart === 0 ? 0 : startPrice == null ? null : sharesStart * startPrice;
      const endValue = sharesEnd === 0 ? 0 : endPrice == null ? null : sharesEnd * endPrice;
      const contribution =
        startValue == null || endValue == null
          ? null
          : Math.round(endValue - startValue - boughtCents + soldCents);
      return {
        ticker: position.ticker,
        startPriceCents: Number.isFinite(referencePrice) ? referencePrice : null,
        endPriceCents: endPrice,
        priceReturn: Number.isFinite(referencePrice)
          ? sessionReturn(referencePrice, endPrice)
          : null,
        contributionCents: Number.isFinite(contribution) ? contribution : null,
        endValueCents: endValue == null ? null : Math.round(endValue),
        boughtInWindow,
      };
    })
    .filter((h) => h.endValueCents !== 0 || h.contributionCents !== 0)
    .sort((a, b) => (b.contributionCents ?? -Infinity) - (a.contributionCents ?? -Infinity));
}

function unattributed(change: number | null, holdings: HoldingContribution[]): number | null {
  if (change == null || holdings.some((h) => h.contributionCents == null)) return null;
  return change - holdings.reduce((sum, h) => sum + (h.contributionCents ?? 0), 0);
}

/** Chain-linked, flow-excluded portfolio return from `start` through the end. */
function chainedReturn(args: {
  closes: PerformanceClose[];
  startIndex: number;
  end: PerformanceEnd;
  transactions: PortfolioTransaction[];
}): number | null {
  let growth = 1;
  let prev = args.closes[args.startIndex]!;
  const legs: Array<{ asOf: string; value: number | null; openEnded: boolean }> = args.closes
    .slice(args.startIndex + 1)
    .map((c) => ({ asOf: c.timestamp, value: c.portfolioValueCents, openEnded: false }));
  if (args.end.live) {
    legs.push({ asOf: args.end.asOf, value: args.end.portfolioValueCents, openEnded: true });
  }
  for (const leg of legs) {
    const flow = netExternalCashFlowBetween(
      args.transactions,
      prev.timestamp,
      leg.openEnded ? undefined : leg.asOf,
    );
    const r = flowAdjustedPortfolioReturn(prev.portfolioValueCents, leg.value, flow);
    if (r == null) return null;
    growth *= 1 + r;
    prev = { id: leg.asOf, timestamp: leg.asOf, portfolioValueCents: leg.value, prices: {} };
  }
  return growth - 1;
}

function pickStartIndex(
  id: Exclude<PeriodId, "inception">,
  anchors: PerformanceClose[],
  endAt: string,
) {
  if (anchors.length === 0) return -1;
  if (id === "1d") return anchors.length - 1;
  if (id === "1w") {
    const cutoff = Date.parse(endAt) - 7 * MS_PER_DAY;
    for (let i = anchors.length - 1; i >= 0; i -= 1) {
      if (Date.parse(anchors[i]!.timestamp) <= cutoff) return i;
    }
    return 0;
  }
  const month = etYearMonth(endAt);
  for (let i = anchors.length - 1; i >= 0; i -= 1) {
    if (etYearMonth(anchors[i]!.timestamp) < month) return i;
  }
  return 0;
}

/**
 * Performance over 1 day, 1 week, month to date, and since inception, with each
 * holding's dollar contribution. Holdings are attributed from official closes
 * (or purchase prices inside a window); anything left over is reported as
 * unattributed rather than assigned to a holding.
 */
export function buildPerformancePeriods(args: {
  /** Official market closes in ascending order. */
  closes: PerformanceClose[];
  inception: { asOf: string; portfolioValueCents: number };
  positions: Array<{ ticker: string; shares: number }>;
  transactions: PortfolioTransaction[];
  end: PerformanceEnd;
}): PeriodPerformance[] {
  const endMs = Date.parse(args.end.asOf);
  const history = args.closes.filter((c) => Date.parse(c.timestamp) <= endMs);
  const anchors = args.end.live ? history : history.slice(0, -1);
  const periods: PeriodPerformance[] = [];

  for (const id of ["1d", "1w", "mtd"] as const) {
    const startIndex = pickStartIndex(id, anchors, args.end.asOf);
    if (startIndex < 0) continue;
    const start = anchors[startIndex]!;
    const flow = netExternalCashFlowBetween(
      args.transactions,
      start.timestamp,
      args.end.live ? undefined : args.end.asOf,
    );
    const change =
      start.portfolioValueCents == null
        ? null
        : args.end.portfolioValueCents - start.portfolioValueCents - flow;
    const holdings = holdingContributions({ ...args, start, end: args.end });
    periods.push({
      id,
      startAt: start.timestamp,
      endAt: args.end.asOf,
      portfolioReturn: chainedReturn({
        closes: history,
        startIndex,
        end: args.end,
        transactions: args.transactions,
      }),
      method: "time_weighted",
      portfolioChangeCents: change,
      benchmarks: Object.fromEntries(
        PERFORMANCE_BENCHMARKS.map((s) => [
          s,
          sessionReturn(priceOf(start.prices, s), priceOf(args.end.prices, s)),
        ]),
      ) as Record<PerformanceBenchmark, number | null>,
      holdings,
      unattributedCents: unattributed(change, holdings),
    });
  }

  const firstClose = history[0];
  if (firstClose) {
    const flowsToEnd = args.end.live
      ? args.transactions
      : transactionsThrough(args.transactions, args.end.asOf);
    const contributions = summarizeContributions(flowsToEnd);
    const pnl = calculateInvestmentPnL({
      currentPortfolioValueCents: args.end.portfolioValueCents,
      totalExternalContributionsCents: contributions.totalExternalContributionsCents,
    });
    const net = contributions.netExternalContributionsCents;
    const cashFlows = extractExternalCashFlows(flowsToEnd);
    const holdings = holdingContributions({ ...args, start: firstClose, end: args.end });
    periods.push({
      id: "inception",
      startAt: args.inception.asOf,
      endAt: args.end.asOf,
      portfolioReturn: net === 0 ? null : pnl / net,
      method: "contribution_adjusted",
      portfolioChangeCents: pnl,
      benchmarks: Object.fromEntries(
        PERFORMANCE_BENCHMARKS.map((s) => {
          const prices = [
            ...history.map((c) => ({ asOf: c.timestamp, priceCents: priceOf(c.prices, s) })),
            ...(args.end.live
              ? [{ asOf: args.end.asOf, priceCents: priceOf(args.end.prices, s) }]
              : []),
          ].filter((p): p is { asOf: string; priceCents: number } => p.priceCents != null);
          const matched = calculateCashFlowMatchedBenchmark({
            symbol: s,
            cashFlows,
            prices,
            asOf: args.end.asOf,
          });
          return [
            s,
            matched.valueCents == null || net === 0 ? null : (matched.valueCents - net) / net,
          ];
        }),
      ) as Record<PerformanceBenchmark, number | null>,
      holdings,
      unattributedCents: unattributed(pnl, holdings),
    });
  }

  return periods;
}
