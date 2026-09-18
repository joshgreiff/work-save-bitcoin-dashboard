import { describe, expect, it } from "vitest";
import {
  validateAllDataFiles,
  loadPortfolio,
  loadEpisodes,
  loadValuationHistory,
} from "@/lib/data/load";

describe("seed data files", () => {
  it("validates all public data files", () => {
    expect(() => validateAllDataFiles()).not.toThrow();
  });

  it("includes confirmed Episode 1 holdings and starting value", () => {
    const portfolio = loadPortfolio();
    expect(portfolio.startingPortfolioValueCents).toBe(199991);
    expect(portfolio.positions.find((p) => p.ticker === "MSTR")?.shares).toBe(12.12);
    expect(portfolio.positions.find((p) => p.ticker === "ASST")?.shares).toBe(13.7);
    expect(portfolio.positions.find((p) => p.ticker === "MPJPY")?.shares).toBe(59);

    const episodes = loadEpisodes().episodes;
    expect(episodes[0]?.portfolioValueCents).toBe(199991);
  });

  it("seeds Day 1 inception plus Sep 16–17 official market-close valuation history", () => {
    const history = loadValuationHistory();
    expect(history.points.map((p) => p.valuationType)).toEqual([
      "inception",
      "market_close",
      "market_close",
    ]);
    expect(history.points[0]?.portfolioValueCents).toBe(199991);
    expect(history.points[1]?.portfolioValueCents).toBe(199692);
    expect(history.points[2]?.portfolioValueCents).toBe(208235);
  });
});
