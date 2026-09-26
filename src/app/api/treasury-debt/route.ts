import { NextResponse } from "next/server";
import { loadTreasuryDebtFallback } from "@/lib/data/load";
import { fetchTreasuryDebt } from "@/lib/learn/treasury-debt";

export const dynamic = "force-dynamic";

export async function GET() {
  const fallback = loadTreasuryDebtFallback().observation;
  const observation = await fetchTreasuryDebt({ fallback });
  return NextResponse.json(observation, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600",
    },
  });
}
