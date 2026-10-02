"use client";

import {
  AsOf,
  formatPercent,
  formatUsdFromCents,
  MetricCard,
} from "@/components/ui/primitives";
import { useLivePortfolioValue } from "@/components/useLivePortfolioValue";
import type { CapitalAdjustedStartingValue } from "@/lib/accounting/portfolio";

type Props = {
  cashBalanceCents: number;
  positions: Array<{ ticker: string; shares: number }>;
  totalExternalContributionsCents: number;
  netExternalContributionsCents: number;
  liveTotalExternalContributionsCents: number;
  liveNetExternalContributionsCents: number;
  adjustedStartingValue: CapitalAdjustedStartingValue;
  /** Includes capital recorded after the official close; pairs with a live mark. */
  adjustedStartingValueToDate: CapitalAdjustedStartingValue;
  fallbackValueCents: number;
  fallbackAsOf: string;
};

export function PortfolioLiveHeader(props: Props) {
  const live = useLivePortfolioValue({
    cashBalanceCents: props.cashBalanceCents,
    positions: props.positions,
    totalExternalContributionsCents: props.totalExternalContributionsCents,
    netExternalContributionsCents: props.netExternalContributionsCents,
    liveTotalExternalContributionsCents: props.liveTotalExternalContributionsCents,
    liveNetExternalContributionsCents: props.liveNetExternalContributionsCents,
    fallbackValueCents: props.fallbackValueCents,
    fallbackAsOf: props.fallbackAsOf,
  });
  const start = live.usingLive ? props.adjustedStartingValueToDate : props.adjustedStartingValue;

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--muted)]">
        {live.usingLive
          ? "Live regular-session portfolio mark. Assumes published share weights are unchanged."
          : live.isPending
            ? "Loading live quotes…"
            : "Showing latest official market close until a live regular-session mark is available."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Starting value + added capital"
          value={formatUsdFromCents(start.adjustedStartingValueCents)}
          asOf={live.asOf}
          hint={`${formatUsdFromCents(start.startingPortfolioValueCents)} at inception + ${formatUsdFromCents(start.netCapitalAddedCents)} added since`}
        />
        <MetricCard
          label="Current value"
          value={formatUsdFromCents(live.valueCents)}
          asOf={live.asOf}
          hint={
            live.usingLive
              ? "Live regular-session portfolio mark — not historical"
              : "Latest official market close"
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
