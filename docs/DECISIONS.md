# Decisions

## Why static JSON in version 1

Static files keep the public ledger auditable, avoid secrets, and match episode-based publishing. `src/lib/data` isolates loading so a database can replace files later without rewriting UI.

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

## Episode 1 valuation timestamp

`inceptionValuationAt` uses the series convention of 4:00 p.m. Eastern on the publication date. It is **not** a confirmed brokerage fill timestamp. Security and benchmark prices remain `null` until confirmed.
