import { SATS_PER_BTC } from "./format";

export type LookThroughPositionInput = {
  ticker: string;
  shares: number;
  lookThroughEligible: boolean;
  dilutedSatsPerShare: number | null;
};

export type LookThroughPositionResult = {
  ticker: string;
  shares: number;
  dilutedSatsPerShare: number | null;
  lookThroughSats: number | null;
  available: boolean;
  reason?: string;
};

/**
 * Look-through BTC exposure in sats = shares owned × diluted BTC per share × 1e8
 * When dilutedSatsPerShare is already in sats/share, multiply shares × dilutedSatsPerShare.
 */
export function calculateLookThroughSats(
  shares: number,
  dilutedSatsPerShare: number | null,
): number | null {
  if (dilutedSatsPerShare == null) return null;
  if (!Number.isFinite(shares) || shares < 0) return null;
  return Math.round(shares * dilutedSatsPerShare);
}

export function calculateDilutedSatsPerShare(args: {
  totalBtcSats: number | null;
  dilutedSharesOutstanding: number | null;
}): number | null {
  if (args.totalBtcSats == null || args.dilutedSharesOutstanding == null) {
    return null;
  }
  if (args.dilutedSharesOutstanding <= 0) return null;
  return Math.round(args.totalBtcSats / args.dilutedSharesOutstanding);
}

export function calculatePositionLookThrough(
  positions: LookThroughPositionInput[],
): {
  positions: LookThroughPositionResult[];
  totalLookThroughSats: number | null;
} {
  const results: LookThroughPositionResult[] = positions.map((position) => {
    if (!position.lookThroughEligible) {
      return {
        ticker: position.ticker,
        shares: position.shares,
        dilutedSatsPerShare: null,
        lookThroughSats: null,
        available: false,
        reason: "Position excluded from look-through (preferred, ETF, cash, or ineligible).",
      };
    }
    if (position.dilutedSatsPerShare == null) {
      return {
        ticker: position.ticker,
        shares: position.shares,
        dilutedSatsPerShare: null,
        lookThroughSats: null,
        available: false,
        reason: "Diluted sats per share unavailable.",
      };
    }
    const lookThroughSats = calculateLookThroughSats(
      position.shares,
      position.dilutedSatsPerShare,
    );
    return {
      ticker: position.ticker,
      shares: position.shares,
      dilutedSatsPerShare: position.dilutedSatsPerShare,
      lookThroughSats,
      available: lookThroughSats != null,
    };
  });

  const available = results.filter((r) => r.available && r.lookThroughSats != null);
  const totalLookThroughSats =
    available.length === 0
      ? null
      : available.reduce((sum, r) => sum + (r.lookThroughSats ?? 0), 0);

  return { positions: results, totalLookThroughSats };
}

export function btcFromSats(sats: number): number {
  return sats / SATS_PER_BTC;
}
