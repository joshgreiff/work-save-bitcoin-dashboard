import { NextResponse } from "next/server";
import { loadPortfolio } from "@/lib/data/load";
import { fetchLiveQuotes } from "@/lib/quotes/fetch-live-quotes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const portfolio = loadPortfolio();
    const payload = await fetchLiveQuotes({
      portfolio: {
        positions: portfolio.positions,
        cashBalanceCents: portfolio.cashBalanceCents,
      },
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch live quotes",
      },
      { status: 502 },
    );
  }
}
