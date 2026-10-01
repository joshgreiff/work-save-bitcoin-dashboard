import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateAllocationIllustration,
  calculateResearchIssuerMetrics,
} from "@/lib/accounting/research-issuer";
import { loadResearchNotes, loadResearchSnapshots } from "@/lib/data/load";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";
import { claimKindsUsed, SITE_RESEARCH_LINKS } from "@/lib/learn/content";
import { isNavItemActive, MORE_NAV, PRIMARY_NAV } from "@/lib/navigation";
import { researchNoteSchema, type ResearchNote } from "@/lib/schemas/learn";

const SLUG = "can-spacex-help-a-bitcoin-portfolio-outperform";

function spacexNote(): ResearchNote {
  const note = loadResearchNotes().notes.find((n) => n.slug === SLUG);
  if (!note) throw new Error("missing SpaceX note");
  return note;
}

function snapshot() {
  const s = loadResearchSnapshots().snapshots.find((x) => x.id === "spacex-2026-06-30");
  if (!s) throw new Error("missing SpaceX snapshot");
  return s;
}

function noteText(note: ResearchNote): string {
  return [
    note.summary,
    note.workingThesis,
    ...[note.mainstreamView, note.alternativeView].flatMap((v) => v.claims),
    ...note.evidence.flatMap((s) => s.claims),
  ]
    .map((item) => (typeof item === "string" ? item : `${item.text} ${item.note ?? ""}`))
    .join("\n");
}

function claimsInSection(note: ResearchNote, id: string) {
  const section = note.evidence.find((s) => s.id === id);
  if (!section) throw new Error(`missing section ${id}`);
  return section.claims;
}

describe("SpaceX research snapshot calculations", () => {
  it("derives sats per share from reported holdings and share counts", () => {
    const m = calculateResearchIssuerMetrics(snapshot());
    expect(m.basicSatsPerShare).toBeCloseTo(142.0158, 3);
    expect(m.dilutedSatsPerShare).toBeCloseTo(136.1863, 3);
    expect(m.dilutedWithConditionalSatsPerShare).toBeCloseTo(124.159, 3);
    expect(m.dilutedShares).toBe(13_740_000_000);
    expect(m.dilutedWithConditionalShares).toBe(15_071_000_000);
  });

  it("derives BTC value per share and share of approximate market value", () => {
    const m = calculateResearchIssuerMetrics(snapshot());
    expect(m.btcValuePerShareUsd).toBeCloseTo(0.0833, 4);
    expect(m.approximateMarketValueUsd).toBeCloseTo(2_251_251_360_000, -3);
    expect(m.btcShareOfMarketValue).toBeCloseTo(0.000488, 6);
    expect(m.impliedBtcPriceUsd).toBeCloseTo(58_678.92, 1);
  });

  it("builds the 0/5/10% hypothetical allocation illustration", () => {
    const rows = calculateAllocationIllustration(snapshot());
    expect(rows.map((r) => r.allocation)).toEqual([0, 0.05, 0.1]);
    expect(rows.map((r) => r.lookThroughSats)).toEqual([0, 399, 797]);
    expect(rows.map((r) => r.portfolioChangeOnEquityMove)).toEqual([0, 0.025, 0.05]);
    expect(rows[2]!.btcValueInPositionUsd).toBeCloseTo(0.49, 2);
    expect(rows[2]!.directBitcoinSats).toBeCloseTo(1_704_189, -1);
  });
});

describe("SpaceX research note", () => {
  it("validates and awaits editorial review", () => {
    const note = spacexNote();
    expect(researchNoteSchema.safeParse(note).success).toBe(true);
    expect(note.status).toBe("needs_review");
    expect(note.publishedAt).toBeNull();
    expect(note.pillar).toBe("bitcoin-capital-markets");
    expect(note.issuerSnapshot?.snapshotId).toBe("spacex-2026-06-30");
    expect(note.workingThesis).toMatch(
      /^SpaceX is not currently a meaningful source of Bitcoin amplification\./,
    );
  });

  it("separates established facts, company targets, and speculation", () => {
    const kinds = claimKindsUsed(spacexNote());
    for (const kind of ["established_fact", "company_target", "speculative"] as const) {
      expect(kinds.has(kind)).toBe(true);
    }
    const orbital = claimsInSection(spacexNote(), "orbital-compute");
    expect(orbital.some((c) => c.kind === "speculative" && /orbital AI compute/.test(c.text))).toBe(
      true,
    );
    const v3 = claimsInSection(spacexNote(), "starship-and-v3");
    expect(v3.find((c) => /one Tbps/.test(c.text))?.kind).toBe("company_target");
  });

  it("uses primary sources, plus one labeled market-data source for the price", () => {
    const note = spacexNote();
    expect(note.sources.filter((s) => s.type === "commentary")).toEqual([]);
    expect(note.sources.filter((s) => s.type === "market_data").map((s) => s.id)).toEqual([
      "spcx-close-2026-06-30",
    ]);
    expect(note.sources.filter((s) => s.type === "primary").length).toBe(note.sources.length - 1);
  });

  it("states the rounded figures produced by the shared calculation", () => {
    const m = calculateResearchIssuerMetrics(snapshot());
    const text = noteText(spacexNote());
    expect(text).toContain(`approximately ${Math.round(m.basicSatsPerShare)} sats per share`);
    expect(text).toContain(`approximately ${Math.round(m.dilutedSatsPerShare)} sats per share`);
    expect(text).toContain(
      `about ${Math.round(m.dilutedWithConditionalSatsPerShare)} sats per share`,
    );
    expect(text).toContain(`$${m.btcValuePerShareUsd.toFixed(3)}`);
    expect(text).toContain(`about ${(m.btcShareOfMarketValue * 100).toFixed(2)}%`);
    expect(text).toContain(`$${(m.approximateMarketValueUsd / 1e12).toFixed(2)} trillion`);
    const rows = calculateAllocationIllustration(snapshot());
    expect(text).toContain(`about ${rows[2]!.lookThroughSats} sats`);
  });

  it("covers every requested item", () => {
    const text = noteText(spacexNote());
    for (const phrase of [
      "18,712 BTC",
      "13.176 billion",
      "564 million",
      "1.331 billion",
      "more than 80% of global mass to orbit",
      "78 launches and 1,041 metric tons",
      "12.0 million subscribers",
      "operating income",
      "one Tbps",
      "up to 60",
      "twenty-fold",
      "Flight 14",
      "first orbital flight",
      "rapid reuse",
      "orbital AI compute",
    ]) {
      expect(text, phrase).toContain(phrase);
    }
    const ids = spacexNote().evidence.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "technical-counterarguments",
        "financial-counterarguments",
        "allocation-illustration",
      ]),
    );
  });
});

describe("accounting boundaries", () => {
  it("keeps SPCX out of every official portfolio data file", () => {
    for (const file of [
      "portfolio.json",
      "transactions.json",
      "valuation-history.json",
      "market-observations.json",
      "market-prices.json",
      "issuer-metrics.json",
      "issuer-bps-history.json",
    ]) {
      const fullPath = path.join(process.cwd(), "data", file);
      if (!existsSync(fullPath)) continue;
      expect(readFileSync(fullPath, "utf8"), file).not.toMatch(/SPCX|SpaceX/i);
    }
  });

  it("excludes SPCX from look-through totals", () => {
    const lt = buildPublicDashboard().lookThrough;
    expect(lt.positions.map((p) => p.ticker)).not.toContain("SPCX");
    expect(lt.metrics.map((m) => m.ticker)).not.toContain("SPCX");
  });
});

describe("site research links and navigation", () => {
  it("resolves every research note linked from site pages", () => {
    const slugs = new Set(loadResearchNotes().notes.map((n) => n.slug));
    for (const slug of Object.values(SITE_RESEARCH_LINKS)) expect(slugs.has(slug)).toBe(true);
    expect(SITE_RESEARCH_LINKS.operatingCompanyGrowth).toBe(SLUG);
  });

  it("reduces primary navigation and keeps every section reachable under More", () => {
    expect(PRIMARY_NAV.map((i) => i.label)).toEqual([
      "Overview",
      "Learn",
      "Portfolio",
      "BTC Exposure",
    ]);
    expect(MORE_NAV.map((i) => i.label)).toEqual([
      "Episodes",
      "Reserve",
      "Leaderboard",
      "Income Model",
      "Methodology",
      "Resources",
    ]);
    for (const item of [...PRIMARY_NAV, ...MORE_NAV]) {
      const page = path.join(process.cwd(), "src", "app", item.href, "page.tsx");
      expect(existsSync(page), item.href).toBe(true);
    }
  });

  it("marks nested routes active without matching unrelated prefixes", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/learn", "/")).toBe(false);
    expect(isNavItemActive(`/learn/research/${SLUG}`, "/learn")).toBe(true);
    expect(isNavItemActive("/learn/resources", "/resources")).toBe(false);
  });
});
