import { loadPortfolio } from "../src/lib/data/load";
import { fetchLiveQuotes } from "../src/lib/quotes/fetch-live-quotes";

async function main() {
  const portfolio = loadPortfolio();
  const result = await fetchLiveQuotes({
    portfolio: {
      positions: portfolio.positions,
      cashBalanceCents: portfolio.cashBalanceCents,
    },
  });

  const printable = {
    retrievedAt: result.mark.retrievedAt,
    livePortfolioValueCents: result.mark.portfolioValueCents,
    livePortfolioValueUsd:
      result.mark.portfolioValueCents == null
        ? null
        : (result.mark.portfolioValueCents / 100).toFixed(2),
    quotes: result.quotes.map((q) => ({
      symbol: q.symbol,
      priceUsd: (q.priceCents / 100).toFixed(2),
      priceCents: q.priceCents,
      asOf: q.asOf,
      sourceName: q.sourceName,
    })),
    errors: result.errors,
    note: result.disclaimer,
  };

  console.log(JSON.stringify(printable, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
