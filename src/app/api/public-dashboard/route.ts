import { NextResponse } from "next/server";
import { buildPublicDashboard } from "@/lib/data/public-dashboard";

export const dynamic = "force-static";

export async function GET() {
  const data = buildPublicDashboard();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
