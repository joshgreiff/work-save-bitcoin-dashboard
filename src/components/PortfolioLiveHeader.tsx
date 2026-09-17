"use client";

import {
  AsOf,
  formatPercent,
  formatUsdFromCents,
  MetricCard,
} from "@/components/ui/primitives";
import { useLivePortfolioValue } from "@/components/useLivePortfolioValue";

type Props = {
  cashBalanceCents: number;
  positions: Array<{ ticker: string; shares: number }>;
  totalExternalContributionsCents: number;
  netExternalContributionsCents: number;
  startingPortfolioValueCents: number;
  inceptionValuationAt: string;
  fallbackValueCents: number;
  fallbackAsOf: string;
};

export function PortfolioLiveHeader(props: Props) {
  const live = useLivePortfolioValue({
    cashBalanceCents: props.cashBalanceCents,
    positions: props.positions,
    totalExternalContributionsCents: props.totalExternalContributionsCents,
    netExternalContributionsCents: props.netExternalContributionsCents,
    fallbackValueCents: props.fallbackValueCents,
    fallbackAsOf: props.fallbackAsOf,
  });

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted)]">
        {live.usingLive
          ? "Current value marks unchanged holdings to live market quotes."
          : live.isPending
            ? "Loading live quotes…"
            : "Showing last stored valuation until live quotes are available."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Starting value"
          value={formatUsdFromCents(props.startingPortfolioValueCents)}
          asOf={props.inceptionValuationAt}
        />
        <MetricCard
          label="Current value"
          value={formatUsdFromCents(live.valueCents)}
          asOf={live.asOf}
          hint={
            live.usingLive
              ? "Live mark · same share weights"
              : "Stored valuation (live quotes unavailable)"
          }
        />
        <MetricCard
          label="Cash balance"
          value={formatUsdFromCents(props.cashBalanceCents)}
          asOf={live.asOf}
          hint="Confirmed cash figure pending; buying power excluded"
        />
        <MetricCard
          label="Investment P&L"
          value={formatUsdFromCents(live.pnl, { showSign: true })}
          tone={live.pnl === 0 ? "neutral" : live.pnl > 0 ? "positive" : "negative"}
          asOf={live.asOf}
        />
      </div>
      <AsOf value={live.asOf} />
      <p className="text-sm tabular-nums text-[var(--muted-foreground)]">
        Return since inception: {formatPercent(live.ret, { showSign: true })}
      </p>
    </div>
  );
}
