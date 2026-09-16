import type { PortfolioTransaction } from "@/lib/schemas/transactions";
import { isExternalContribution, isExternalWithdrawal } from "./portfolio";

export type BenchmarkPricePoint = {
  asOf: string;
  priceCents: number;
};

export type CashFlowEvent = {
  timestamp: string;
  amountCents: number;
};

export type CashFlowMatchedSeries = {
  symbol: string;
  units: number;
  valueCents: number | null;
  available: boolean;
  reason?: string;
};

/**
 * Cash-flow-matched benchmark:
 * Buy units with each external contribution at that timestamp's price;
 * sell/reduce units for external withdrawals; multiply by latest price.
 */
export function extractExternalCashFlows(
  transactions: PortfolioTransaction[],
): CashFlowEvent[] {
  const events: CashFlowEvent[] = [];
  for (const tx of transactions) {
    if (isExternalContribution(tx)) {
      events.push({ timestamp: tx.timestamp, amountCents: tx.amountCents });
    } else if (isExternalWithdrawal(tx)) {
      events.push({
        timestamp: tx.timestamp,
        amountCents: -Math.abs(tx.amountCents),
      });
    }
  }
  return events.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function etCalendarDay(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

/**
 * Prefer a price at or before the cash-flow timestamp.
 * If funding occurs earlier the same Eastern day than the 4:00 p.m. valuation
 * print, use that same-day valuation price. Otherwise use the next available price.
 */
function priceForTimestamp(
  prices: BenchmarkPricePoint[],
  timestamp: string,
): number | null {
  const target = Date.parse(timestamp);
  const atOrBefore = prices
    .filter((p) => Date.parse(p.asOf) <= target)
    .sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf));
  if (atOrBefore[0]) return atOrBefore[0].priceCents;

  const day = etCalendarDay(timestamp);
  const sameDay = prices
    .filter((p) => etCalendarDay(p.asOf) === day)
    .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf));
  if (sameDay[0]) return sameDay[0].priceCents;

  const after = prices
    .filter((p) => Date.parse(p.asOf) > target)
    .sort((a, b) => Date.parse(a.asOf) - Date.parse(b.asOf));
  return after[0]?.priceCents ?? null;
}

export function calculateCashFlowMatchedBenchmark(args: {
  symbol: string;
  cashFlows: CashFlowEvent[];
  prices: BenchmarkPricePoint[];
  asOf: string;
}): CashFlowMatchedSeries {
  if (args.prices.length === 0 || args.prices.some((p) => p.priceCents == null)) {
    return {
      symbol: args.symbol,
      units: 0,
      valueCents: null,
      available: false,
      reason: "Benchmark prices unavailable",
    };
  }

  let units = 0;
  for (const flow of args.cashFlows) {
    const price = priceForTimestamp(args.prices, flow.timestamp);
    if (price == null || price <= 0) {
      return {
        symbol: args.symbol,
        units: 0,
        valueCents: null,
        available: false,
        reason: `Missing price for cash flow at ${flow.timestamp}`,
      };
    }
    if (flow.amountCents >= 0) {
      units += flow.amountCents / price;
    } else {
      units -= Math.abs(flow.amountCents) / price;
    }
  }

  const latestPrice = priceForTimestamp(args.prices, args.asOf);
  if (latestPrice == null) {
    return {
      symbol: args.symbol,
      units,
      valueCents: null,
      available: false,
      reason: "Missing latest benchmark price",
    };
  }

  return {
    symbol: args.symbol,
    units,
    valueCents: Math.round(units * latestPrice),
    available: true,
  };
}

export function contributionAdjustedReturn(args: {
  investmentPnLCents: number;
  netExternalContributionsCents: number;
}): number | null {
  if (args.netExternalContributionsCents === 0) return null;
  return args.investmentPnLCents / args.netExternalContributionsCents;
}

export function normalizeSeriesToZero(values: (number | null)[]): (number | null)[] {
  const firstDefined = values.find((v) => v != null);
  if (firstDefined == null || firstDefined === 0) {
    return values.map(() => null);
  }
  return values.map((value) =>
    value == null ? null : value / firstDefined - 1,
  );
}
