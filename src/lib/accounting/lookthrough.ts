import { SATS_PER_BTC } from "./format";

export type LookThroughPositionInput = {
  ticker: string;
  shares: number;
  lookThroughEligible: boolean;
  dilutedSatsPerShare: number | null;
  adrRatio?: number | null;
};

export type LookThroughPositionResult = {
  ticker: string;
  shares: number;
  dilutedSatsPerShare: number | null;
  adrRatio: number;
  lookThroughSats: number | null;
  available: boolean;
  reason?: string;
};

/**
 * Position look-through sats =
 * portfolio shares × unrounded issuer diluted sats per share × ADR ratio,
 * rounded only at the end to the nearest satoshi.
 */
export function calculateLookThroughSats(
  shares: number,
  dilutedSatsPerShare: number | null,
  adrRatio: number | null = 1,
): number | null {
  if (dilutedSatsPerShare == null) return null;
  if (!Number.isFinite(shares) || shares < 0) return null;
  const ratio = adrRatio == null ? 1 : adrRatio;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return Math.round(shares * dilutedSatsPerShare * ratio);
}

/**
 * Rounded display helper for issuer diluted sats/share.
 * Look-through must use the unrounded value via calculateLookThroughSats.
 */
export function displayDilutedSatsPerShare(
  dilutedSatsPerShare: number | null,
): number | null {
  if (dilutedSatsPerShare == null) return null;
  return Math.round(dilutedSatsPerShare);
}

export function calculateDilutedSatsPerShare(args: {
  totalBtcSats: number | null;
  dilutedSharesOutstanding: number | null;
}): number | null {
  if (args.totalBtcSats == null || args.dilutedSharesOutstanding == null) {
    return null;
  }
  if (args.dilutedSharesOutstanding <= 0) return null;
  return args.totalBtcSats / args.dilutedSharesOutstanding;
}

export function calculatePositionLookThrough(
  positions: LookThroughPositionInput[],
): {
  positions: LookThroughPositionResult[];
  totalLookThroughSats: number | null;
} {
  const results: LookThroughPositionResult[] = positions.map((position) => {
    const adrRatio = position.adrRatio == null ? 1 : position.adrRatio;
    if (!position.lookThroughEligible) {
      return {
        ticker: position.ticker,
        shares: position.shares,
        dilutedSatsPerShare: null,
        adrRatio,
        lookThroughSats: null,
        available: false,
        reason:
          "Position excluded from look-through (preferred, ETF, cash, or ineligible).",
      };
    }
    if (position.dilutedSatsPerShare == null) {
      return {
        ticker: position.ticker,
        shares: position.shares,
        dilutedSatsPerShare: null,
        adrRatio,
        lookThroughSats: null,
        available: false,
        reason: "Diluted sats per share unavailable.",
      };
    }
    const lookThroughSats = calculateLookThroughSats(
      position.shares,
      position.dilutedSatsPerShare,
      adrRatio,
    );
    return {
      ticker: position.ticker,
      shares: position.shares,
      dilutedSatsPerShare: position.dilutedSatsPerShare,
      adrRatio,
      lookThroughSats,
      available: lookThroughSats != null,
    };
  });

  const available = results.filter(
    (r) => r.available && r.lookThroughSats != null,
  );
  const totalLookThroughSats =
    available.length === 0
      ? null
      : available.reduce((sum, r) => sum + (r.lookThroughSats ?? 0), 0);

  return { positions: results, totalLookThroughSats };
}

export function btcFromSats(sats: number): number {
  return sats / SATS_PER_BTC;
}

export function percentOfTotal(
  part: number | null,
  total: number | null,
): number | null {
  if (part == null || total == null || total === 0) return null;
  return part / total;
}
