"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { calculateInvestmentPnL } from "@/lib/accounting/portfolio";
import type { LiveQuotesResponse } from "@/lib/quotes/types";

type PortfolioInput = {
  cashBalanceCents: number;
  positions: Array<{ ticker: string; shares: number }>;
  totalExternalContributionsCents: number;
  netExternalContributionsCents: number;
  fallbackValueCents: number;
  fallbackAsOf: string;
};

export function useLivePortfolioValue(input: PortfolioInput) {
  const [data, setData] = useState<LiveQuotesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch("/api/live-quotes", { cache: "no-store" });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? `HTTP ${response.status}`);
        }
        setData((await response.json()) as LiveQuotesResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const live = useMemo(() => {
    const mark = data?.mark;
    const liveValue =
      mark?.complete && mark.portfolioValueCents != null
        ? mark.portfolioValueCents
        : null;
    const valueCents = liveValue ?? input.fallbackValueCents;
    const usingLive = liveValue != null;
    const pnl = calculateInvestmentPnL({
      currentPortfolioValueCents: valueCents,
      totalExternalContributionsCents: input.totalExternalContributionsCents,
    });
    const ret =
      input.netExternalContributionsCents === 0
        ? null
        : pnl / input.netExternalContributionsCents;
    const allocation =
      mark?.complete
        ? mark.positions
            .filter((p) => p.marketValueCents != null)
            .map((p) => ({
              name: p.ticker,
              value: (p.marketValueCents as number) / 100,
            }))
        : [];

    return {
      valueCents,
      asOf: usingLive ? (mark?.asOf ?? mark?.retrievedAt ?? null) : input.fallbackAsOf,
      usingLive,
      pnl,
      ret,
      allocation,
      quotes: data,
      mark,
    };
  }, [data, input]);

  return { ...live, error, isPending, refresh: load };
}
