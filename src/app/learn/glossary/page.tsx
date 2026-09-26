import type { Metadata } from "next";
import { SectionIntro } from "@/components/ui/primitives";
import { loadLearnGlossary } from "@/lib/data/load";
import type { LearnCategory } from "@/lib/schemas/learn";

export const metadata: Metadata = {
  title: "Glossary",
  description: "Plain-language Bitcoin and money definitions for Work Save Bitcoin learners.",
  alternates: { canonical: "/learn/glossary" },
};

const CATEGORY_LABEL: Record<LearnCategory, string> = {
  money: "Money",
  bitcoin: "Bitcoin",
  ownership: "Ownership",
};

export default function LearnGlossaryPage() {
  const glossary = loadLearnGlossary();
  const categories: LearnCategory[] = ["money", "bitcoin", "ownership"];

  return (
    <div className="space-y-8">
      <SectionIntro
        eyebrow="Learn"
        title="Glossary"
        description="Plain-language definitions. These are teaching aids — not legal, tax, or investment advice."
      />

      {categories.map((category) => {
        const terms = glossary.terms
          .filter((t) => t.category === category)
          .sort((a, b) => a.term.localeCompare(b.term));
        return (
          <section key={category} className="space-y-3">
            <h2 className="text-xl font-medium">{CATEGORY_LABEL[category]}</h2>
            <dl className="space-y-3">
              {terms.map((term) => (
                <div key={term.id} className="border border-[var(--border)] bg-[var(--surface)] p-4">
                  <dt className="font-medium text-[var(--foreground)]">{term.term}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                    {term.definition}
                  </dd>
                  {term.sources.length > 0 ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {term.sources.map((s) => s.label).join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
