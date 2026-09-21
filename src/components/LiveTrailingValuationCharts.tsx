"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  CashFlowMatchedChart,
  PortfolioValueChart,
} from "@/components/charts/Charts";
import {
  appendLiveTrailingChartPoints,
  type CashFlowChartPoint,
  type LastBenchmarkPrices,
  type PortfolioValuePoint,
} from "@/lib/accounting/live-chart-trail";
import type { LiveQuotesResponse } from "@/lib/quotes/types";

type Props = {
  valueChart: PortfolioValuePoint[];
  cashFlowChart: CashFlowChartPoint[];
  lastBenchmarkPrices: LastBenchmarkPrices;
};

function liveTrailFromQuotes(live: LiveQuotesResponse | null) {
  if (
    live?.marketOpen !== true ||
    !live.mark.complete ||
    live.mark.portfolioValueCents == null
  ) {
    return null;
  }
  const bySymbol = new Map(live.quotes.map((q) => [q.symbol, q]));
  return {
    portfolioDollars: live.mark.portfolioValueCents / 100,
    asOf: live.mark.asOf ?? live.mark.retrievedAt,
    btcDollars: bySymbol.get("BTCUSD")
      ? bySymbol.get("BTCUSD")!.priceCents / 100
      : null,
    spyDollars: bySymbol.get("SPY")
      ? bySymbol.get("SPY")!.priceCents / 100
      : null,
    gldDollars: bySymbol.get("GLD")
      ? bySymbol.get("GLD")!.priceCents / 100
      : null,
  };
}

/**
 * Renders portfolio + cash-flow charts with a live trailing tip when available.
 * Uses `display: contents` so the charts participate in a parent CSS grid.
 */
export function LiveTrailingValuationCharts({
  valueChart,
  cashFlowChart,
  lastBenchmarkPrices,
}: Props) {
  const [live, setLive] = useState<LiveQuotesResponse | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/live-quotes", { cache: "no-store" });
        if (!response.ok) return;
        setLive((await response.json()) as LiveQuotesResponse);
      } catch {
        // Keep historical series when live quotes fail.
      }
    });
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const trailed = useMemo(
    () =>
      appendLiveTrailingChartPoints({
        valueChart,
        cashFlowChart,
        lastBenchmarkPrices,
        live: liveTrailFromQuotes(live),
      }),
    [valueChart, cashFlowChart, lastBenchmarkPrices, live],
  );

  return (
    <div className="contents">
      <PortfolioValueChart data={trailed.valueChart} usingLive={trailed.usingLive} />
      <CashFlowMatchedChart
        data={trailed.cashFlowChart}
        usingLive={trailed.usingLive}
      />
      {trailed.usingLive ? (
        <p className="col-span-full text-xs text-[var(--muted)]">
          Latest chart point is the live regular-session mark. Historical open/close points stay as
          published and are not rewritten.
        </p>
      ) : null}
    </div>
  );
}
