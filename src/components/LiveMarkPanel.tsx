"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  AsOf,
  formatShares,
  formatUsdFromCents,
} from "@/components/ui/primitives";
import type { LiveQuotesResponse } from "@/lib/quotes/types";

function formatQuoteAge(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

export function LiveMarkPanel() {
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
        const payload = (await response.json()) as LiveQuotesResponse;
        setData(payload);
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

  const holdingQuotes = data?.quotes.filter((q) =>
    ["MSTR", "ASST", "MPJPY"].includes(q.symbol),
  );
  const benchmarkQuotes = data?.quotes.filter((q) =>
    ["BTCUSD", "SPY", "GLD"].includes(q.symbol),
  );

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
            Live mark (informational)
          </p>
          <h2 className="mt-1 text-lg font-medium text-[var(--foreground)]">
            Market quotes
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Auto-refreshed quotes for holdings and benchmarks. Official performance still uses
            confirmed 4:00 p.m. Eastern closes only.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isPending}
          className="border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-50"
        >
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[var(--negative)]">
          Could not load live quotes: {error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="border border-[var(--border)] px-3 py-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                Live portfolio estimate
              </p>
              <p className="mt-2 text-2xl font-medium tabular-nums text-[var(--accent)]">
                {formatUsdFromCents(data.mark.portfolioValueCents)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Shares × live quotes + recorded cash
                {data.mark.complete ? "" : " (incomplete)"}
              </p>
              <AsOf value={data.mark.asOf} />
            </article>
            {(holdingQuotes ?? []).map((quote) => (
              <article key={quote.symbol} className="border border-[var(--border)] px-3 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                  {quote.symbol}
                </p>
                <p className="mt-2 text-xl font-medium tabular-nums">
                  {formatUsdFromCents(quote.priceCents)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {quote.sourceName} · {formatQuoteAge(quote.retrievedAt)}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="py-2 pr-4">Ticker</th>
                  <th className="py-2 pr-4">Shares</th>
                  <th className="py-2 pr-4">Live price</th>
                  <th className="py-2">Live value</th>
                </tr>
              </thead>
              <tbody>
                {data.mark.positions.map((pos) => (
                  <tr key={pos.ticker} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-4">{pos.ticker}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatShares(pos.shares)}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatUsdFromCents(pos.priceCents)}
                    </td>
                    <td className="py-2 tabular-nums">
                      {formatUsdFromCents(pos.marketValueCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {benchmarkQuotes && benchmarkQuotes.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--muted-foreground)]">
              {benchmarkQuotes.map((quote) => (
                <li key={quote.symbol} className="tabular-nums">
                  <span className="text-[var(--muted)]">{quote.symbol}</span>{" "}
                  {formatUsdFromCents(quote.priceCents)}
                </li>
              ))}
            </ul>
          ) : null}

          {data.errors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-[var(--negative)]">
              {data.errors.map((err) => (
                <li key={err.symbol}>
                  {err.symbol}: {err.message}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">{data.disclaimer}</p>
        </>
      ) : !error ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Loading live quotes…</p>
      ) : null}
    </section>
  );
}
