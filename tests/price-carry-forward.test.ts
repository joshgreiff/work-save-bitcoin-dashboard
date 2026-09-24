import { describe, expect, it } from "vitest";
import {
  appendCarryForwardClarification,
  equityCarryForwardLabels,
  priorCloseCarriedForwardLabel,
} from "@/lib/quotes/price-carry-forward";

describe("price carry-forward labels", () => {
  it("uses the visible MPJPY portfolio-snapshot wording", () => {
    expect(priorCloseCarriedForwardLabel("MPJPY")).toBe(
      "MPJPY prior close carried forward due to no reported session print.",
    );
  });

  it("only labels equity sources with fallbackUsed", () => {
    expect(
      equityCarryForwardLabels({
        sources: {
          BTCUSD: { fallbackUsed: true },
          MPJPY: { fallbackUsed: true },
          MSTR: { fallbackUsed: false },
        },
      }),
    ).toEqual(["MPJPY prior close carried forward due to no reported session print."]);
  });

  it("appends clarification that the total remains a valid close", () => {
    const note = appendCarryForwardClarification("Base note.", [
      priorCloseCarriedForwardLabel("MPJPY"),
    ]);
    expect(note).toContain("Base note.");
    expect(note).toContain(
      "MPJPY prior close carried forward due to no reported session print.",
    );
    expect(note).toContain(
      "The total is still a valid market-close valuation, but one component is estimated from its last available close.",
    );
  });
});
