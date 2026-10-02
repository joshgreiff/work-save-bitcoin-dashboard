import type {
  LearnLessonMeta,
  LearnPillar,
  LearnPillarDefinition,
  ResearchClaimKind,
  ResearchNote,
  ResearchSourceType,
  ResearchStatus,
} from "@/lib/schemas/learn";

export const RESEARCH_STATUS_LABEL: Record<ResearchStatus, string> = {
  question: "Open question",
  researching: "Researching",
  published: "Published",
  needs_review: "Needs editorial review",
};

export const RESEARCH_CLAIM_LABEL: Record<ResearchClaimKind, string> = {
  established_fact: "Established fact",
  company_target: "Company target",
  speculative: "Speculative",
  interpretation: "Interpretation",
  disputed: "Disputed",
  open_question: "Open question",
};

export const RESEARCH_CLAIM_DESCRIPTION: Record<ResearchClaimKind, string> = {
  established_fact:
    "Supported by official data, original texts, filings, market data, or peer-reviewed research.",
  company_target:
    "A goal or expectation stated by the company in its own filings or webcasts — not a result.",
  speculative: "A possible future scenario that has not been demonstrated. Not a forecast.",
  interpretation: "A reading of the evidence — reasonable people may weigh it differently.",
  disputed: "Actively contested by credible researchers.",
  open_question: "Not yet answered by the evidence reviewed here.",
};

export const RESEARCH_SOURCE_TYPE_LABEL: Record<ResearchSourceType, string> = {
  primary: "Primary",
  academic: "Academic",
  official_data: "Official data",
  market_data: "Market data",
  commentary: "Commentary",
};

/** Research notes linked from site pages outside Learn; validated against notes at build time. */
export const SITE_RESEARCH_LINKS = {
  operatingCompanyGrowth: "can-spacex-help-a-bitcoin-portfolio-outperform",
} as const;

export const RESEARCH_WORKFLOW_STEPS = [
  "Question",
  "Competing explanations",
  "Primary sources",
  "Data and history",
  "Working conclusion",
] as const;

export function pillarBySlug(
  pillars: LearnPillarDefinition[],
  slug: string,
): LearnPillarDefinition | null {
  return pillars.find((p) => p.slug === slug) ?? null;
}

export function lessonsForPillar(lessons: LearnLessonMeta[], pillar: LearnPillar): LearnLessonMeta[] {
  return lessons
    .filter((l) => l.pillar === pillar)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function researchNotesForPillar(notes: ResearchNote[], pillar: LearnPillar): ResearchNote[] {
  return sortResearchNotes(notes.filter((n) => n.pillar === pillar));
}

/** Newest first by publication (falling back to last update for unpublished notes). */
export function sortResearchNotes(notes: ResearchNote[]): ResearchNote[] {
  return [...notes].sort(
    (a, b) =>
      Date.parse(b.publishedAt ?? b.updatedAt) - Date.parse(a.publishedAt ?? a.updatedAt),
  );
}

/** 1-based citation numbers in the order sources are listed on the note. */
export function sourceCitationNumbers(note: ResearchNote): Map<string, number> {
  return new Map(note.sources.map((source, index) => [source.id, index + 1]));
}

/** Human label for a YYYY, YYYY-MM, or YYYY-MM-DD source date without inventing precision. */
export function formatPartialDate(value: string | null): string {
  if (!value) return "Undated";
  const [year, month, day] = value.split("-");
  if (!month) return year!;
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
  );
  return day ? `${monthLabel}. ${Number(day)}, ${year}` : `${monthLabel}. ${year}`;
}

/** Resolve ids against a collection, preserving the requested order and skipping unknown ids. */
export function pickInOrder<T>(ids: string[], items: T[], key: (item: T) => string): T[] {
  const byKey = new Map(items.map((item) => [key(item), item]));
  return ids.flatMap((id) => {
    const item = byKey.get(id);
    return item ? [item] : [];
  });
}

export function claimKindsUsed(note: ResearchNote): Set<ResearchClaimKind> {
  const claims = [
    ...note.mainstreamView.claims,
    ...note.alternativeView.claims,
    ...note.evidence.flatMap((s) => s.claims),
  ];
  const kinds = new Set<ResearchClaimKind>(claims.map((c) => c.kind));
  for (const engine of note.valueEngines?.engines ?? []) kinds.add(engine.kind);
  if (note.valueEngines) kinds.add("interpretation");
  if (note.openQuestions.length > 0) kinds.add("open_question");
  return kinds;
}
