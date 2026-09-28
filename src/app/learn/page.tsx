import type { Metadata } from "next";
import Link from "next/link";
import { SectionIntro, TextLink } from "@/components/ui/primitives";
import { NewsletterSignup } from "@/components/learn/NewsletterSignup";
import { ResearchNoteRow } from "@/components/learn/ResearchNoteRow";
import { SubstackReadingList } from "@/components/learn/SubstackReadingList";
import {
  loadLearnLessons,
  loadLearnPillars,
  loadNewsletterConfig,
  loadResearchNotes,
  loadSiteConfig,
} from "@/lib/data/load";
import {
  lessonsForPillar,
  pillarBySlug,
  researchNotesForPillar,
  sortResearchNotes,
} from "@/lib/learn/content";
import { fetchSubstackFeed } from "@/lib/learn/substack-feed";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Research and practical tools for understanding how money, institutions, Bitcoin, and technology affect the value of your time.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Learn | Work Save Bitcoin",
    description:
      "Protect your time and energy by saving in Bitcoin, no matter your budget. Sourced research notes, lessons, and tools — without financial advice.",
  },
};

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export default async function LearnHubPage() {
  const lessonsFile = loadLearnLessons();
  const newsletter = loadNewsletterConfig();
  const site = loadSiteConfig();
  const newsletterSignupEnabled =
    newsletter.provider !== "none" &&
    Boolean(process.env[newsletter.endpointEnvVar]?.trim());
  const lessons = [...lessonsFile.lessons].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const latest = lessons[0] ?? null;
  const pillars = loadLearnPillars().pillars;
  const notes = sortResearchNotes(loadResearchNotes().notes);
  const substackFeed = await fetchSubstackFeed({
    feedUrl: site.substackUrl ? `${site.substackUrl.replace(/\/$/, "")}/feed` : undefined,
    limit: 6,
  });

  return (
    <div className="space-y-10">
      <SectionIntro
        eyebrow="Education"
        title="Protect your time. Save in Bitcoin."
        description="Protect your time and energy by saving in Bitcoin, no matter your budget. Research and practical tools for understanding how money, institutions, Bitcoin, and technology affect the value of your time."
      />

      <DisclaimerStrip />

      {latest ? (
        <section className="border border-[var(--accent)] bg-[var(--surface)] p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--accent)]">Latest lesson</p>
          <h2 className="mt-2 text-2xl font-medium">{latest.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {latest.summary}
          </p>
          <div className="mt-4">
            <TextLink href={`/learn/${latest.slug}`}>Continue learning →</TextLink>
          </div>
        </section>
      ) : null}

      <section id="research-pillars" className="scroll-mt-24 space-y-4">
        <div className="max-w-3xl">
          <h2 className="text-xl font-medium">Research pillars</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
            Five areas of research, each with lessons, sourced notes, and the questions we are
            still working through.
          </p>
        </div>
        <ol className="border-b border-[var(--border)]">
          {pillars.map((pillar, index) => {
            const lessonCount = lessonsForPillar(lessons, pillar.slug).length;
            const noteCount = researchNotesForPillar(notes, pillar.slug).length;
            return (
              <li key={pillar.slug} className="border-t border-[var(--border)]">
                <Link
                  href={`/learn/pillars/${pillar.slug}`}
                  className="action-row group grid gap-2 px-2 py-5 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-4 sm:px-3"
                >
                  <span className="text-sm tabular-nums text-[var(--accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className="block text-lg font-medium group-hover:text-[var(--accent)] group-focus-visible:text-[var(--accent)]">
                      {pillar.title}
                    </span>
                    <span className="mt-1 block max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
                      {pillar.description}
                    </span>
                    <span className="mt-2 block text-xs text-[var(--muted)]">
                      {countLabel(lessonCount, "lesson")} · {countLabel(noteCount, "research note")}{" "}
                      · {countLabel(pillar.questions.length, "open question")}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-sm font-medium text-[var(--accent)] underline-offset-4 group-hover:underline group-focus-visible:underline"
                  >
                    Explore →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {notes.length > 0 ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-medium">Latest research</h2>
            <TextLink href="/learn/research">All research notes →</TextLink>
          </div>
          <ul>
            {notes.slice(0, 3).map((note) => (
              <ResearchNoteRow
                key={note.slug}
                note={note}
                pillarTitle={pillarBySlug(pillars, note.pillar)?.title}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Lesson index</h2>
        <ul className="space-y-3">
          {lessons.map((lesson) => (
            <li
              key={lesson.slug}
              className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
                  {pillarBySlug(pillars, lesson.pillar)?.title ?? lesson.category} ·{" "}
                  {lesson.difficulty} · {lesson.readingMinutes} min
                </p>
                <h3 className="mt-1 text-lg font-medium">{lesson.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
                  {lesson.summary}
                </p>
              </div>
              <TextLink href={`/learn/${lesson.slug}`}>Open →</TextLink>
            </li>
          ))}
        </ul>
      </section>

      <SubstackReadingList feed={substackFeed} />

      <section className="flex flex-wrap gap-4 text-sm">
        <TextLink href="/learn/research">Research notes →</TextLink>
        <TextLink href="/learn/glossary">Glossary →</TextLink>
        <TextLink href="/learn/resources">Curated resources →</TextLink>
        <TextLink href="/learn/rss.xml">RSS →</TextLink>
        {site.youtubeChannelUrl ? (
          <a
            href={site.youtubeChannelUrl}
            className="action-link text-sm font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube channel ↗
            <span className="sr-only"> (external link, opens in a new tab)</span>
          </a>
        ) : null}
        {site.substackUrl ? (
          <a
            href={site.substackUrl}
            className="action-link text-sm font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Substack ↗
            <span className="sr-only"> (external link, opens in a new tab)</span>
          </a>
        ) : null}
      </section>

      <NewsletterSignup
        config={newsletter}
        sourcePage="/learn"
        signupEnabled={newsletterSignupEnabled}
      />
    </div>
  );
}

function DisclaimerStrip() {
  return (
    <aside className="border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
      Educational content only. Not personalized financial advice. No promised returns. Do not enter
      seed phrases into this website.
    </aside>
  );
}
