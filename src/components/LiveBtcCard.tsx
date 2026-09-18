"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  formatPercent,
  formatUsdFromCents,
} from "@/components/ui/primitives";
import { formatEtTimestamp } from "@/lib/market/session";

type BtcPayload = {
  priceCents: number;
  change24hCents: number | null;
  change24hPct: number | null;
  asOf: string;
  retrievedAt: string;
  sourceName: string;
  freshness: "live" | "last_available";
};

export function LiveBtcCard() {
  const [data, setData] = useState<BtcPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        setError(null);
        const response = await fetch("/api/live-btc", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setData((await response.json()) as BtcPayload);
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

  const tone =
    data?.change24hCents == null
      ? "neutral"
      : data.change24hCents > 0
        ? "positive"
        : data.change24hCents < 0
          ? "negative"
          : "neutral";

  return (
    <section className="border border-[var(--accent)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
            Live BTC/USD — informational
          </p>
          <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
            {data ? formatUsdFromCents(data.priceCents) : isPending ? "…" : "—"}
          </p>
          <p
            className={`mt-2 text-sm tabular-nums ${
              tone === "positive"
                ? "text-[var(--positive)]"
                : tone === "negative"
                  ? "text-[var(--negative)]"
                  : "text-[var(--muted)]"
            }`}
          >
            {data?.change24hCents != null
              ? `${formatUsdFromCents(data.change24hCents, { showSign: true })} (${formatPercent(data.change24hPct, { showSign: true })}) 24h`
              : "24h change unavailable"}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isPending}
          className="border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)] disabled:opacity-50"
        >
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="mt-4 max-w-2xl text-sm text-[var(--muted-foreground)]">
        Bitcoin trades continuously. This quote does not alter the portfolio’s official
        market-close valuation or benchmark history.
      </p>
      <dl className="mt-4 grid gap-2 text-xs text-[var(--muted)] sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-wide">Status</dt>
          <dd className="mt-1 text-[var(--foreground)]">
            {data?.freshness === "last_available"
              ? "Last available"
              : data
                ? "Live"
                : "Loading"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Timestamp (ET)</dt>
          <dd className="mt-1 tabular-nums text-[var(--foreground)]">
            {formatEtTimestamp(data?.asOf)}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Source</dt>
          <dd className="mt-1 text-[var(--foreground)]">{data?.sourceName ?? "Coinbase spot"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Freshness</dt>
          <dd className="mt-1 text-[var(--foreground)]">
            {data?.freshness === "live" ? "Current request" : data ? "Cached fallback" : "—"}
          </dd>
        </div>
      </dl>
      {error && !data ? (
        <p className="mt-3 text-sm text-[var(--negative)]">{error}</p>
      ) : null}
    </section>
  );
}
