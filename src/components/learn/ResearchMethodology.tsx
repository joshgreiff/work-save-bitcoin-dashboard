import { RESEARCH_WORKFLOW_STEPS } from "@/lib/learn/content";

export function ResearchMethodology() {
  return (
    <aside
      aria-label="Research method"
      className="border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3"
    >
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">How we research</p>
      <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--foreground)]">
        {RESEARCH_WORKFLOW_STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span>{step}</span>
            {index < RESEARCH_WORKFLOW_STEPS.length - 1 ? (
              <span aria-hidden="true" className="text-[var(--accent)]">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
        Work Save Bitcoin takes monetary critiques seriously while testing them against competing
        explanations, historical evidence, and measurable data.
      </p>
    </aside>
  );
}
