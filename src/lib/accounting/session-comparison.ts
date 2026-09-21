import type { SynchronizedMarketObservation } from "@/lib/schemas/market-observations";

export type SessionAssetReturn = {
  symbol: string;
  startCents: number | null;
  endCents: number | null;
  sessionReturn: number | null;
  excessVsBtcPp: number | null;
};

export type AmplificationResult = {
  available: boolean;
  multiple: number | null;
  reason?: string;
};

export type EpisodeSummaryResult = {
  available: boolean;
  text: string;
  dateLabel: string;
};

/** Transient live end leg for prior-close → live comparisons (never stored). */
export type LiveSessionEnd = {
  asOf: string;
  prices: {
    BTCUSD: number | null;
    MSTR: number | null;
    ASST: number | null;
    MPJPY: number | null;
  };
  portfolioValueCents: number | null;
};

export type SessionComparisonMode = "official_close" | "live" | "pending";

export type SessionComparison = {
  available: boolean;
  pendingReason: string | null;
  mode: SessionComparisonMode;
  endAsOf: string | null;
  assets: SessionAssetReturn[];
  btcReturn: number | null;
  amplification: AmplificationResult;
  episodeSummary: EpisodeSummaryResult;
};

const AMPLIFICATION_BTC_THRESHOLD = 0.005;

export function sessionReturn(
  startCents: number | null | undefined,
  endCents: number | null | undefined,
): number | null {
  if (startCents == null || endCents == null || startCents === 0) return null;
  return endCents / startCents - 1;
}

export function excessReturnPp(
  assetReturn: number | null,
  btcReturn: number | null,
): number | null {
  if (assetReturn == null || btcReturn == null) return null;
  return assetReturn - btcReturn;
}

export function amplificationMultiple(
  mstrReturn: number | null,
  btcReturn: number | null,
): AmplificationResult {
  if (mstrReturn == null || btcReturn == null) {
    return {
      available: false,
      multiple: null,
      reason:
        "Amplification multiple not meaningful because Bitcoin’s synchronized move was too small or moved in the opposite direction.",
    };
  }
  if (Math.abs(btcReturn) < AMPLIFICATION_BTC_THRESHOLD) {
    return {
      available: false,
      multiple: null,
      reason:
        "Amplification multiple not meaningful because Bitcoin’s synchronized move was too small or moved in the opposite direction.",
    };
  }
  if (Math.sign(mstrReturn) !== Math.sign(btcReturn) && mstrReturn !== 0) {
    return {
      available: false,
      multiple: null,
      reason:
        "Amplification multiple not meaningful because Bitcoin’s synchronized move was too small or moved in the opposite direction.",
    };
  }
  return {
    available: true,
    multiple: mstrReturn / btcReturn,
  };
}

function pendingComparison(reason = "Exact BTC comparison pending"): SessionComparison {
  return {
    available: false,
    pendingReason: reason,
    mode: "pending",
    endAsOf: null,
    assets: [],
    btcReturn: null,
    amplification: amplificationMultiple(null, null),
    episodeSummary: {
      available: false,
      text: reason,
      dateLabel: "",
    },
  };
}

export function buildSessionComparison(args: {
  /** Start of the window — prior official close for live, or previous close for official. */
  previous: SynchronizedMarketObservation | null;
  /** End of an official close→close window. Ignored when `liveEnd` is provided. */
  latest: SynchronizedMarketObservation | null;
  /** When set, ending values come from live quotes (prior close → live). */
  liveEnd?: LiveSessionEnd | null;
}): SessionComparison {
  const { previous, latest, liveEnd } = args;
  const usingLive = liveEnd != null;

  if (!previous) {
    return pendingComparison();
  }
  if (!usingLive && !latest) {
    return pendingComparison();
  }

  const endPrices = usingLive
    ? liveEnd.prices
    : {
        BTCUSD: latest!.prices.BTCUSD,
        MSTR: latest!.prices.MSTR,
        ASST: latest!.prices.ASST,
        MPJPY: latest!.prices.MPJPY,
      };
  const endPortfolio = usingLive
    ? liveEnd.portfolioValueCents
    : latest!.portfolioValueCents;
  const endAsOf = usingLive ? liveEnd.asOf : latest!.timestamp;

  const btcStart = previous.prices.BTCUSD;
  const btcEnd = endPrices.BTCUSD;
  const btcReturn = sessionReturn(btcStart, btcEnd);

  const symbols = ["BTCUSD", "MSTR", "ASST", "MPJPY", "PORTFOLIO"] as const;
  const assets: SessionAssetReturn[] = symbols.map((symbol) => {
    if (symbol === "PORTFOLIO") {
      const start = previous.portfolioValueCents;
      const end = endPortfolio;
      const ret = sessionReturn(start, end);
      return {
        symbol: "Actual portfolio",
        startCents: start,
        endCents: end,
        sessionReturn: ret,
        excessVsBtcPp: excessReturnPp(ret, btcReturn),
      };
    }
    const start = previous.prices[symbol];
    const end = endPrices[symbol];
    const ret = sessionReturn(start, end);
    return {
      symbol: symbol === "BTCUSD" ? "Bitcoin" : symbol,
      startCents: start,
      endCents: end,
      sessionReturn: ret,
      excessVsBtcPp: symbol === "BTCUSD" ? null : excessReturnPp(ret, btcReturn),
    };
  });

  const mstr = assets.find((a) => a.symbol === "MSTR");
  const amplification = amplificationMultiple(mstr?.sessionReturn ?? null, btcReturn);

  const syncReady =
    btcStart != null &&
    btcEnd != null &&
    mstr?.startCents != null &&
    mstr?.endCents != null &&
    mstr.sessionReturn != null &&
    btcReturn != null;

  const episodeSummary = syncReady
    ? buildEpisodeSummary({
        asOf: endAsOf,
        mstrStart: mstr!.startCents!,
        mstrEnd: mstr!.endCents!,
        mstrReturn: mstr!.sessionReturn!,
        btcStart: btcStart!,
        btcEnd: btcEnd!,
        btcReturn: btcReturn!,
        amplification,
        windowKind: usingLive ? "live" : "official_close",
      })
    : {
        available: false,
        text: "Exact BTC comparison pending",
        dateLabel: "",
      };

  return {
    available: syncReady,
    pendingReason: syncReady ? null : "Exact BTC comparison pending",
    mode: syncReady ? (usingLive ? "live" : "official_close") : "pending",
    endAsOf: syncReady ? endAsOf : null,
    assets,
    btcReturn,
    amplification,
    episodeSummary,
  };
}

function formatPct(value: number): string {
  return `${(Math.abs(value) * 100).toFixed(2)}`;
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildEpisodeSummary(args: {
  asOf: string;
  mstrStart: number;
  mstrEnd: number;
  mstrReturn: number;
  btcStart: number;
  btcEnd: number;
  btcReturn: number;
  amplification: AmplificationResult;
  windowKind?: "official_close" | "live";
}): EpisodeSummaryResult {
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(args.asOf));

  const mstrVerb = args.mstrReturn >= 0 ? "rose" : "fell";
  const btcVerb = args.btcReturn >= 0 ? "rose" : "fell";
  const vs =
    args.mstrReturn - args.btcReturn >= 0 ? "outperformed" : "underperformed";
  const excessPp = Math.abs((args.mstrReturn - args.btcReturn) * 100).toFixed(2);
  const live = args.windowKind === "live";

  let text = live
    ? `As of the live mark on ${dateLabel}, MSTR ${mstrVerb} ${formatPct(args.mstrReturn)}% from the prior 4:00 p.m. Eastern close of ${formatUsd(args.mstrStart)} to ${formatUsd(args.mstrEnd)}. Over the same prior-close-to-live window, Bitcoin ${btcVerb} ${formatPct(args.btcReturn)}% from ${formatUsd(args.btcStart)} to ${formatUsd(args.btcEnd)}. MSTR ${vs} Bitcoin by ${excessPp} percentage points.`
    : `On ${dateLabel}, MSTR ${mstrVerb} ${formatPct(args.mstrReturn)}% from ${formatUsd(args.mstrStart)} to ${formatUsd(args.mstrEnd)}. Over the same 4:00 p.m.-to-4:00 p.m. Eastern window, Bitcoin ${btcVerb} ${formatPct(args.btcReturn)}% from ${formatUsd(args.btcStart)} to ${formatUsd(args.btcEnd)}. MSTR ${vs} Bitcoin by ${excessPp} percentage points.`;

  if (args.amplification.available && args.amplification.multiple != null) {
    text += live
      ? ` MSTR moved approximately ${Math.abs(args.amplification.multiple).toFixed(1)} times as much as Bitcoin from the prior close through this live mark.`
      : ` MSTR moved approximately ${Math.abs(args.amplification.multiple).toFixed(1)} times as much as Bitcoin during this session.`;
  }

  return { available: true, text, dateLabel };
}

/** Select Coinbase 1-minute candle at or immediately before 4:00 p.m. ET. */
export function selectSynchronizedBtcCandle(args: {
  targetFourPmIso: string;
  candles: Array<{ startUnix: number; close: number }>;
}): {
  priceCents: number | null;
  observedAt: string | null;
  fallbackUsed: boolean;
  note?: string;
} {
  const targetMs = Date.parse(args.targetFourPmIso);
  const eligible = args.candles
    .filter((c) => c.startUnix * 1000 <= targetMs && c.close > 0)
    .sort((a, b) => b.startUnix - a.startUnix);
  const exact = eligible.find((c) => c.startUnix * 1000 === targetMs);
  const chosen = exact ?? eligible[0];
  if (!chosen) {
    return { priceCents: null, observedAt: null, fallbackUsed: false, note: "No candle at or before 4:00 p.m. ET" };
  }
  const fallbackUsed = !exact;
  return {
    priceCents: Math.round(chosen.close * 100),
    observedAt: new Date(chosen.startUnix * 1000).toISOString(),
    fallbackUsed,
    note: fallbackUsed
      ? "Used last Coinbase 1-minute close at or before 4:00 p.m. Eastern"
      : "Exact 4:00 p.m. Eastern one-minute candle close",
  };
}
