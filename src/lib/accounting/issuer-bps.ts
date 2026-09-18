/**
 * Diluted sats per share = bitcoin holdings (sats) / diluted shares.
 * Prefer reported diluted figures when both reported and calculated exist.
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

export function bitcoinCoinsToSats(coins: number): number {
  return Math.round(coins * 100_000_000);
}

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
 * Historical look-through: shares held at that date × latest issuer metric
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
  return args.sharesHeldAtObservation * args.dilutedSatsPerShareAsOf * ratio;
}
