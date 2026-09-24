/**
 * Diluted sats per share = bitcoin holdings (sats) / diluted shares.
 * Keep full precision; round only final look-through position sats.
 */

export function calculateDilutedSatsPerShare(args: {
  bitcoinHoldingsSats: number | null;
  assumedDilutedSharesOutstanding: number | null;
}): number | null {
  if (
    args.bitcoinHoldingsSats == null ||
    args.assumedDilutedSharesOutstanding == null ||
    args.assumedDilutedSharesOutstanding <= 0
  ) {
    return null;
  }
  return args.bitcoinHoldingsSats / args.assumedDilutedSharesOutstanding;
}

export function calculateDilutedSatsPerShareFromCoins(args: {
  bitcoinHoldings: number | null;
  assumedDilutedSharesOutstanding: number | null;
}): number | null {
  if (args.bitcoinHoldings == null) return null;
  return calculateDilutedSatsPerShare({
    bitcoinHoldingsSats: bitcoinCoinsToSats(args.bitcoinHoldings),
    assumedDilutedSharesOutstanding: args.assumedDilutedSharesOutstanding,
  });
}

export function bitcoinCoinsToSats(coins: number): number {
  return Math.round(coins * 100_000_000);
}

/**
 * Chart / history display preference: issuer-reported when present.
 * Look-through exposure uses calculated-from-raw when inputs exist (see lookthrough.ts).
 */
export function preferDilutedSatsPerShare(args: {
  reportedSatsPerDilutedShare: number | null;
  calculatedSatsPerDilutedShare: number | null;
}): {
  satsPerShare: number | null;
  status: "reported" | "calculated" | "unavailable";
} {
  if (args.reportedSatsPerDilutedShare != null) {
    return {
      satsPerShare: args.reportedSatsPerDilutedShare,
      status: "reported",
    };
  }
  if (args.calculatedSatsPerDilutedShare != null) {
    return {
      satsPerShare: args.calculatedSatsPerDilutedShare,
      status: "calculated",
    };
  }
  return { satsPerShare: null, status: "unavailable" };
}

/**
 * Look-through prefers unrounded calculated sats/share when raw inputs exist.
 */
export function preferLookThroughDilutedSatsPerShare(args: {
  bitcoinHoldings: number | null | undefined;
  bitcoinHoldingsSats: number | null | undefined;
  assumedDilutedSharesOutstanding: number | null | undefined;
  reportedSatsPerDilutedShare: number | null | undefined;
  calculatedSatsPerDilutedShare: number | null | undefined;
}): {
  satsPerShare: number | null;
  status: "calculated" | "reported" | "unavailable";
} {
  const holdingsSats =
    args.bitcoinHoldingsSats ??
    (args.bitcoinHoldings != null
      ? bitcoinCoinsToSats(args.bitcoinHoldings)
      : null);
  const fromRaw = calculateDilutedSatsPerShare({
    bitcoinHoldingsSats: holdingsSats,
    assumedDilutedSharesOutstanding:
      args.assumedDilutedSharesOutstanding ?? null,
  });
  if (fromRaw != null) {
    return { satsPerShare: fromRaw, status: "calculated" };
  }
  if (args.calculatedSatsPerDilutedShare != null) {
    return {
      satsPerShare: args.calculatedSatsPerDilutedShare,
      status: "calculated",
    };
  }
  if (args.reportedSatsPerDilutedShare != null) {
    return {
      satsPerShare: args.reportedSatsPerDilutedShare,
      status: "reported",
    };
  }
  return { satsPerShare: null, status: "unavailable" };
}

export function changeBetweenObservations(
  previous: number | null,
  current: number | null,
): { change: number | null; changePct: number | null } {
  if (previous == null || current == null) {
    return { change: null, changePct: null };
  }
  const change = current - previous;
  const changePct = previous === 0 ? null : change / previous;
  return { change, changePct };
}

/**
 * Historical look-through: shares held at that date × issuer metric
 * known as of that observation. Never applies today's shares retroactively.
 */
export function historicalLookThroughSats(args: {
  sharesHeldAtObservation: number | null;
  dilutedSatsPerShareAsOf: number | null;
  adrRatio?: number | null;
}): number | null {
  if (
    args.sharesHeldAtObservation == null ||
    args.dilutedSatsPerShareAsOf == null
  ) {
    return null;
  }
  const ratio = args.adrRatio ?? 1;
  if (ratio <= 0) return null;
  return Math.round(
    args.sharesHeldAtObservation * args.dilutedSatsPerShareAsOf * ratio,
  );
}

export type IssuerBpsChartMode = "level" | "change";

export type IssuerBpsChartPoint = {
  asOf: string;
  label: string;
  [ticker: string]: string | number | null;
};

/**
 * Build chart series from disclosed observations only.
 * Does not interpolate. One-point series is valid (renders a single dated point).
 */
export function buildIssuerBpsChartSeries(args: {
  observations: Array<{
    ticker: string;
    asOf: string;
    reportedSatsPerDilutedShare: number | null;
    calculatedSatsPerDilutedShare: number | null;
  }>;
  mode: IssuerBpsChartMode;
  formatLabel: (asOf: string) => string;
}): IssuerBpsChartPoint[] {
  if (args.observations.length === 0) return [];

  const tickers = [...new Set(args.observations.map((o) => o.ticker))];
  const byDate = new Map<string, IssuerBpsChartPoint>();
  const firstByTicker = new Map<string, number>();

  const sorted = [...args.observations].sort(
    (a, b) => Date.parse(a.asOf) - Date.parse(b.asOf),
  );

  for (const obs of sorted) {
    const key = obs.asOf;
    let row = byDate.get(key);
    if (!row) {
      row = { asOf: obs.asOf, label: args.formatLabel(obs.asOf) };
      for (const ticker of tickers) {
        row[ticker] = null;
      }
      byDate.set(key, row);
    }
    const value =
      obs.reportedSatsPerDilutedShare ?? obs.calculatedSatsPerDilutedShare;
    if (value != null && !firstByTicker.has(obs.ticker)) {
      firstByTicker.set(obs.ticker, value);
    }
    const first = firstByTicker.get(obs.ticker);
    row[obs.ticker] =
      value == null
        ? null
        : args.mode === "level"
          ? value
          : first != null
            ? value / first - 1
            : null;
  }

  return [...byDate.values()];
}

export function observationByAsOfDate<T extends { asOf: string; ticker: string }>(
  observations: T[],
  ticker: string,
  isoDatePrefix: string,
): T | null {
  const matches = observations.filter(
    (o) => o.ticker === ticker && o.asOf.startsWith(isoDatePrefix),
  );
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => Date.parse(b.asOf) - Date.parse(a.asOf))[0]!;
}
