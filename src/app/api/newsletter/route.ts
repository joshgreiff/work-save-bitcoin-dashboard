import { NextResponse } from "next/server";
import { z } from "zod";
import { loadNewsletterConfig } from "@/lib/data/load";

const bodySchema = z.object({
  email: z.string().email(),
  consent: z.literal(true),
  sourcePage: z.string().min(1),
});

export async function POST(request: Request) {
  const config = loadNewsletterConfig();
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email and confirm consent." },
      { status: 400 },
    );
  }

  if (config.provider === "none") {
    return NextResponse.json(
      {
        ok: false,
        message: "Work Save Bitcoin Weekly is coming soon.",
      },
      { status: 503 },
    );
  }

  const endpoint = process.env[config.endpointEnvVar];
  if (!endpoint) {
    return NextResponse.json(
      {
        ok: false,
        message: "Work Save Bitcoin Weekly is coming soon.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: parsed.email,
        source: parsed.sourcePage,
        consent: true,
        doubleOptIn: config.doubleOptIn,
      }),
    });
    if (!response.ok) {
      throw new Error(`Provider HTTP ${response.status}`);
    }
    return NextResponse.json({
      ok: true,
      message: config.doubleOptIn
        ? "Check your email to confirm your subscription."
        : "You are subscribed. You can unsubscribe anytime.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Newsletter signup failed.",
      },
      { status: 502 },
    );
  }
}
