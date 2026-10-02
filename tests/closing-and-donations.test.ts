import { describe, expect, it } from "vitest";
import { buildBitcoinLeaderboard, buildFiatLeaderboard } from "@/lib/schemas/donations";
import { formatUsdFromCents } from "@/lib/accounting/format";
import {
  calculateInvestmentPnL,
  sharesHeldAt,
  summarizeContributions,
  transactionsThrough,
} from "@/lib/accounting/portfolio";
import { computeOfficialPortfolioMark } from "@/lib/quotes/official-close";
import {
  loadDonations,
  loadEpisodes,
  loadMarketObservations,
  loadMarketPrices,
  loadPortfolio,
  loadReserve,
  loadTransactions,
  loadValuationHistory,
} from "@/lib/data/load";

const OFFICIAL_CLOSE_TIME = /^\d{4}-\d{2}-\d{2}T16:00:00-0[45]:00$/;

function officialCloses() {
  return loadMarketObservations().observations.filter((o) => o.valuationType === "market_close");
}

function latestOfficialClose() {
  const closes = officialCloses();
  expect(closes.length).toBeGreaterThan(0);
  return closes.reduce((latest, o) =>
    Date.parse(o.timestamp) > Date.parse(latest.timestamp) ? o : latest,
  );
}

function sessionDay(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function closePrices(o: ReturnType<typeof officialCloses>[number]): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const [symbol, cents] of Object.entries(o.prices)) {
    expect(cents, `${o.id} ${symbol} price`).toEqual(expect.any(Number));
    prices[symbol] = cents!;
  }
  return prices;
}

describe("closing snapshot", () => {
  it("keeps Episode 1 opening value separate from the current official close", () => {
    const episodes = loadEpisodes().episodes;
    const portfolio = loadPortfolio();
    expect(episodes[0]?.portfolioValueCents).toBe(199991);
    expect(portfolio.startingPortfolioValueCents).toBe(199991);
    expect(portfolio.currentValuationAt).not.toBe(portfolio.inceptionValuationAt);
  });

  it("values the current portfolio at the latest official market-close observation", () => {
    const portfolio = loadPortfolio();
    const latest = latestOfficialClose();
    expect(portfolio.currentValuationAt).toBe(latest.timestamp);
    expect(portfolio.currentPortfolioValueCents).toBe(latest.portfolioValueCents);
    expect(portfolio.dataQuality).toBe("confirmed");
  });

  it("ends valuation history with the same official close", () => {
    const latest = latestOfficialClose();
    const points = loadValuationHistory().points;
    const last = points.reduce((a, b) => (Date.parse(b.asOf) > Date.parse(a.asOf) ? b : a));
    expect(last.id).toBe(`vh-${sessionDay(latest.timestamp)}-close`);
    expect(last.asOf).toBe(latest.timestamp);
    expect(last.valuationType).toBe("market_close");
    expect(last.session).toBe("close");
    expect(last.portfolioValueCents).toBe(latest.portfolioValueCents);
    expect(last.prices).toEqual(latest.prices);
  });

  it("reconciles the current total from shares held at the latest close × its prices", () => {
    const portfolio = loadPortfolio();
    const transactions = loadTransactions().transactions;
    const latest = latestOfficialClose();
    const prices = closePrices(latest);
    const held = portfolio.positions.filter(
      (p) => sharesHeldAt(p, transactions, latest.timestamp) > 0,
    );
    const acquiredLater = portfolio.positions.filter((p) => !held.includes(p));
    for (const position of held) {
      expect(sharesHeldAt(position, transactions, latest.timestamp), position.ticker).toBe(
        position.shares,
      );
    }

    const mark = computeOfficialPortfolioMark({
      portfolio: { ...portfolio, positions: held },
      closes: prices,
    });
    expect(mark.missing).toEqual([]);
    expect(mark.portfolioValueCents).toBe(portfolio.currentPortfolioValueCents);

    for (const position of held) {
      expect(position.priceCents).toBe(prices[position.ticker]);
      expect(position.marketValueCents).toBe(Math.round(position.shares * position.priceCents!));
    }
    for (const position of acquiredLater) {
      expect(position.priceCents, `${position.ticker} has no close mark yet`).toBeNull();
      expect(position.marketValueCents).toBeNull();
    }
    const positionsTotal = held.reduce((sum, p) => sum + p.marketValueCents!, 0);
    expect(positionsTotal + portfolio.cashBalanceCents).toBe(portfolio.currentPortfolioValueCents);

    const contributions = summarizeContributions(transactionsThrough(transactions, latest.timestamp));
    expect(latest.netExternalContributionsCents).toBe(contributions.netExternalContributionsCents);
    const pnl = calculateInvestmentPnL({
      currentPortfolioValueCents: portfolio.currentPortfolioValueCents,
      totalExternalContributionsCents: contributions.totalExternalContributionsCents,
    });
    expect(pnl).toBe(portfolio.currentPortfolioValueCents - contributions.totalExternalContributionsCents);
    expect(portfolio.notes.join("\n")).toContain(
      formatUsdFromCents(portfolio.currentPortfolioValueCents),
    );
    expect(portfolio.notes.join("\n")).toContain(formatUsdFromCents(pnl, { showSign: true }));
  });

  it("keeps automated close data internally consistent", () => {
    const closes = officialCloses();
    const historyById = new Map(loadValuationHistory().points.map((p) => [p.id, p]));
    const days = closes.map((o) => sessionDay(o.timestamp));
    expect(new Set(days).size).toBe(days.length);

    closes.forEach((o, i) => {
      expect(o.timestamp).toMatch(OFFICIAL_CLOSE_TIME);
      expect(o.id).toBe(`mo-${sessionDay(o.timestamp)}-close`);
      if (i > 0) expect(Date.parse(o.timestamp)).toBeGreaterThan(Date.parse(closes[i - 1]!.timestamp));
      const sources = new Map(Object.entries(o.sources));
      for (const symbol of Object.keys(closePrices(o))) {
        expect(sources.get(symbol), `${o.id} ${symbol} source`).toBeTruthy();
      }

      const point = historyById.get(`vh-${sessionDay(o.timestamp)}-close`);
      expect(point, `${o.id} valuation-history point`).toBeDefined();
      expect(point?.asOf).toBe(o.timestamp);
      expect(point?.portfolioValueCents).toBe(o.portfolioValueCents);
      expect(point?.prices).toEqual(o.prices);
    });

    const latest = latestOfficialClose();
    const latestPrices = closePrices(latest);
    for (const price of loadMarketPrices().prices) {
      expect(price.asOf, price.symbol).toBe(latest.timestamp);
      expect(price.priceCents, price.symbol).toBe(latestPrices[price.symbol]);
    }
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
