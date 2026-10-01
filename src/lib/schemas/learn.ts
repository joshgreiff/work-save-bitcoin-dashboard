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

export const learnPillarSchema = z.enum([
  "money-and-human-time",
  "institutions-and-power",
  "bitcoin-as-an-alternative",
  "bitcoin-capital-markets",
  "technology-and-sovereignty",
]);

export const LEARN_PILLAR_ORDER = learnPillarSchema.options;

const slugSchema = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** Internal site path (e.g. `/learn/save-your-time#sats-calculator`) or https URL. */
const internalOrHttpsHrefSchema = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("/") || value.startsWith("https://"), {
    message: "href must be an internal path or https URL",
  });

export const learnRelatedToolSchema = z.object({
  label: z.string().min(1),
  href: internalOrHttpsHrefSchema,
  description: z.string().optional(),
});

export const learnSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  asOf: isoDateSchema.nullable().optional(),
  note: z.string().optional(),
});

export const learnLessonMetaSchema = z.object({
  title: z.string().min(1),
  slug: slugSchema,
  summary: z.string().min(1),
  publishedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  category: learnCategorySchema,
  pillar: learnPillarSchema,
  difficulty: learnDifficultySchema,
  readingMinutes: z.number().int().positive(),
  videoUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  relatedNewsletterUrl: z.string().url().nullable().default(null),
  relatedTools: z.array(learnRelatedToolSchema).default([]),
  glossaryTermIds: z.array(z.string().min(1)).default([]),
  relatedResearchSlugs: z.array(slugSchema).default([]),
  sources: z.array(learnSourceSchema).default([]),
  relatedLessons: z.array(z.string().min(1)).default([]),
  disclosures: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  pathOrder: z.number().int().nonnegative().default(0),
});

export const learnLessonsFileSchema = z
  .object({
    lessons: z.array(learnLessonMetaSchema).min(1),
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

const publishedContentLinkSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  publishedAt: isoDateTimeSchema,
});

export const learnPillarQuestionSchema = z.object({
  question: z.string().min(1),
  researchSlug: slugSchema.nullable().default(null),
});

export const learnPillarDefinitionSchema = z.object({
  slug: learnPillarSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  topics: z.array(z.string().min(1)).min(1),
  questions: z.array(learnPillarQuestionSchema).min(1),
  relatedTools: z.array(learnRelatedToolSchema).default([]),
  relatedVideos: z.array(publishedContentLinkSchema).default([]),
  relatedNewsletterEssays: z.array(publishedContentLinkSchema).default([]),
});

export const learnPillarsFileSchema = z
  .object({
    pillars: z.array(learnPillarDefinitionSchema),
    notes: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const slugs = data.pillars.map((p) => p.slug);
    if (slugs.join("|") !== LEARN_PILLAR_ORDER.join("|")) {
      ctx.addIssue({
        code: "custom",
        message: `Pillars must appear exactly once in order: ${LEARN_PILLAR_ORDER.join(", ")}`,
      });
    }
  });

export const researchStatusSchema = z.enum([
  "question",
  "researching",
  "published",
  "needs_review",
]);

export const researchSourceTypeSchema = z.enum([
  "primary",
  "academic",
  "official_data",
  "market_data",
  "commentary",
]);

/** Year, year-month, or full date — never invent a day that the source does not state. */
export const partialDateSchema = z
  .string()
  .regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/, "Use YYYY, YYYY-MM, or YYYY-MM-DD");

export const researchSourceSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url(),
  publishedAt: partialDateSchema.nullable(),
  type: researchSourceTypeSchema,
  note: z.string().optional(),
});

export const researchClaimKindSchema = z.enum([
  "established_fact",
  "company_target",
  "speculative",
  "interpretation",
  "disputed",
  "open_question",
]);

export const RESEARCH_CLAIM_KIND_ORDER = researchClaimKindSchema.options;

export const researchClaimSchema = z.object({
  kind: researchClaimKindSchema,
  text: z.string().min(1),
  sourceIds: z.array(slugSchema).default([]),
  note: z.string().optional(),
});

export const researchViewSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  claims: z.array(researchClaimSchema).min(1),
});

export const researchSectionSchema = z.object({
  id: slugSchema,
  heading: z.string().min(1),
  claims: z.array(researchClaimSchema).min(1),
});

export const researchRevisionSchema = z.object({
  date: isoDateSchema,
  note: z.string().min(1),
});

/** Links a note to a research-only issuer snapshot (never portfolio data) and places its panels. */
export const researchIssuerSnapshotLinkSchema = z.object({
  snapshotId: slugSchema,
  metricsAfterSectionId: slugSchema,
  illustrationAfterSectionId: slugSchema,
});

export const researchNoteSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    pillar: learnPillarSchema,
    status: researchStatusSchema,
    publishedAt: isoDateTimeSchema.nullable(),
    updatedAt: isoDateTimeSchema,
    centralQuestion: z.string().min(1),
    workingThesis: z.string().min(1),
    mainstreamView: researchViewSchema,
    alternativeView: researchViewSchema,
    evidence: z.array(researchSectionSchema).min(1),
    openQuestions: z.array(z.string().min(1)).default([]),
    sources: z.array(researchSourceSchema).min(1),
    relatedLessonSlugs: z.array(slugSchema).default([]),
    relatedVideoUrl: z.string().url().nullable().default(null),
    relatedNewsletterUrl: z.string().url().nullable().default(null),
    relatedTools: z.array(learnRelatedToolSchema).default([]),
    glossaryTermIds: z.array(z.string().min(1)).default([]),
    nextResearchSlugs: z.array(slugSchema).default([]),
    disclosures: z.array(z.string().min(1)).default([]),
    revisions: z.array(researchRevisionSchema).default([]),
    issuerSnapshot: researchIssuerSnapshotLinkSchema.nullable().default(null),
  })
  .superRefine((note, ctx) => {
    if (note.status === "published" && note.publishedAt == null) {
      ctx.addIssue({ code: "custom", message: `${note.slug}: published notes need publishedAt` });
    }
    if (note.publishedAt && Date.parse(note.updatedAt) < Date.parse(note.publishedAt)) {
      ctx.addIssue({ code: "custom", message: `${note.slug}: updatedAt precedes publishedAt` });
    }

    const sourceById = new Map<string, z.infer<typeof researchSourceSchema>>();
    for (const source of note.sources) {
      if (sourceById.has(source.id)) {
        ctx.addIssue({ code: "custom", message: `${note.slug}: duplicate source id ${source.id}` });
      }
      sourceById.set(source.id, source);
    }

    const claims = [
      ...note.mainstreamView.claims,
      ...note.alternativeView.claims,
      ...note.evidence.flatMap((section) => section.claims),
    ];
    for (const claim of claims) {
      for (const id of claim.sourceIds) {
        if (!sourceById.has(id)) {
          ctx.addIssue({ code: "custom", message: `${note.slug}: claim cites unknown source ${id}` });
        }
      }
      const excerpt = `"${claim.text.slice(0, 60)}…"`;
      if (claim.kind === "established_fact") {
        const hasEvidenceSource = claim.sourceIds.some((id) => {
          const type = sourceById.get(id)?.type;
          return type != null && type !== "commentary";
        });
        if (!hasEvidenceSource) {
          ctx.addIssue({
            code: "custom",
            message: `${note.slug}: established facts must cite a primary, academic, official-data, or market-data source — ${excerpt}`,
          });
        }
      }
      if (
        claim.kind === "company_target" &&
        !claim.sourceIds.some((id) => sourceById.get(id)?.type === "primary")
      ) {
        ctx.addIssue({
          code: "custom",
          message: `${note.slug}: company targets must cite the company's own primary source — ${excerpt}`,
        });
      }
      if (claim.kind === "speculative" && claim.sourceIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: `${note.slug}: speculative scenarios must cite who proposed them — ${excerpt}`,
        });
      }
    }

    if (note.issuerSnapshot) {
      const sectionIds = new Set(note.evidence.map((section) => section.id));
      for (const sectionId of [
        note.issuerSnapshot.metricsAfterSectionId,
        note.issuerSnapshot.illustrationAfterSectionId,
      ]) {
        if (!sectionIds.has(sectionId)) {
          ctx.addIssue({
            code: "custom",
            message: `${note.slug}: issuer snapshot panel targets unknown section ${sectionId}`,
          });
        }
      }
    }

    for (let i = 1; i < note.revisions.length; i += 1) {
      if (note.revisions[i]!.date < note.revisions[i - 1]!.date) {
        ctx.addIssue({ code: "custom", message: `${note.slug}: revisions must be chronological` });
      }
    }
  });

export const researchNotesFileSchema = z
  .object({
    notes: z.array(researchNoteSchema),
    policy: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const slugs = new Set<string>();
    for (const note of data.notes) {
      if (slugs.has(note.slug)) {
        ctx.addIssue({ code: "custom", message: `Duplicate research note slug: ${note.slug}` });
      }
      slugs.add(note.slug);
    }
  });

export type LearnPillar = z.infer<typeof learnPillarSchema>;
export type LearnPillarDefinition = z.infer<typeof learnPillarDefinitionSchema>;
export type LearnRelatedTool = z.infer<typeof learnRelatedToolSchema>;
export type ResearchStatus = z.infer<typeof researchStatusSchema>;
export type ResearchSourceType = z.infer<typeof researchSourceTypeSchema>;
export type ResearchSource = z.infer<typeof researchSourceSchema>;
export type ResearchClaimKind = z.infer<typeof researchClaimKindSchema>;
export type ResearchClaim = z.infer<typeof researchClaimSchema>;
export type ResearchNote = z.infer<typeof researchNoteSchema>;
export type LearnCategory = z.infer<typeof learnCategorySchema>;
export type LearnLessonMeta = z.infer<typeof learnLessonMetaSchema>;
export type LearnLessonsFile = z.infer<typeof learnLessonsFileSchema>;
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export type LearnResource = z.infer<typeof learnResourceSchema>;
export type TreasuryDebtObservation = z.infer<typeof treasuryDebtObservationSchema>;
export type NewsletterConfig = z.infer<typeof newsletterConfigSchema>;
export type ClaimKind = z.infer<typeof claimKindSchema>;
