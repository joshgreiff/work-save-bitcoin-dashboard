# Data sources

Version 1 keeps **official performance** in manually maintained JSON. Live quotes are a separate informational layer and never overwrite episode or close history.

| Dataset | File / endpoint | Status | Notes |
| --- | --- | --- | --- |
| Portfolio holdings & values | `data/portfolio.json` | Manual | Share counts and official close value; per-security close prices may be null |
| Episodes | `data/episodes.json` | Manual | Historical snapshots |
| Transactions | `data/transactions.json` | Manual | Securities ledger only |
| Valuation history | `data/valuation-history.json` | Manual append-only | Official open/close marks for charts |
| Market prices | `data/market-prices.json` | Confirmed | Latest official synchronized session prints (Sep 17 close) |
| Market observations | `data/market-observations.json` | Append-only | Inception + Sep 16/17 market closes with synchronized BTC/equity prints |
| Issuer BTC/share history | `data/issuer-bps-history.json` | Empty seed | Diluted sats/share from primary sources only; UI shows coming-soon when empty |
| Live BTC card | `/api/live-btc` | Automated | Coinbase spot + 24h stats; cached fallback labeled Last available |
| Live quotes | `/api/live-quotes` | Automated | Equities only during regular U.S. session; BTC 24/7 informational |
| Issuer BTC metrics | `data/issuer-metrics.json` | Manual placeholders | Prefer IR → SEC → company dashboards |
| Reserve | `data/reserve-transactions.json` | Manual | Empty at seed |
| Income model | `data/income-model.json` | Illustrative preset | Editable allocations + scenario presets; never mutates portfolio |
| Income securities catalog | `data/income-securities.json` | Seeded | STRF/STRC terms with sources; other preferreds pending confirmation |
| Income history | `data/income-history.json` | Empty | Historical total-return series for Sharpe/Sortino when available |
| Site/referrals | `data/site-config.json` | Manual | Links and disclaimers |

Every externally sourced figure should eventually include source name, URL, as-of timestamp, retrieved-at timestamp, and manual/automated flag.

## Live quotes

* CLI: `npm run quotes` prints the current live mark JSON.
* UI: home and portfolio pages show live regular-session marks when the U.S. equity market is open.
* Live income: `/api/live-income-model` applies live quotes to the income-model allocation (informational; never mutates episodes).
* Live values must never overwrite official episode / valuation-history / market-observation rows without human confirmation.

## Synchronized BTC 4:00 p.m. Eastern selection

For each official market-close observation, Bitcoin’s synchronized price is taken from Coinbase BTC-USD one-minute candles:

1. Prefer the candle whose start equals 4:00 p.m. America/New_York.
2. If missing, use the last candle at or immediately before 4:00 p.m.
3. Store the actual selected timestamp and whether a fallback was required.
4. Never silently use a later observation, rolling 24h return, or UTC midnight close.

Timezone conversion always uses `America/New_York` (EDT/EST aware) — offsets are not hard-coded.
