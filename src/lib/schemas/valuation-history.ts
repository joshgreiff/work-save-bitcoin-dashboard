import { z } from "zod";
import {
  centsSchema,
  isoDateTimeSchema,
  nonNegativeCentsSchema,
  provenanceSchema,
} from "./common";
import { historicalValuationTypeSchema } from "./market-observations";

export const sessionSchema = z.enum(["open", "close"]);

export const valuationHistoryPointSchema = provenanceSchema.extend({
  id: z.string().min(1),
  asOf: isoDateTimeSchema,
  session: sessionSchema,
  valuationType: historicalValuationTypeSchema.default("market_close"),
  portfolioValueCents: nonNegativeCentsSchema.nullable(),
  prices: z.object({
    BTCUSD: centsSchema.nullable(),
    SPY: centsSchema.nullable(),
    GLD: centsSchema.nullable(),
    MSTR: centsSchema.nullable().optional(),
    ASST: centsSchema.nullable().optional(),
    MPJPY: centsSchema.nullable().optional(),
  }),
});

export const valuationHistoryFileSchema = z
  .object({
    points: z.array(valuationHistoryPointSchema),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    const keys = new Set<string>();
    for (const point of data.points) {
      if (ids.has(point.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate valuation history id: ${point.id}`,
        });
      }
      ids.add(point.id);
      const key = `${point.asOf}|${point.valuationType}`;
      if (keys.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate valuation history point: ${key}`,
        });
      }
      keys.add(key);
    }
  });

export type ValuationHistoryPoint = z.infer<typeof valuationHistoryPointSchema>;
export type ValuationHistoryFile = z.infer<typeof valuationHistoryFileSchema>;
export type SessionKind = z.infer<typeof sessionSchema>;
