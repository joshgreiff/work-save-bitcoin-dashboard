# Decisions

## Why static JSON in version 1

Static files keep the public ledger auditable, avoid secrets, and match episode-based publishing. `src/lib/data` isolates loading so a database can replace files later without rewriting UI.

## Why open/close valuation history before a live ticker

Append-only session marks (`data/valuation-history.json`) unlock time-series charts for portfolio value, contribution-adjusted returns, and cash-flow-matched BTC/SPY/GLD without brokerage APIs or invented prices. Live quotes can layer on later; official performance still uses confirmed 9:30 a.m. / 4:00 p.m. Eastern points only.

## Why synchronized 4:00 p.m. Bitcoin closes

Equities and Bitcoin trade on different clocks. Daily MSTR-versus-Bitcoin narration uses Coinbase one-minute closes selected at or immediately before 4:00 p.m. America/New_York so both legs share one session window. Rolling 24-hour Bitcoin performance is never substituted into that comparison.

## Why live marks stay transient

During regular U.S. equity hours the dashboard may show one live regular-session portfolio mark. It is replaced on refresh, never appended to `market-observations.json` or episode snapshots, and disappears outside the session in favor of the latest official close.

## Why no brokerage integration

Credentials and account identifiers are explicitly out of scope. Manual snapshots prevent accidental exposure and keep the educational narrative intentional.

## Why the reserve is separate

Viewer Bitcoin support must never inflate securities performance or imply ownership. Separate files, schemas, pages, and accounting utilities enforce the boundary.

## Why benchmark cash flows are mirrored

Percentage returns alone can mislead when contributions arrive over time. Cash-flow-matched benchmarks answer: “What would the same external cash flows be worth in BTC, SPY, or GLD?”

## Why diluted BTC per share is primary

Dilution is material for treasury equities. Basic sats/share may be shown when available, but comparisons use diluted sats/share.

## Why the model tracks income potential, not simulated performance

Version 1 answers “how much gross income could today’s liquidation value buy?” It does not invent a second historical track record for a hypothetical allocation.

## Episode 1 valuation timestamps

Episode 1 preserves the opening baseline at `$1,999.91`. The first official regular-market close is `$1,996.92` at `2026-09-16T16:00:00-04:00`. Both points are stored in `data/valuation-history.json` (open + close). Do not rewrite prior history unless correcting a documented error.

## MPJPY classification

MPJPY is a sponsored Level I ADR representing Metaplanet ordinary shares (TSE:3350) at a 1:1 ratio. Asset class is `adr_common_equity` with `lookThroughEligible: true`. Diluted sats/share should come from Metaplanet disclosures and apply 1:1 to the ADR.
