import Link from "next/link";
import { ResearchStatusBadge } from "@/components/learn/ResearchBadges";
import { formatViewerDate } from "@/lib/market/session";
import type { ResearchNote } from "@/lib/schemas/learn";

export function ResearchNoteRow({ note, pillarTitle }: { note: ResearchNote; pillarTitle?: string }) {
  return (
    <li className="border-t border-[var(--border)] py-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <ResearchStatusBadge status={note.status} />
        {pillarTitle ? <span className="uppercase tracking-[0.1em]">{pillarTitle}</span> : null}
        <span>
          {note.publishedAt
            ? formatViewerDate(note.publishedAt)
            : `Updated ${formatViewerDate(note.updatedAt)}`}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-medium">
        <Link
          href={`/learn/research/${note.slug}`}
          className="title-link"
        >
          {note.title}
        </Link>
      </h3>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
        {note.summary}
      </p>
    </li>
  );
}
