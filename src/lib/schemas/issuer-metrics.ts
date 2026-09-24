import { z } from "zod";
import {
  isoDateSchema,
  isoDateTimeSchema,
  nonNegativeSatsSchema,
  provenanceSchema,
} from "./common";

/** Dilution scope labels for issuer-defined share counts. */
export const dilutionScopeSchema = z.enum([
  "assumed_diluted_convertible_instruments_options_rsus_psus",
  "issuer_assumed_fully_diluted_excluding_traditional_warrants",
  "assumed_diluted_tracker",
]);

export const issuerMetricSchema = provenanceSchema.extend({
  id: z.string().min(1),
  ticker: z.string().min(1),
  issuer: z.string().min(1),
  metricDate: isoDateSchema,
  metricDateLabel: z.string().nullable().optional(),
  asOf: isoDateTimeSchema,
  asOfBasis: z.string().nullable().optional(),
  /** BTC holdings in whole coins when disclosed that way. */
  bitcoinHoldings: z.number().nonnegative().nullable(),
  totalBtcSats: nonNegativeSatsSchema.nullable(),
  basicSharesOutstanding: z.number().positive().nullable(),
  dilutedSharesOutstanding: z.number().positive().nullable(),
  dilutionScope: dilutionScopeSchema.nullable().optional(),
  excludedTraditionalWarrants: z.number().nonnegative().nullable().optional(),
  /** May be fractional — look-through rounds only the final position sats. */
  basicSatsPerShare: z.number().nonnegative().nullable(),
  dilutedSatsPerShare: z.number().nonnegative().nullable(),
  /** Issuer-published rounded diluted sats/share when it differs from calculated. */
  reportedDilutedSatsPerShare: z.number().nonnegative().nullable().optional(),
  reportedBasicSatsPerShare: z.number().nonnegative().nullable().optional(),
  adrRatio: z.number().positive().nullable().optional(),
  effectiveCommonShares: z.number().positive().nullable().optional(),
  options: z.number().nonnegative().nullable().optional(),
  unvestedEmployeeAwards: z.number().nonnegative().nullable().optional(),
});

export const issuerMetricsFileSchema = z
  .object({
    metrics: z.array(issuerMetricSchema),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const metric of data.metrics) {
      if (ids.has(metric.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate issuer metric id: ${metric.id}`,
        });
      }
      ids.add(metric.id);
    }
  });

export type IssuerMetric = z.infer<typeof issuerMetricSchema>;
export type DilutionScope = z.infer<typeof dilutionScopeSchema>;
