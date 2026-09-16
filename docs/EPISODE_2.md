# How to publish Episode 2

No application code changes are required. Update data files only.

## 1. Record transactions since Episode 1

Append to `data/transactions.json` with unique `id` values. Examples:

* `personal_contribution` / channel / viewer support → `externalCashFlow: true`
* `dividend` / `options_premium` / `interest` → `externalCashFlow: false`
* `security_purchase` / `security_sale` → include `ticker`, `shares`, `priceCents` when known

Set `episodeNumber: 2` on Episode 2 transactions.

## 2. Add the episode snapshot

Append to `data/episodes.json`:

```json
{
  "episodeNumber": 2,
  "slug": "episode-2-your-title-here",
  "title": "Fiat Freedom Portfolio — Episode 2",
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "thumbnailUrl": null,
  "publishedAt": "2026-09-17T12:00:00-04:00",
  "valuationAt": "2026-09-17T16:00:00-04:00",
  "portfolioValueCents": 0,
  "cashBalanceCents": 0,
  "cumulativeContributionsCents": 0,
  "cumulativeWithdrawalsCents": 0,
  "cumulativeIncomeCents": 0,
  "investmentPnLCents": 0,
  "positions": [],
  "benchmarks": [
    { "symbol": "BTCUSD", "label": "Bitcoin", "priceCents": null, "units": null, "valueCents": null },
    { "symbol": "SPY", "label": "S&P 500 (SPY)", "priceCents": null, "units": null, "valueCents": null },
    { "symbol": "GLD", "label": "Gold (GLD)", "priceCents": null, "units": null, "valueCents": null }
  ],
  "notes": ["Replace placeholders with confirmed Episode 2 figures."]
}
```

Fill cents, holdings, and notes from the confirmed Episode 2 record. Do **not** edit Episode 1 prices retroactively.

## 3. Update current portfolio state

In `data/portfolio.json`:

* `currentValuationAt`
* `currentPortfolioValueCents`
* `cashBalanceCents`
* `positions`
* Set `dataQuality` to `"confirmed"` once prices are verified

## 4. Optional companion updates

* `data/market-prices.json` — BTCUSD, SPY, GLD, and holding prices at the valuation timestamp
* `data/issuer-metrics.json` — diluted sats/share with citations
* `data/reserve-transactions.json` — any support received (never mark as portfolio performance)
* `data/income-model.json` — modeled securities if allocating the income model

## 5. Verify

```bash
npm test
npm run lint
npm run build
```

Open `/episodes/episode-2-your-title-here` and confirm Episode 1 is unchanged.
