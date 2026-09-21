export type PortfolioValuePoint = { label: string; value: number | null };

export type CashFlowChartPoint = {
  label: string;
  portfolio: number | null;
  btc: number | null;
  spy: number | null;
  gld: number | null;
};

export type LiveChartTrailInput = {
  portfolioDollars: number;
  asOf: string;
  /** Live benchmark prices in dollars (null when unavailable). */
  btcDollars: number | null;
  spyDollars: number | null;
  gldDollars: number | null;
};

export type LastBenchmarkPrices = {
  btc: number | null;
  spy: number | null;
  gld: number | null;
};

function liveChartLabel(asOf: string): string {
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(new Date(asOf));
  return `${date} live`;
}

function scaleCashFlowLeg(
  lastValue: number | null,
  lastPrice: number | null,
  livePrice: number | null,
): number | null {
  if (
    lastValue == null ||
    lastPrice == null ||
    livePrice == null ||
    lastPrice === 0
  ) {
    return null;
  }
  return lastValue * (livePrice / lastPrice);
}

function lastNonNull(
  points: CashFlowChartPoint[],
  key: keyof Omit<CashFlowChartPoint, "label">,
): number | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    const value = points[i]?.[key];
    if (value != null) return value;
  }
  return null;
}

/**
 * Keep every historical open/close point and append one live trailing tip.
 * Does not mutate stored valuation history.
 */
export function appendLiveTrailingChartPoints(args: {
  valueChart: PortfolioValuePoint[];
  cashFlowChart: CashFlowChartPoint[];
  lastBenchmarkPrices: LastBenchmarkPrices;
  live: LiveChartTrailInput | null;
}): {
  valueChart: PortfolioValuePoint[];
  cashFlowChart: CashFlowChartPoint[];
  usingLive: boolean;
} {
  if (!args.live) {
    return {
      valueChart: args.valueChart,
      cashFlowChart: args.cashFlowChart,
      usingLive: false,
    };
  }

  const label = liveChartLabel(args.live.asOf);
  const lastCf = args.cashFlowChart;

  return {
    usingLive: true,
    valueChart: [
      ...args.valueChart,
      { label, value: args.live.portfolioDollars },
    ],
    cashFlowChart: [
      ...args.cashFlowChart,
      {
        label,
        portfolio: args.live.portfolioDollars,
        btc: scaleCashFlowLeg(
          lastNonNull(lastCf, "btc"),
          args.lastBenchmarkPrices.btc,
          args.live.btcDollars,
        ),
        spy: scaleCashFlowLeg(
          lastNonNull(lastCf, "spy"),
          args.lastBenchmarkPrices.spy,
          args.live.spyDollars,
        ),
        gld: scaleCashFlowLeg(
          lastNonNull(lastCf, "gld"),
          args.lastBenchmarkPrices.gld,
          args.live.gldDollars,
        ),
      },
    ],
  };
}

/** Walk valuation series for the latest confirmed raw benchmark prices (dollars). */
export function lastConfirmedBenchmarkPrices(
  series: Array<{ btc: number | null; spy: number | null; gld: number | null }>,
): LastBenchmarkPrices {
  let btc: number | null = null;
  let spy: number | null = null;
  let gld: number | null = null;
  for (const row of series) {
    if (row.btc != null) btc = row.btc;
    if (row.spy != null) spy = row.spy;
    if (row.gld != null) gld = row.gld;
  }
  return { btc, spy, gld };
}
