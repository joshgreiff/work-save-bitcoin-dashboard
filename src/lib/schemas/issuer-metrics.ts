import { z } from "zod";
import {
  isoDateSchema,
  isoDateTimeSchema,
  nonNegativeSatsSchema,
  provenanceSchema,
  satsSchema,
} from "./common";

export const issuerMetricSchema = provenanceSchema.extend({
  id: z.string().min(1),
  ticker: z.string().min(1),
  metricDate: isoDateSchema,
  asOf: isoDateTimeSchema,
  totalBtcSats: nonNegativeSatsSchema.nullable(),
  basicSharesOutstanding: z.number().positive().nullable(),
  dilutedSharesOutstanding: z.number().positive().nullable(),
  basicSatsPerShare: satsSchema.nullable(),
  dilutedSatsPerShare: satsSchema.nullable(),
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
