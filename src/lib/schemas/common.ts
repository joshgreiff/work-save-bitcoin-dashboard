import { z } from "zod";

export const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid ISO datetime",
});

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date");

export const centsSchema = z.number().int();
export const nonNegativeCentsSchema = z.number().int().nonnegative();
export const satsSchema = z.number().int();
export const nonNegativeSatsSchema = z.number().int().nonnegative();

export const provenanceSchema = z.object({
  sourceName: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  retrievedAt: isoDateTimeSchema.nullable().optional(),
  manual: z.boolean().default(true),
  note: z.string().nullable().optional(),
});

export const assetClassSchema = z.enum([
  "common_equity",
  "preferred",
  "etf",
  "cash",
  "other",
]);

export const transactionCategorySchema = z.enum([
  "initial_funding",
  "personal_contribution",
  "youtube_revenue_contribution",
  "affiliate_revenue_contribution",
  "sponsorship_revenue_contribution",
  "viewer_support_contribution",
  "security_purchase",
  "security_sale",
  "dividend",
  "options_premium",
  "interest",
  "fee",
  "tax_withholding",
  "withdrawal",
  "correction",
]);

export type TransactionCategory = z.infer<typeof transactionCategorySchema>;
