import { z } from "zod";
import { centsSchema, isoDateTimeSchema, nonNegativeCentsSchema } from "./common";

export const valuationTypeSchema = z.enum([
  "inception",
  "market_open",
  "market_close",
  "live_transient",
]);

export const historicalValuationTypeSchema = z.enum([
  "inception",
  "market_open",
  "market_close",
]);

export const marketPriceSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url().nullable(),
  observedAt: isoDateTimeSchema,
  retrievedAt: isoDateTimeSchema,
  fallbackUsed: z.boolean().optional(),
  note: z.string().optional(),
});

const nullablePriceMap = z.object({
  BTCUSD: centsSchema.nullable(),
  MSTR: centsSchema.nullable(),
  ASST: centsSchema.nullable(),
  MPJPY: centsSchema.nullable(),
  SPY: centsSchema.nullable(),
  GLD: centsSchema.nullable(),
});

const nullableSourceMap = z.object({
  BTCUSD: marketPriceSourceSchema.nullable(),
  MSTR: marketPriceSourceSchema.nullable(),
  ASST: marketPriceSourceSchema.nullable(),
  MPJPY: marketPriceSourceSchema.nullable(),
  SPY: marketPriceSourceSchema.nullable(),
  GLD: marketPriceSourceSchema.nullable(),
});

export const synchronizedMarketObservationSchema = z.object({
  id: z.string().min(1),
  timestamp: isoDateTimeSchema,
  timezone: z.literal("America/New_York"),
  valuationType: historicalValuationTypeSchema,
  prices: nullablePriceMap,
  sources: nullableSourceMap,
  portfolioValueCents: nonNegativeCentsSchema.nullable(),
  netExternalContributionsCents: nonNegativeCentsSchema.nullable(),
  note: z.string().optional(),
});

export const marketObservationsFileSchema = z
  .object({
    observations: z.array(synchronizedMarketObservationSchema),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const obs of data.observations) {
      if (ids.has(obs.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate market observation id: ${obs.id}`,
        });
      }
      ids.add(obs.id);
    }
  });

export type ValuationType = z.infer<typeof valuationTypeSchema>;
export type HistoricalValuationType = z.infer<typeof historicalValuationTypeSchema>;
export type MarketPriceSource = z.infer<typeof marketPriceSourceSchema>;
export type SynchronizedMarketObservation = z.infer<
  typeof synchronizedMarketObservationSchema
>;
export type MarketObservationsFile = z.infer<typeof marketObservationsFileSchema>;
