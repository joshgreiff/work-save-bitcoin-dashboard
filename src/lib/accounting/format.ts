import { formatViewerTimestamp } from "@/lib/market/session";

const SATS_PER_BTC = 100_000_000;

export function formatUsdFromCents(
  cents: number | null | undefined,
  options?: { showSign?: boolean; fallback?: string },
): string {
  if (cents == null) {
    return options?.fallback ?? "—";
  }
  const absolute = Math.abs(cents) / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(absolute);
  if (options?.showSign) {
    if (cents > 0) return `+${formatted}`;
    if (cents < 0) return `-${formatted}`;
  }
  return cents < 0 ? `-${formatted}` : formatted;
}

export function formatPercent(
  value: number | null | undefined,
  options?: { digits?: number; showSign?: boolean; fallback?: string },
): string {
  if (value == null || Number.isNaN(value)) {
    return options?.fallback ?? "—";
  }
  const digits = options?.digits ?? 2;
  const formatted = `${(Math.abs(value) * 100).toFixed(digits)}%`;
  if (options?.showSign) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
  }
  return value < 0 ? `-${formatted}` : formatted;
}

export function formatSats(sats: number | null | undefined): string {
  if (sats == null) return "—";
  return `${new Intl.NumberFormat("en-US").format(sats)} sats`;
}

export function formatBtcFromSats(sats: number | null | undefined, digits = 8): string {
  if (sats == null) return "—";
  return `${(sats / SATS_PER_BTC).toFixed(digits)} BTC`;
}

export function formatShares(shares: number | null | undefined): string {
  if (shares == null) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(shares);
}

export function formatAsOf(value: string | null | undefined): string {
  if (!value) return "As of: unavailable";
  const formatted = formatViewerTimestamp(value);
  if (formatted === "—") return "As of: unavailable";
  return `As of ${formatted}`;
}

export { SATS_PER_BTC };
