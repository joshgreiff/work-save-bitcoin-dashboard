import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { IssuerSnapshotView } from "@/components/learn/IssuerSnapshotPanels";
import { ResearchNoteView } from "@/components/learn/ResearchNoteView";
import {
  calculateAllocationIllustration,
  calculateResearchIssuerMetrics,
} from "@/lib/accounting/research-issuer";
import {
  loadLearnGlossary,
  loadLearnLessons,
  loadLearnPillars,
  loadResearchNotes,
  loadResearchSnapshots,
} from "@/lib/data/load";
import { pickInOrder, pillarBySlug } from "@/lib/learn/content";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return loadResearchNotes().notes.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = loadResearchNotes().notes.find((n) => n.slug === slug);
  if (!note) return { title: "Research note" };
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `/learn/research/${note.slug}` },
    openGraph: {
      title: `${note.title} | Work Save Bitcoin`,
      description: note.summary,
      type: "article",
      publishedTime: note.publishedAt ?? undefined,
      modifiedTime: note.updatedAt,
    },
  };
}

export default async function ResearchNotePage({ params }: Props) {
  const { slug } = await params;
  const notes = loadResearchNotes().notes;
  const note = notes.find((n) => n.slug === slug);
  if (!note) notFound();

  const pillar = pillarBySlug(loadLearnPillars().pillars, note.pillar);
  if (!pillar) notFound();

  const relatedLessons = pickInOrder(
    note.relatedLessonSlugs,
    loadLearnLessons().lessons,
    (l) => l.slug,
  );
  const glossaryTerms = pickInOrder(note.glossaryTermIds, loadLearnGlossary().terms, (t) => t.id);
  const nextNotes = pickInOrder(note.nextResearchSlugs, notes, (n) => n.slug);

  const snapshot = note.issuerSnapshot
    ? loadResearchSnapshots().snapshots.find((s) => s.id === note.issuerSnapshot!.snapshotId)
    : undefined;
  let issuerSnapshot: IssuerSnapshotView | null = null;
  if (snapshot) {
    const metrics = calculateResearchIssuerMetrics(snapshot);
    issuerSnapshot = {
      snapshot,
      metrics,
      illustration: calculateAllocationIllustration(snapshot, metrics),
    };
  }

  return (
    <>
      <ResearchNoteView
        note={note}
        pillar={pillar}
        relatedLessons={relatedLessons}
        glossaryTerms={glossaryTerms}
        nextNotes={nextNotes}
        issuerSnapshot={issuerSnapshot}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: note.title,
            description: note.summary,
            ...(note.publishedAt ? { datePublished: note.publishedAt } : {}),
            dateModified: note.updatedAt,
            author: { "@type": "Organization", name: "Work Save Bitcoin" },
            citation: note.sources.map((s) => s.url),
          }),
        }}
      />
    </>
  );
}
