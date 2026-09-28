import { describe, expect, it } from "vitest";
import {
  loadLearnLessons,
  loadLearnPillars,
  loadResearchNotes,
  validateLearnCrossReferences,
} from "@/lib/data/load";
import {
  claimKindsUsed,
  formatPartialDate,
  lessonsForPillar,
  pickInOrder,
  pillarBySlug,
  researchNotesForPillar,
  sourceCitationNumbers,
} from "@/lib/learn/content";
import { purchasingPowerToday } from "@/lib/learn/calculators";
import {
  LEARN_PILLAR_ORDER,
  researchNoteSchema,
  researchNotesFileSchema,
  type ResearchNote,
} from "@/lib/schemas/learn";

const TWO_PERCENT_SLUG = "is-two-percent-inflation-necessary";

function twoPercentNote(): ResearchNote {
  const note = loadResearchNotes().notes.find((n) => n.slug === TWO_PERCENT_SLUG);
  if (!note) throw new Error("missing 2% note");
  return note;
}

function allClaims(note: ResearchNote) {
  return [
    ...note.mainstreamView.claims,
    ...note.alternativeView.claims,
    ...note.evidence.flatMap((s) => s.claims),
  ];
}

function minimalNote(overrides: Record<string, unknown> = {}) {
  return {
    slug: "test-note",
    title: "Test note",
    summary: "Summary",
    pillar: "money-and-human-time",
    status: "researching",
    publishedAt: null,
    updatedAt: "2026-09-28T10:00:00-04:00",
    centralQuestion: "Question?",
    workingThesis: "Thesis.",
    mainstreamView: {
      title: "Mainstream",
      summary: "Summary",
      claims: [{ kind: "interpretation", text: "A reading." }],
    },
    alternativeView: {
      title: "Alternative",
      summary: "Summary",
      claims: [{ kind: "interpretation", text: "Another reading." }],
    },
    evidence: [
      {
        id: "context",
        heading: "Context",
        claims: [{ kind: "open_question", text: "Unresolved." }],
      },
    ],
    sources: [
      {
        id: "podcast",
        title: "A podcast",
        publisher: "Some show",
        url: "https://example.com/podcast",
        publishedAt: "2026-09",
        type: "commentary",
      },
      {
        id: "fed",
        title: "Official statement",
        publisher: "Federal Reserve",
        url: "https://example.com/fed",
        publishedAt: "2012-01-25",
        type: "primary",
      },
    ],
    ...overrides,
  };
}

describe("learn pillars", () => {
  it("defines exactly five pillars in the canonical order", () => {
    const pillars = loadLearnPillars().pillars;
    expect(pillars.map((p) => p.slug)).toEqual([...LEARN_PILLAR_ORDER]);
    expect(pillars.map((p) => p.title)).toEqual([
      "Money and Human Time",
      "Institutions and Power",
      "Bitcoin as an Alternative",
      "Bitcoin Capital Markets",
      "Technology and Sovereignty",
    ]);
    for (const pillar of pillars) {
      expect(pillar.description.length).toBeGreaterThan(0);
      expect(pillar.questions.length).toBeGreaterThan(0);
    }
  });

  it("groups lessons and notes by pillar", () => {
    const pillars = loadLearnPillars().pillars;
    const lessons = loadLearnLessons().lessons;
    const notes = loadResearchNotes().notes;
    expect(pillarBySlug(pillars, "money-and-human-time")?.title).toBe("Money and Human Time");
    expect(pillarBySlug(pillars, "nope")).toBeNull();
    expect(lessonsForPillar(lessons, "money-and-human-time").map((l) => l.slug)).toContain(
      "save-your-time",
    );
    expect(researchNotesForPillar(notes, "money-and-human-time").map((n) => n.slug)).toContain(
      TWO_PERCENT_SLUG,
    );
    expect(researchNotesForPillar(notes, "technology-and-sovereignty")).toEqual([]);
  });

  it("resolves every cross-reference between lessons, notes, pillars, and glossary", () => {
    expect(() => validateLearnCrossReferences()).not.toThrow();
  });
});

describe("2% inflation research note", () => {
  it("validates and uses all four claim labels", () => {
    const note = twoPercentNote();
    expect(researchNoteSchema.safeParse(note).success).toBe(true);
    expect([...claimKindsUsed(note)].sort()).toEqual(
      ["disputed", "established_fact", "interpretation", "open_question"].sort(),
    );
    expect(note.title).toBe("Is 2% Inflation Necessary for Economic Growth?");
  });

  it("stays unpublished while awaiting editorial review", () => {
    const note = twoPercentNote();
    expect(note.status).toBe("needs_review");
    expect(note.publishedAt).toBeNull();
  });

  it("backs every established fact with a non-commentary source", () => {
    const note = twoPercentNote();
    const types = new Map(note.sources.map((s) => [s.id, s.type]));
    for (const claim of allClaims(note).filter((c) => c.kind === "established_fact")) {
      expect(claim.sourceIds.some((id) => types.get(id) !== "commentary")).toBe(true);
    }
  });

  it("does not cite any commentary source as evidence", () => {
    const note = twoPercentNote();
    expect(note.sources.filter((s) => s.type === "commentary")).toEqual([]);
  });

  it("numbers sources in listed order", () => {
    const note = twoPercentNote();
    const numbers = sourceCitationNumbers(note);
    expect(numbers.get(note.sources[0]!.id)).toBe(1);
    expect(numbers.size).toBe(note.sources.length);
  });

  it("matches the documented 35-year halving of purchasing power at 2%", () => {
    expect(
      purchasingPowerToday({ nominalAmount: 100, annualInflationRate: 0.02, years: 35 }),
    ).toBeCloseTo(50, 0);
  });
});

describe("research note schema", () => {
  it("accepts the minimal fixture", () => {
    expect(researchNoteSchema.safeParse(minimalNote()).success).toBe(true);
  });

  it("rejects an established fact backed only by commentary", () => {
    const result = researchNoteSchema.safeParse(
      minimalNote({
        evidence: [
          {
            id: "claims",
            heading: "Claims",
            claims: [{ kind: "established_fact", text: "Said on a podcast.", sourceIds: ["podcast"] }],
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts an established fact backed by a primary source", () => {
    const result = researchNoteSchema.safeParse(
      minimalNote({
        evidence: [
          {
            id: "claims",
            heading: "Claims",
            claims: [{ kind: "established_fact", text: "The Fed set 2%.", sourceIds: ["fed"] }],
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects claims citing unknown source ids", () => {
    const result = researchNoteSchema.safeParse(
      minimalNote({
        evidence: [
          {
            id: "claims",
            heading: "Claims",
            claims: [{ kind: "interpretation", text: "Hmm.", sourceIds: ["missing"] }],
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("requires a publication date for published notes", () => {
    expect(researchNoteSchema.safeParse(minimalNote({ status: "published" })).success).toBe(false);
    expect(
      researchNoteSchema.safeParse(
        minimalNote({ status: "published", publishedAt: "2026-09-28T10:00:00-04:00" }),
      ).success,
    ).toBe(true);
  });

  it("rejects duplicate note slugs", () => {
    const note = minimalNote();
    expect(researchNotesFileSchema.safeParse({ notes: [note, note] }).success).toBe(false);
  });
});

describe("research content helpers", () => {
  it("formats partial source dates without inventing precision", () => {
    expect(formatPartialDate("1931")).toBe("1931");
    expect(formatPartialDate("1997-04")).toBe("Apr. 1997");
    expect(formatPartialDate("2012-01-25")).toBe("Jan. 25, 2012");
    expect(formatPartialDate(null)).toBe("Undated");
  });

  it("picks items in requested order and skips unknown ids", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pickInOrder(["c", "x", "a"], items, (i) => i.id)).toEqual([{ id: "c" }, { id: "a" }]);
  });
});
