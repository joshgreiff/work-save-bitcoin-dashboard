import { z } from "zod";
import {
  isoDateTimeSchema,
  nonNegativeSatsSchema,
  provenanceSchema,
} from "./common";
import { dilutionScopeSchema } from "./issuer-metrics";

export const issuerBpsSourceTypeSchema = z.enum([
  "company_release",
  "sec_filing",
  "company_dashboard",
]);

export const issuerBitcoinPerShareObservationSchema = provenanceSchema.extend({
  id: z.string().min(1),
  ticker: z.string().min(1),
  issuer: z.string().min(1),
  asOf: isoDateTimeSchema,
  metricDateLabel: z.string().nullable().optional(),
  asOfBasis: z.string().nullable().optional(),
  bitcoinHoldings: z.number().nonnegative().nullable(),
  /** BTC as whole coins when disclosed that way; sats preferred via bitcoinHoldingsSats. */
  bitcoinHoldingsSats: nonNegativeSatsSchema.nullable().optional(),
  basicSharesOutstanding: z.number().positive().nullable(),
  assumedDilutedSharesOutstanding: z.number().positive().nullable(),
  dilutionScope: dilutionScopeSchema.nullable().optional(),
  excludedTraditionalWarrants: z.number().nonnegative().nullable().optional(),
  reportedSatsPerBasicShare: z.number().nonnegative().nullable(),
  reportedSatsPerDilutedShare: z.number().nonnegative().nullable(),
  calculatedSatsPerBasicShare: z.number().nonnegative().nullable(),
  calculatedSatsPerDilutedShare: z.number().nonnegative().nullable(),
  adrRatio: z.number().positive().nullable().optional(),
  methodologyVersion: z.string().nullable().optional(),
  sourceType: issuerBpsSourceTypeSchema.nullable(),
  calculationNote: z.string().nullable().optional(),
  notes: z.array(z.string()).default([]),
});

export const issuerBitcoinPerShareFileSchema = z
  .object({
    observations: z.array(issuerBitcoinPerShareObservationSchema),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const obs of data.observations) {
      if (ids.has(obs.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate issuer BTC/share observation id: ${obs.id}`,
        });
      }
      ids.add(obs.id);
      if (
        !obs.sourceUrl ||
        !obs.sourceName ||
        !obs.retrievedAt ||
        !obs.asOf
      ) {
        ctx.addIssue({
          code: "custom",
          message: `${obs.id}: every observation requires primary sourceName, sourceUrl, asOf, and retrievedAt`,
        });
      }
    }
  });

export type IssuerBitcoinPerShareObservation = z.infer<
  typeof issuerBitcoinPerShareObservationSchema
>;
export type IssuerBitcoinPerShareFile = z.infer<
  typeof issuerBitcoinPerShareFileSchema
>;
