import type { PortfolioTransaction } from "@/lib/schemas/transactions";
import type { TransactionCategory } from "@/lib/schemas/common";

const CONTRIBUTION_CATEGORIES = new Set<TransactionCategory>([
  "initial_funding",
  "personal_contribution",
  "youtube_revenue_contribution",
  "affiliate_revenue_contribution",
  "sponsorship_revenue_contribution",
  "viewer_support_contribution",
]);

const INCOME_CATEGORIES = new Set<TransactionCategory>([
  "dividend",
  "options_premium",
  "interest",
]);

export type ContributionBreakdown = {
  personalCents: number;
  channelIncomeCents: number;
  viewerSupportCents: number;
  initialFundingCents: number;
  totalExternalContributionsCents: number;
  externalWithdrawalsCents: number;
  netExternalContributionsCents: number;
};

export type PortfolioPerformance = {
  currentPortfolioValueCents: number;
  investmentRelatedWithdrawalsCents: number;
  totalExternalContributionsCents: number;
  investmentPnLCents: number;
  returnSinceInception: number | null;
  dividendsReceivedCents: number;
  optionsIncomeReceivedCents: number;
  interestReceivedCents: number;
  totalIncomeReceivedCents: number;
  realizedGainLossCents: number | null;
  unrealizedGainLossCents: number | null;
};

export function isExternalContribution(tx: PortfolioTransaction): boolean {
  return tx.externalCashFlow && CONTRIBUTION_CATEGORIES.has(tx.category);
}

export function isExternalWithdrawal(tx: PortfolioTransaction): boolean {
  return tx.externalCashFlow && tx.category === "withdrawal";
}

export function summarizeContributions(
  transactions: PortfolioTransaction[],
): ContributionBreakdown {
  let personalCents = 0;
  let channelIncomeCents = 0;
  let viewerSupportCents = 0;
  let initialFundingCents = 0;
  let totalExternalContributionsCents = 0;
  let externalWithdrawalsCents = 0;

  for (const tx of transactions) {
    if (isExternalContribution(tx)) {
      const amount = tx.amountCents ?? 0;
      totalExternalContributionsCents += amount;
      if (tx.category === "personal_contribution") personalCents += amount;
      if (tx.category === "initial_funding") initialFundingCents += amount;
      if (tx.category === "viewer_support_contribution") {
        viewerSupportCents += amount;
      }
      if (
        tx.category === "youtube_revenue_contribution" ||
        tx.category === "affiliate_revenue_contribution" ||
        tx.category === "sponsorship_revenue_contribution"
      ) {
        channelIncomeCents += amount;
      }
    }
    if (isExternalWithdrawal(tx)) {
      externalWithdrawalsCents += Math.abs(tx.amountCents ?? 0);
    }
  }

  return {
    personalCents,
    channelIncomeCents,
    viewerSupportCents,
    initialFundingCents,
    totalExternalContributionsCents,
    externalWithdrawalsCents,
    netExternalContributionsCents:
      totalExternalContributionsCents - externalWithdrawalsCents,
  };
}

export function calculateInvestmentPnL(args: {
  currentPortfolioValueCents: number;
  totalExternalContributionsCents: number;
  investmentRelatedWithdrawalsCents?: number;
}): number {
  const withdrawals = args.investmentRelatedWithdrawalsCents ?? 0;
  return (
    args.currentPortfolioValueCents +
    withdrawals -
    args.totalExternalContributionsCents
  );
}

export function calculatePortfolioPerformance(args: {
  currentPortfolioValueCents: number;
  transactions: PortfolioTransaction[];
  costBasisCents?: number | null;
  marketValueExCashCents?: number | null;
}): PortfolioPerformance {
  const contributions = summarizeContributions(args.transactions);
  let dividendsReceivedCents = 0;
  let optionsIncomeReceivedCents = 0;
  let interestReceivedCents = 0;
  let investmentRelatedWithdrawalsCents = 0;
  const realizedGainLossCents: number | null = null;

  for (const tx of args.transactions) {
    if (tx.category === "dividend") dividendsReceivedCents += tx.amountCents ?? 0;
    if (tx.category === "options_premium") {
      optionsIncomeReceivedCents += tx.amountCents ?? 0;
    }
    if (tx.category === "interest") interestReceivedCents += tx.amountCents ?? 0;
    if (tx.category === "withdrawal" && !tx.externalCashFlow) {
      investmentRelatedWithdrawalsCents += Math.abs(tx.amountCents ?? 0);
    }
  }

  const investmentPnLCents = calculateInvestmentPnL({
    currentPortfolioValueCents: args.currentPortfolioValueCents,
    totalExternalContributionsCents: contributions.totalExternalContributionsCents,
    investmentRelatedWithdrawalsCents,
  });

  const returnSinceInception =
    contributions.netExternalContributionsCents === 0
      ? null
      : investmentPnLCents / contributions.netExternalContributionsCents;

  let unrealizedGainLossCents: number | null = null;
  if (
    args.costBasisCents != null &&
    args.marketValueExCashCents != null
  ) {
    unrealizedGainLossCents = args.marketValueExCashCents - args.costBasisCents;
  }

  return {
    currentPortfolioValueCents: args.currentPortfolioValueCents,
    investmentRelatedWithdrawalsCents,
    totalExternalContributionsCents: contributions.totalExternalContributionsCents,
    investmentPnLCents,
    returnSinceInception,
    dividendsReceivedCents,
    optionsIncomeReceivedCents,
    interestReceivedCents,
    totalIncomeReceivedCents:
      dividendsReceivedCents + optionsIncomeReceivedCents + interestReceivedCents,
    realizedGainLossCents,
    unrealizedGainLossCents,
  };
}

export function incomeFromCategory(
  transactions: PortfolioTransaction[],
  category: TransactionCategory,
): number {
  if (!INCOME_CATEGORIES.has(category)) return 0;
  return transactions
    .filter((tx) => tx.category === category)
    .reduce((sum, tx) => sum + (tx.amountCents ?? 0), 0);
}
