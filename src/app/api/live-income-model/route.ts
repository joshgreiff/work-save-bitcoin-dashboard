import { NextResponse } from "next/server";
import { calculateIncomeModel } from "@/lib/accounting/income-model";
import {
  loadIncomeModel,
  loadIncomeSecurities,
  loadPortfolio,
} from "@/lib/data/load";
import { fetchLiveQuotes } from "@/lib/quotes/fetch-live-quotes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Informational live income model: marks the illustrative allocation to live
 * quotes. Never mutates official episode snapshots or valuation history.
 */
export async function GET() {
  try {
    const portfolio = loadPortfolio();
    const incomeModel = loadIncomeModel();
    const catalog = loadIncomeSecurities();
    const catalogByTicker = new Map(
      catalog.securities.map((s) => [s.ticker, s]),
    );

    const quotes = await fetchLiveQuotes({
      portfolio: {
        positions: portfolio.positions,
        cashBalanceCents: portfolio.cashBalanceCents,
      },
    });
    const quoteBySymbol = new Map(quotes.quotes.map((q) => [q.symbol, q]));

    const liveSecurities = incomeModel.securities.map((row) => {
      const catalogRow = catalogByTicker.get(row.ticker);
      const quote = quoteBySymbol.get(row.ticker as never);
      const annualDistributionCentsPerShare =
        row.annualDistributionCentsPerShare ??
        catalogRow?.annualDistributionCentsPerShare ??
        null;
      return {
        ...row,
        priceCents:
          row.ticker === "CASH"
            ? row.priceCents
            : (quote?.priceCents ?? row.priceCents),
        annualDistributionCentsPerShare,
      };
    });

    const result = calculateIncomeModel({
      portfolioValueCents: portfolio.currentPortfolioValueCents,
      model: { ...incomeModel, securities: liveSecurities },
      catalogByTicker,
      deployableValueOverrideCents:
        quotes.mark.complete && quotes.mark.portfolioValueCents != null
          ? quotes.mark.portfolioValueCents
          : null,
    });

    return NextResponse.json(
      {
        kind: "informational_live_income_model",
        label:
          "Informational only — live quotes applied to the income-model allocation. Does not mutate official episode snapshots, valuation history, or reported investment performance.",
        retrievedAt: new Date().toISOString(),
        quotesAsOf: quotes.mark.asOf,
        quoteErrors: quotes.errors,
        allocation: liveSecurities,
        result,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to build live income model",
      },
      { status: 502 },
    );
  }
}
