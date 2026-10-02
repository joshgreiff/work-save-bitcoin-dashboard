import { ResearchClaimBadge } from "@/components/learn/ResearchBadges";
import { formatViewerDate } from "@/lib/market/session";
import type { ResearchClaimKind, ResearchValueEngines } from "@/lib/schemas/learn";

const CARD_EDGE: Partial<Record<ResearchClaimKind, string>> = {
  established_fact: "border-t-[var(--positive)]",
  company_target: "border-t-[var(--foreground)]",
  speculative: "border-dashed border-t-[var(--accent)]",
};

const STATUS_TONE: Partial<Record<ResearchClaimKind, string>> = {
  established_fact: "text-[var(--positive)]",
  speculative: "text-[var(--accent)]",
};

function Operator({ symbol, spoken }: { symbol: string; spoken: string }) {
  return (
    <span className="text-[var(--muted)]">
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}

export function ValueEngines({
  view,
  citations,
}: {
  view: ResearchValueEngines;
  citations: Map<string, number>;
}) {
  const { heading, engines, equation } = view;
  return (
    <section
      aria-labelledby="value-engines-heading"
      className="space-y-5 border border-[var(--border)] bg-[var(--surface-elevated)] p-5"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
          Overview · each engine links to its evidence
        </p>
        <h3 id="value-engines-heading" className="mt-1 text-lg font-medium">
          {heading}
        </h3>
      </div>

      <ol className="grid gap-7 md:grid-cols-3 md:gap-6">
        {engines.map((engine, index) => (
          <li
            key={engine.name}
            className={`relative flex flex-col border border-t-2 border-[var(--border)] bg-[var(--surface)] p-4 ${CARD_EDGE[engine.kind] ?? ""}`}
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-[var(--muted)] md:top-1/2 md:-left-[1.1rem] md:translate-x-0 md:-translate-y-1/2"
              >
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            ) : null}
            <p className="text-xs tabular-nums text-[var(--muted)]">{index + 1}</p>
            <h4 className="mt-1 text-base font-medium">{engine.name}</h4>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {engine.role}
            </p>
            <p
              className={`mt-3 text-xs uppercase tracking-[0.12em] ${STATUS_TONE[engine.kind] ?? "text-[var(--foreground)]"}`}
            >
              {engine.status}
            </p>
            <div className="mt-3 flex-1 border-t border-[var(--border)] pt-3">
              <ResearchClaimBadge kind={engine.kind} />
              <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                {engine.evidence}
                {engine.sourceIds.map((id) => (
                  <a
                    key={id}
                    href={`#source-${id}`}
                    className="action-link ml-1 whitespace-nowrap text-xs"
                    aria-label={`Source ${citations.get(id)}`}
                  >
                    [{citations.get(id)}]
                  </a>
                ))}
              </p>
              {engine.asOf ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  As of {formatViewerDate(engine.asOf)}
                </p>
              ) : null}
            </div>
            <a href={`#${engine.sectionId}`} className="action-link mt-3 text-sm font-medium">
              {engine.name} evidence ↓
            </a>
          </li>
        ))}
      </ol>

      <div className="space-y-3 border-t border-[var(--border)] pt-4">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-[var(--foreground)]">{equation.result}</span>
          <Operator symbol="=" spoken="equals" />
          {equation.terms.map((term, index) => {
            const tone =
              term.effect === "adds"
                ? "border-[var(--positive)] text-[var(--positive)]"
                : "border-[var(--border)] text-[var(--muted-foreground)]";
            const chip = `inline-flex border px-2 py-1 ${tone}`;
            return (
              <span key={term.label} className="inline-flex items-center gap-2">
                {index > 0 ? (
                  term.effect === "adds" ? (
                    <Operator symbol="+" spoken="plus" />
                  ) : (
                    <Operator symbol="−" spoken="minus" />
                  )
                ) : null}
                {term.sectionId ? (
                  <a
                    href={`#${term.sectionId}`}
                    className={`${chip} hover:border-[var(--foreground)] hover:text-[var(--foreground)]`}
                  >
                    {term.label}
                  </a>
                ) : (
                  <span className={chip}>{term.label}</span>
                )}
              </span>
            );
          })}
        </p>
        <div className="flex flex-wrap items-start gap-2">
          <ResearchClaimBadge kind="interpretation" />
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--muted)]">{equation.note}</p>
        </div>
      </div>
    </section>
  );
}
