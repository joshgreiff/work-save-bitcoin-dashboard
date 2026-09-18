"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPercent, formatUsdFromCents } from "@/components/ui/primitives";
import type { PublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

type Props = {
  marketObservations: PublicDashboard["marketObservations"];
};

function pp(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)} pp`;
}

export function DailyVsBitcoin({ marketObservations }: Props) {
  const comparison = marketObservations.sessionComparison;
  const [copied, setCopied] = useState(false);

  const normalized = useMemo(() => {
    const closes = marketObservations.observations
      .filter((o) => o.valuationType === "market_close")
      .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    if (closes.length === 0) return [];
    const base = closes[0]!;
    return closes.map((obs) => {
      const row: Record<string, string | number | null> = {
        label: formatEtTimestamp(obs.timestamp),
      };
      const pair: Array<[string, number | null]> = [
        ["Bitcoin", obs.prices.BTCUSD],
        ["MSTR", obs.prices.MSTR],
        ["ASST", obs.prices.ASST],
        ["MPJPY", obs.prices.MPJPY],
        ["Portfolio", obs.portfolioValueCents],
      ];
      for (const [key, value] of pair) {
        const baseValue =
          key === "Portfolio"
            ? base.portfolioValueCents
            : base.prices[key === "Bitcoin" ? "BTCUSD" : (key as "MSTR" | "ASST" | "MPJPY")];
        row[key] =
          value == null || baseValue == null || baseValue === 0
            ? null
            : value / baseValue - 1;
      }
      return row;
    });
  }, [marketObservations.observations]);

  async function copySummary() {
    if (!comparison.episodeSummary.available) return;
    await navigator.clipboard.writeText(comparison.episodeSummary.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-medium">Daily performance vs Bitcoin</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Exact, defensible comparison using identical 4:00 p.m.-to-4:00 p.m. Eastern windows for
          equities and Bitcoin. Rolling 24-hour Bitcoin returns are never substituted.
        </p>
      </div>

      {!comparison.available ? (
        <p className="border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--accent)]">
          Exact BTC comparison pending
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-3">Asset</th>
                  <th className="py-2 pr-3">Starting value</th>
                  <th className="py-2 pr-3">Ending value</th>
                  <th className="py-2 pr-3">Session return</th>
                  <th className="py-2">Excess vs BTC</th>
                </tr>
              </thead>
              <tbody>
                {comparison.assets.map((row) => (
                  <tr key={row.symbol} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-3">{row.symbol}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatUsdFromCents(row.startCents)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatUsdFromCents(row.endCents)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatPercent(row.sessionReturn, { showSign: true })}
                    </td>
                    <td className="py-2 tabular-nums">
                      {row.symbol === "Bitcoin" ? "—" : pp(row.excessVsBtcPp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-[var(--muted-foreground)]">
            {comparison.amplification.available
              ? `Amplification multiple (secondary): ${comparison.amplification.multiple?.toFixed(2)}×. Not a permanent Bitcoin beta.`
              : comparison.amplification.reason}
          </p>

          <article className="border border-[var(--border)] bg-[var(--surface)] p-4">
            <h3 className="text-sm font-medium">Ready-to-read episode summary</h3>
            <p className="mt-3 text-sm leading-relaxed">{comparison.episodeSummary.text}</p>
            <button
              type="button"
              onClick={copySummary}
              className="mt-4 border border-[var(--border)] px-3 py-2 text-sm hover:border-[var(--accent)]"
            >
              {copied ? "Copied" : "Copy episode summary"}
            </button>
          </article>

          {marketObservations.previousOfficialClose &&
          marketObservations.latestOfficialClose ? (
            <div className="space-y-1 text-xs text-[var(--muted)]">
              <p>
                Window: {formatEtTimestamp(marketObservations.previousOfficialClose.timestamp)} →{" "}
                {formatEtTimestamp(marketObservations.latestOfficialClose.timestamp)}
              </p>
              <p>
                BTC sources:{" "}
                {marketObservations.previousOfficialClose.sources.BTCUSD?.observedAt
                  ? formatEtTimestamp(
                      marketObservations.previousOfficialClose.sources.BTCUSD.observedAt,
                    )
                  : "—"}{" "}
                →{" "}
                {marketObservations.latestOfficialClose.sources.BTCUSD?.observedAt
                  ? formatEtTimestamp(
                      marketObservations.latestOfficialClose.sources.BTCUSD.observedAt,
                    )
                  : "—"}{" "}
                (Coinbase 1-minute candles). Equity closes: Yahoo unadjusted regular-session
                daily bars.
              </p>
            </div>
          ) : null}
        </>
      )}

      <div className="border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Normalized session path (official closes)</h3>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Historical
          </span>
        </div>
        <div className="mt-4 h-56">
          {normalized.length < 1 ||
          normalized.every(
            (row) =>
              row.Bitcoin == null &&
              row.MSTR == null &&
              row.Portfolio == null,
          ) ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
              Exact BTC comparison pending — synchronized closes not yet stored.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalized}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#7A8494" fontSize={11} />
                <YAxis
                  stroke="#7A8494"
                  fontSize={11}
                  tickFormatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(value) =>
                    value == null ? "—" : `${(Number(value) * 100).toFixed(2)}%`
                  }
                />
                <Legend />
                <Line dataKey="Bitcoin" stroke="#E8E2D6" dot={{ r: 3 }} connectNulls={false} />
                <Line dataKey="MSTR" stroke="#F7931A" dot={{ r: 3 }} connectNulls={false} />
                <Line dataKey="ASST" stroke="#7A8494" dot={{ r: 3 }} connectNulls={false} />
                <Line dataKey="MPJPY" stroke="#A67C52" dot={{ r: 3 }} connectNulls={false} />
                <Line dataKey="Portfolio" stroke="#3D9B6E" dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Bitcoin trades continuously while public equities trade during defined market sessions. This
        comparison synchronizes Bitcoin to the equity market’s 4:00 p.m. Eastern close. Different
        time windows may produce different results. Excess return is shown in percentage points, not
        as a percent-of-percent figure.
      </p>
    </section>
  );
}
