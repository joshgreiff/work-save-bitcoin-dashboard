import { priorCloseCarriedForwardLabel } from "@/lib/quotes/price-carry-forward";
import { etCalendarDay } from "@/lib/market/session";

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{ close?: Array<number | null> }>;
      };
      meta?: {
        symbol?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
      };
    }>;
    error?: { description?: string };
  };
};

export type YahooDailyClose = {
  symbol: string;
  priceCents: number;
  priceUsd: number;
  sessionDay: string;
  /** Calendar day of the bar actually used (may be earlier when fallbackUsed). */
  barSessionDay: string;
  observedAtUnix: number;
  sourceUrl: string;
  retrievedAt: string;
  sourceName: string;
  fallbackUsed: boolean;
  note: string;
};

type Bar = {
  unix: number;
  close: number;
  day: string;
};

function parseBars(
  timestamps: number[],
  closes: Array<number | null>,
): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const unix = timestamps[i]!;
    const close = closes[i];
    if (close == null || !Number.isFinite(close) || close <= 0) continue;
    bars.push({
      unix,
      close,
      day: etCalendarDay(new Date(unix * 1000)),
    });
  }
  return bars;
}

/**
 * Unadjusted Yahoo daily close for a specific America/New_York calendar day.
 * When allowPriorCloseFallback is true and the session has no print (common for
 * thin ADRs), uses the latest prior bar and sets fallbackUsed.
 */
export async function fetchYahooUnadjustedDailyClose(args: {
  symbol: string;
  sessionDay: string;
  allowPriorCloseFallback?: boolean;
  fetchImpl?: typeof fetch;
}): Promise<YahooDailyClose> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const retrievedAt = new Date().toISOString();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(args.symbol)}?interval=1d&range=1mo`;
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "WorkSaveBitcoinDashboard/1.0 (+https://www.worksavebitcoin.com)",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Yahoo chart HTTP ${response.status} for ${args.symbol}`);
  }
  const data = (await response.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  if (timestamps.length === 0 || closes.length === 0) {
    throw new Error(
      data.chart?.error?.description ??
        `Yahoo chart missing daily bars for ${args.symbol}`,
    );
  }

  const bars = parseBars(timestamps, closes);
  const exact = bars.find((b) => b.day === args.sessionDay);
  if (exact) {
    const cents = dollarsToCents(exact.close);
    return {
      symbol: args.symbol,
      priceCents: cents,
      priceUsd: exact.close,
      sessionDay: args.sessionDay,
      barSessionDay: exact.day,
      observedAtUnix: exact.unix,
      sourceUrl: url,
      retrievedAt,
      sourceName: "Yahoo Finance chart unadjusted daily close",
      fallbackUsed: false,
      note: `Unadjusted regular-session close $${(cents / 100).toFixed(2)}`,
    };
  }

  if (args.allowPriorCloseFallback) {
    const prior = [...bars].reverse().find((b) => b.day < args.sessionDay);
    if (prior) {
      const cents = dollarsToCents(prior.close);
      return {
        symbol: args.symbol,
        priceCents: cents,
        priceUsd: prior.close,
        sessionDay: args.sessionDay,
        barSessionDay: prior.day,
        observedAtUnix: prior.unix,
        sourceUrl: url,
        retrievedAt,
        sourceName: "Yahoo Finance chart unadjusted daily close",
        fallbackUsed: true,
        note: `${priorCloseCarriedForwardLabel(args.symbol)} Carried ${prior.day} unadjusted close $${(cents / 100).toFixed(2)}.`,
      };
    }
  }

  throw new Error(
    `No Yahoo unadjusted daily close for ${args.symbol} on ${args.sessionDay} (holiday or missing bar)`,
  );
}
