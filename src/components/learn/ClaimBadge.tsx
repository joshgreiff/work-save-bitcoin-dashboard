import type { ClaimKind } from "@/lib/schemas/learn";

const LABELS: Record<ClaimKind, string> = {
  verified_fact: "Verified fact",
  illustration: "Illustration",
  opinion: "Opinion",
  projection: "Projection",
};

export function ClaimBadge({ kind }: { kind: ClaimKind }) {
  return (
    <span className="inline-flex border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
      {LABELS[kind]}
    </span>
  );
}
