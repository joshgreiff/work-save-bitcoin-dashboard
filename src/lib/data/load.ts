import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { donationsFileSchema } from "@/lib/schemas/donations";
import { episodesFileSchema } from "@/lib/schemas/episodes";
import {
  incomeHistoryFileSchema,
  incomeModelSchema,
  incomeSecuritiesFileSchema,
} from "@/lib/schemas/income-model";
import { issuerBitcoinPerShareFileSchema } from "@/lib/schemas/issuer-bps-history";
import { issuerMetricsFileSchema } from "@/lib/schemas/issuer-metrics";
import { marketObservationsFileSchema } from "@/lib/schemas/market-observations";
import { marketPricesFileSchema } from "@/lib/schemas/market-prices";
import { portfolioSchema } from "@/lib/schemas/portfolio";
import { researchIssuerSnapshotsFileSchema } from "@/lib/schemas/research-snapshots";
import { reserveFileSchema } from "@/lib/schemas/reserve";
import { siteConfigSchema } from "@/lib/schemas/site-config";
import { transactionsFileSchema } from "@/lib/schemas/transactions";
import { valuationHistoryFileSchema } from "@/lib/schemas/valuation-history";
import { youtubeFeedFileSchema } from "@/lib/schemas/youtube-feed";
import {
  glossaryFileSchema,
  learnLessonsFileSchema,
  learnPillarsFileSchema,
  learnResourcesFileSchema,
  newsletterConfigSchema,
  researchNotesFileSchema,
  treasuryDebtFallbackFileSchema,
} from "@/lib/schemas/learn";
import { SITE_RESEARCH_LINKS } from "@/lib/learn/content";

const DATA_DIR = path.join(process.cwd(), "data");

function readJsonFile(filename: string): unknown {
  const fullPath = path.join(DATA_DIR, filename);
  const raw = readFileSync(fullPath, "utf8");
  return JSON.parse(raw) as unknown;
}

function parseOrThrow<T>(
  filename: string,
  result: { success: true; data: T } | { success: false; error: { message: string } },
): T {
  if (!result.success) {
    throw new Error(`Invalid data file ${filename}: ${result.error.message}`);
  }
  return result.data;
}

export function loadSiteConfig() {
  return parseOrThrow("site-config.json", siteConfigSchema.safeParse(readJsonFile("site-config.json")));
}

export function loadPortfolio() {
  return parseOrThrow("portfolio.json", portfolioSchema.safeParse(readJsonFile("portfolio.json")));
}

export function loadEpisodes() {
  return parseOrThrow("episodes.json", episodesFileSchema.safeParse(readJsonFile("episodes.json")));
}

export function loadTransactions() {
  return parseOrThrow(
    "transactions.json",
    transactionsFileSchema.safeParse(readJsonFile("transactions.json")),
  );
}

export function loadMarketPrices() {
  return parseOrThrow(
    "market-prices.json",
    marketPricesFileSchema.safeParse(readJsonFile("market-prices.json")),
  );
}

export function loadIssuerMetrics() {
  return parseOrThrow(
    "issuer-metrics.json",
    issuerMetricsFileSchema.safeParse(readJsonFile("issuer-metrics.json")),
  );
}

export function loadReserve() {
  return parseOrThrow(
    "reserve-transactions.json",
    reserveFileSchema.safeParse(readJsonFile("reserve-transactions.json")),
  );
}

export function loadDonations() {
  return parseOrThrow(
    "donations.json",
    donationsFileSchema.safeParse(readJsonFile("donations.json")),
  );
}

export function loadValuationHistory() {
  return parseOrThrow(
    "valuation-history.json",
    valuationHistoryFileSchema.safeParse(readJsonFile("valuation-history.json")),
  );
}

export function loadIncomeModel() {
  return parseOrThrow(
    "income-model.json",
    incomeModelSchema.safeParse(readJsonFile("income-model.json")),
  );
}

export function loadIncomeSecurities() {
  return parseOrThrow(
    "income-securities.json",
    incomeSecuritiesFileSchema.safeParse(readJsonFile("income-securities.json")),
  );
}

export function loadIncomeHistory() {
  return parseOrThrow(
    "income-history.json",
    incomeHistoryFileSchema.safeParse(readJsonFile("income-history.json")),
  );
}

export function loadMarketObservations() {
  return parseOrThrow(
    "market-observations.json",
    marketObservationsFileSchema.safeParse(readJsonFile("market-observations.json")),
  );
}

export function loadIssuerBpsHistory() {
  return parseOrThrow(
    "issuer-bps-history.json",
    issuerBitcoinPerShareFileSchema.safeParse(
      readJsonFile("issuer-bps-history.json"),
    ),
  );
}

export function loadYoutubeFeed() {
  return parseOrThrow(
    "youtube-feed.json",
    youtubeFeedFileSchema.safeParse(readJsonFile("youtube-feed.json")),
  );
}

export function loadLearnLessons() {
  return parseOrThrow(
    "learn/lessons.json",
    learnLessonsFileSchema.safeParse(readJsonFile("learn/lessons.json")),
  );
}

export function loadLearnGlossary() {
  return parseOrThrow(
    "learn/glossary.json",
    glossaryFileSchema.safeParse(readJsonFile("learn/glossary.json")),
  );
}

export function loadLearnResources() {
  return parseOrThrow(
    "learn/resources.json",
    learnResourcesFileSchema.safeParse(readJsonFile("learn/resources.json")),
  );
}

export function loadTreasuryDebtFallback() {
  return parseOrThrow(
    "learn/treasury-debt-fallback.json",
    treasuryDebtFallbackFileSchema.safeParse(
      readJsonFile("learn/treasury-debt-fallback.json"),
    ),
  );
}

export function loadNewsletterConfig() {
  return parseOrThrow(
    "learn/newsletter.json",
    newsletterConfigSchema.safeParse(readJsonFile("learn/newsletter.json")),
  );
}

export function loadLearnPillars() {
  return parseOrThrow(
    "learn/pillars.json",
    learnPillarsFileSchema.safeParse(readJsonFile("learn/pillars.json")),
  );
}

export function loadResearchNotes() {
  return parseOrThrow(
    "learn/research-notes.json",
    researchNotesFileSchema.safeParse(readJsonFile("learn/research-notes.json")),
  );
}

export function loadResearchSnapshots() {
  return parseOrThrow(
    "learn/research-snapshots.json",
    researchIssuerSnapshotsFileSchema.safeParse(readJsonFile("learn/research-snapshots.json")),
  );
}

const APP_DIR = path.join(process.cwd(), "src", "app");

/**
 * Resolve an internal href (path only; hash and query ignored) against Learn content and the
 * static App Router tree. Returns a problem description or null.
 */
function internalHrefProblem(
  href: string,
  known: { lessonSlugs: Set<string>; noteSlugs: Set<string>; pillarSlugs: Set<string> },
): string | null {
  if (!href.startsWith("/")) return null;
  const pathname = href.split(/[?#]/)[0]!.replace(/\/$/, "") || "/";
  const research = pathname.match(/^\/learn\/research\/([^/]+)$/);
  if (research) return known.noteSlugs.has(research[1]!) ? null : `missing research note ${research[1]}`;
  const pillar = pathname.match(/^\/learn\/pillars\/([^/]+)$/);
  if (pillar) return known.pillarSlugs.has(pillar[1]!) ? null : `missing pillar ${pillar[1]}`;
  const staticPage = path.join(APP_DIR, pathname, "page.tsx");
  if (existsSync(staticPage)) return null;
  const lesson = pathname.match(/^\/learn\/([^/]+)$/);
  if (lesson && known.lessonSlugs.has(lesson[1]!)) return null;
  return `unresolved internal link ${href}`;
}

/** Every slug, term id, snapshot id, or internal link referenced across Learn content must resolve. */
export function validateLearnCrossReferences(): void {
  const lessons = loadLearnLessons().lessons;
  const notes = loadResearchNotes().notes;
  const glossary = loadLearnGlossary().terms;
  const pillars = loadLearnPillars().pillars;
  const snapshotIds = new Set(loadResearchSnapshots().snapshots.map((s) => s.id));

  const lessonSlugs = new Set(lessons.map((l) => l.slug));
  const noteSlugs = new Set(notes.map((n) => n.slug));
  const termIds = new Set(glossary.map((t) => t.id));
  const pillarSlugs = new Set<string>(pillars.map((p) => p.slug));
  const known = { lessonSlugs, noteSlugs, pillarSlugs };
  const problems: string[] = [];

  for (const [key, slug] of Object.entries(SITE_RESEARCH_LINKS)) {
    if (!noteSlugs.has(slug)) problems.push(`site research link ${key} → missing research note ${slug}`);
  }
  for (const note of notes) {
    if (note.issuerSnapshot && !snapshotIds.has(note.issuerSnapshot.snapshotId)) {
      problems.push(`note ${note.slug} → missing research snapshot ${note.issuerSnapshot.snapshotId}`);
    }
    for (const tool of note.relatedTools) {
      const problem = internalHrefProblem(tool.href, known);
      if (problem) problems.push(`note ${note.slug} → ${problem}`);
    }
  }
  for (const lesson of lessons) {
    for (const tool of lesson.relatedTools) {
      const problem = internalHrefProblem(tool.href, known);
      if (problem) problems.push(`lesson ${lesson.slug} → ${problem}`);
    }
  }
  for (const pillar of pillars) {
    for (const tool of pillar.relatedTools) {
      const problem = internalHrefProblem(tool.href, known);
      if (problem) problems.push(`pillar ${pillar.slug} → ${problem}`);
    }
  }

  for (const lesson of lessons) {
    for (const slug of lesson.relatedResearchSlugs) {
      if (!noteSlugs.has(slug)) problems.push(`lesson ${lesson.slug} → missing research note ${slug}`);
    }
    for (const id of lesson.glossaryTermIds) {
      if (!termIds.has(id)) problems.push(`lesson ${lesson.slug} → missing glossary term ${id}`);
    }
  }
  for (const note of notes) {
    for (const slug of note.relatedLessonSlugs) {
      if (!lessonSlugs.has(slug)) problems.push(`note ${note.slug} → missing lesson ${slug}`);
    }
    for (const slug of note.nextResearchSlugs) {
      if (!noteSlugs.has(slug)) problems.push(`note ${note.slug} → missing research note ${slug}`);
    }
    for (const id of note.glossaryTermIds) {
      if (!termIds.has(id)) problems.push(`note ${note.slug} → missing glossary term ${id}`);
    }
  }
  for (const pillar of pillars) {
    for (const q of pillar.questions) {
      if (q.researchSlug && !noteSlugs.has(q.researchSlug)) {
        problems.push(`pillar ${pillar.slug} → missing research note ${q.researchSlug}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid Learn cross-references:\n${problems.join("\n")}`);
  }
}

export function validateAllDataFiles(): void {
  loadSiteConfig();
  loadPortfolio();
  loadEpisodes();
  loadTransactions();
  loadMarketPrices();
  loadIssuerMetrics();
  loadReserve();
  loadDonations();
  loadValuationHistory();
  loadMarketObservations();
  loadIssuerBpsHistory();
  loadYoutubeFeed();
  loadLearnLessons();
  loadLearnGlossary();
  loadLearnResources();
  loadTreasuryDebtFallback();
  loadNewsletterConfig();
  loadLearnPillars();
  loadResearchNotes();
  loadResearchSnapshots();
  validateLearnCrossReferences();
  loadIncomeModel();
  loadIncomeSecurities();
  loadIncomeHistory();
}
