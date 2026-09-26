import { z } from "zod";
import { isoDateSchema, isoDateTimeSchema } from "./common";

export const learnCategorySchema = z.enum(["money", "bitcoin", "ownership"]);
export const learnDifficultySchema = z.enum(["intro", "intermediate", "advanced"]);
export const claimKindSchema = z.enum([
  "verified_fact",
  "illustration",
  "opinion",
  "projection",
]);

export const learnSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  asOf: isoDateSchema.nullable().optional(),
  note: z.string().optional(),
});

export const learnLessonMetaSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().min(1),
  publishedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  category: learnCategorySchema,
  difficulty: learnDifficultySchema,
  readingMinutes: z.number().int().positive(),
  videoUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  sources: z.array(learnSourceSchema).default([]),
  relatedLessons: z.array(z.string().min(1)).default([]),
  disclosures: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  pathOrder: z.number().int().nonnegative().default(0),
});

export const learnLessonsFileSchema = z
  .object({
    lessons: z.array(learnLessonMetaSchema).min(1),
    paths: z.object({
      money: z.object({
        title: z.string(),
        summary: z.string(),
      }),
      bitcoin: z.object({
        title: z.string(),
        summary: z.string(),
      }),
      ownership: z.object({
        title: z.string(),
        summary: z.string(),
      }),
    }),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const slugs = new Set<string>();
    for (const lesson of data.lessons) {
      if (slugs.has(lesson.slug)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate learn lesson slug: ${lesson.slug}`,
        });
      }
      slugs.add(lesson.slug);
    }
    for (const lesson of data.lessons) {
      for (const related of lesson.relatedLessons) {
        if (!slugs.has(related)) {
          ctx.addIssue({
            code: "custom",
            message: `Lesson ${lesson.slug} references missing related lesson: ${related}`,
          });
        }
      }
    }
  });

export const glossaryTermSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  definition: z.string().min(1),
  category: learnCategorySchema,
  relatedTerms: z.array(z.string()).default([]),
  sources: z.array(learnSourceSchema).default([]),
});

export const glossaryFileSchema = z
  .object({
    terms: z.array(glossaryTermSchema).min(1),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const ids = new Set<string>();
    for (const term of data.terms) {
      if (ids.has(term.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate glossary id: ${term.id}` });
      }
      ids.add(term.id);
    }
  });

export const learnResourceCategorySchema = z.enum([
  "buying_bitcoin",
  "wallets_self_custody",
  "bitcoin_nodes",
  "home_mining",
  "monetary_education",
  "books_podcasts",
]);

export const learnResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().nullable(),
  category: learnResourceCategorySchema,
  summary: z.string().min(1),
  referral: z.boolean().default(false),
  referralDisclosure: z.string().nullable().optional(),
  pendingUrlConfirmation: z.boolean().default(false),
  pendingNote: z.string().nullable().optional(),
});

export const learnResourcesFileSchema = z.object({
  resources: z.array(learnResourceSchema),
  notes: z.array(z.string()).default([]),
});

export const treasuryDebtObservationSchema = z.object({
  recordDate: isoDateSchema,
  totalPublicDebtUsd: z.number().positive(),
  debtHeldByPublicUsd: z.number().positive().nullable().optional(),
  intragovernmentalUsd: z.number().positive().nullable().optional(),
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: isoDateTimeSchema,
  freshness: z.enum(["live", "last_verified"]),
  note: z.string().optional(),
});

export const treasuryDebtFallbackFileSchema = z.object({
  observation: treasuryDebtObservationSchema,
  notes: z.array(z.string()).default([]),
});

export const newsletterConfigSchema = z.object({
  headline: z.string().min(1),
  description: z.string().min(1),
  privacyPolicyPath: z.string().min(1),
  provider: z.enum(["none", "formspree", "buttondown", "custom"]),
  endpointEnvVar: z.string().min(1),
  doubleOptIn: z.boolean().default(true),
  consentText: z.string().min(1),
});

export type LearnCategory = z.infer<typeof learnCategorySchema>;
export type LearnLessonMeta = z.infer<typeof learnLessonMetaSchema>;
export type LearnLessonsFile = z.infer<typeof learnLessonsFileSchema>;
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export type LearnResource = z.infer<typeof learnResourceSchema>;
export type TreasuryDebtObservation = z.infer<typeof treasuryDebtObservationSchema>;
export type NewsletterConfig = z.infer<typeof newsletterConfigSchema>;
export type ClaimKind = z.infer<typeof claimKindSchema>;
