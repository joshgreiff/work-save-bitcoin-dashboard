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
import type { PublicDashboard } from "@/lib/data/public-dashboard";
import { formatEtTimestamp } from "@/lib/market/session";

type Props = {
  observations: PublicDashboard["issuerBitcoinPerShare"]["observations"];
  latestByTicker: PublicDashboard["issuerBitcoinPerShare"]["latestByTicker"];
  notes: string[];
};

export function IssuerBpsHistory({ observations, latestByTicker, notes }: Props) {
  const tickers = useMemo(
    () => [...new Set(observations.map((o) => o.ticker))].sort(),
    [observations],
  );
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"level" | "change">("level");

  const activeTickers = tickers.filter((t) => enabled[t] !== false);

  const chartData = useMemo(() => {
    if (observations.length === 0) return [];
    const byDate = new Map<string, Record<string, string | number | null>>();
    const firstByTicker = new Map<string, number>();

    const sorted = [...observations].sort(
      (a, b) => Date.parse(a.asOf) - Date.parse(b.asOf),
    );
    for (const obs of sorted) {
      const key = obs.asOf;
      const row = byDate.get(key) ?? { label: formatEtTimestamp(obs.asOf) };
      const value =
        obs.reportedSatsPerDilutedShare ?? obs.calculatedSatsPerDilutedShare;
      if (value != null && !firstByTicker.has(obs.ticker)) {
        firstByTicker.set(obs.ticker, value);
      }
      const first = firstByTicker.get(obs.ticker);
      row[obs.ticker] =
        value == null
          ? null
          : mode === "level"
            ? value
            : first
              ? value / first - 1
              : null;
      byDate.set(key, row);
    }
    return [...byDate.values()];
  }, [observations, mode]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-medium">Diluted sats per share history</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Append-only primary-source observations. Values remain the latest reported metric until
          another company disclosure — they do not change continuously every day.
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
              Diluted sats per share
            </button>
            <button
              type="button"
              className={`border px-3 py-1.5 text-sm ${mode === "change" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)]"}`}
              onClick={() => setMode("change")}
            >
              Change since first observation
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
                {ticker}
              </label>
            ))}
          </div>
          <div className="h-64 border border-[var(--border)] bg-[var(--surface)] p-3">
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
                <Tooltip />
                <Legend />
                {activeTickers.map((ticker, index) => (
                  <Line
                    key={ticker}
                    type="stepAfter"
                    dataKey={ticker}
                    stroke={["#F7931A", "#E8E2D6", "#7A8494"][index % 3]}
                    dot={{ r: 3 }}
                    connectNulls={false}
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
              <th className="py-2 pr-3">As of</th>
              <th className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {latestByTicker.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-4 text-[var(--muted)]">
                  Verified historical observations coming soon — no invented sats-per-share rows.
                </td>
              </tr>
            ) : (
              latestByTicker.map((row) => (
                <tr key={row.ticker} className="border-t border-[var(--border)]">
                  <td className="py-2 pr-3">
                    {row.ticker}
                    <span className="block text-xs text-[var(--muted)]">{row.issuer}</span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {row.dilutedSatsPerShare == null
                      ? "—"
                      : formatSats(Math.round(row.dilutedSatsPerShare))}
                    <span className="block text-xs text-[var(--muted)]">{row.status}</span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {row.previous
                      ? formatSats(
                          Math.round(
                            (row.previous.reportedSatsPerDilutedShare ??
                              row.previous.calculatedSatsPerDilutedShare ??
                              0) as number,
                          ),
                        )
                      : "—"}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {row.change == null ? "—" : formatSats(Math.round(row.change))}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatPercent(row.changePct, { showSign: true })}
                  </td>
                  <td className="py-2 pr-3">{formatEtTimestamp(row.latest.asOf)}</td>
                  <td className="py-2 text-xs text-[var(--muted)]">
                    {row.latest.sourceName ?? "—"}
                  </td>
                </tr>
              ))
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
