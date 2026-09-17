export type PreferredProjectionInputs = {
  horizonYears: number;
  startingPriceCents: number;
  annualDistributionCentsPerShare: number;
  distributionFrequencyPerYear: number;
  terminalRequiredYield: number;
  reinvestDistributions: boolean;
  callable: boolean;
  callActivated: boolean;
  callPriceCents: number | null;
  dividendStressHaircut?: number;
  recoveryValueCents?: number | null;
};

export type PreferredProjectionPoint = {
  year: number;
  marketPriceCents: number;
  cashDistributedCents: number;
  shares: number;
  portfolioValueCents: number;
};

function distributionsPerYear(freq: number): number {
  return Math.max(1, Math.round(freq));
}

/**
 * Preferreds are modeled from distributions + price path to a required-yield
 * terminal — not as leveraged Bitcoin.
 */
export function projectPreferredTotalReturn(
  args: PreferredProjectionInputs,
): {
  points: PreferredProjectionPoint[];
  simpleTotalReturn: number;
  terminalPriceCents: number;
} {
  const haircut = args.dividendStressHaircut ?? 0;
  const annualDist = Math.max(
    0,
    args.annualDistributionCentsPerShare * (1 - haircut),
  );
  const modeledTerminal =
    args.terminalRequiredYield <= 0
      ? args.startingPriceCents
      : Math.round(annualDist / args.terminalRequiredYield);

  let terminalPriceCents = modeledTerminal;
  if (args.callable && args.callActivated && args.callPriceCents != null) {
    terminalPriceCents = Math.min(modeledTerminal, args.callPriceCents);
  }
  if (args.recoveryValueCents != null) {
    terminalPriceCents = args.recoveryValueCents;
  }

  const points: PreferredProjectionPoint[] = [];
  let shares = 1;
  let cumulativeCash = 0;
  const periods = distributionsPerYear(args.distributionFrequencyPerYear);
  const distPerPeriod = annualDist / periods;

  for (let year = 0; year <= args.horizonYears; year += 1) {
    const t = args.horizonYears === 0 ? 0 : year / args.horizonYears;
    const marketPriceCents = Math.round(
      args.startingPriceCents +
        (terminalPriceCents - args.startingPriceCents) * t,
    );

    let yearCash = 0;
    if (year > 0) {
      for (let p = 0; p < periods; p += 1) {
        const cash = shares * distPerPeriod;
        yearCash += cash;
        if (args.reinvestDistributions && marketPriceCents > 0) {
          shares += cash / marketPriceCents;
        } else {
          cumulativeCash += cash;
        }
      }
    }

    if (!args.reinvestDistributions && year > 0) {
      // cumulativeCash already updated
    } else if (args.reinvestDistributions) {
      cumulativeCash = 0;
    }

    const portfolioValueCents = args.reinvestDistributions
      ? Math.round(shares * marketPriceCents)
      : Math.round(shares * marketPriceCents + cumulativeCash);

    points.push({
      year,
      marketPriceCents,
      cashDistributedCents: Math.round(yearCash),
      shares,
      portfolioValueCents,
    });
  }

  const ending = points[points.length - 1]!;
  const endingWealth = args.reinvestDistributions
    ? ending.portfolioValueCents
    : ending.marketPriceCents +
      points.reduce((sum, p) => sum + p.cashDistributedCents, 0);
  const simpleTotalReturn =
    (endingWealth - args.startingPriceCents) / args.startingPriceCents;

  return { points, simpleTotalReturn, terminalPriceCents };
}

export function frequencyToPeriodsPerYear(
  frequency:
    | "monthly"
    | "semi_monthly"
    | "quarterly"
    | "semi_annual"
    | "annual"
    | "none"
    | "other",
): number {
  switch (frequency) {
    case "semi_monthly":
      return 24;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "semi_annual":
      return 2;
    case "annual":
      return 1;
    default:
      return 4;
  }
}
