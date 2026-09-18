import { describe, expect, it } from "vitest";
import { buildBitcoinLeaderboard, buildFiatLeaderboard } from "@/lib/schemas/donations";
import { calculateInvestmentPnL } from "@/lib/accounting/portfolio";
import { loadDonations, loadEpisodes, loadPortfolio, loadReserve } from "@/lib/data/load";

describe("closing snapshot", () => {
  it("keeps Episode 1 opening value while current portfolio uses the latest official close", () => {
    const episodes = loadEpisodes().episodes;
    const portfolio = loadPortfolio();
    expect(episodes[0]?.portfolioValueCents).toBe(199991);
    expect(portfolio.currentPortfolioValueCents).toBe(208235);
    expect(portfolio.currentValuationAt).toBe("2026-09-17T16:00:00-04:00");
    expect(
      calculateInvestmentPnL({
        currentPortfolioValueCents: portfolio.currentPortfolioValueCents,
        totalExternalContributionsCents: 199991,
      }),
    ).toBe(8244);
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
  it("records the anonymous Bitcoin donation in both ledgers", () => {
    const donations = loadDonations();
    const reserve = loadReserve();
    expect(donations.bitcoin[0]?.sats).toBe(13215);
    expect(donations.bitcoin[0]?.displayName).toBe("Anonymous");
    expect(reserve.transactions[0]?.sats).toBe(13215);
    expect(buildBitcoinLeaderboard(donations.bitcoin)[0]?.rank).toBe(1);
    expect(buildFiatLeaderboard(donations.fiat)).toEqual([]);
  });
});
