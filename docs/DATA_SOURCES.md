# Data sources

Version 1 keeps **official performance** in manually maintained JSON. Live quotes are a separate informational layer and never overwrite episode or close history.

| Dataset | File / endpoint | Status | Notes |
| --- | --- | --- | --- |
| Portfolio holdings & values | `data/portfolio.json` | Manual | Share counts and official close value; per-security close prices may be null |
| Episodes | `data/episodes.json` | Manual | Historical snapshots |
| Transactions | `data/transactions.json` | Manual | Securities ledger only |
| Valuation history | `data/valuation-history.json` | Manual append-only | Official open/close marks for charts |
| Market prices | `data/market-prices.json` | Manual placeholders | Confirmed session prints for accounting; null until verified |
| Live quotes | `/api/live-quotes` | Automated | Coinbase BTC spot + Yahoo Finance chart for MSTR/ASST/MPJPY/SPY/GLD; informational only |
| Issuer BTC metrics | `data/issuer-metrics.json` | Manual placeholders | Prefer IR → SEC → company dashboards |
| Reserve | `data/reserve-transactions.json` | Manual | Empty at seed |
| Income model | `data/income-model.json` | Illustrative preset | Editable allocations + scenario presets; never mutates portfolio |
| Income securities catalog | `data/income-securities.json` | Seeded | STRF/STRC terms with sources; other preferreds pending confirmation |
| Income history | `data/income-history.json` | Empty | Historical total-return series for Sharpe/Sortino when available |
| Site/referrals | `data/site-config.json` | Manual | Links and disclaimers |

Every externally sourced figure should eventually include source name, URL, as-of timestamp, retrieved-at timestamp, and manual/automated flag.

## Live quotes

* CLI: `npm run quotes` prints the current live mark JSON.
* UI: home and portfolio pages show a live mark panel that refreshes about once a minute.
* Live values must never be labeled as the official 4:00 p.m. Eastern close or written into episode / valuation-history rows without human confirmation.
