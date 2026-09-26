import type { Metadata } from "next";
import Link from "next/link";
import { SectionIntro, TextLink } from "@/components/ui/primitives";
import { NewsletterSignup } from "@/components/learn/NewsletterSignup";
import { SubstackReadingList } from "@/components/learn/SubstackReadingList";
import {
  loadLearnLessons,
  loadNewsletterConfig,
  loadSiteConfig,
} from "@/lib/data/load";
import { fetchSubstackFeed } from "@/lib/learn/substack-feed";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Bitcoin education for people protecting their time and energy — starting from any budget.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Learn | Work Save Bitcoin",
    description:
      "Paths for Money, Bitcoin, and Ownership — practical education without financial advice.",
  },
};

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
  const substackFeed = await fetchSubstackFeed({
    feedUrl: site.substackUrl ? `${site.substackUrl.replace(/\/$/, "")}/feed` : undefined,
    limit: 6,
  });

  return (
    <div className="space-y-10">
      <SectionIntro
        eyebrow="Education"
        title="Protect your time. Save in Bitcoin."
        description="Work Save Bitcoin helps people protect their time and energy by saving in Bitcoin, no matter their budget. Start with $5 a week — this is not only for traders or technical experts."
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

      <section className="space-y-4">
        <h2 className="text-xl font-medium">Three paths</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              ["money", lessonsFile.paths.money],
              ["bitcoin", lessonsFile.paths.bitcoin],
              ["ownership", lessonsFile.paths.ownership],
            ] as const
          ).map(([key, path]) => {
            const pathLessons = lessons.filter((l) => l.category === key);
            return (
              <article key={key} className="border border-[var(--border)] bg-[var(--surface)] p-4">
                <h3 className="text-lg font-medium">{path.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {path.summary}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {pathLessons.length === 0 ? (
                    <li className="text-[var(--muted)]">Lessons coming soon.</li>
                  ) : (
                    pathLessons.map((lesson) => (
                      <li key={lesson.slug}>
                        <Link
                          href={`/learn/${lesson.slug}`}
                          className="text-[var(--accent)] underline-offset-2 hover:underline"
                        >
                          {lesson.title}
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

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
                  {lesson.category} · {lesson.difficulty} · {lesson.readingMinutes} min
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
        <TextLink href="/learn/glossary">Glossary →</TextLink>
        <TextLink href="/learn/resources">Curated resources →</TextLink>
        <TextLink href="/learn/rss.xml">RSS →</TextLink>
        {site.youtubeChannelUrl ? (
          <a
            href={site.youtubeChannelUrl}
            className="text-[var(--accent)] underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            YouTube channel →
          </a>
        ) : null}
        {site.substackUrl ? (
          <a
            href={site.substackUrl}
            className="text-[var(--accent)] underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Substack →
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
