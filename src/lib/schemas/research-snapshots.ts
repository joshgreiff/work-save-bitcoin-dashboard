import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema } from "./common";

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Research-only issuer snapshot. These figures support Learn research notes and are never part of
 * the Fiat Freedom Portfolio, valuation history, market observations, or look-through totals.
 */
export const researchIssuerSnapshotSchema = z
  .object({
    id: slugSchema,
    issuer: z.string().min(1),
    displayName: z.string().min(1),
    ticker: z.string().min(1),
    asOf: isoDateSchema,
    bitcoinHoldings: z.number().positive(),
    bitcoinCostBasisUsd: z.number().positive(),
    bitcoinFairValueUsd: z.number().positive(),
    commonSharesOutstanding: z.number().int().positive(),
    commonSharesNote: z.string().min(1),
    potentiallyDilutiveAwards: z.number().int().nonnegative(),
    conditionalPerformanceAwards: z.number().int().nonnegative(),
    filingSourceUrl: z.string().url(),
    sharePrice: z.object({
      closeUsd: z.number().positive(),
      sessionDate: isoDateSchema,
      sourceName: z.string().min(1),
      sourceUrl: z.string().url(),
      retrievedAt: isoDateTimeSchema,
      note: z.string().min(1),
    }),
    allocationIllustration: z.object({
      portfolioValueUsd: z.number().positive(),
      allocations: z.array(z.number().min(0).max(1)).min(1),
      equityMove: z.number().positive().max(1),
      bitcoinMove: z.number().positive().max(1),
    }),
  })
  .superRefine((snapshot, ctx) => {
    if (snapshot.sharePrice.sessionDate !== snapshot.asOf) {
      ctx.addIssue({
        code: "custom",
        message: `${snapshot.id}: share price session ${snapshot.sharePrice.sessionDate} must match asOf ${snapshot.asOf}`,
      });
    }
  });

export const researchIssuerSnapshotsFileSchema = z
  .object({
    snapshots: z.array(researchIssuerSnapshotSchema),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const snapshot of data.snapshots) {
      if (ids.has(snapshot.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate research snapshot id: ${snapshot.id}` });
      }
      ids.add(snapshot.id);
    }
  });

export type ResearchIssuerSnapshot = z.infer<typeof researchIssuerSnapshotSchema>;
