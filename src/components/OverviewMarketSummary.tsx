"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { AllocationChart } from "@/components/charts/Charts";
import {
  formatBtcFromSats,
  formatPercent,
  formatSats,
  formatUsdFromCents,
  MetricCard,
} from "@/components/ui/primitives";
import { calculateInvestmentPnL } from "@/lib/accounting/portfolio";
import { formatEtTimestamp } from "@/lib/market/session";
import type { LiveQuotesResponse } from "@/lib/quotes/types";

type Props = {
  cashBalanceCents: number;
  positions: Array<{ ticker: string; shares: number }>;
  totalExternalContributionsCents: number;
  netExternalContributionsCents: number;
  officialCloseCents: number;
  officialCloseAt: string;
  lookThrough: { totalLookThroughSats: number | null; asOf: string };
  reserve: { currentReserveSats: number; asOf: string };
  incomeModel: {
    monthlyIncomeCents: number | null;
    configured: boolean;
    asOf: string;
  };
};

export function OverviewMarketSummary(props: Props) {
  const [live, setLive] = useState<LiveQuotesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch("/api/live-quotes", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setLive((await response.json()) as LiveQuotesResponse);
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

  const marketOpen = live?.marketOpen === true;
  const liveComplete =
    marketOpen && live?.mark.complete && live.mark.portfolioValueCents != null;

  const displayValue = liveComplete
    ? (live!.mark.portfolioValueCents as number)
    : props.officialCloseCents;
  const displayAsOf = liveComplete
    ? (live!.mark.asOf ?? live!.mark.retrievedAt)
    : props.officialCloseAt;
  const statusLabel = liveComplete
    ? "Live regular-session portfolio mark"
    : "Latest official market close";
  const statusHint = liveComplete
    ? "Live — not historical · assumes published share weights unchanged"
    : "Official market-close snapshot";

  const pnl = calculateInvestmentPnL({
    currentPortfolioValueCents: displayValue,
    totalExternalContributionsCents: props.totalExternalContributionsCents,
  });
  const ret =
    props.netExternalContributionsCents === 0
      ? null
      : pnl / props.netExternalContributionsCents;

  const allocation = useMemo(() => {
    if (!liveComplete || !live) return [];
    return live.mark.positions
      .filter((p) => p.marketValueCents != null)
      .map((p) => ({
        name: p.ticker,
        value: (p.marketValueCents as number) / 100,
      }));
  }, [live, liveComplete]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Portfolio value"
          value={formatUsdFromCents(displayValue)}
          asOf={displayAsOf}
          hint={`${statusLabel} · ${statusHint}`}
        />
        <MetricCard
          label="Investment gain / loss"
          value={formatUsdFromCents(pnl, { showSign: true })}
          tone={pnl > 0 ? "positive" : pnl < 0 ? "negative" : "neutral"}
          hint="Excludes outside contributions"
          asOf={displayAsOf}
        />
        <MetricCard
          label="Return since inception"
          value={formatPercent(ret, { showSign: true })}
          asOf={displayAsOf}
        />
        <MetricCard
          label="Look-through BTC exposure"
          value={
            props.lookThrough.totalLookThroughSats == null
              ? "Unavailable"
              : formatSats(props.lookThrough.totalLookThroughSats)
          }
          hint="Requires confirmed diluted sats/share"
          asOf={props.lookThrough.asOf}
        />
        <MetricCard
          label="WSB Bitcoin Reserve"
          value={formatBtcFromSats(props.reserve.currentReserveSats)}
          hint={formatSats(props.reserve.currentReserveSats)}
          asOf={props.reserve.asOf}
          tone="accent"
        />
        <MetricCard
          label="Modeled monthly income"
          value={formatUsdFromCents(props.incomeModel.monthlyIncomeCents)}
          hint={
            props.incomeModel.configured
              ? "Hypothetical conversion"
              : "Income model not configured yet"
          }
          asOf={props.incomeModel.asOf}
        />
      </section>

      <aside className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-foreground)]">
        <p className="font-medium text-[var(--foreground)]">Valuation status</p>
        <p className="mt-2">
          {statusLabel}. {formatEtTimestamp(displayAsOf)}.{" "}
          {liveComplete
            ? "Source: regular-session equity quotes (Yahoo chart) + recorded cash."
            : "Source: stored official market-close snapshot."}
        </p>
        {liveComplete ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Live — not historical. Refreshing replaces this transient mark; it is never appended to
            immutable history. {isPending ? "Refreshing…" : ""}
          </p>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Outside regular U.S. equity hours (or quotes incomplete), the dashboard shows the latest
            official 4:00 p.m. Eastern close. Premarket and after-hours equity prints are excluded.
          </p>
        )}
        {error ? <p className="mt-2 text-xs text-[var(--negative)]">{error}</p> : null}
      </aside>

      {allocation.length > 0 ? <AllocationChart data={allocation} /> : null}
    </div>
  );
}
