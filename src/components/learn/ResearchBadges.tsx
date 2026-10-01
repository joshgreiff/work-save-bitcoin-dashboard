import {
  RESEARCH_CLAIM_LABEL,
  RESEARCH_SOURCE_TYPE_LABEL,
  RESEARCH_STATUS_LABEL,
} from "@/lib/learn/content";
import type {
  ResearchClaimKind,
  ResearchSourceType,
  ResearchStatus,
} from "@/lib/schemas/learn";

const BADGE_BASE =
  "inline-flex shrink-0 items-center border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]";

const CLAIM_TONE: Record<ResearchClaimKind, string> = {
  established_fact: "border-[var(--positive)] text-[var(--positive)]",
  company_target: "border-[var(--foreground)] text-[var(--foreground)]",
  speculative: "border-dashed border-[var(--accent)] text-[var(--accent)]",
  interpretation: "border-[var(--border)] text-[var(--muted-foreground)]",
  disputed: "border-[var(--accent)] text-[var(--accent)]",
  open_question: "border-dashed border-[var(--muted)] text-[var(--muted)]",
};

const STATUS_TONE: Record<ResearchStatus, string> = {
  question: "border-dashed border-[var(--muted)] text-[var(--muted)]",
  researching: "border-[var(--border)] text-[var(--muted-foreground)]",
  published: "border-[var(--positive)] text-[var(--positive)]",
  needs_review: "border-[var(--accent)] text-[var(--accent)]",
};

export function ResearchClaimBadge({ kind }: { kind: ResearchClaimKind }) {
  return <span className={`${BADGE_BASE} ${CLAIM_TONE[kind]}`}>{RESEARCH_CLAIM_LABEL[kind]}</span>;
}

export function ResearchStatusBadge({ status }: { status: ResearchStatus }) {
  return (
    <span className={`${BADGE_BASE} ${STATUS_TONE[status]}`}>{RESEARCH_STATUS_LABEL[status]}</span>
  );
}

export function SourceTypeBadge({ type }: { type: ResearchSourceType }) {
  return (
    <span className={`${BADGE_BASE} border-[var(--border)] text-[var(--muted)]`}>
      {RESEARCH_SOURCE_TYPE_LABEL[type]}
    </span>
  );
}
