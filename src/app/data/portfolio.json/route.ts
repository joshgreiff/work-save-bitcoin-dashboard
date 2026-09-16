import { NextResponse } from "next/server";
import { loadPortfolio } from "@/lib/data/load";

export const dynamic = "force-static";

export async function GET() {
  const portfolio = loadPortfolio();
  return NextResponse.json(portfolio, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
