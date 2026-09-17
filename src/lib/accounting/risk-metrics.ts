export type TotalReturnObservation = {
  asOf: string;
  totalReturn: number;
};

export type RiskMetricsResult = {
  available: boolean;
  reason?: string;
  annualizedTotalReturn: number | null;
  annualizedVolatility: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maximumDrawdown: number | null;
  incomeToVolatilityRatio: number | null;
  observationCount: number;
};

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function sampleStdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Build period total returns from price + distribution series.
 * return_t = (price_t + dist_t) / price_(t-1) - 1
 */
export function periodTotalReturnsFromPrices(args: {
  pricesCents: number[];
  distributionsCents: number[];
}): number[] {
  const returns: number[] = [];
  for (let i = 1; i < args.pricesCents.length; i += 1) {
    const prev = args.pricesCents[i - 1]!;
    const price = args.pricesCents[i]!;
    const dist = args.distributionsCents[i] ?? 0;
    if (prev <= 0) continue;
    returns.push((price + dist) / prev - 1);
  }
  return returns;
}

export function calculateMaximumDrawdown(values: number[]): number | null {
  if (values.length === 0) return null;
  let peak = values[0]!;
  let maxDd = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const dd = (value - peak) / peak;
      if (dd < maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

export function calculateRiskMetrics(args: {
  periodReturns: number[];
  wealthPath?: number[];
  periodsPerYear?: number;
  riskFreeRate?: number;
  minimumAcceptableReturn?: number;
  minObservations: number;
  currentIndicatedYield?: number | null;
  /** Guard: never treat projected terminal assumptions as historical. */
  seriesKind: "historical" | "projected";
}): RiskMetricsResult {
  if (args.seriesKind !== "historical") {
    return {
      available: false,
      reason: "Projected assumptions are not historical results",
      annualizedTotalReturn: null,
      annualizedVolatility: null,
      sharpeRatio: null,
      sortinoRatio: null,
      maximumDrawdown: null,
      incomeToVolatilityRatio: null,
      observationCount: args.periodReturns.length,
    };
  }

  const n = args.periodReturns.length;
  if (n < args.minObservations) {
    return {
      available: false,
      reason: "Insufficient history",
      annualizedTotalReturn: null,
      annualizedVolatility: null,
      sharpeRatio: null,
      sortinoRatio: null,
      maximumDrawdown: null,
      incomeToVolatilityRatio: null,
      observationCount: n,
    };
  }

  const periodsPerYear = args.periodsPerYear ?? 12;
  const avg = mean(args.periodReturns);
  const vol = sampleStdDev(args.periodReturns);
  const annualizedTotalReturn = (1 + avg) ** periodsPerYear - 1;
  const annualizedVolatility =
    vol == null ? null : vol * Math.sqrt(periodsPerYear);
  const rf = args.riskFreeRate ?? 0;
  const mar = args.minimumAcceptableReturn ?? rf;

  const sharpeRatio =
    annualizedVolatility == null || annualizedVolatility === 0
      ? null
      : (annualizedTotalReturn - rf) / annualizedVolatility;

  const downside = args.periodReturns.map((r) => Math.min(0, r - mar / periodsPerYear));
  const downsideDev = sampleStdDev(downside.map((d) => d));
  const annualizedDownside =
    downsideDev == null ? null : downsideDev * Math.sqrt(periodsPerYear);
  const sortinoRatio =
    annualizedDownside == null || annualizedDownside === 0
      ? null
      : (annualizedTotalReturn - mar) / annualizedDownside;

  const maximumDrawdown =
    args.wealthPath != null
      ? calculateMaximumDrawdown(args.wealthPath)
      : null;

  const incomeToVolatilityRatio =
    args.currentIndicatedYield != null &&
    annualizedVolatility != null &&
    annualizedVolatility > 0
      ? args.currentIndicatedYield / annualizedVolatility
      : null;

  return {
    available: true,
    annualizedTotalReturn,
    annualizedVolatility,
    sharpeRatio,
    sortinoRatio,
    maximumDrawdown,
    incomeToVolatilityRatio,
    observationCount: n,
  };
}
