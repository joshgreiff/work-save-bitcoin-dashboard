"use client";

import { useMemo, useState } from "react";
import {
  AsOf,
  formatPercent,
  formatShares,
  formatUsdFromCents,
  MetricCard,
} from "@/components/ui/primitives";
import { LIVE_REFRESH_MS, useLivePortfolioValue } from "@/components/useLivePortfolioValue";
import {
  buildPerformancePeriods,
  PERFORMANCE_BENCHMARKS,
  type PerformanceClose,
  type PerformanceEnd,
  type PeriodId,
  type PeriodPerformance,
} from "@/lib/accounting/performance-periods";
import type { CapitalAdjustedStartingValue } from "@/lib/accounting/portfolio";
import { formatEtTimestamp } from "@/lib/market/session";
import type { PortfolioTransaction } from "@/lib/schemas/transactions";

type Position = {
  ticker: string;
  name: string;
  shares: number;
  lookThroughEligible: boolean;
};

type Props = {
  cashBalanceCents: number;
  positions: Position[];
  totalExternalContributionsCents: number;
  netExternalContributionsCents: number;
  liveTotalExternalContributionsCents: number;
  liveNetExternalContributionsCents: number;
  adjustedStartingValue: CapitalAdjustedStartingValue;
  adjustedStartingValueToDate: CapitalAdjustedStartingValue;
  fallbackValueCents: number;
  fallbackAsOf: string;
  closes: PerformanceClose[];
  inception: { asOf: string; portfolioValueCents: number };
  transactions: PortfolioTransaction[];
};

const BENCHMARK_LABEL: Record<string, string> = { BTCUSD: "Bitcoin", SPY: "SPY", GLD: "GLD" };

function periodLabel(id: PeriodId, live: boolean): string {
  if (id === "1d") return live ? "Today" : "Last session";
  if (id === "1w") return "1 week";
  if (id === "mtd") return "Month to date";
  return "Since inception";
}

const SHORT_PERIOD_LABEL: Record<PeriodId, string> = {
  "1d": "1D",
  "1w": "1W",
  mtd: "MTD",
  inception: "All",
};

function toneOf(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-[var(--foreground)]";
  return value > 0 ? "text-[var(--positive)]" : "text-[var(--negative)]";
}

function Pct({ value, pp = false }: { value: number | null | undefined; pp?: boolean }) {
  if (pp) {
    return (
      <span className={`tabular-nums ${toneOf(value)}`}>
        {value == null
          ? "—"
          : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value * 100).toFixed(2)} pp`}
      </span>
    );
  }
  return (
    <span className={`tabular-nums ${toneOf(value)}`}>
      {formatPercent(value, { showSign: true })}
    </span>
  );
}

function ContributionBars({
  period,
  positions,
}: {
  period: PeriodPerformance;
  positions: Position[];
}) {
  const nameOf = new Map(positions.map((p) => [p.ticker, p.name]));
  const rows = period.holdings.map((h) => ({
    key: h.ticker,
    title: h.ticker,
    subtitle: nameOf.get(h.ticker) ?? "",
    cents: h.contributionCents,
    priceReturn: h.priceReturn,
    note: h.boughtInWindow ? "since purchase" : null,
  }));
  if (period.unattributedCents != null && Math.abs(period.unattributedCents) >= 1) {
    rows.push({
      key: "other",
      title: "Other",
      subtitle:
        period.id === "inception"
          ? "Sep. 16 opening mark to first close (purchase prices pending)"
          : "Cash and rounding",
      cents: period.unattributedCents,
      priceReturn: null,
      note: null,
    });
  }
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.cents ?? 0)));
  const total = period.portfolioChangeCents;

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const width = row.cents == null ? 0 : (Math.abs(row.cents) / max) * 100;
        const share =
          row.cents == null || total == null || total === 0 ? null : row.cents / Math.abs(total);
        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-[var(--foreground)]">{row.title}</span>{" "}
                <span className="hidden text-[var(--muted)] sm:inline">{row.subtitle}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                {row.priceReturn != null ? (
                  <span className="text-xs tabular-nums text-[var(--muted)]">
                    Price <Pct value={row.priceReturn} />
                    {row.note ? ` ${row.note}` : ""}
                    {share != null ? (
                      <span className="hidden sm:inline">
                        {" "}
                        · {formatPercent(share, { digits: 0 })} of move
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <span className={`tabular-nums font-medium ${toneOf(row.cents)}`}>
                  {formatUsdFromCents(row.cents, { showSign: true })}
                </span>
              </span>
            </div>
            {row.key === "other" ? (
              <p className="text-xs text-[var(--muted)] sm:hidden">{row.subtitle}</p>
            ) : null}
            <div className="mt-1 h-2 bg-[var(--surface-elevated)]">
              <div
                className={`h-2 ${(row.cents ?? 0) >= 0 ? "bg-[var(--positive)]" : "bg-[var(--negative)]"}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PortfolioDashboard(props: Props) {
  const live = useLivePortfolioValue({
    cashBalanceCents: props.cashBalanceCents,
    positions: props.positions.map((p) => ({ ticker: p.ticker, shares: p.shares })),
    totalExternalContributionsCents: props.totalExternalContributionsCents,
    netExternalContributionsCents: props.netExternalContributionsCents,
    liveTotalExternalContributionsCents: props.liveTotalExternalContributionsCents,
    liveNetExternalContributionsCents: props.liveNetExternalContributionsCents,
    fallbackValueCents: props.fallbackValueCents,
    fallbackAsOf: props.fallbackAsOf,
  });
  const start = live.usingLive ? props.adjustedStartingValueToDate : props.adjustedStartingValue;

  const end: PerformanceEnd | null = useMemo(() => {
    const latest = props.closes[props.closes.length - 1];
    if (live.usingLive) {
      const prices: Record<string, number> = {};
      for (const q of live.quotes?.quotes ?? []) prices[q.symbol] = q.priceCents;
      return {
        asOf: live.asOf ?? new Date().toISOString(),
        live: true,
        portfolioValueCents: live.valueCents,
        prices,
      };
    }
    if (!latest || latest.portfolioValueCents == null) return null;
    return {
      asOf: latest.timestamp,
      live: false,
      portfolioValueCents: latest.portfolioValueCents,
      prices: latest.prices,
    };
  }, [live.usingLive, live.quotes, live.asOf, live.valueCents, props.closes]);

  const periods = useMemo(
    () =>
      end
        ? buildPerformancePeriods({
            closes: props.closes,
            inception: props.inception,
            positions: props.positions,
            transactions: props.transactions,
            end,
          })
        : [],
    [end, props.closes, props.inception, props.positions, props.transactions],
  );
  const [selected, setSelected] = useState<PeriodId>("inception");
  const period = periods.find((p) => p.id === selected) ?? periods[periods.length - 1];
  const byId = new Map(periods.map((p) => [p.id, p]));
  const today = byId.get("1d");
  const sinceInception = byId.get("inception");
  const endPrices = end?.prices ?? {};
  const totalValue = live.valueCents;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            {live.usingLive
              ? "Live regular-session mark — not historical. Assumes published share weights are unchanged."
              : live.isPending && !live.checkedAt
                ? "Loading live quotes…"
                : "Showing the latest official 4:00 p.m. Eastern close until a live regular-session mark is available."}
            <span className="block">
              Prices refresh every {LIVE_REFRESH_MS / 1000} seconds during market hours
              {live.checkedAt ? ` · last checked ${formatEtTimestamp(live.checkedAt)}` : ""}.
            </span>
          </p>
          <button
            type="button"
            onClick={live.refresh}
            disabled={live.isPending}
            className="min-h-9 border border-[var(--border)] px-3 text-sm text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-50"
          >
            {live.isPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Current value"
            value={formatUsdFromCents(live.valueCents)}
            asOf={live.asOf}
            hint={live.usingLive ? "Live regular-session mark" : "Latest official market close"}
          />
          <MetricCard
            label="Investment P&L"
            value={formatUsdFromCents(live.pnl, { showSign: true })}
            tone={live.pnl === 0 ? "neutral" : live.pnl > 0 ? "positive" : "negative"}
            asOf={live.asOf}
            hint="Excludes deposits — new money is never profit"
          />
          <MetricCard
            label="Return since inception"
            value={formatPercent(live.ret, { showSign: true })}
            tone={
              live.ret == null || live.ret === 0
                ? "neutral"
                : live.ret > 0
                  ? "positive"
                  : "negative"
            }
            asOf={live.asOf}
            hint={
              sinceInception?.benchmarks.BTCUSD != null
                ? `Bitcoin with the same deposits: ${formatPercent(sinceInception.benchmarks.BTCUSD, { showSign: true })}`
                : undefined
            }
          />
          <MetricCard
            label="Starting value + added capital"
            value={formatUsdFromCents(start.adjustedStartingValueCents)}
            asOf={live.asOf}
            hint={`${formatUsdFromCents(start.startingPortfolioValueCents)} at inception + ${formatUsdFromCents(start.netCapitalAddedCents)} added since`}
          />
        </div>
        {live.error ? (
          <p className="text-xs text-[var(--negative)]">Live quotes unavailable: {live.error}</p>
        ) : null}
      </div>

      {period ? (
        <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Performance by time frame</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {formatEtTimestamp(period.startAt)} → {formatEtTimestamp(period.endAt)}
                {end?.live ? " (live)" : " (official close)"}
              </p>
            </div>
            <div role="tablist" aria-label="Time frame" className="flex flex-wrap gap-1">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === period.id}
                  onClick={() => setSelected(p.id)}
                  className={`min-h-9 border px-3 text-sm ${
                    p.id === period.id
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]"
                  }`}
                >
                  {periodLabel(p.id, end?.live ?? false)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border border-[var(--accent)] px-3 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">Portfolio</p>
              <p className="mt-1 text-xl font-medium">
                <Pct value={period.portfolioReturn} />
              </p>
              <p className={`mt-1 text-xs tabular-nums ${toneOf(period.portfolioChangeCents)}`}>
                {formatUsdFromCents(period.portfolioChangeCents, { showSign: true })}
              </p>
            </div>
            {PERFORMANCE_BENCHMARKS.map((symbol) => {
              const value = period.benchmarks[symbol];
              const excess =
                period.portfolioReturn == null || value == null
                  ? null
                  : period.portfolioReturn - value;
              return (
                <div key={symbol} className="border border-[var(--border)] px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                    {BENCHMARK_LABEL[symbol]}
                  </p>
                  <p className="mt-1 text-xl font-medium">
                    <Pct value={value} />
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Portfolio <Pct value={excess} pp />
                  </p>
                </div>
              );
            })}
          </div>

          <div>
            <h3 className="text-sm font-medium">What&rsquo;s carrying the portfolio</h3>
            <p className="mb-3 mt-1 text-xs text-[var(--muted)]">
              Dollar gain or loss each holding added over this time frame.
              {period.id === "inception"
                ? " Holdings are measured from the first official close (Sep. 16) or their purchase price."
                : ""}
            </p>
            <ContributionBars period={period} positions={props.positions} />
          </div>

          <p className="text-xs text-[var(--muted)]">
            {period.method === "contribution_adjusted"
              ? "Since inception: investment P&L ÷ net deposits. Benchmarks buy the same dollar amounts on the same dates."
              : "Excludes new money: deposits inside the window are removed before measuring the return. Benchmarks use the same start and end prices."}
          </p>
        </section>
      ) : null}

      {periods.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Returns at a glance</h2>
          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--surface-elevated)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-2 py-3 sm:px-3 font-medium" />
                  {periods.map((p) => (
                    <th key={p.id} className="px-2 py-3 sm:px-3 text-right font-medium">
                      <span className="sm:hidden">{SHORT_PERIOD_LABEL[p.id]}</span>
                      <span className="hidden sm:inline">
                        {periodLabel(p.id, end?.live ?? false)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--border)]">
                  <td className="px-2 py-2 sm:px-3 font-medium text-[var(--accent)]">Portfolio</td>
                  {periods.map((p) => (
                    <td key={p.id} className="px-2 py-2 sm:px-3 text-right">
                      <Pct value={p.portfolioReturn} />
                    </td>
                  ))}
                </tr>
                {PERFORMANCE_BENCHMARKS.map((symbol) => (
                  <tr key={symbol} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2 sm:px-3 text-[var(--muted-foreground)]">
                      {BENCHMARK_LABEL[symbol]}
                    </td>
                    {periods.map((p) => (
                      <td key={p.id} className="px-2 py-2 sm:px-3 text-right">
                        <Pct value={p.benchmarks[symbol]} />
                      </td>
                    ))}
                  </tr>
                ))}
                {props.positions.map((pos) => (
                  <tr key={pos.ticker} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2 sm:px-3">{pos.ticker}</td>
                    {periods.map((p) => {
                      const h = p.holdings.find((x) => x.ticker === pos.ticker);
                      return (
                        <td key={p.id} className="px-2 py-2 sm:px-3 text-right">
                          {h ? (
                            <Pct value={h.priceReturn} />
                          ) : (
                            <span className="text-[var(--muted)]">not held</span>
                          )}
                          {h?.boughtInWindow ? (
                            <span className="text-[var(--muted)]">*</span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Holding rows are share-price changes. * Measured from the purchase price.
            Since-inception holding prices start at the first official close because Episode 1
            purchase prices are pending confirmation.
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Holdings</h2>
        <div className="overflow-x-auto border border-[var(--border)]">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead className="bg-[var(--surface-elevated)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-2 py-3 sm:px-3 font-medium">Holding</th>
                <th className="hidden px-2 py-3 sm:px-3 text-right font-medium sm:table-cell">
                  Shares
                </th>
                <th className="hidden px-2 py-3 sm:px-3 text-right font-medium sm:table-cell">
                  Price
                </th>
                <th className="px-2 py-3 sm:px-3 text-right font-medium">Value</th>
                <th className="px-2 py-3 sm:px-3 text-right font-medium">
                  <span className="sm:hidden">% of total</span>
                  <span className="hidden sm:inline">% of portfolio</span>
                </th>
                <th className="hidden px-2 py-3 text-right font-medium sm:table-cell sm:px-3">
                  {end?.live ? "Today" : "Last session"}
                </th>
                <th className="px-2 py-3 sm:px-3 text-right font-medium">
                  <span className="sm:hidden">Gain</span>
                  <span className="hidden sm:inline">Gain since inception</span>
                </th>
                <th className="hidden px-2 py-3 sm:px-3 font-medium sm:table-cell">Look-through</th>
              </tr>
            </thead>
            <tbody>
              {props.positions.map((pos) => {
                const price = endPrices[pos.ticker] ?? null;
                const value = price == null ? null : Math.round(pos.shares * price);
                const day = today?.holdings.find((h) => h.ticker === pos.ticker);
                const all = sinceInception?.holdings.find((h) => h.ticker === pos.ticker);
                return (
                  <tr key={pos.ticker} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2 sm:px-3">
                      <span className="font-medium">{pos.ticker}</span>
                      <span className="hidden text-xs text-[var(--muted)] sm:block">
                        {pos.name}
                      </span>
                    </td>
                    <td className="hidden px-2 py-2 sm:px-3 text-right tabular-nums sm:table-cell">
                      {formatShares(pos.shares)}
                    </td>
                    <td className="hidden px-2 py-2 sm:px-3 text-right tabular-nums sm:table-cell">
                      {formatUsdFromCents(price)}
                    </td>
                    <td className="px-2 py-2 sm:px-3 text-right tabular-nums">
                      {formatUsdFromCents(value)}
                    </td>
                    <td className="px-2 py-2 sm:px-3 text-right tabular-nums">
                      {value == null || totalValue === 0
                        ? "—"
                        : formatPercent(value / totalValue, { digits: 1 })}
                    </td>
                    <td className="hidden px-2 py-2 text-right sm:table-cell sm:px-3">
                      {day ? (
                        <Pct value={day.priceReturn} />
                      ) : (
                        <span className="text-[var(--muted)]">new</span>
                      )}
                    </td>
                    <td className="px-2 py-2 sm:px-3 text-right">
                      <span className={`tabular-nums ${toneOf(all?.contributionCents)}`}>
                        {formatUsdFromCents(all?.contributionCents, { showSign: true })}
                      </span>
                      {all?.boughtInWindow ? (
                        <span className="block whitespace-nowrap text-xs text-[var(--muted)]">
                          since purchase
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-2 py-2 sm:px-3 text-xs text-[var(--muted-foreground)] sm:table-cell">
                      {pos.lookThroughEligible ? "Included" : "Excluded"}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-[var(--border)]">
                <td className="px-2 py-2 sm:px-3">
                  <span className="font-medium">Cash</span>
                  <span className="hidden text-xs text-[var(--muted)] sm:block">
                    Confirmed figure pending
                  </span>
                </td>
                <td className="hidden px-2 py-2 sm:px-3 sm:table-cell" />
                <td className="hidden px-2 py-2 sm:px-3 sm:table-cell" />
                <td className="px-2 py-2 sm:px-3 text-right tabular-nums">
                  {formatUsdFromCents(props.cashBalanceCents)}
                </td>
                <td className="px-2 py-2 sm:px-3 text-right tabular-nums">
                  {totalValue === 0
                    ? "—"
                    : formatPercent(props.cashBalanceCents / totalValue, { digits: 1 })}
                </td>
                <td className="px-2 py-2 sm:px-3" colSpan={3} />
              </tr>
              <tr className="border-t border-[var(--border)] bg-[var(--surface-elevated)]">
                <td className="px-2 py-2 sm:px-3 font-medium">Total</td>
                <td className="hidden px-2 py-2 sm:px-3 sm:table-cell" colSpan={2} />
                <td className="px-2 py-2 sm:px-3 text-right font-medium tabular-nums">
                  {formatUsdFromCents(totalValue)}
                </td>
                <td className="px-2 py-2 sm:px-3 text-right tabular-nums">100%</td>
                <td className="hidden px-2 py-2 text-right sm:table-cell sm:px-3">
                  <Pct value={today?.portfolioReturn} />
                </td>
                <td className="px-2 py-2 sm:px-3 text-right">
                  <span className={`tabular-nums ${toneOf(live.pnl)}`}>
                    {formatUsdFromCents(live.pnl, { showSign: true })}
                  </span>
                </td>
                <td className="hidden px-2 py-2 sm:px-3 sm:table-cell" />
              </tr>
            </tbody>
          </table>
        </div>
        <AsOf value={end?.asOf ?? props.fallbackAsOf} />
        {sinceInception?.unattributedCents != null &&
        Math.abs(sinceInception.unattributedCents) >= 1 ? (
          <p className="text-xs text-[var(--muted)]">
            Holding gains plus{" "}
            {formatUsdFromCents(sinceInception.unattributedCents, { showSign: true })} from the Sep.
            16 opening mark to the first official close (before per-holding prices were recorded)
            add up to the total.
          </p>
        ) : null}
        {end ? (
          <p className="text-xs text-[var(--muted)]">
            Benchmark prices:{" "}
            {PERFORMANCE_BENCHMARKS.map(
              (s) => `${BENCHMARK_LABEL[s]} ${formatUsdFromCents(endPrices[s] ?? null)}`,
            ).join(" · ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
