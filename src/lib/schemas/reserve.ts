import { z } from "zod";
import { isoDateTimeSchema, nonNegativeSatsSchema } from "./common";

export const reserveTransactionCategorySchema = z.enum([
  "contribution_received",
  "sats_sent",
  "network_fee",
  "correction",
]);

export const reserveTransactionSchema = z.object({
  id: z.string().min(1),
  timestamp: isoDateTimeSchema,
  category: reserveTransactionCategorySchema,
  sats: nonNegativeSatsSchema,
  episodeNumber: z.number().int().positive().optional(),
  publicNote: z.string().optional(),
  affectsPortfolioPerformance: z.literal(false).default(false),
});

export const reserveFileSchema = z
  .object({
    publicSupportAddress: z.string().nullable(),
    publicSupportQrUrl: z.string().url().nullable(),
    transactions: z.array(reserveTransactionSchema),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const tx of data.transactions) {
      if (ids.has(tx.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate reserve transaction id: ${tx.id}`,
        });
      }
      ids.add(tx.id);
      if (tx.affectsPortfolioPerformance) {
        ctx.addIssue({
          code: "custom",
          message: `Reserve transaction ${tx.id} must not affect portfolio performance`,
        });
      }
    }
  });

export type ReserveTransaction = z.infer<typeof reserveTransactionSchema>;
export type ReserveData = z.infer<typeof reserveFileSchema>;
