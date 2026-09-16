# Data sources

Version 1 uses **manually maintained JSON**. No scraping and no brokerage APIs.

| Dataset | File | Status | Notes |
| --- | --- | --- | --- |
| Portfolio holdings & values | `data/portfolio.json` | Manual | Episode 1 share counts and starting value confirmed; prices null |
| Episodes | `data/episodes.json` | Manual | Historical snapshots |
| Transactions | `data/transactions.json` | Manual | Securities ledger only |
| Market prices | `data/market-prices.json` | Manual placeholders | BTCUSD, SPY, GLD, holdings — prices null until confirmed |
| Issuer BTC metrics | `data/issuer-metrics.json` | Manual placeholders | Prefer IR → SEC → company dashboards |
| Reserve | `data/reserve-transactions.json` | Manual | Empty at seed |
| Income model | `data/income-model.json` | Manual | Unconfigured securities list |
| Site/referrals | `data/site-config.json` | Manual | Links and disclaimers |

Every externally sourced figure should eventually include source name, URL, as-of timestamp, retrieved-at timestamp, and manual/automated flag.
