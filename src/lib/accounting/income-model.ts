import type {
  IncomeModel,
  IncomeModelSecurity,
  IncomeSecurity,
} from "@/lib/schemas/income-model";

export type ModeledSecurityResult = {
  ticker: string;
  name?: string;
  targetAllocationBps: number;
  priceCents: number | null;
  annualDistributionCentsPerShare: number | null;
  allocatedCapitalCents: number | null;
  modeledShares: number | null;
  investedCapitalCents: number | null;
  residualCashCents: number;
  projectedAnnualIncomeCents: number | null;
  projectedMonthlyIncomeCents: number | null;
  indicatedYield: number | null;
  available: boolean;
  reason?: string;
};

export type IncomeModelResult = {
  deployableValueCents: number;
  securities: ModeledSecurityResult[];
  residualCashCents: number;
  annualIncomeCents: number | null;
  monthlyIncomeCents: number | null;
  blendedIndicatedYield: number | null;
  milestones: {
    monthlyCents: number;
    progress: number | null;
    achieved: boolean;
  }[];
  configured: boolean;
};

export function calculateDeployableValue(
  portfolioValueCents: number,
  excludedCashCents: number,
): number {
  return Math.max(0, portfolioValueCents - excludedCashCents);
}

/**
 * Prefer verified $ distribution/share; else statedAmount × rate (bps).
 */
export function resolveAnnualDistributionCentsPerShare(args: {
  annualDistributionCentsPerShare?: number | null;
  statedAmountCents?: number | null;
  annualDistributionRateBps?: number | null;
}): number | null {
  if (args.annualDistributionCentsPerShare != null) {
    return args.annualDistributionCentsPerShare;
  }
  if (
    args.statedAmountCents != null &&
    args.annualDistributionRateBps != null
  ) {
    return Math.round(
      (args.statedAmountCents * args.annualDistributionRateBps) / 10000,
    );
  }
  return null;
}

export function indicatedYieldFromPrice(args: {
  annualDistributionCentsPerShare: number | null;
  priceCents: number | null;
}): number | null {
  if (
    args.annualDistributionCentsPerShare == null ||
    args.priceCents == null ||
    args.priceCents === 0
  ) {
    return null;
  }
  return args.annualDistributionCentsPerShare / args.priceCents;
}

export function modelSecurityIncome(args: {
  deployableValueCents: number;
  security: IncomeModelSecurity;
  wholeSharesOnly: boolean;
  catalog?: IncomeSecurity | null;
}): ModeledSecurityResult {
  const { security, deployableValueCents, wholeSharesOnly, catalog } = args;
  const annualDistributionCentsPerShare = resolveAnnualDistributionCentsPerShare({
    annualDistributionCentsPerShare:
      security.annualDistributionCentsPerShare ??
      catalog?.annualDistributionCentsPerShare ??
      null,
    statedAmountCents: catalog?.statedAmountCents ?? null,
    annualDistributionRateBps: catalog?.annualDistributionRateBps ?? null,
  });

  const allocatedCapitalCents = Math.round(
    (deployableValueCents * security.targetAllocationBps) / 10000,
  );

  if (security.priceCents == null || annualDistributionCentsPerShare == null) {
    return {
      ticker: security.ticker,
      name: security.name,
      targetAllocationBps: security.targetAllocationBps,
      priceCents: security.priceCents,
      annualDistributionCentsPerShare,
      allocatedCapitalCents,
      modeledShares: null,
      investedCapitalCents: null,
      residualCashCents: 0,
      projectedAnnualIncomeCents: null,
      projectedMonthlyIncomeCents: null,
      indicatedYield: null,
      available: false,
      reason: "Price or distribution assumption unavailable",
    };
  }

  const rawShares = allocatedCapitalCents / security.priceCents;
  const modeledShares = wholeSharesOnly ? Math.floor(rawShares) : rawShares;
  const investedCapitalCents = Math.round(modeledShares * security.priceCents);
  const residualCashCents = wholeSharesOnly
    ? Math.max(0, allocatedCapitalCents - investedCapitalCents)
    : 0;
  const projectedAnnualIncomeCents = Math.round(
    modeledShares * annualDistributionCentsPerShare,
  );
  const projectedMonthlyIncomeCents = Math.round(projectedAnnualIncomeCents / 12);
  const indicatedYield = indicatedYieldFromPrice({
    annualDistributionCentsPerShare,
    priceCents: security.priceCents,
  });

  return {
    ticker: security.ticker,
    name: security.name,
    targetAllocationBps: security.targetAllocationBps,
    priceCents: security.priceCents,
    annualDistributionCentsPerShare,
    allocatedCapitalCents,
    modeledShares,
    investedCapitalCents,
    residualCashCents,
    projectedAnnualIncomeCents,
    projectedMonthlyIncomeCents,
    indicatedYield,
    available: true,
  };
}

export function calculateIncomeModel(args: {
  portfolioValueCents: number;
  model: IncomeModel;
  catalogByTicker?: Map<string, IncomeSecurity>;
  /** Optional override; never mutates the actual portfolio. */
  deployableValueOverrideCents?: number | null;
}): IncomeModelResult {
  const deployableValueCents =
    args.deployableValueOverrideCents != null
      ? Math.max(0, args.deployableValueOverrideCents)
      : calculateDeployableValue(
          args.portfolioValueCents,
          args.model.excludedCashCents,
        );
  const configured = args.model.securities.length > 0;
  const securities = args.model.securities.map((security) =>
    modelSecurityIncome({
      deployableValueCents,
      security,
      wholeSharesOnly: args.model.wholeSharesOnly,
      catalog: args.catalogByTicker?.get(security.ticker) ?? null,
    }),
  );

  const residualCashCents = securities.reduce(
    (sum, s) => sum + s.residualCashCents,
    0,
  );

  const allComplete = configured && securities.every((s) => s.available);
  const resolvedAnnual = allComplete
    ? securities.reduce((sum, s) => sum + (s.projectedAnnualIncomeCents ?? 0), 0)
    : null;

  const monthlyIncomeCents =
    resolvedAnnual == null ? null : Math.round(resolvedAnnual / 12);

  const blendedIndicatedYield =
    resolvedAnnual == null || deployableValueCents === 0
      ? null
      : resolvedAnnual / deployableValueCents;

  return {
    deployableValueCents,
    securities,
    residualCashCents,
    annualIncomeCents: resolvedAnnual,
    monthlyIncomeCents,
    blendedIndicatedYield,
    milestones: args.model.milestonesMonthlyCents.map((monthlyCents) => ({
      monthlyCents,
      progress:
        monthlyIncomeCents == null || monthlyCents === 0
          ? null
          : Math.min(1, monthlyIncomeCents / monthlyCents),
      achieved: monthlyIncomeCents != null && monthlyIncomeCents >= monthlyCents,
    })),
    configured,
  };
}

export function assertAllocationsTotal10000(bps: number[]): boolean {
  return bps.reduce((sum, n) => sum + n, 0) === 10000;
}
