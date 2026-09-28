import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RelatedContent } from "@/components/learn/RelatedContent";
import { SaveYourTimeLesson } from "@/components/learn/SaveYourTimeLesson";
import {
  loadLearnGlossary,
  loadLearnLessons,
  loadNewsletterConfig,
  loadResearchNotes,
  loadTreasuryDebtFallback,
} from "@/lib/data/load";
import { pickInOrder } from "@/lib/learn/content";
import { fetchTreasuryDebt } from "@/lib/learn/treasury-debt";
import { fetchCoinbaseBtcCard } from "@/lib/quotes/btc";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return loadLearnLessons().lessons.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lesson = loadLearnLessons().lessons.find((l) => l.slug === slug);
  if (!lesson) return { title: "Lesson" };
  return {
    title: lesson.title,
    description: lesson.summary,
    alternates: { canonical: `/learn/${lesson.slug}` },
    openGraph: {
      title: `${lesson.title} | Work Save Bitcoin`,
      description: lesson.summary,
      type: "article",
      publishedTime: lesson.publishedAt,
      modifiedTime: lesson.updatedAt,
    },
  };
}

export default async function LearnLessonPage({ params }: Props) {
  const { slug } = await params;
  const lessonsFile = loadLearnLessons();
  const lesson = lessonsFile.lessons.find((l) => l.slug === slug);
  if (!lesson) notFound();

  const newsletter = loadNewsletterConfig();
  const newsletterSignupEnabled =
    newsletter.provider !== "none" &&
    Boolean(process.env[newsletter.endpointEnvVar]?.trim());
  const fallback = loadTreasuryDebtFallback().observation;
  const debt = await fetchTreasuryDebt({ fallback });

  let btc: { priceUsd: number | null; asOf: string | null; sourceName: string | null } = {
    priceUsd: null,
    asOf: null,
    sourceName: null,
  };
  try {
    const card = await fetchCoinbaseBtcCard();
    btc = {
      priceUsd: card.priceCents / 100,
      asOf: card.asOf,
      sourceName: `${card.sourceName} (${card.freshness})`,
    };
  } catch {
    // Leave unavailable — never invent a price.
  }

  const related = pickInOrder(lesson.relatedLessons, lessonsFile.lessons, (l) => l.slug);
  const glossaryTerms = pickInOrder(lesson.glossaryTermIds, loadLearnGlossary().terms, (t) => t.id);
  const researchNotes = pickInOrder(
    lesson.relatedResearchSlugs,
    loadResearchNotes().notes,
    (n) => n.slug,
  );

  return (
    <div className="space-y-10">
      {slug === "save-your-time" ? (
        <SaveYourTimeLesson
          lesson={lesson}
          debt={debt}
          btc={btc}
          newsletter={newsletter}
          newsletterSignupEnabled={newsletterSignupEnabled}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Lesson module for <code>{slug}</code> is not registered yet.
        </p>
      )}

      <RelatedContent
        videoUrl={lesson.videoUrl}
        newsletterUrl={lesson.relatedNewsletterUrl}
        tools={lesson.relatedTools}
        glossaryTerms={glossaryTerms}
        lessons={related}
        researchNotes={researchNotes}
      />

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/learn" className="text-[var(--accent)] underline-offset-2 hover:underline">
          ← All lessons
        </Link>
        <Link
          href="/learn/glossary"
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Glossary
        </Link>
        <Link
          href="/learn/resources"
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Resources
        </Link>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: lesson.title,
            description: lesson.summary,
            datePublished: lesson.publishedAt,
            dateModified: lesson.updatedAt,
            author: { "@type": "Organization", name: "Work Save Bitcoin" },
          }),
        }}
      />
    </div>
  );
}
