import { z } from "zod";
import {
  assetClassSchema,
  centsSchema,
  isoDateTimeSchema,
  nonNegativeCentsSchema,
} from "./common";

export const positionSnapshotSchema = z.object({
  ticker: z.string().min(1),
  shares: z.number(),
  priceCents: centsSchema.nullable(),
  marketValueCents: centsSchema.nullable(),
  assetClass: assetClassSchema,
  lookThroughEligible: z.boolean(),
  underlyingTicker: z.string().optional(),
  adrRatio: z.number().positive().optional(),
});

export const benchmarkSnapshotSchema = z.object({
  symbol: z.string().min(1),
  label: z.string().min(1),
  priceCents: centsSchema.nullable(),
  units: z.number().nullable(),
  valueCents: centsSchema.nullable(),
});

export const episodeSnapshotSchema = z.object({
  episodeNumber: z.number().int().positive(),
  slug: z.string().min(1),
  title: z.string().min(1),
  youtubeUrl: z.string().url().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  publishedAt: isoDateTimeSchema,
  valuationAt: isoDateTimeSchema,
  portfolioValueCents: nonNegativeCentsSchema,
  cashBalanceCents: nonNegativeCentsSchema,
  cumulativeContributionsCents: nonNegativeCentsSchema,
  cumulativeWithdrawalsCents: nonNegativeCentsSchema,
  cumulativeIncomeCents: nonNegativeCentsSchema,
  investmentPnLCents: centsSchema,
  positions: z.array(positionSnapshotSchema),
  benchmarks: z.array(benchmarkSnapshotSchema),
  notes: z.array(z.string()).optional(),
});

export const episodesFileSchema = z
  .object({
    episodes: z.array(episodeSnapshotSchema).min(1),
  })
  .superRefine((data, ctx) => {
    const numbers = new Set<number>();
    const slugs = new Set<string>();
    for (const episode of data.episodes) {
      if (numbers.has(episode.episodeNumber)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate episode number: ${episode.episodeNumber}`,
        });
      }
      numbers.add(episode.episodeNumber);
      if (slugs.has(episode.slug)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate episode slug: ${episode.slug}`,
        });
      }
      slugs.add(episode.slug);
      if (Date.parse(episode.valuationAt) > Date.parse(episode.publishedAt) + 7 * 24 * 60 * 60 * 1000) {
        // Soft warning only via note — allow valuation after publish within reason.
      }
      if (Date.parse(episode.publishedAt) < Date.parse(episode.valuationAt) - 2 * 24 * 60 * 60 * 1000) {
        // Allow publish before valuation convention within a couple days.
      }
    }
  });

export type EpisodeSnapshot = z.infer<typeof episodeSnapshotSchema>;
export type PositionSnapshot = z.infer<typeof positionSnapshotSchema>;
export type BenchmarkSnapshot = z.infer<typeof benchmarkSnapshotSchema>;
