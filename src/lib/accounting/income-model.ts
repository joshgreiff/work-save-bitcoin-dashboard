import type { IncomeModel, IncomeModelSecurity } from "@/lib/schemas/income-model";

export type ModeledSecurityResult = {
  ticker: string;
  name?: string;
  targetAllocationBps: number;
  priceCents: number | null;
  annualDistributionCentsPerShare: number | null;
  allocatedCapitalCents: number | null;
  modeledShares: number | null;
  projectedAnnualIncomeCents: number | null;
  indicatedYield: number | null;
  available: boolean;
  reason?: string;
};

export type IncomeModelResult = {
  deployableValueCents: number;
  securities: ModeledSecurityResult[];
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

export function modelSecurityIncome(args: {
  deployableValueCents: number;
  security: IncomeModelSecurity;
  wholeSharesOnly: boolean;
}): ModeledSecurityResult {
  const { security, deployableValueCents, wholeSharesOnly } = args;
  if (security.priceCents == null || security.annualDistributionCentsPerShare == null) {
    return {
      ticker: security.ticker,
      name: security.name,
      targetAllocationBps: security.targetAllocationBps,
      priceCents: security.priceCents,
      annualDistributionCentsPerShare: security.annualDistributionCentsPerShare,
      allocatedCapitalCents: Math.round(
        (deployableValueCents * security.targetAllocationBps) / 10000,
      ),
      modeledShares: null,
      projectedAnnualIncomeCents: null,
      indicatedYield: null,
      available: false,
      reason: "Price or distribution assumption unavailable",
    };
  }

  const allocatedCapitalCents = Math.round(
    (deployableValueCents * security.targetAllocationBps) / 10000,
  );
  const rawShares = allocatedCapitalCents / security.priceCents;
  const modeledShares = wholeSharesOnly ? Math.floor(rawShares) : rawShares;
  const projectedAnnualIncomeCents = Math.round(
    modeledShares * security.annualDistributionCentsPerShare,
  );
  const indicatedYield =
    security.priceCents === 0
      ? null
      : security.annualDistributionCentsPerShare / security.priceCents;

  return {
    ticker: security.ticker,
    name: security.name,
    targetAllocationBps: security.targetAllocationBps,
    priceCents: security.priceCents,
    annualDistributionCentsPerShare: security.annualDistributionCentsPerShare,
    allocatedCapitalCents,
    modeledShares,
    projectedAnnualIncomeCents,
    indicatedYield,
    available: true,
  };
}

export function calculateIncomeModel(args: {
  portfolioValueCents: number;
  model: IncomeModel;
}): IncomeModelResult {
  const deployableValueCents = calculateDeployableValue(
    args.portfolioValueCents,
    args.model.excludedCashCents,
  );
  const configured = args.model.securities.length > 0;
  const securities = args.model.securities.map((security) =>
    modelSecurityIncome({
      deployableValueCents,
      security,
      wholeSharesOnly: args.model.wholeSharesOnly,
    }),
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
