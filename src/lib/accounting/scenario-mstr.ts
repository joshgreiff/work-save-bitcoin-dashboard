export type MstrProjectionInputs = {
  horizonYears: number;
  bitcoinPricesCents: number[];
  startingBtcPerDilutedShare: number;
  annualBtcPerShareGrowth: number;
  startingNetSeniorClaimsPerShareCents: number;
  annualSeniorClaimsGrowth: number;
  startingCashPerShareCents: number;
  startingSoftwareValuePerShareCents: number;
  startingMnav: number;
  terminalMnav: number;
  /** Optional custom mNAV path length horizonYears+1; otherwise linear. */
  mnavPath?: number[];
};

export type MstrProjectionPoint = {
  year: number;
  bitcoinPriceCents: number;
  btcPerDilutedShare: number;
  bitcoinAssetValuePerShareCents: number;
  netSeniorClaimsPerShareCents: number;
  cashPerShareCents: number;
  softwareValuePerShareCents: number;
  commonNavPerShareCents: number;
  mnavMultiple: number;
  projectedPriceCents: number | null;
  negativeNav: boolean;
  warning?: string;
};

function mnavAtYear(
  year: number,
  horizonYears: number,
  starting: number,
  terminal: number,
  custom?: number[],
): number {
  if (custom && custom[year] != null) return custom[year]!;
  if (horizonYears === 0) return terminal;
  return starting + ((terminal - starting) * year) / horizonYears;
}

/**
 * Transparent common NAV × mNAV model. Does not apply a fixed Bitcoin beta.
 */
export function projectMstrNav(args: MstrProjectionInputs): MstrProjectionPoint[] {
  const points: MstrProjectionPoint[] = [];
  for (let year = 0; year <= args.horizonYears; year += 1) {
    const bitcoinPriceCents =
      args.bitcoinPricesCents[year] ??
      args.bitcoinPricesCents[args.bitcoinPricesCents.length - 1] ??
      0;
    const btcPerDilutedShare =
      args.startingBtcPerDilutedShare *
      Math.pow(1 + args.annualBtcPerShareGrowth, year);
    const bitcoinAssetValuePerShareCents = Math.round(
      btcPerDilutedShare * bitcoinPriceCents,
    );
    const netSeniorClaimsPerShareCents = Math.round(
      args.startingNetSeniorClaimsPerShareCents *
        Math.pow(1 + args.annualSeniorClaimsGrowth, year),
    );
    const cashPerShareCents = args.startingCashPerShareCents;
    const softwareValuePerShareCents = args.startingSoftwareValuePerShareCents;
    const commonNavPerShareCents =
      bitcoinAssetValuePerShareCents +
      cashPerShareCents +
      softwareValuePerShareCents -
      netSeniorClaimsPerShareCents;
    const negativeNav = commonNavPerShareCents <= 0;
    const mnavMultiple = mnavAtYear(
      year,
      args.horizonYears,
      args.startingMnav,
      args.terminalMnav,
      args.mnavPath,
    );
    const projectedPriceCents = negativeNav
      ? 0
      : Math.round(commonNavPerShareCents * mnavMultiple);

    points.push({
      year,
      bitcoinPriceCents,
      btcPerDilutedShare,
      bitcoinAssetValuePerShareCents,
      netSeniorClaimsPerShareCents,
      cashPerShareCents,
      softwareValuePerShareCents,
      commonNavPerShareCents,
      mnavMultiple,
      projectedPriceCents,
      negativeNav,
      warning: negativeNav
        ? "Common NAV is zero or negative; projected common price floored at $0 for this year."
        : undefined,
    });
  }
  return points;
}

/** Illustrates leverage: equity = assets − fixed senior claims (same-direction amplification). */
export function amplifyCommonEquity(args: {
  assetValueCents: number;
  fixedSeniorClaimsCents: number;
}): number {
  return args.assetValueCents - args.fixedSeniorClaimsCents;
}
