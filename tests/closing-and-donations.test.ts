import { describe, expect, it } from "vitest";
import { buildBitcoinLeaderboard, buildFiatLeaderboard } from "@/lib/schemas/donations";
import { calculateInvestmentPnL } from "@/lib/accounting/portfolio";
import { loadDonations, loadEpisodes, loadPortfolio, loadReserve } from "@/lib/data/load";

describe("closing snapshot", () => {
  it("keeps Episode 1 opening value while current portfolio uses the latest official close", () => {
    const episodes = loadEpisodes().episodes;
    const portfolio = loadPortfolio();
    expect(episodes[0]?.portfolioValueCents).toBe(199991);
    expect(portfolio.currentPortfolioValueCents).toBe(256748);
    expect(portfolio.currentValuationAt).toBe("2026-09-21T16:00:00-04:00");
    expect(
      calculateInvestmentPnL({
        currentPortfolioValueCents: portfolio.currentPortfolioValueCents,
        totalExternalContributionsCents: 199991,
      }),
    ).toBe(56757);
  });

  it("stores after-hours separately from the official close", () => {
    const portfolio = loadPortfolio();
    expect(portfolio.afterHours?.portfolioValueCents).toBe(200694);
    expect(portfolio.afterHours?.portfolioValueCents).not.toBe(
      portfolio.currentPortfolioValueCents,
    );
  });
});

describe("donations and reserve", () => {
  it("records anonymous Bitcoin donations in both ledgers without portfolio performance", () => {
    const donations = loadDonations();
    const reserve = loadReserve();
    expect(donations.bitcoin.map((d) => d.sats)).toEqual([13215, 5790]);
    expect(donations.bitcoin.every((d) => d.displayName === "Anonymous")).toBe(true);
    expect(reserve.transactions.map((tx) => tx.sats)).toEqual([13215, 5790]);
    expect(reserve.transactions.every((tx) => tx.affectsPortfolioPerformance === false)).toBe(
      true,
    );
    const board = buildBitcoinLeaderboard(donations.bitcoin);
    expect(board[0]?.displayName).toBe("Anonymous");
    expect(board[0]?.sats).toBe(19005);
    expect(board[0]?.contributionCount).toBe(2);
    expect(buildFiatLeaderboard(donations.fiat)).toEqual([]);
  });
});
