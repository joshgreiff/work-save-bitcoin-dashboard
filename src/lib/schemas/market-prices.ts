import { z } from "zod";
import { centsSchema, isoDateTimeSchema, provenanceSchema } from "./common";

export const marketPriceSchema = provenanceSchema.extend({
  symbol: z.string().min(1),
  asOf: isoDateTimeSchema,
  priceCents: centsSchema.nullable(),
});

export const marketPricesFileSchema = z
  .object({
    prices: z.array(marketPriceSchema),
  })
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    for (const price of data.prices) {
      const key = `${price.symbol}|${price.asOf}`;
      if (keys.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate market price for ${key}`,
        });
      }
      keys.add(key);
    }
  });

export type MarketPrice = z.infer<typeof marketPriceSchema>;
