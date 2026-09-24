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
import { formatPercent, formatSats } from "@/components/ui/primitives";
import { buildIssuerBpsChartSeries } from "@/lib/accounting/issuer-bps";
import type { PublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

type Props = {
  observations: PublicDashboard["issuerBitcoinPerShare"]["observations"];
  latestByTicker: PublicDashboard["issuerBitcoinPerShare"]["latestByTicker"];
  notes: string[];
};

const TICKER_LABELS: Record<string, string> = {
  MSTR: "MSTR",
  ASST: "ASST",
  MPJPY: "Metaplanet",
};

const STROKES = ["#F7931A", "#E8E2D6", "#7A8494"];

export function IssuerBpsHistory({ observations, latestByTicker, notes }: Props) {
  const tickers = useMemo(
    () => [...new Set(observations.map((o) => o.ticker))].sort(),
    [observations],
  );
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"level" | "change">("change");

  const activeTickers = tickers.filter((t) => enabled[t] !== false);

  const chartData = useMemo(
    () =>
      buildIssuerBpsChartSeries({
        observations,
        mode,
        formatLabel: (asOf) => formatEtTimestamp(asOf),
      }),
    [observations, mode],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-medium">Diluted sats-per-share history</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Append-only primary-source observations. Missing dates are not interpolated — only
          disclosed points are connected, each labeled with its actual date.
        </p>
      </div>

      {observations.length === 0 ? (
        <div className="border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
          <p className="font-medium text-[var(--foreground)]">
            Verified historical observations coming soon
          </p>
          <p className="mt-2">
            Diluted sats-per-share history stays unavailable until primary IR/SEC observations are
            confirmed. No invented points are shown.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`border px-3 py-1.5 text-sm ${mode === "level" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}
              onClick={() => setMode("level")}
            >
              Absolute sats per share
            </button>
            <button
              type="button"
              className={`border px-3 py-1.5 text-sm ${mode === "change" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}
              onClick={() => setMode("change")}
            >
              Percentage change from first observation
            </button>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {tickers.map((ticker) => (
              <label key={ticker} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled[ticker] !== false}
                  onChange={(e) =>
                    setEnabled((prev) => ({ ...prev, [ticker]: e.target.checked }))
                  }
                />
                {TICKER_LABELS[ticker] ?? ticker}
              </label>
            ))}
          </div>
          <div className="h-72 border border-[var(--border)] bg-[var(--surface)] p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" stroke="#7A8494" fontSize={11} />
                <YAxis
                  stroke="#7A8494"
                  fontSize={11}
                  tickFormatter={(v) =>
                    mode === "change" ? `${(Number(v) * 100).toFixed(0)}%` : String(v)
                  }
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (value == null) return ["Unavailable", String(name)];
                    if (mode === "change") {
                      return [formatPercent(Number(value), { showSign: true }), String(name)];
                    }
                    return [formatSats(Math.round(Number(value))), String(name)];
                  }}
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as { asOf?: string; label?: string } | undefined;
                    return point?.asOf ? formatEtTimestamp(point.asOf) : (point?.label ?? "");
                  }}
                />
                <Legend
                  formatter={(value) => TICKER_LABELS[String(value)] ?? String(value)}
                />
                {activeTickers.map((ticker, index) => (
                  <Line
                    key={ticker}
                    type="linear"
                    dataKey={ticker}
                    name={ticker}
                    stroke={STROKES[index % STROKES.length]}
                    dot={{ r: 4 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="py-2 pr-3">Issuer</th>
              <th className="py-2 pr-3">Latest diluted sats/share</th>
              <th className="py-2 pr-3">Previous</th>
              <th className="py-2 pr-3">Change</th>
              <th className="py-2 pr-3">Change %</th>
              <th className="py-2 pr-3">Vs Jun 30 2026</th>
              <th className="py-2 pr-3">Vs Dec 31 2025</th>
              <th className="py-2 pr-3">As of</th>
              <th className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {latestByTicker.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-4 text-[var(--muted)]">
                  Verified historical observations coming soon — no invented sats-per-share rows.
                </td>
              </tr>
            ) : (
              latestByTicker.map((row) => {
                const previousValue =
                  row.previous == null
                    ? null
                    : (row.previous.reportedSatsPerDilutedShare ??
                      row.previous.calculatedSatsPerDilutedShare);
                return (
                  <tr key={row.ticker} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-3">
                      {TICKER_LABELS[row.ticker] ?? row.ticker}
                      <span className="block text-xs text-[var(--muted)]">{row.issuer}</span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.dilutedSatsPerShare == null
                        ? "Unavailable"
                        : formatSats(Math.round(row.dilutedSatsPerShare))}
                      <span className="block text-xs text-[var(--muted)]">{row.status}</span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {previousValue == null
                        ? "Unavailable"
                        : formatSats(Math.round(previousValue))}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.change == null ? "Unavailable" : formatSats(Math.round(row.change))}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatPercent(row.changePct, {
                        showSign: true,
                        fallback: "Unavailable",
                      })}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatPercent(row.changeSinceJun2026Pct, {
                        showSign: true,
                        fallback: "Unavailable",
                      })}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatPercent(row.changeSinceDec2025Pct, {
                        showSign: true,
                        fallback: "Unavailable",
                      })}
                    </td>
                    <td className="py-2 pr-3">
                      {row.latest.metricDateLabel ?? formatEtTimestamp(row.latest.asOf)}
                    </td>
                    <td className="py-2 text-xs text-[var(--muted)]">
                      {row.latest.sourceUrl ? (
                        <a
                          href={row.latest.sourceUrl}
                          className="underline decoration-[var(--border)] underline-offset-2 hover:text-[var(--accent)]"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.latest.sourceName ?? "Source"}
                        </a>
                      ) : (
                        (row.latest.sourceName ?? "Unavailable")
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
