import type { Metadata } from "next";
import { ResearchMethodology } from "@/components/learn/ResearchMethodology";
import { ResearchNoteRow } from "@/components/learn/ResearchNoteRow";
import { EmptyState, SectionIntro, TextLink } from "@/components/ui/primitives";
import { loadLearnPillars, loadResearchNotes } from "@/lib/data/load";
import { pillarBySlug, sortResearchNotes } from "@/lib/learn/content";

export const metadata: Metadata = {
  title: "Research notes",
  description:
    "Sourced research notes on money, institutions, Bitcoin, and technology — with claims labeled as established facts, interpretations, disputed claims, or open questions.",
  alternates: { canonical: "/learn/research" },
  openGraph: {
    title: "Research notes | Work Save Bitcoin",
    description:
      "Sourced research notes that test monetary critiques against competing explanations and data.",
  },
};

export default function ResearchIndexPage() {
  const pillars = loadLearnPillars().pillars;
  const notes = sortResearchNotes(loadResearchNotes().notes);

  return (
    <div className="space-y-10">
      <SectionIntro
        eyebrow="Research"
        title="Research notes"
        description="Each note starts from a question, lays out the mainstream and alternative explanations, and labels every claim so you can see what is established, what is interpretation, and what is still open."
      />

      <ResearchMethodology />

      <section className="space-y-2">
        <h2 className="text-xl font-medium">All notes</h2>
        {notes.length === 0 ? (
          <EmptyState message="No research notes yet." />
        ) : (
          <ul>
            {notes.map((note) => (
              <ResearchNoteRow
                key={note.slug}
                note={note}
                pillarTitle={pillarBySlug(pillars, note.pillar)?.title}
              />
            ))}
          </ul>
        )}
      </section>

      <nav className="flex flex-wrap gap-4 text-sm">
        <TextLink href="/learn">← Learn</TextLink>
        <TextLink href="/learn#research-pillars">Research pillars</TextLink>
        <TextLink href="/methodology#research-notes">Research standards</TextLink>
      </nav>
    </div>
  );
}
