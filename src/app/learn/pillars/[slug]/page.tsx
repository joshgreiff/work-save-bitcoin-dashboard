import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolLink } from "@/components/learn/RelatedContent";
import { ResearchNoteRow } from "@/components/learn/ResearchNoteRow";
import { TextLink } from "@/components/ui/primitives";
import { loadLearnLessons, loadLearnPillars, loadResearchNotes } from "@/lib/data/load";
import {
  lessonsForPillar,
  pillarBySlug,
  researchNotesForPillar,
} from "@/lib/learn/content";
import { formatViewerDate } from "@/lib/market/session";
import type { LearnPillarDefinition } from "@/lib/schemas/learn";

type Props = {
  params: Promise<{ slug: string }>;
};

const LINK_CLASS = "action-link";

export const dynamicParams = false;

export async function generateStaticParams() {
  return loadLearnPillars().pillars.map((pillar) => ({ slug: pillar.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pillar = pillarBySlug(loadLearnPillars().pillars, slug);
  if (!pillar) return { title: "Research pillar" };
  return {
    title: pillar.title,
    description: pillar.description,
    alternates: { canonical: `/learn/pillars/${pillar.slug}` },
    openGraph: {
      title: `${pillar.title} | Work Save Bitcoin`,
      description: pillar.description,
    },
  };
}

function PublishedLinks({
  title,
  items,
}: {
  title: string;
  items: LearnPillarDefinition["relatedVideos"];
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-medium">{title}</h2>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.url} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <a href={item.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {item.title} ↗
              <span className="sr-only"> (external link, opens in a new tab)</span>
            </a>
            <span className="text-xs text-[var(--muted)]">{formatViewerDate(item.publishedAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function LearnPillarPage({ params }: Props) {
  const { slug } = await params;
  const pillars = loadLearnPillars().pillars;
  const pillar = pillarBySlug(pillars, slug);
  if (!pillar) notFound();

  const index = pillars.findIndex((p) => p.slug === pillar.slug);
  const previous = index > 0 ? pillars[index - 1] : null;
  const next = index < pillars.length - 1 ? pillars[index + 1] : null;
  const lessons = lessonsForPillar(loadLearnLessons().lessons, pillar.slug);
  const notes = researchNotesForPillar(loadResearchNotes().notes, pillar.slug);

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-3">
        <nav aria-label="Breadcrumb" className="text-xs text-[var(--muted)]">
          <Link href="/learn" className="title-link">
            Learn
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href="/learn#research-pillars" className="title-link">
            Research pillars
          </Link>
        </nav>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Pillar {String(index + 1).padStart(2, "0")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{pillar.title}</h1>
        <p className="text-base leading-relaxed text-[var(--muted-foreground)]">
          {pillar.description}
        </p>
        <ul className="flex flex-wrap gap-2 pt-1">
          {pillar.topics.map((topic) => (
            <li
              key={topic}
              className="border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)]"
            >
              {topic}
            </li>
          ))}
        </ul>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Questions we’re investigating</h2>
        <ol className="space-y-3">
          {pillar.questions.map((q, i) => (
            <li
              key={q.question}
              className="flex gap-3 border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
            >
              <span className="tabular-nums text-[var(--muted)]">{i + 1}.</span>
              <div>
                <p className="text-[var(--foreground)]">{q.question}</p>
                {q.researchSlug ? (
                  <Link href={`/learn/research/${q.researchSlug}`} className={`mt-1 inline-block ${LINK_CLASS}`}>
                    Read the research note →
                  </Link>
                ) : (
                  <p className="mt-1 text-xs text-[var(--muted)]">No note yet — on the research list.</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Research notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No research notes in this pillar yet.</p>
        ) : (
          <ul>
            {notes.map((note) => (
              <ResearchNoteRow key={note.slug} note={note} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Lessons</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No lessons in this pillar yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link href={`/learn/${lesson.slug}`} className={LINK_CLASS}>
                  {lesson.title}
                </Link>
                <span className="text-[var(--muted)]"> — {lesson.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pillar.relatedTools.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">Tools</h2>
          <ul className="space-y-2 text-sm">
            {pillar.relatedTools.map((tool) => (
              <li key={tool.href}>
                <ToolLink tool={tool} />
                {tool.description ? (
                  <span className="text-[var(--muted)]"> — {tool.description}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PublishedLinks title="Videos" items={pillar.relatedVideos} />
      <PublishedLinks title="Essays" items={pillar.relatedNewsletterEssays} />

      <nav className="flex flex-wrap justify-between gap-4 border-t border-[var(--border)] pt-4 text-sm">
        {previous ? (
          <TextLink href={`/learn/pillars/${previous.slug}`}>← {previous.title}</TextLink>
        ) : (
          <TextLink href="/learn">← Learn</TextLink>
        )}
        {next ? <TextLink href={`/learn/pillars/${next.slug}`}>{next.title} →</TextLink> : null}
      </nav>
    </div>
  );
}
