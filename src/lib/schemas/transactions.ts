import { z } from "zod";
import {
  centsSchema,
  isoDateTimeSchema,
  transactionCategorySchema,
} from "./common";

export const portfolioTransactionSchema = z
  .object({
    id: z.string().min(1),
    timestamp: isoDateTimeSchema,
    category: transactionCategorySchema,
    ticker: z.string().optional(),
    shares: z.number().optional(),
    priceCents: centsSchema.nullable().optional(),
    amountCents: centsSchema.nullable(),
    externalCashFlow: z.boolean(),
    episodeNumber: z.number().int().positive().optional(),
    note: z.string().optional(),
  })
  .superRefine((tx, ctx) => {
    if (tx.externalCashFlow && tx.amountCents == null) {
      ctx.addIssue({
        code: "custom",
        message: `External cash-flow transaction ${tx.id} requires amountCents`,
      });
    }
  });

export const transactionsFileSchema = z
  .object({
    transactions: z.array(portfolioTransactionSchema),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const tx of data.transactions) {
      if (ids.has(tx.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate transaction id: ${tx.id}`,
        });
      }
      ids.add(tx.id);

      if (
        tx.category === "dividend" ||
        tx.category === "options_premium" ||
        tx.category === "interest" ||
        tx.category === "security_purchase" ||
        tx.category === "security_sale"
      ) {
        if (tx.externalCashFlow) {
          ctx.addIssue({
            code: "custom",
            message: `Transaction ${tx.id} category ${tx.category} must not be an external cash flow`,
          });
        }
      }

      if (
        tx.category === "initial_funding" ||
        tx.category === "personal_contribution" ||
        tx.category === "youtube_revenue_contribution" ||
        tx.category === "affiliate_revenue_contribution" ||
        tx.category === "sponsorship_revenue_contribution" ||
        tx.category === "viewer_support_contribution"
      ) {
        if (!tx.externalCashFlow) {
          ctx.addIssue({
            code: "custom",
            message: `Transaction ${tx.id} contribution category must set externalCashFlow true`,
          });
        }
      }
    }
  });

export type PortfolioTransaction = z.infer<typeof portfolioTransactionSchema>;
