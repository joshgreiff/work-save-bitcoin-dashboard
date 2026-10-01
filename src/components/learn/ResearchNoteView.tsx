import Link from "next/link";
import {
  ResearchClaimBadge,
  ResearchStatusBadge,
  SourceTypeBadge,
} from "@/components/learn/ResearchBadges";
import {
  AllocationIllustration,
  IssuerSnapshotMetrics,
  type IssuerSnapshotView,
} from "@/components/learn/IssuerSnapshotPanels";
import { ResearchMethodology } from "@/components/learn/ResearchMethodology";
import { Expandable } from "@/components/ui/primitives";
import { RelatedContent } from "@/components/learn/RelatedContent";
import {
  RESEARCH_CLAIM_DESCRIPTION,
  RESEARCH_CLAIM_LABEL,
  claimKindsUsed,
  formatPartialDate,
  sourceCitationNumbers,
} from "@/lib/learn/content";
import { formatViewerDate } from "@/lib/market/session";
import {
  RESEARCH_CLAIM_KIND_ORDER,
  type GlossaryTerm,
  type LearnLessonMeta,
  type LearnPillarDefinition,
  type ResearchClaim,
  type ResearchNote,
} from "@/lib/schemas/learn";

const LINK_CLASS = "action-link";

type Props = {
  note: ResearchNote;
  pillar: LearnPillarDefinition;
  relatedLessons: LearnLessonMeta[];
  glossaryTerms: GlossaryTerm[];
  nextNotes: ResearchNote[];
  issuerSnapshot?: IssuerSnapshotView | null;
};

function ClaimList({
  claims,
  citations,
}: {
  claims: ResearchClaim[];
  citations: Map<string, number>;
}) {
  return (
    <ul className="space-y-3">
      {claims.map((claim) => (
        <li
          key={claim.text}
          className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-relaxed text-[var(--muted-foreground)]"
        >
          <ResearchClaimBadge kind={claim.kind} />
          <p className="mt-2 text-[var(--foreground)]">
            {claim.text}
            {claim.sourceIds.length > 0 ? (
              <span className="ml-1 whitespace-nowrap text-xs text-[var(--muted)]">
                {claim.sourceIds.map((id) => (
                  <a
                    key={id}
                    href={`#source-${id}`}
                    className="action-link ml-0.5"
                    aria-label={`Source ${citations.get(id)}`}
                  >
                    [{citations.get(id)}]
                  </a>
                ))}
              </span>
            ) : null}
          </p>
          {claim.note ? <p className="mt-2 text-xs text-[var(--muted)]">{claim.note}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function ResearchNoteView({
  note,
  pillar,
  relatedLessons,
  glossaryTerms,
  nextNotes,
  issuerSnapshot = null,
}: Props) {
  const citations = sourceCitationNumbers(note);
  const kindsUsed = claimKindsUsed(note);

  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <nav aria-label="Breadcrumb" className="text-xs text-[var(--muted)]">
          <Link href="/learn" className="title-link">
            Learn
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/learn/pillars/${pillar.slug}`} className="title-link">
            {pillar.title}
          </Link>
          <span aria-hidden="true"> / </span>
          <Link href="/learn/research" className="title-link">
            Research
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">Research note</p>
          <ResearchStatusBadge status={note.status} />
        </div>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">{note.title}</h1>
        <p className="max-w-3xl text-lg leading-relaxed text-[var(--muted-foreground)]">
          {note.summary}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {note.publishedAt ? `Published ${formatViewerDate(note.publishedAt)} · ` : null}
          Updated {formatViewerDate(note.updatedAt)}
        </p>
        {note.status === "needs_review" ? (
          <p className="max-w-3xl border-l-2 border-[var(--accent)] pl-3 text-sm text-[var(--muted-foreground)]">
            This note is awaiting editorial review. Claims are labeled and sourced, but wording and
            conclusions may still change.
          </p>
        ) : null}
      </header>

      <section className="space-y-2 border-l-2 border-[var(--accent)] pl-4">
        <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Central question</h2>
        <blockquote className="max-w-3xl text-xl leading-relaxed text-[var(--foreground)]">
          {note.centralQuestion}
        </blockquote>
      </section>

      <section className="space-y-2 border border-[var(--border)] bg-[var(--surface-elevated)] p-5">
        <h2 className="text-lg font-medium">Working thesis</h2>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--accent)]">
          A working conclusion, not a settled fact
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          {note.workingThesis}
        </p>
      </section>

      <Expandable
        id="how-to-read"
        title="How to read this research"
        description="Our research method and what each claim label means"
      >
        <ResearchMethodology embedded />
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            How claims are labeled
          </h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {RESEARCH_CLAIM_KIND_ORDER.filter((kind) => kindsUsed.has(kind)).map((kind) => (
              <div key={kind} className="flex items-start gap-2 text-sm">
                <dt>
                  <ResearchClaimBadge kind={kind} />
                  <span className="sr-only">{RESEARCH_CLAIM_LABEL[kind]}</span>
                </dt>
                <dd className="text-[var(--muted-foreground)]">
                  {RESEARCH_CLAIM_DESCRIPTION[kind]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Expandable>

      <div className="grid gap-8 lg:grid-cols-2">
        {[note.mainstreamView, note.alternativeView].map((view) => (
          <section key={view.title} className="space-y-3">
            <h2 className="text-2xl font-medium">{view.title}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{view.summary}</p>
            <ClaimList claims={view.claims} citations={citations} />
          </section>
        ))}
      </div>

      {note.evidence.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
          <h2 className="text-2xl font-medium">{section.heading}</h2>
          <ClaimList claims={section.claims} citations={citations} />
          {issuerSnapshot && note.issuerSnapshot?.metricsAfterSectionId === section.id ? (
            <IssuerSnapshotMetrics view={issuerSnapshot} />
          ) : null}
          {issuerSnapshot && note.issuerSnapshot?.illustrationAfterSectionId === section.id ? (
            <AllocationIllustration view={issuerSnapshot} />
          ) : null}
        </section>
      ))}

      {note.openQuestions.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-medium">Questions we’re still investigating</h2>
            <ResearchClaimBadge kind="open_question" />
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {note.openQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <RelatedContent
        videoUrl={note.relatedVideoUrl}
        newsletterUrl={note.relatedNewsletterUrl}
        tools={note.relatedTools}
        glossaryTerms={glossaryTerms}
        lessons={relatedLessons}
        researchNotes={nextNotes}
        researchHeading="Next research notes"
      />

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Sources</h2>
        <ol className="space-y-3 text-sm">
          {note.sources.map((source) => (
            <li
              key={source.id}
              id={`source-${source.id}`}
              className="scroll-mt-24 border-t border-[var(--border)] pt-3"
            >
              <div className="flex flex-wrap items-start gap-2">
                <span className="tabular-nums text-[var(--muted)]">[{citations.get(source.id)}]</span>
                <SourceTypeBadge type={source.type} />
              </div>
              <p className="mt-1">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${LINK_CLASS} break-words`}
                >
                  {source.title} ↗
                  <span className="sr-only"> (external link, opens in a new tab)</span>
                </a>
              </p>
              <p className="mt-1 text-[var(--muted-foreground)]">
                {source.publisher} · {formatPartialDate(source.publishedAt)}
              </p>
              {source.note ? <p className="mt-1 text-xs text-[var(--muted)]">{source.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Disclosures</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {note.disclosures.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      {note.revisions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xl font-medium">Revision history</h2>
          <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
            {note.revisions.map((revision) => (
              <li key={`${revision.date}-${revision.note}`}>
                <span className="tabular-nums text-[var(--muted)]">
                  {formatViewerDate(revision.date)}
                </span>{" "}
                — {revision.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
