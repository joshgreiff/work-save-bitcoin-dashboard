# Data sources

Version 1 keeps **official performance** in manually maintained JSON. Live quotes are a separate informational layer and never overwrite episode or close history.

| Dataset | File / endpoint | Status | Notes |
| --- | --- | --- | --- |
| Portfolio holdings & values | `data/portfolio.json` | Manual shares + automated close marks | Share counts manual; official close value updated by `npm run close:append` |
| Episodes | `data/episodes.json` | Manual + sync-assisted | Permanent portfolio snapshots; never rewrite history |
| YouTube feed cache | `data/youtube-feed.json` | Automated via `npm run sync:episodes` | Channel Atom feed; series videos on/after 2026-09-16 |
| Transactions | `data/transactions.json` | Manual | Securities ledger only |
| Valuation history | `data/valuation-history.json` | Append-only + automated close job | Official open/close marks for charts |
| Market prices | `data/market-prices.json` | Automated close job | Latest official synchronized session prints |
| Market observations | `data/market-observations.json` | Append-only + automated close job | Inception + official market closes with synchronized BTC/equity prints |
| Issuer BTC/share history | `data/issuer-bps-history.json` | Populated | Append-only diluted sats/share from Strategy, Strive SEC, Metaplanet tracker |
| Issuer BTC metrics | `data/issuer-metrics.json` | Populated | Current look-through inputs with dilution scope and primary sources |
| Live BTC card | `/api/live-btc` | Automated | Coinbase spot + 24h stats; cached fallback labeled Last available |
| Live quotes | `/api/live-quotes` | Automated | Equities only during regular U.S. session; BTC 24/7 informational |
| Reserve | `data/reserve-transactions.json` | Manual | Empty at seed |
| Income model | `data/income-model.json` | Illustrative preset | Editable allocations + scenario presets; never mutates portfolio |
| Income securities catalog | `data/income-securities.json` | Seeded | STRF/STRC terms with sources; other preferreds pending confirmation |
| Income history | `data/income-history.json` | Empty | Historical total-return series for Sharpe/Sortino when available |
| Learn lessons catalog | `data/learn/lessons.json` | Seeded | Validated lesson metadata; bodies rendered by slug modules |
| Learn glossary | `data/learn/glossary.json` | Seeded | Plain-language terms by Money / Bitcoin / Ownership |
| Learn resources | `data/learn/resources.json` | Seeded | Curated links; referrals labeled; ForrestHODL URL pending |
| Treasury debt fallback | `data/learn/treasury-debt-fallback.json` | Verified | Used when Fiscal Data API is unavailable |
| Newsletter config | `data/learn/newsletter.json` | Seeded | Provider-agnostic; endpoint via env var |
| Learn hub | `/learn` | App route | Education paths + lesson index |
| Treasury debt API | `/api/treasury-debt` | Automated | Debt to the Penny with cache + fallback |
| Newsletter API | `/api/newsletter` | Automated | Consent required; no credentials in repo |

Every externally sourced figure should eventually include source name, URL, as-of timestamp, retrieved-at timestamp, and manual/automated flag.

## Official market closes (automated)

Weekday after the U.S. equity close, `npm run close:append -- --write` (and the GitHub Action `.github/workflows/append-market-close.yml`) appends a fail-closed official snapshot:

* Equities: Yahoo Finance **unadjusted** daily closes for MSTR, ASST, MPJPY, SPY, GLD
* Thin listings with a session timestamp but no print (seen on MPJPY) may carry the prior unadjusted close with `fallbackUsed: true` and the visible snapshot label: “{TICKER} prior close carried forward due to no reported session print.” The close total remains valid; the labeled component is estimated from its last available close.
* Bitcoin: Coinbase Exchange BTC-USD **4:00 p.m. Eastern** one-minute candle via `selectSynchronizedBtcCandle` (never spot, never rolling 24h)
* Portfolio mark: published share counts × closes + cash (never reserve or income-model capital)
* Provenance: `manual: false`, per-symbol `retrievedAt` / `observedAt` / source URLs
* Idempotent: existing `mo-{day}-close` / `vh-{day}-close` rows are left untouched
* Missing bars (holiday / provider gap) abort with no write

Live quotes remain a separate informational layer and still never overwrite official history.

## Live quotes

* CLI: `npm run quotes` prints the current live mark JSON.
* UI: home and portfolio pages show live regular-session marks when the U.S. equity market is open (overview ending values and portfolio header use prior close → live).
* Live income: `/api/live-income-model` applies live quotes to the income-model allocation (informational; never mutates episodes).
* Live values must never overwrite official episode / valuation-history / market-observation rows without human confirmation.
* Long-term chart history stays on official market-close observations; during regular hours a client-side live tip is appended as the newest point only.

## Synchronized BTC 4:00 p.m. Eastern selection

For each official market-close observation, Bitcoin’s synchronized price is taken from Coinbase BTC-USD one-minute candles:

1. Prefer the candle whose start equals 4:00 p.m. America/New_York.
2. If missing, use the last candle at or immediately before 4:00 p.m.
3. Store the actual selected timestamp and whether a fallback was required.
4. Never silently use a later observation, rolling 24h return, or UTC midnight close.

Timezone conversion always uses `America/New_York` (EDT/EST aware) — offsets are not hard-coded.
