import type { PortfolioTransaction } from "@/lib/schemas/transactions";
import type { ValuationHistoryPoint } from "@/lib/schemas/valuation-history";
import {
  calculateCashFlowMatchedBenchmark,
  extractExternalCashFlows,
} from "./benchmarks";
import { calculateInvestmentPnL, summarizeContributions } from "./portfolio";

export type ValuationChartRow = {
  id: string;
  label: string;
  asOf: string;
  session: "open" | "close";
  portfolio: number | null;
  btc: number | null;
  spy: number | null;
  gld: number | null;
  portfolioReturn: number | null;
  btcReturn: number | null;
  spyReturn: number | null;
  gldReturn: number | null;
  cashFlowPortfolio: number | null;
  cashFlowBtc: number | null;
  cashFlowSpy: number | null;
  cashFlowGld: number | null;
};

function formatSessionLabel(point: ValuationHistoryPoint): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(new Date(point.asOf));
  const kind =
    point.valuationType === "inception"
      ? "inception"
      : point.valuationType === "market_open"
        ? "market open"
        : "market close";
  return `${date} ${kind}`;
}

function centsToDollars(cents: number | null | undefined): number | null {
  return cents == null ? null : cents / 100;
}

function returnFromBase(
  value: number | null,
  base: number | null,
): number | null {
  if (value == null || base == null || base === 0) return null;
  return value / base - 1;
}

/**
 * Build chart-ready open/close series for the portfolio and benchmarks.
 * Official performance uses stored portfolio values; benchmark legs appear
 * only when confirmed prices exist for that session.
 */
export function buildValuationChartSeries(args: {
  points: ValuationHistoryPoint[];
  transactions: PortfolioTransaction[];
}): ValuationChartRow[] {
  const points = [...args.points].sort(
    (a, b) => Date.parse(a.asOf) - Date.parse(b.asOf),
  );
  const contributions = summarizeContributions(args.transactions);
  const cashFlows = extractExternalCashFlows(args.transactions);

  const firstBtc = points.find((p) => p.prices.BTCUSD != null)?.prices.BTCUSD ?? null;
  const firstSpy = points.find((p) => p.prices.SPY != null)?.prices.SPY ?? null;
  const firstGld = points.find((p) => p.prices.GLD != null)?.prices.GLD ?? null;

  return points.map((point) => {
    const portfolioPnL =
      point.portfolioValueCents == null
        ? null
        : calculateInvestmentPnL({
            currentPortfolioValueCents: point.portfolioValueCents,
            totalExternalContributionsCents:
              contributions.totalExternalContributionsCents,
          });
    const portfolioReturn =
      portfolioPnL == null || contributions.netExternalContributionsCents === 0
        ? null
        : portfolioPnL / contributions.netExternalContributionsCents;

    const btcMatched = calculateCashFlowMatchedBenchmark({
      symbol: "BTCUSD",
      cashFlows,
      prices: points
        .filter(
          (p) =>
            p.prices.BTCUSD != null && Date.parse(p.asOf) <= Date.parse(point.asOf),
        )
        .map((p) => ({ asOf: p.asOf, priceCents: p.prices.BTCUSD as number })),
      asOf: point.asOf,
    });
    const spyMatched = calculateCashFlowMatchedBenchmark({
      symbol: "SPY",
      cashFlows,
      prices: points
        .filter(
          (p) => p.prices.SPY != null && Date.parse(p.asOf) <= Date.parse(point.asOf),
        )
        .map((p) => ({ asOf: p.asOf, priceCents: p.prices.SPY as number })),
      asOf: point.asOf,
    });
    const gldMatched = calculateCashFlowMatchedBenchmark({
      symbol: "GLD",
      cashFlows,
      prices: points
        .filter(
          (p) => p.prices.GLD != null && Date.parse(p.asOf) <= Date.parse(point.asOf),
        )
        .map((p) => ({ asOf: p.asOf, priceCents: p.prices.GLD as number })),
      asOf: point.asOf,
    });

    return {
      id: point.id,
      label: formatSessionLabel(point),
      asOf: point.asOf,
      session: point.session,
      portfolio: centsToDollars(point.portfolioValueCents),
      btc: centsToDollars(point.prices.BTCUSD),
      spy: centsToDollars(point.prices.SPY),
      gld: centsToDollars(point.prices.GLD),
      portfolioReturn,
      btcReturn: returnFromBase(point.prices.BTCUSD, firstBtc),
      spyReturn: returnFromBase(point.prices.SPY, firstSpy),
      gldReturn: returnFromBase(point.prices.GLD, firstGld),
      cashFlowPortfolio: centsToDollars(point.portfolioValueCents),
      cashFlowBtc: centsToDollars(btcMatched.valueCents),
      cashFlowSpy: centsToDollars(spyMatched.valueCents),
      cashFlowGld: centsToDollars(gldMatched.valueCents),
    };
  });
}

export function valuationHistoryHasBenchmarkPrices(
  points: ValuationHistoryPoint[],
): boolean {
  return points.some(
    (point) =>
      point.prices.BTCUSD != null ||
      point.prices.SPY != null ||
      point.prices.GLD != null,
  );
}
