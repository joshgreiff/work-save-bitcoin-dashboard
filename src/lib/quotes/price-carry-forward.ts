/**
 * Visible labels when an equity close is carried from a prior session print.
 * The portfolio total remains a valid market-close valuation; labeled components
 * are estimated from the last available close.
 */

export const PRIOR_CLOSE_CARRIED_FORWARD_SUFFIX =
  "prior close carried forward due to no reported session print.";

export function priorCloseCarriedForwardLabel(ticker: string): string {
  return `${ticker} ${PRIOR_CLOSE_CARRIED_FORWARD_SUFFIX}`;
}

export function equityCarryForwardLabels(args: {
  sources: Partial<
    Record<
      string,
      {
        fallbackUsed?: boolean | null;
      } | null
    >
  >;
  /** Only label equity holdings, not BTC candle fallbacks. */
  tickers?: string[];
}): string[] {
  const tickers = args.tickers ?? ["MSTR", "ASST", "MPJPY", "SPY", "GLD"];
  const labels: string[] = [];
  for (const ticker of tickers) {
    if (args.sources[ticker]?.fallbackUsed) {
      labels.push(priorCloseCarriedForwardLabel(ticker));
    }
  }
  return labels;
}

export function appendCarryForwardClarification(baseNote: string, labels: string[]): string {
  if (labels.length === 0) return baseNote;
  const clarification =
    labels.length === 1
      ? `${labels[0]} The total is still a valid market-close valuation, but one component is estimated from its last available close.`
      : `${labels.join(" ")} The total is still a valid market-close valuation, but labeled components are estimated from their last available closes.`;
  return `${baseNote} ${clarification}`;
}
