/**
 * Pure education calculators — no market projections or return promises.
 */

export function nominalEarnings(hourlyWage: number, hoursWorked: number): number {
  if (!Number.isFinite(hourlyWage) || !Number.isFinite(hoursWorked)) return NaN;
  if (hourlyWage < 0 || hoursWorked < 0) return NaN;
  return hourlyWage * hoursWorked;
}

/**
 * Purchasing power of past nominal earnings expressed in today's dollars,
 * given constant annual inflation over `years`.
 * Formula: nominal / (1 + r)^n
 */
export function purchasingPowerToday(args: {
  nominalAmount: number;
  annualInflationRate: number;
  years: number;
}): number {
  const { nominalAmount, annualInflationRate, years } = args;
  if (
    !Number.isFinite(nominalAmount) ||
    !Number.isFinite(annualInflationRate) ||
    !Number.isFinite(years)
  ) {
    return NaN;
  }
  if (nominalAmount < 0 || years < 0 || annualInflationRate <= -1) return NaN;
  return nominalAmount / (1 + annualInflationRate) ** years;
}

export function purchasingPowerDifference(args: {
  nominalAmount: number;
  annualInflationRate: number;
  years: number;
}): { purchasingPower: number; difference: number; percentChange: number } {
  const purchasingPower = purchasingPowerToday(args);
  const difference = purchasingPower - args.nominalAmount;
  const percentChange =
    args.nominalAmount === 0 ? NaN : purchasingPower / args.nominalAmount - 1;
  return { purchasingPower, difference, percentChange };
}

/**
 * Future price of today's basket after inflation: amount * (1+r)^n
 */
export function futureBasketPrice(args: {
  startingAmount: number;
  annualInflationRate: number;
  years: number;
}): number {
  const { startingAmount, annualInflationRate, years } = args;
  if (
    !Number.isFinite(startingAmount) ||
    !Number.isFinite(annualInflationRate) ||
    !Number.isFinite(years)
  ) {
    return NaN;
  }
  if (startingAmount < 0 || years < 0 || annualInflationRate <= -1) return NaN;
  return startingAmount * (1 + annualInflationRate) ** years;
}

export function inflationCalculator(args: {
  startingAmount: number;
  annualInflationRate: number;
  years: number;
}): {
  futureBasketPrice: number;
  cashPurchasingPower: number;
  totalPercentChange: number;
} {
  const future = futureBasketPrice(args);
  const cashPurchasingPower = purchasingPowerToday({
    nominalAmount: args.startingAmount,
    annualInflationRate: args.annualInflationRate,
    years: args.years,
  });
  const totalPercentChange =
    args.startingAmount === 0 ? NaN : future / args.startingAmount - 1;
  return {
    futureBasketPrice: future,
    cashPurchasingPower,
    totalPercentChange,
  };
}

/** Convert USD to sats using a BTC/USD price. */
export function usdToSats(args: {
  usdAmount: number;
  btcUsdPrice: number;
}): number | null {
  const { usdAmount, btcUsdPrice } = args;
  if (
    !Number.isFinite(usdAmount) ||
    !Number.isFinite(btcUsdPrice) ||
    usdAmount < 0 ||
    btcUsdPrice <= 0
  ) {
    return null;
  }
  return Math.floor((usdAmount / btcUsdPrice) * 100_000_000);
}

export function recurringMonthlyUsd(args: {
  usdAmount: number;
  frequency: "one_time" | "weekly" | "monthly";
}): number | null {
  const { usdAmount, frequency } = args;
  if (!Number.isFinite(usdAmount) || usdAmount < 0) return null;
  if (frequency === "one_time") return usdAmount;
  if (frequency === "weekly") return usdAmount * (52 / 12);
  return usdAmount;
}

export function satsFromRecurringPurchase(args: {
  usdAmount: number;
  frequency: "one_time" | "weekly" | "monthly";
  btcUsdPrice: number;
}): {
  satsToday: number | null;
  monthlyContributionUsd: number | null;
} {
  return {
    satsToday: usdToSats({
      usdAmount: args.usdAmount,
      btcUsdPrice: args.btcUsdPrice,
    }),
    monthlyContributionUsd: recurringMonthlyUsd({
      usdAmount: args.usdAmount,
      frequency: args.frequency,
    }),
  };
}
