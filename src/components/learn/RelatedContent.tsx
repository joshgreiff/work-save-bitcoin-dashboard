import Link from "next/link";
import type { ReactNode } from "react";
import type {
  GlossaryTerm,
  LearnLessonMeta,
  LearnRelatedTool,
  ResearchNote,
} from "@/lib/schemas/learn";

const LINK_CLASS = "action-link";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {children}
      <span className="sr-only"> (external link, opens in a new tab)</span>
    </a>
  );
}

export function ToolLink({ tool }: { tool: LearnRelatedTool }) {
  return tool.href.startsWith("/") ? (
    <Link href={tool.href} className={LINK_CLASS}>
      {tool.label}
    </Link>
  ) : (
    <ExternalLink href={tool.href}>{tool.label} ↗</ExternalLink>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">{children}</ul>
    </div>
  );
}

/**
 * Content-engine links shared by lessons and research notes.
 * Groups with nothing to show are omitted rather than padded with placeholders.
 */
export function RelatedContent({
  videoUrl,
  newsletterUrl,
  tools = [],
  glossaryTerms = [],
  lessons = [],
  researchNotes = [],
  researchHeading = "Research notes",
}: {
  videoUrl?: string | null;
  newsletterUrl?: string | null;
  tools?: LearnRelatedTool[];
  glossaryTerms?: GlossaryTerm[];
  lessons?: LearnLessonMeta[];
  researchNotes?: ResearchNote[];
  researchHeading?: string;
}) {
  const hasMedia = Boolean(videoUrl || newsletterUrl);
  const hasAnything =
    hasMedia ||
    tools.length > 0 ||
    glossaryTerms.length > 0 ||
    lessons.length > 0 ||
    researchNotes.length > 0;
  if (!hasAnything) return null;

  return (
    <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="text-xl font-medium">Keep exploring</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {lessons.length > 0 ? (
          <Group title="Lessons">
            {lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link href={`/learn/${lesson.slug}`} className={LINK_CLASS}>
                  {lesson.title}
                </Link>
              </li>
            ))}
          </Group>
        ) : null}
        {researchNotes.length > 0 ? (
          <Group title={researchHeading}>
            {researchNotes.map((note) => (
              <li key={note.slug}>
                <Link href={`/learn/research/${note.slug}`} className={LINK_CLASS}>
                  {note.title}
                </Link>
              </li>
            ))}
          </Group>
        ) : null}
        {tools.length > 0 ? (
          <Group title="Tools">
            {tools.map((tool) => (
              <li key={tool.href}>
                <ToolLink tool={tool} />
                {tool.description ? (
                  <span className="text-[var(--muted)]"> — {tool.description}</span>
                ) : null}
              </li>
            ))}
          </Group>
        ) : null}
        {glossaryTerms.length > 0 ? (
          <Group title="Glossary">
            <li className="flex flex-wrap gap-x-3 gap-y-1">
              {glossaryTerms.map((term) => (
                <Link key={term.id} href={`/learn/glossary#${term.id}`} className={LINK_CLASS}>
                  {term.term}
                </Link>
              ))}
            </li>
          </Group>
        ) : null}
        {hasMedia ? (
          <Group title="Watch and read">
            {videoUrl ? (
              <li>
                <ExternalLink href={videoUrl}>Watch on YouTube ↗</ExternalLink>
              </li>
            ) : null}
            {newsletterUrl ? (
              <li>
                <ExternalLink href={newsletterUrl}>Read the Substack essay ↗</ExternalLink>
              </li>
            ) : null}
          </Group>
        ) : null}
      </div>
    </section>
  );
}
