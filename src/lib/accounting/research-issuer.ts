import type { ResearchIssuerSnapshot } from "@/lib/schemas/research-snapshots";
import { SATS_PER_BTC } from "./format";
import { calculateDilutedSatsPerShare } from "./lookthrough";

/**
 * Derived metrics for a research-only issuer snapshot. Nothing here feeds the Fiat Freedom
 * Portfolio, valuation history, or look-through totals.
 */
export type ResearchIssuerMetrics = {
  totalBtcSats: number;
  /** Reported common shares only. */
  basicSatsPerShare: number;
  /** Reported common shares plus potentially dilutive share-based awards. */
  dilutedSatsPerShare: number;
  /** Also adds conditional performance awards whose conditions were not met at asOf. */
  dilutedWithConditionalSatsPerShare: number;
  dilutedShares: number;
  dilutedWithConditionalShares: number;
  btcValuePerShareUsd: number;
  /** Fair value ÷ holdings — the Bitcoin price implied by the company's reported fair value. */
  impliedBtcPriceUsd: number;
  /** Approximation: one closing price applied to every reported common share. */
  approximateMarketValueUsd: number;
  btcShareOfMarketValue: number;
};

export function calculateResearchIssuerMetrics(
  snapshot: ResearchIssuerSnapshot,
): ResearchIssuerMetrics {
  const totalBtcSats = snapshot.bitcoinHoldings * SATS_PER_BTC;
  const shares = snapshot.commonSharesOutstanding;
  const dilutedShares = shares + snapshot.potentiallyDilutiveAwards;
  const dilutedWithConditionalShares = dilutedShares + snapshot.conditionalPerformanceAwards;
  const approximateMarketValueUsd = shares * snapshot.sharePrice.closeUsd;

  return {
    totalBtcSats,
    basicSatsPerShare: calculateDilutedSatsPerShare({
      totalBtcSats,
      dilutedSharesOutstanding: shares,
    })!,
    dilutedSatsPerShare: calculateDilutedSatsPerShare({
      totalBtcSats,
      dilutedSharesOutstanding: dilutedShares,
    })!,
    dilutedWithConditionalSatsPerShare: calculateDilutedSatsPerShare({
      totalBtcSats,
      dilutedSharesOutstanding: dilutedWithConditionalShares,
    })!,
    dilutedShares,
    dilutedWithConditionalShares,
    btcValuePerShareUsd: snapshot.bitcoinFairValueUsd / shares,
    impliedBtcPriceUsd: snapshot.bitcoinFairValueUsd / snapshot.bitcoinHoldings,
    approximateMarketValueUsd,
    btcShareOfMarketValue: snapshot.bitcoinFairValueUsd / approximateMarketValueUsd,
  };
}

export type AllocationIllustrationRow = {
  allocation: number;
  positionUsd: number;
  shares: number;
  /** Uses diluted sats per share (reported common + potentially dilutive awards). */
  lookThroughSats: number;
  btcValueInPositionUsd: number;
  /** Sats the same dollars would buy directly at the implied Bitcoin price. */
  directBitcoinSats: number;
  /** Portfolio change, as a fraction, if the issuer's share price moves by ±equityMove. */
  portfolioChangeOnEquityMove: number;
  /** Portfolio change in USD from a +bitcoinMove via the issuer's Bitcoin holdings alone. */
  portfolioChangeOnBitcoinMoveUsd: number;
};

/** Hypothetical illustration only — never actual portfolio performance. */
export function calculateAllocationIllustration(
  snapshot: ResearchIssuerSnapshot,
  metrics: ResearchIssuerMetrics = calculateResearchIssuerMetrics(snapshot),
): AllocationIllustrationRow[] {
  const { portfolioValueUsd, allocations, equityMove, bitcoinMove } =
    snapshot.allocationIllustration;
  return allocations.map((allocation) => {
    const positionUsd = portfolioValueUsd * allocation;
    const shares = positionUsd / snapshot.sharePrice.closeUsd;
    const btcValueInPositionUsd = positionUsd * metrics.btcShareOfMarketValue;
    return {
      allocation,
      positionUsd,
      shares,
      lookThroughSats: Math.round(shares * metrics.dilutedSatsPerShare),
      btcValueInPositionUsd,
      directBitcoinSats: Math.round((positionUsd / metrics.impliedBtcPriceUsd) * SATS_PER_BTC),
      portfolioChangeOnEquityMove: allocation * equityMove,
      portfolioChangeOnBitcoinMoveUsd: btcValueInPositionUsd * bitcoinMove,
    };
  });
}
