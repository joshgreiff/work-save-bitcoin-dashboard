import { NextResponse } from "next/server";
import { fetchCoinbaseBtcCard } from "@/lib/quotes/btc";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const card = await fetchCoinbaseBtcCard();
    return NextResponse.json(card, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch BTC quote",
      },
      { status: 502 },
    );
  }
}
