export type BitcoinProjectionPoint = {
  year: number;
  priceCents: number;
  cumulativeReturn: number;
  realPriceCents: number | null;
};

export function projectBitcoinPrices(args: {
  startingPriceCents: number;
  horizonYears: number;
  cagr?: number;
  annualReturns?: number[];
  inflationRate?: number;
}): BitcoinProjectionPoint[] {
  const points: BitcoinProjectionPoint[] = [];
  let price = args.startingPriceCents;
  const start = args.startingPriceCents;
  const inflation = args.inflationRate ?? 0;

  for (let year = 0; year <= args.horizonYears; year += 1) {
    if (year > 0) {
      const custom = args.annualReturns?.[year - 1];
      const growth =
        custom != null ? custom : args.cagr != null ? args.cagr : 0;
      price = Math.round(price * (1 + growth));
    }
    const cumulativeReturn = start === 0 ? 0 : price / start - 1;
    const realPriceCents =
      inflation === 0
        ? price
        : Math.round(price / Math.pow(1 + inflation, year));
    points.push({
      year,
      priceCents: Math.max(0, price),
      cumulativeReturn,
      realPriceCents,
    });
  }
  return points;
}

export function annualizedReturnFromTotal(
  totalReturn: number,
  years: number,
): number | null {
  if (years <= 0) return null;
  if (1 + totalReturn <= 0) return null;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}
