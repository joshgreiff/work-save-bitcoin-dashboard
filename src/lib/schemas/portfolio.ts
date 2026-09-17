import { z } from "zod";
import {
  assetClassSchema,
  centsSchema,
  isoDateTimeSchema,
  nonNegativeCentsSchema,
} from "./common";

export const positionSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().optional(),
  assetClass: assetClassSchema,
  shares: z.number(),
  lookThroughEligible: z.boolean(),
  underlyingTicker: z.string().optional(),
  adrRatio: z.number().positive().optional(),
  priceCents: centsSchema.nullable(),
  marketValueCents: centsSchema.nullable(),
  costBasisCents: centsSchema.nullable().optional(),
});

export const portfolioSchema = z.object({
  series: z.string().min(1),
  inceptionEpisodeNumber: z.number().int().positive(),
  inceptionPublishedAt: isoDateTimeSchema,
  inceptionValuationAt: isoDateTimeSchema,
  startingPortfolioValueCents: nonNegativeCentsSchema,
  currentValuationAt: isoDateTimeSchema,
  currentPortfolioValueCents: nonNegativeCentsSchema,
  cashBalanceCents: nonNegativeCentsSchema,
  dataQuality: z.enum(["seed", "confirmed", "corrected"]),
  notes: z.array(z.string()).default([]),
  positions: z.array(positionSchema).min(1),
  afterHours: z
    .object({
      asOf: isoDateTimeSchema,
      portfolioValueCents: nonNegativeCentsSchema,
      cashBalanceCents: nonNegativeCentsSchema.nullable(),
      positions: z.array(
        z.object({
          ticker: z.string().min(1),
          shares: z.number(),
          marketValueCents: centsSchema.nullable(),
        }),
      ),
      notes: z.array(z.string()).default([]),
    })
    .optional(),
});

export type PortfolioData = z.infer<typeof portfolioSchema>;
export type Position = z.infer<typeof positionSchema>;
