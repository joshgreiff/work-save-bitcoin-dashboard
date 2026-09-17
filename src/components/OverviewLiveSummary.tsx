"use client";

import { AllocationChart } from "@/components/charts/Charts";
import {
  AsOf,
  formatBtcFromSats,
  formatPercent,
  formatSats,
  formatUsdFromCents,
  MetricCard,
} from "@/components/ui/primitives";
import { useLivePortfolioValue } from "@/components/useLivePortfolioValue";

type Props = {
  cashBalanceCents: number;
  positions: Array<{ ticker: string; shares: number }>;
  totalExternalContributionsCents: number;
  netExternalContributionsCents: number;
  fallbackValueCents: number;
  fallbackAsOf: string;
  lookThrough: {
    totalLookThroughSats: number | null;
    asOf: string;
  };
  reserve: {
    currentReserveSats: number;
    asOf: string;
  };
  incomeModel: {
    monthlyIncomeCents: number | null;
    configured: boolean;
    asOf: string;
  };
};

export function OverviewLiveSummary(props: Props) {
  const live = useLivePortfolioValue({
    cashBalanceCents: props.cashBalanceCents,
    positions: props.positions,
    totalExternalContributionsCents: props.totalExternalContributionsCents,
    netExternalContributionsCents: props.netExternalContributionsCents,
    fallbackValueCents: props.fallbackValueCents,
    fallbackAsOf: props.fallbackAsOf,
  });

  return (
    <div className="space-y-10">
      <div>
        <AsOf value={live.asOf} />
        <p className="mt-1 text-xs text-[var(--muted)]">
          {live.usingLive
            ? "Current value marks unchanged holdings to live market quotes."
            : live.isPending
              ? "Loading live quotes…"
              : "Showing last stored valuation until live quotes are available."}
          {live.error ? ` (${live.error})` : ""}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Portfolio value"
          value={formatUsdFromCents(live.valueCents)}
          asOf={live.asOf}
          hint={
            live.usingLive
              ? "Live mark · same share weights"
              : "Stored valuation (live quotes unavailable)"
          }
        />
        <MetricCard
          label="Investment gain / loss"
          value={formatUsdFromCents(live.pnl, { showSign: true })}
          tone={live.pnl > 0 ? "positive" : live.pnl < 0 ? "negative" : "neutral"}
          hint="Excludes outside contributions"
          asOf={live.asOf}
        />
        <MetricCard
          label="Return since inception"
          value={formatPercent(live.ret, { showSign: true })}
          asOf={live.asOf}
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

      {live.allocation.length > 0 ? (
        <AllocationChart data={live.allocation} />
      ) : null}
    </div>
  );
}
