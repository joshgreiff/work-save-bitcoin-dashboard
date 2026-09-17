import { z } from "zod";
import {
  centsSchema,
  isoDateTimeSchema,
  nonNegativeCentsSchema,
  provenanceSchema,
} from "./common";

export const rateKindSchema = z.enum(["fixed", "variable"]);
export const cumulativeKindSchema = z.enum([
  "cumulative",
  "non_cumulative",
  "not_applicable",
]);
export const convertibilitySchema = z.enum([
  "convertible",
  "non_convertible",
  "not_applicable",
]);
export const distributionFrequencySchema = z.enum([
  "business_daily",
  "monthly",
  "semi_monthly",
  "quarterly",
  "semi_annual",
  "annual",
  "none",
  "other",
]);
export const securityRoleSchema = z.enum([
  "common_equity",
  "preferred",
  "bitcoin_proxy",
  "cash_proxy",
  "benchmark",
]);

export const observedOrAssumedSchema = z.enum(["observed", "assumed"]);

export const incomeSecurityFieldSchema = provenanceSchema.extend({
  valueKind: observedOrAssumedSchema,
});

export const incomeSecuritySchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  issuer: z.string().nullable().optional(),
  role: securityRoleSchema,
  eligibleForIncomeAllocation: z.boolean(),
  statedAmountCents: nonNegativeCentsSchema.nullable(),
  liquidationPreferenceCents: nonNegativeCentsSchema.nullable(),
  /** Basis points, e.g. 1000 = 10.00% */
  annualDistributionRateBps: z.number().int().nonnegative().nullable(),
  /**
   * When the issuer quotes a verified dollar distribution, prefer this over
   * statedAmount × rate.
   */
  annualDistributionCentsPerShare: nonNegativeCentsSchema.nullable(),
  distributionFrequency: distributionFrequencySchema,
  rateKind: rateKindSchema,
  cumulativeKind: cumulativeKindSchema,
  convertibility: convertibilitySchema,
  seniorityRank: z.number().int().positive().nullable(),
  seniorityLabel: z.string().nullable(),
  /** Ordinary discretionary optional redemption (e.g. STRC at $101). */
  ordinaryCallable: z.boolean(),
  ordinaryCallPriceCents: nonNegativeCentsSchema.nullable(),
  cleanUpRedemption: z.boolean().default(false),
  taxRedemption: z.boolean().default(false),
  fundamentalChangeRepurchase: z.boolean().default(false),
  callYear: z.number().int().nullable(),
  compoundedDividendMaxRateBps: z.number().int().nonnegative().nullable(),
  rateAsOf: isoDateTimeSchema.nullable(),
  /** When false, Scenario Lab should not run preferred projections for this name. */
  projectionsEnabled: z.boolean().default(true),
  termsNotes: z.array(z.string()).default([]),
  riskNotes: z.array(z.string()).default([]),
  sources: z
    .array(
      provenanceSchema.extend({
        label: z.string().min(1),
      }),
    )
    .default([]),
  comparisonHints: z
    .object({
      missedDividendProtections: z.string().nullable().optional(),
      fundamentalChangeProvisions: z.string().nullable().optional(),
      atmProgramStatus: z.string().nullable().optional(),
      liquidityNote: z.string().nullable().optional(),
    })
    .optional(),
});

export const incomeSecuritiesFileSchema = z.object({
  asOf: isoDateTimeSchema,
  securities: z.array(incomeSecuritySchema).min(1),
  notes: z.array(z.string()).default([]),
});

export const scenarioPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.literal("Illustrative only"),
  bitcoinCagr: z.number(),
  annualBtcPerShareGrowth: z.number(),
  startingMnav: z.number().positive(),
  terminalMnav: z.number().positive(),
  preferredTerminalRequiredYield: z.number().positive(),
  dividendStress: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
});

export const mstrScenarioDefaultsSchema = z.object({
  startingPriceCents: centsSchema.positive().nullable(),
  startingBitcoinHoldings: z.number().nonnegative().nullable(),
  startingDilutedShares: z.number().positive().nullable(),
  startingBtcPerDilutedShare: z.number().nonnegative().nullable(),
  startingNetSeniorClaimsPerShareCents: centsSchema.nullable(),
  startingCashPerShareCents: centsSchema.nullable(),
  startingSoftwareValuePerShareCents: centsSchema.nullable(),
  annualSeniorClaimsGrowth: z.number(),
  asOf: isoDateTimeSchema.nullable(),
  notes: z.array(z.string()).default([]),
  sources: z
    .array(
      provenanceSchema.extend({
        label: z.string().min(1),
      }),
    )
    .default([]),
});

export const incomeModelSchema = z
  .object({
    asOf: isoDateTimeSchema,
    wholeSharesOnly: z.boolean(),
    excludedCashCents: nonNegativeCentsSchema,
    milestonesMonthlyCents: z.array(nonNegativeCentsSchema).min(1),
    securities: z.array(
      z.object({
        ticker: z.string().min(1),
        name: z.string().optional(),
        targetAllocationBps: z.number().int().nonnegative().max(10000),
        priceCents: centsSchema.positive().nullable(),
        annualDistributionCentsPerShare: nonNegativeCentsSchema.nullable(),
        note: z.string().optional(),
      }),
    ),
    illustrativePreset: z.boolean().default(false),
    scenarioPresets: z.array(scenarioPresetSchema).default([]),
    mstrDefaults: mstrScenarioDefaultsSchema.optional(),
    defaultHorizonYears: z.number().int().min(1).max(10).default(5),
    defaultRiskFreeRate: z.number().default(0.04),
    defaultInflationRate: z.number().default(0.02),
    minHistoryObservations: z.number().int().positive().default(24),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.securities.length === 0) {
      return;
    }
    const total = data.securities.reduce((sum, s) => sum + s.targetAllocationBps, 0);
    if (total !== 10000) {
      ctx.addIssue({
        code: "custom",
        message: `Income model allocations must total 10000 bps (100%). Found ${total}`,
      });
    }
    for (const security of data.securities) {
      if (
        security.priceCents != null &&
        security.annualDistributionCentsPerShare == null
      ) {
        ctx.addIssue({
          code: "custom",
          message: `Model security ${security.ticker} has a price but lacks annualDistributionCentsPerShare`,
        });
      }
    }
  });

export const incomeHistoryPointSchema = z.object({
  asOf: isoDateTimeSchema,
  /** Unadjusted closing price for point-in-time valuation. */
  priceCents: centsSchema.positive(),
  distributionCents: nonNegativeCentsSchema.default(0),
  /**
   * Distribution-adjusted total-return index level (or period total return input
   * series elsewhere). Risk metrics must not use price-only paths for dividend
   * securities.
   */
  totalReturnIndex: z.number().positive().nullable().optional(),
});

export const incomeHistorySeriesSchema = provenanceSchema.extend({
  ticker: z.string().min(1),
  points: z.array(incomeHistoryPointSchema),
  seriesKind: z
    .enum(["unadjusted_close", "distribution_adjusted_total_return"])
    .default("unadjusted_close"),
});

export const incomeHistoryFileSchema = z.object({
  series: z.array(incomeHistorySeriesSchema),
  notes: z.array(z.string()).default([]),
});

export type IncomeSecurity = z.infer<typeof incomeSecuritySchema>;
export type IncomeSecuritiesFile = z.infer<typeof incomeSecuritiesFileSchema>;
export type IncomeModel = z.infer<typeof incomeModelSchema>;
export type IncomeModelSecurity = IncomeModel["securities"][number];
export type ScenarioPreset = z.infer<typeof scenarioPresetSchema>;
export type IncomeHistoryFile = z.infer<typeof incomeHistoryFileSchema>;
export type IncomeHistorySeries = z.infer<typeof incomeHistorySeriesSchema>;
