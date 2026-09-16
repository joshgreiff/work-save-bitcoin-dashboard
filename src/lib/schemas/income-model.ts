import { z } from "zod";
import {
  centsSchema,
  isoDateTimeSchema,
  nonNegativeCentsSchema,
} from "./common";

export const incomeModelSecuritySchema = z.object({
  ticker: z.string().min(1),
  name: z.string().optional(),
  targetAllocationBps: z.number().int().nonnegative().max(10000),
  priceCents: centsSchema.positive().nullable(),
  annualDistributionCentsPerShare: nonNegativeCentsSchema.nullable(),
  note: z.string().optional(),
});

export const incomeModelSchema = z
  .object({
    asOf: isoDateTimeSchema,
    wholeSharesOnly: z.boolean(),
    excludedCashCents: nonNegativeCentsSchema,
    milestonesMonthlyCents: z.array(nonNegativeCentsSchema).min(1),
    securities: z.array(incomeModelSecuritySchema),
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

export type IncomeModel = z.infer<typeof incomeModelSchema>;
export type IncomeModelSecurity = z.infer<typeof incomeModelSecuritySchema>;
